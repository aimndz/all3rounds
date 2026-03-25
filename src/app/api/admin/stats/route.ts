import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";

type AdminStatsResponse = {
  overview: {
    total_reviews: number;
    total_approved: number;
    total_rejected: number;
  };
  moderators: {
    id: string;
    display_name: string;
    role: string;
    approved: number;
    rejected: number;
    total: number;
    last_review: string | null;
  }[];
};

export async function GET(_request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const cacheKey = "admin:stats";
  const cached = await getCached<AdminStatsResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const adminClient = createAdminClient();

  // Fetch all non-pending suggestions (handling Supabase 1000 row limit)
  interface SuggestionData {
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
  }
  let allSuggestions: SuggestionData[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: chunk, error: suggError } = await adminClient
      .from("suggestions")
      .select("status, reviewed_by, reviewed_at")
      .neq("status", "pending")
      .range(from, from + step - 1);

    if (suggError) {
      console.error("Stats suggError at range", from, suggError);
      return NextResponse.json(
        { error: "Failed to fetch stats." },
        { status: 500 },
      );
    }

    if (chunk && chunk.length > 0) {
      allSuggestions = allSuggestions.concat(chunk);
      from += step;
      if (chunk.length < step) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  const suggestions = allSuggestions;

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
    users?.reduce(
      (
        acc: Record<string, { id: string; display_name: string; role: string }>,
        cur: { id: string; display_name: string; role: string },
      ) => {
        acc[cur.id] = cur;
        return acc;
      },
      {},
    ) || {};

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

  for (const sugg of suggestions) {
    if (!sugg.reviewed_by) continue;

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
      sugg.reviewed_at &&
      (!m.last_review || sugg.reviewed_at > m.last_review)
    ) {
      m.last_review = sugg.reviewed_at;
    }
  }

  const moderatorArray = Object.values(modStats).sort(
    (a, b) => b.total - a.total,
  );

  const response: AdminStatsResponse = {
    overview: {
      total_reviews: totalApproved + totalRejected,
      total_approved: totalApproved,
      total_rejected: totalRejected,
    },
    moderators: moderatorArray,
  };

  await setCached(cacheKey, response, 60);
  return NextResponse.json(response);
}
