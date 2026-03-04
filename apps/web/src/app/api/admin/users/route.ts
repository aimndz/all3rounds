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

  // Fetch all user profiles.
  const { data, error } = await adminClient
    .from("user_profiles")
    .select("id, display_name, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
