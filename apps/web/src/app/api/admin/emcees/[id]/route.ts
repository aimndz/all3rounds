import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const UpdateEmceeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name too long").optional(),
  aka: z.array(z.string().max(100, "AKA too long")).optional()
}).refine(data => data.name !== undefined || data.aka !== undefined, { message: "Nothing to update." });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("emcees:manage");
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

  const parsed = UpdateEmceeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, aka } = parsed.data;

  const adminClient = createAdminClient();

  const updateData: any = {};
  if (name !== undefined) {
    updateData.name = name.trim();
  }
  if (aka !== undefined) updateData.aka = aka;

  const { error } = await adminClient
    .from("emcees")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Update emcee error:", error);
    if (error.code === "23505") {
      // unique violation
      return NextResponse.json(
        { error: "Another emcee with this name already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update emcee." },
      { status: 500 },
    );
  }

  await invalidateCachePattern("emcees:*");
  await invalidateCachePattern("battles:*"); // because names appear in battle pages
  await invalidateCachePattern("battle:*");

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("emcees:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.from("emcees").delete().eq("id", id);

  if (error) {
    console.error("Delete emcee error:", error);
    return NextResponse.json(
      { error: "Failed to delete emcee." },
      { status: 500 },
    );
  }

  await invalidateCachePattern("emcees:*");
  await invalidateCachePattern("battles:*");
  await invalidateCachePattern("battle:*");

  return NextResponse.json({ success: true });
}
