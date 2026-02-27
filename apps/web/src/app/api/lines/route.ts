import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
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
  const { allowed } = checkRateLimit(`add:${user.id}`, RATE_LIMITS.edit);
  if (!allowed) {
    return NextResponse.json(
      { error: "Action limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const adminClient = createAdminClient();
  const body = await request.json();
  const { battle_id, content, start_time, end_time, emcee_id, round_number } =
    body;

  // Validation: Check required fields and formats
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!battle_id || !UUID_REGEX.test(battle_id)) {
    return NextResponse.json({ error: "Invalid battle ID." }, { status: 400 });
  }

  if (!content || start_time === undefined || end_time === undefined) {
    return NextResponse.json(
      {
        error: "Missing required fields (content, start_time, end_time).",
      },
      { status: 400 },
    );
  }

  const { data, error } = await adminClient
    .from("lines")
    .insert({
      battle_id,
      content,
      start_time: parseFloat(start_time),
      end_time: parseFloat(end_time),
      emcee_id: emcee_id === "none" ? null : emcee_id,
      round_number: round_number === "none" ? null : parseInt(round_number),
    })
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    return NextResponse.json(
      { error: "Failed to create line." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, line: data });
}

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

  // Validation: lineId must be an integer
  if (!lineId || typeof lineId !== "number" || !Number.isInteger(lineId)) {
    return NextResponse.json({ error: "Invalid line ID." }, { status: 400 });
  }

  if (!field || value === undefined) {
    return NextResponse.json(
      { error: "Missing field or value." },
      { status: 400 },
    );
  }

  const allowedFields = [
    "content",
    "emcee_id",
    "round_number",
    "start_time",
    "end_time",
  ];
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
    .update({ [field]: value === "none" ? null : value })
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
