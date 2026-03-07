import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // 'approved' or 'rejected'
  const moderatorId = searchParams.get("moderatorId");

  const adminClient = createAdminClient();

  let query = adminClient
    .from("suggestions")
    .select(
      `
      *,
      lines ( content, start_time, end_time, battle:battles ( id, title, youtube_id ) ),
      reviewer:user_profiles!suggestions_reviewed_by_fkey ( display_name ),
      user:user_profiles!suggestions_user_id_fkey ( display_name )
    `,
    )
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (moderatorId && moderatorId !== "all")
    query = query.eq("reviewed_by", moderatorId);

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Fetch reviews audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch review audit log." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
