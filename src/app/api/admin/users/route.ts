import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

type UserProfileRow = {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

type AuthUserRow = {
  id: string;
  email: string;
};

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
  const search = searchParams.get("q") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("user_profiles")
    .select("id, display_name, role, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (role && role !== "all") {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  const { data: profiles, count, error } = await query.range(from, to);

  if (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }

  const profileRows = (profiles || []) as UserProfileRow[];
  const profileIds = profileRows.map((profile) => profile.id);
  const { data: betterAuthUsers } = profileIds.length
    ? await adminClient.from("user").select("id, email").in("id", profileIds)
    : { data: [] };

  const emailById = new Map(
    ((betterAuthUsers || []) as AuthUserRow[]).map((user) => [
      user.id,
      user.email,
    ]),
  );
  const profilesWithEmail = profileRows.map((profile) => ({
    ...profile,
    email: emailById.get(profile.id) || "N/A",
  }));

  return NextResponse.json({
    data: profilesWithEmail,
    total: count || 0,
    page,
    limit,
  });
}
