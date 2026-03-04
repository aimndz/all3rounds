import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Auth & Permission Check ──
  const auth = await requirePermission("emcees:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const body = await request.json();
  const { name, aka } = body as { name?: string; aka?: string[] };

  if (!name && !aka) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const updateData: any = {};
  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Name cannot be empty." },
        { status: 400 },
      );
    }
    updateData.name = trimmed;
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
