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

  const adminClient = createAdminClient();

  // Fetch all non-pending suggestions
  const { data: suggestions, error: suggError } = await adminClient
    .from("suggestions")
    .select("status, reviewed_by, reviewed_at")
    .neq("status", "pending");

  if (suggError) {
    console.error("Stats suggError:", suggError);
    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500 },
    );
  }

  // Fetch all user profiles to map IDs to names
  const { data: users, error: usersError } = await adminClient
    .from("user_profiles")
    .select("id, display_name, role");

  if (usersError) {
    console.error("Stats usersError:", usersError);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }

  const userMap =
    users?.reduce((acc: any, cur: any) => {
      acc[cur.id] = cur;
      return acc;
    }, {}) || {};

  // Global overview
  let totalApproved = 0;
  let totalRejected = 0;

  // Moderator stats map
  const modStats: Record<
    string,
    {
      id: string;
      display_name: string;
      role: string;
      approved: number;
      rejected: number;
      total: number;
      last_review: string | null;
    }
  > = {};

  suggestions?.forEach((sugg) => {
    if (!sugg.reviewed_by) return;

    if (sugg.status === "approved") totalApproved++;
    if (sugg.status === "rejected") totalRejected++;

    if (!modStats[sugg.reviewed_by]) {
      const u = userMap[sugg.reviewed_by];
      modStats[sugg.reviewed_by] = {
        id: sugg.reviewed_by,
        display_name: u?.display_name || "Unknown",
        role: u?.role || "unknown",
        approved: 0,
        rejected: 0,
        total: 0,
        last_review: null,
      };
    }

    const m = modStats[sugg.reviewed_by];
    if (sugg.status === "approved") m.approved++;
    if (sugg.status === "rejected") m.rejected++;
    m.total++;

    if (
      !m.last_review ||
      new Date(sugg.reviewed_at) > new Date(m.last_review)
    ) {
      m.last_review = sugg.reviewed_at;
    }
  });

  const moderatorArray = Object.values(modStats).sort(
    (a, b) => b.total - a.total,
  );

  return NextResponse.json({
    overview: {
      total_reviews: totalApproved + totalRejected,
      total_approved: totalApproved,
      total_rejected: totalRejected,
    },
    moderators: moderatorArray,
  });
}
