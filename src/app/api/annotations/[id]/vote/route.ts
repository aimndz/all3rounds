import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { getUserWithRole } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import type { AnnotationRow } from "@/lib/annotations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

async function fetchAnnotation(id: string) {
  const { data, error } = await createAdminClient()
    .from("annotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AnnotationRow;
}

async function adjustUserPoints(userId: string, delta: number) {
  const adminClient = createAdminClient();
  const { data: current } = await adminClient
    .from("user_points")
    .select("user_id, annotation_points, transcript_points, total_points")
    .eq("user_id", userId)
    .maybeSingle();

  const currentPoints = current as
    | {
        user_id: string;
        annotation_points: number | null;
        transcript_points: number | null;
      }
    | null;
  const annotationPoints = Math.max(
    0,
    Number(currentPoints?.annotation_points ?? 0) + delta,
  );
  const transcriptPoints = Number(currentPoints?.transcript_points ?? 0);
  const next = {
    user_id: userId,
    annotation_points: annotationPoints,
    transcript_points: transcriptPoints,
    total_points: annotationPoints + transcriptPoints,
    updated_at: new Date().toISOString(),
  };

  if (currentPoints) {
    await adminClient.from("user_points").update(next).eq("user_id", userId);
  } else {
    await adminClient.from("user_points").insert(next);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const { user, role } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  if (role !== "superadmin") {
    const rateRes = await checkRateLimit(
      `annotation:vote:${user.id}`,
      "annotation_vote",
    );
    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Vote limit reached. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateRes) },
      );
    }
  }

  const annotation = await fetchAnnotation(id);
  if (!annotation || annotation.status !== "published") {
    return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const { data: existingVote } = await adminClient
    .from("annotation_votes")
    .select("id")
    .eq("annotation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVote) {
    return NextResponse.json({ success: true, score: annotation.score });
  }

  const { error: voteError } = await adminClient.from("annotation_votes").insert({
    id: crypto.randomUUID(),
    annotation_id: id,
    user_id: user.id,
    value: 1,
    created_at: new Date().toISOString(),
  });

  if (voteError) {
    console.error("Create annotation vote error:", voteError);
    return NextResponse.json(
      { error: "Failed to upvote annotation." },
      { status: 500 },
    );
  }

  const nextScore = Number(annotation.score ?? 0) + 1;
  await adminClient
    .from("annotations")
    .update({ score: nextScore, updated_at: new Date().toISOString() })
    .eq("id", id);
  await adjustUserPoints(annotation.author_id, 1);

  return NextResponse.json({ success: true, score: nextScore });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const { user } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  const annotation = await fetchAnnotation(id);
  if (!annotation) {
    return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const { data: existingVote } = await adminClient
    .from("annotation_votes")
    .select("id")
    .eq("annotation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingVote) {
    return NextResponse.json({ success: true, score: annotation.score });
  }

  const { error: deleteError } = await adminClient
    .from("annotation_votes")
    .delete()
    .eq("annotation_id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Delete annotation vote error:", deleteError);
    return NextResponse.json(
      { error: "Failed to remove upvote." },
      { status: 500 },
    );
  }

  const nextScore = Math.max(0, Number(annotation.score ?? 0) - 1);
  await adminClient
    .from("annotations")
    .update({ score: nextScore, updated_at: new Date().toISOString() })
    .eq("id", id);
  await adjustUserPoints(annotation.author_id, -1);

  return NextResponse.json({ success: true, score: nextScore });
}
