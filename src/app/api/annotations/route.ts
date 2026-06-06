import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { requirePermission, hasPermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  buildAnnotationResponse,
  buildLineSnapshot,
  CreateAnnotationSchema,
  fetchLineRange,
  fetchReferences,
  fetchVisibleBattle,
  type AnnotationRow,
} from "@/lib/annotations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const auth = await requirePermission("annotations:create");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user, role } = auth;

  if (role !== "superadmin") {
    const rateRes = await checkRateLimit(
      `annotation:create:${user.id}`,
      "annotation_create",
    );
    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Annotation limit reached. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateRes) },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateAnnotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const battle = await fetchVisibleBattle(payload.battle_id, role);
  if (!battle) {
    return NextResponse.json({ error: "Battle not found." }, { status: 404 });
  }

  const selectedRange = await fetchLineRange({
    battleId: payload.battle_id,
    startLineId: payload.start_line_id,
    endLineId: payload.end_line_id,
  });
  if (selectedRange.error || selectedRange.lines.length === 0) {
    return NextResponse.json(
      { error: selectedRange.error ?? "Selected line range was not found." },
      { status: 404 },
    );
  }

  const references = await fetchReferences(
    payload.battle_id,
    payload.references,
  );
  if (references.error) {
    return NextResponse.json({ error: references.error }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const selectedLines = selectedRange.lines;
  const startLine = selectedLines[0];
  const endLine = selectedLines[selectedLines.length - 1];
  const lineById = new Map(selectedLines.map((line) => [line.id, line]));
  const targetLine = payload.target_line_id
    ? selectedLines.find((line) => line.id === payload.target_line_id)
    : null;
  const legacyTextTarget =
    targetLine &&
    payload.start_text_offset !== undefined &&
    payload.end_text_offset !== undefined &&
    payload.selected_text
      ? {
          line: targetLine,
          start: payload.start_text_offset,
          end: payload.end_text_offset,
          text: payload.selected_text,
        }
      : null;
  const textTargets = payload.annotation_targets?.length
    ? payload.annotation_targets.map((target) => ({
        line: lineById.get(target.line_id),
        start: target.start_text_offset,
        end: target.end_text_offset,
        text: target.selected_text,
      }))
    : legacyTextTarget
      ? [legacyTextTarget]
      : [];

  if (payload.target_line_id && !targetLine) {
    return NextResponse.json(
      { error: "Selected text target must belong to the selected line range." },
      { status: 400 },
    );
  }

  for (const textTarget of textTargets) {
    if (!textTarget.line) {
      return NextResponse.json(
        { error: "Selected text target must belong to the selected line range." },
        { status: 400 },
      );
    }
    if (textTarget.end <= textTarget.start) {
      return NextResponse.json(
        { error: "Selected text range is invalid." },
        { status: 400 },
      );
    }
    const selectedText = textTarget.line.content.slice(
      textTarget.start,
      textTarget.end,
    );
    if (selectedText !== textTarget.text) {
      return NextResponse.json(
        { error: "Selected text no longer matches this line." },
        { status: 400 },
      );
    }
  }

  const { data: duplicate } = await adminClient
    .from("annotations")
    .select("id")
    .eq("battle_id", payload.battle_id)
    .eq("author_id", user.id)
    .eq("body_text", payload.body_text)
    .eq("status", "published")
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { error: "You already published this annotation." },
      { status: 409 },
    );
  }

  const annotationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const qualityState = hasPermission(role, "annotations:moderate")
    ? "trusted"
    : "normal";

  const { data: annotation, error: insertError } = await adminClient
    .from("annotations")
    .insert({
      id: annotationId,
      battle_id: payload.battle_id,
      author_id: user.id,
      body_json: JSON.stringify(payload.body_json),
      body_text: payload.body_text,
      status: "published",
      score: 1,
      quality_state: qualityState,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertError || !annotation) {
    console.error("Create annotation error:", insertError);
    return NextResponse.json(
      { error: "Failed to create annotation." },
      { status: 500 },
    );
  }

  const rangeRows =
    textTargets.length > 0
      ? textTargets.map((target) => ({
          id: crypto.randomUUID(),
          annotation_id: annotationId,
          battle_id: payload.battle_id,
          start_line_id: target.line?.id ?? null,
          end_line_id: target.line?.id ?? null,
          start_line_sort: target.line?.start_time ?? startLine.start_time,
          end_line_sort: target.line?.start_time ?? endLine.start_time,
          start_text_offset: target.start,
          end_text_offset: target.end,
          selected_text: target.text,
          line_snapshot_json: buildLineSnapshot(
            target.line ? [target.line] : selectedLines,
          ),
          created_at: now,
        }))
      : [
          {
            id: crypto.randomUUID(),
            annotation_id: annotationId,
            battle_id: payload.battle_id,
            start_line_id: startLine.id,
            end_line_id: endLine.id,
            start_line_sort: startLine.start_time,
            end_line_sort: endLine.start_time,
            start_text_offset: null,
            end_text_offset: null,
            selected_text: null,
            line_snapshot_json: buildLineSnapshot(selectedLines),
            created_at: now,
          },
        ];

  const { error: rangeError } = await adminClient
    .from("annotation_line_ranges")
    .insert(rangeRows);

  if (rangeError) {
    console.error("Create annotation range error:", rangeError);
    await adminClient
      .from("annotations")
      .update({ status: "deleted", deleted_at: now })
      .eq("id", annotationId);
    return NextResponse.json(
      { error: "Failed to attach annotation to selected lines." },
      { status: 500 },
    );
  }

  const { error: voteError } = await adminClient.from("annotation_votes").insert({
    id: crypto.randomUUID(),
    annotation_id: annotationId,
    user_id: user.id,
    value: 1,
    created_at: now,
  });

  if (voteError) {
    console.error("Create annotation author vote error:", voteError);
    await adminClient
      .from("annotations")
      .update({ status: "deleted", deleted_at: now })
      .eq("id", annotationId);
    return NextResponse.json(
      { error: "Failed to create annotation vote." },
      { status: 500 },
    );
  }

  if (references.references.length > 0) {
    const { error: referenceError } = await adminClient
      .from("annotation_line_references")
      .insert(
        references.references.map((reference) => ({
          id: crypto.randomUUID(),
          annotation_id: annotationId,
          battle_id: payload.battle_id,
          line_id: reference.line_id,
          line_sort: reference.line_sort,
          label: reference.label,
          created_at: now,
        })),
      );

    if (referenceError) {
      console.error("Create annotation references error:", referenceError);
    }
  }

  const responseAnnotations = await buildAnnotationResponse({
    annotations: [annotation as AnnotationRow],
    ranges: [
      {
        id: `${annotationId}:range`,
        annotation_id: annotationId,
        battle_id: payload.battle_id,
        start_line_id: startLine.id,
        end_line_id: endLine.id,
        start_line_sort: startLine.start_time,
        end_line_sort: endLine.start_time,
        start_text_offset: textTargets[0]?.start ?? null,
        end_text_offset: textTargets[0]?.end ?? null,
        selected_text: textTargets[0]?.text ?? null,
        line_snapshot_json: buildLineSnapshot(selectedLines),
      },
    ],
    currentUserId: user.id,
  });

  return NextResponse.json(
    { annotation: responseAnnotations[0] ?? annotation },
    { status: 201 },
  );
}
