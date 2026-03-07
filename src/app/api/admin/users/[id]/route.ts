import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const UpdateRoleSchema = z.object({
  role: z.enum(
    ["superadmin", "admin", "moderator", "verified_emcee", "viewer"],
    { message: "Invalid role" },
  ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { role } = parsed.data;

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
