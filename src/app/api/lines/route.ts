import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";

const AddLineSchema = z.object({
  battle_id: z.string().uuid("Invalid battle ID"),
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(5000, "Content too long"),
  start_time: z.coerce.number(),
  end_time: z.coerce.number(),
  emcee_id: z.string().nullable().optional().or(z.literal("none")),
  round_number: z.coerce.number().nullable().optional().or(z.literal("none")),
});

const EditLineSchema = z.object({
  lineId: z.number().int(),
  field: z.enum(
    ["content", "emcee_id", "round_number", "start_time", "end_time"],
    { message: "Invalid field" },
  ),
  value: z.union([z.string(), z.number(), z.null()]),
});

export async function POST(request: NextRequest) {
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("lines:edit");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user, role } = auth;

  // ── Rate limit ──
  if (role !== "superadmin") {
    const rateRes = await checkRateLimit(`add:${user.id}`, "add_line");
    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Action limit reached. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateRes) },
      );
    }
  }

  const adminClient = createAdminClient();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AddLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { battle_id, content, start_time, end_time, emcee_id, round_number } =
    parsed.data;

  const { data, error } = await adminClient
    .from("lines")
    .insert({
      battle_id,
      content,
      start_time: start_time,
      end_time: end_time,
      emcee_id: emcee_id === "none" ? null : emcee_id,
      round_number: round_number === "none" ? null : round_number,
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
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("lines:edit");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user, role } = auth;

  // ── Rate limit ──
  if (role !== "superadmin") {
    const rateRes = await checkRateLimit(`edit:${user.id}`, "edit");
    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Edit limit reached. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateRes) },
      );
    }
  }

  const adminClient = createAdminClient();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = EditLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { lineId, field, value } = parsed.data;

  // Validation: Check content length if editing content
  if (field === "content") {
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > 5000
    ) {
      return NextResponse.json(
        { error: "Content must be between 1 and 5000 characters." },
        { status: 400 },
      );
    }
  }

  // Get the old value first
  const { data: existing, error: fetchError } = await adminClient
    .from("lines")
    .select("*")
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

  if (existing && existing.battle_id) {
    await invalidateCache(`battle:${existing.battle_id}`);
  }

  return NextResponse.json({ success: true });
}
