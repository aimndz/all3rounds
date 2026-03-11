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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const role = searchParams.get("role") || "all";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("user_profiles")
    .select("id, display_name, role, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (role && role !== "all") {
    query = query.eq("role", role);
  }

  const { data: profiles, count, error } = await query.range(from, to);

  if (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }

  // Fetch emails from auth.users for the current set of profiles
  const profilesWithEmail = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: { user }, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
      return {
        ...profile,
        email: authError ? "N/A" : user?.email || "N/A"
      };
    })
  );

  return NextResponse.json({
    data: profilesWithEmail,
    total: count || 0,
    page,
    limit,
  });
}
