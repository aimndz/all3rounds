import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const body = await request.json();
  const { role } = body as { role: string };

  const validRoles = [
    "superadmin",
    "admin",
    "moderator",
    "verified_emcee",
    "viewer",
  ];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Failed to update role." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
