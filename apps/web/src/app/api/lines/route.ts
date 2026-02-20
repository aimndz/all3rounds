import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function PATCH(request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("lines:edit");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user } = auth;

  // ── Rate limit ──
  const { allowed } = checkRateLimit(`edit:${user.id}`, RATE_LIMITS.edit);
  if (!allowed) {
    return NextResponse.json(
      { error: "Edit limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const adminClient = createAdminClient();
  const body = await request.json();
  const { lineId, field, value } = body;

  if (!lineId || !field || value === undefined) {
    return NextResponse.json(
      { error: "Missing lineId, field, or value." },
      { status: 400 },
    );
  }

  const allowedFields = ["content", "emcee_id", "round_number"];
  if (!allowedFields.includes(field)) {
    return NextResponse.json(
      { error: `Field "${field}" is not editable.` },
      { status: 400 },
    );
  }

  // Get the old value first
  const { data: existing, error: fetchError } = await adminClient
    .from("lines")
    .select(field)
    .eq("id", lineId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Line not found." }, { status: 404 });
  }

  const oldValue = String(existing[field as keyof typeof existing] ?? "");

  // Save edit history
  const { error: historyError } = await adminClient
    .from("edit_history")
    .insert({
      line_id: lineId,
      user_id: user.id,
      field_changed: field,
      old_value: oldValue,
      new_value: String(value),
    });

  if (historyError) {
    console.error("Edit history error:", historyError);
  }

  // Apply the edit
  const { error: updateError } = await adminClient
    .from("lines")
    .update({ [field]: value })
    .eq("id", lineId);

  if (updateError) {
    console.error("Update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update line." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
