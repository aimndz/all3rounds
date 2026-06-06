import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { getUserWithRole } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { AnnotationHelperSchema, fetchVisibleBattle } from "@/lib/annotations";

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

  const { user, role } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  const rateRes = await checkRateLimit(
    `annotation:helper:${user.id}`,
    "annotation_helper",
  );
  if (!rateRes.allowed) {
    return NextResponse.json(
      { error: "Helper limit reached. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(rateRes) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AnnotationHelperSchema.safeParse(body);
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

  const { data: lines, error } = await createAdminClient()
    .from("lines")
    .select("id, content, start_time")
    .eq("battle_id", payload.battle_id)
    .in("id", payload.selected_line_ids)
    .order("start_time", { ascending: true });

  if (error || !lines || (lines as { id: number }[]).length === 0) {
    return NextResponse.json(
      { error: "Selected lines were not found." },
      { status: 404 },
    );
  }

  const selected = (lines as { id: number; content: string }[]).map(
    (line) => line.content,
  );
  const quoted = selected.map((line) => `"${line}"`).join("\n");
  const draft = payload.draft_body_text?.trim();
  const suggestion =
    payload.action === "improve" && draft
      ? `${draft}\n\nTighten this by naming the wordplay, the target, and why the reference lands in the battle.`
      : payload.action === "clearer" && draft
        ? `${draft}\n\nIn simpler terms: explain the setup first, then the punchline, then any cultural or battle-specific context.`
        : payload.action === "context"
          ? `Add context for these lines:\n${quoted}\n\nMention the relevant battle history, slang, named people, places, or earlier bars that make the line hit harder.`
          : payload.action === "references"
            ? "Look for nearby setup, callback, rebuttal, name flips, and any line that introduces the person or phrase being referenced."
            : `Explain what is happening in these lines:\n${quoted}\n\nFocus on the setup, double meaning, reference, and why the crowd or opponent would react.`;

  return NextResponse.json({
    suggestion,
    suggested_references: (lines as { id: number; content: string }[]).map(
      (line) => ({
        line_id: line.id,
        label: `Line ${line.id}`,
      }),
    ),
    warnings: [
      "Helper output is a draft. Review it for accuracy before publishing.",
    ],
  });
}
