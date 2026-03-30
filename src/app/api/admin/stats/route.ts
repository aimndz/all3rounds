import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

type AdminStatsRpcRow = {
  reviewed_by: string | null;
  display_name: string;
  role: string;
  approved: number;
  rejected: number;
  total: number;
  last_review: string | null;
  total_approved: number;
  total_rejected: number;
  total_reviews: number;
};

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

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

export async function GET(_request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status, headers: NO_STORE_HEADERS },
    );
  }

  const adminClient = createAdminClient();

  const { data: rpcRows, error: rpcError } = await adminClient.rpc(
    "get_admin_review_stats",
  );

  if (rpcError) {
    console.error("Stats rpcError:", rpcError);
    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const rows = (rpcRows || []) as AdminStatsRpcRow[];
  const firstRow = rows[0];

  const moderatorArray = rows
    .filter((row) => row.reviewed_by)
    .map((row) => ({
      id: row.reviewed_by as string,
      display_name: row.display_name || "Unknown",
      role: row.role || "unknown",
      approved: Number(row.approved || 0),
      rejected: Number(row.rejected || 0),
      total: Number(row.total || 0),
      last_review: row.last_review,
    }));

  const response: AdminStatsResponse = {
    overview: {
      total_reviews: Number(firstRow?.total_reviews || 0),
      total_approved: Number(firstRow?.total_approved || 0),
      total_rejected: Number(firstRow?.total_rejected || 0),
    },
    moderators: moderatorArray,
  };

  return NextResponse.json(response, { headers: NO_STORE_HEADERS });
}
