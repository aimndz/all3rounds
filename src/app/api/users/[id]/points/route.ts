import { NextResponse } from "next/server";
import { createPublicClient } from "@/db/d1-client";

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await createPublicClient()
    .from("user_points")
    .select("user_id, annotation_points, transcript_points, total_points")
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    console.error("Fetch user points error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user points." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    user_id: id,
    annotation_points: data?.annotation_points ?? 0,
    transcript_points: data?.transcript_points ?? 0,
    total_points: data?.total_points ?? 0,
  });
}
