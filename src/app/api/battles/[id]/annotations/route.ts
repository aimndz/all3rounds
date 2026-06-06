import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { getUserWithRole, hasPermission } from "@/lib/auth";
import {
  buildAnnotationResponse,
  fetchLineRange,
  fetchVisibleBattle,
  type AnnotationRow,
} from "@/lib/annotations";
import { uuidSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type SelectedTextTarget = {
  lineId: number;
  start: number;
  end: number;
};

function parseSelectedTextTargets(value: string | null): SelectedTextTarget[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((target) => {
      if (!target || typeof target !== "object") return [];
      const item = target as Record<string, unknown>;
      const lineId = Number(item.lineId);
      const start = Number(item.start);
      const end = Number(item.end);
      if (
        !Number.isInteger(lineId) ||
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        lineId <= 0 ||
        start < 0 ||
        end <= start
      ) {
        return [];
      }
      return { lineId, start, end };
    });
  } catch {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid battle ID" }, { status: 400 });
  }

  const { user, role } = await getUserWithRole();
  const battle = await fetchVisibleBattle(id, role);
  if (!battle) {
    return NextResponse.json({ error: "Battle not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const selectedTextTargets = parseSelectedTextTargets(
    searchParams.get("targets"),
  );
  const lineId = Number.parseInt(searchParams.get("lineId") || "", 10);
  const rawStartLineId = Number.parseInt(
    searchParams.get("startLineId") || "",
    10,
  );
  const rawEndLineId = Number.parseInt(searchParams.get("endLineId") || "", 10);

  const startLineId = Number.isFinite(lineId) ? lineId : rawStartLineId;
  const endLineId = Number.isFinite(lineId) ? lineId : rawEndLineId;

  if (!Number.isFinite(startLineId) || !Number.isFinite(endLineId)) {
    return NextResponse.json(
      { error: "A lineId or startLineId/endLineId range is required." },
      { status: 400 },
    );
  }

  const selectedRange = await fetchLineRange({
    battleId: id,
    startLineId,
    endLineId,
  });

  if (selectedRange.error || selectedRange.lines.length === 0) {
    return NextResponse.json(
      { error: selectedRange.error ?? "Selected line range was not found." },
      { status: 404 },
    );
  }

  const startSort = selectedRange.lines[0].start_time;
  const endSort = selectedRange.lines[selectedRange.lines.length - 1].start_time;
  const adminClient = createAdminClient();

  const { data: ranges, error: rangeError } = await adminClient
    .from("annotation_line_ranges")
    .select("*")
    .eq("battle_id", id)
    .lte("start_line_sort", endSort)
    .gte("end_line_sort", startSort);

  if (rangeError) {
    console.error("Annotation range fetch error:", rangeError);
    return NextResponse.json(
      { error: "Failed to fetch annotations." },
      { status: 500 },
    );
  }

  const rangeRows = (ranges ?? []) as {
    annotation_id: string;
    start_line_id: number | null;
    end_line_id: number | null;
    start_line_sort: number;
    end_line_sort: number;
    start_text_offset?: number | null;
    end_text_offset?: number | null;
    selected_text?: string | null;
    line_snapshot_json: string;
  }[];
  const matchingRangeRows =
    selectedTextTargets.length > 0
      ? rangeRows.filter((range) =>
          selectedTextTargets.some((target) => {
            if (range.start_line_id !== target.lineId) return false;
            if (
              range.start_text_offset === null ||
              range.start_text_offset === undefined ||
              range.end_text_offset === null ||
              range.end_text_offset === undefined
            ) {
              return false;
            }
            return (
              range.start_text_offset < target.end &&
              range.end_text_offset > target.start
            );
          }),
        )
      : rangeRows;
  const annotationIds = Array.from(
    new Set(matchingRangeRows.map((range) => range.annotation_id)),
  );

  if (annotationIds.length === 0) {
    return NextResponse.json({
      selected_lines: selectedRange.lines,
      annotations: [],
    });
  }

  let query = adminClient
    .from("annotations")
    .select("*")
    .eq("battle_id", id)
    .in("id", annotationIds)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (!hasPermission(role, "annotations:moderate")) {
    query = query.eq("status", "published");
  }

  const { data: annotations, error: annotationError } = await query;
  if (annotationError) {
    console.error("Annotation fetch error:", annotationError);
    return NextResponse.json(
      { error: "Failed to fetch annotations." },
      { status: 500 },
    );
  }

  const responseAnnotations = await buildAnnotationResponse({
    annotations: (annotations ?? []) as AnnotationRow[],
    ranges: matchingRangeRows.map((range) => ({
      id: `${range.annotation_id}:range`,
      battle_id: id,
      ...range,
    })),
    currentUserId: user?.id ?? null,
  });

  responseAnnotations.sort((left, right) => {
    const leftTrusted =
      left.quality_state === "verified" ||
      left.author.trust_level === "trusted" ||
      left.author.trust_level === "senior";
    const rightTrusted =
      right.quality_state === "verified" ||
      right.author.trust_level === "trusted" ||
      right.author.trust_level === "senior";
    if (leftTrusted !== rightTrusted) return leftTrusted ? -1 : 1;
    return right.score - left.score;
  });

  return NextResponse.json({
    selected_lines: selectedRange.lines,
    annotations: responseAnnotations,
  });
}
