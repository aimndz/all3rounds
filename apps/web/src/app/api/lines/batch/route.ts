import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission, hasPermission } from "@/lib/auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/cache";

// Helper for basic CSRF protection
function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest) {
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check (batch edit requires admin+) ──
  const auth = await requirePermission("lines:batch_edit");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user, role } = auth;

  // ── Rate limit ──
  // SKIP rate limiting for superadmins
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
  const body = await request.json();
  const { lineIds, action, value } = body as {
    lineIds: number[];
    action: "set_round" | "set_emcee" | "delete";
    value?: string | number;
  };

  if (!Array.isArray(lineIds) || lineIds.length === 0) {
    return NextResponse.json({ error: "No lines selected." }, { status: 400 });
  }

  // Validation: Ensure all IDs are integers
  if (!lineIds.every((id) => typeof id === "number" && Number.isInteger(id))) {
    return NextResponse.json(
      { error: "Invalid line IDs provided." },
      { status: 400 },
    );
  }

  if (lineIds.length > 200) {
    return NextResponse.json(
      { error: "Too many lines selected (max 200)." },
      { status: 400 },
    );
  }

  if (!["set_round", "set_emcee", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  // ── Delete requires superadmin ──
  if (action === "delete" && !hasPermission(role, "lines:delete")) {
    return NextResponse.json(
      { error: "Only superadmins can delete lines." },
      { status: 403 },
    );
  }

  try {
    const battleIds = new Set<string>();

    if (action === "set_round") {
      const roundVal =
        value === null || value === "" || value === "none"
          ? null
          : Number(value);

      const { data: existing, error: selectError } = await adminClient
        .from("lines")
        .select("id, round_number, battle_id")
        .in("id", lineIds);

      if (selectError) throw selectError;

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "round_number",
          old_value: String(line.round_number ?? ""),
          new_value: String(roundVal ?? ""),
        }));
        await adminClient.from("edit_history").insert(historyRows);
        existing.forEach(
          (line: any) => line.battle_id && battleIds.add(line.battle_id),
        );
      }

      const { error: updateError } = await adminClient
        .from("lines")
        .update({ round_number: roundVal })
        .in("id", lineIds);

      if (updateError) throw updateError;
    } else if (action === "set_emcee") {
      const emceeVal =
        value === "none" || value === "" || value === null ? null : value;

      const { data: existing, error: selectError } = await adminClient
        .from("lines")
        .select("id, emcee_id, battle_id")
        .in("id", lineIds);

      if (selectError) throw selectError;

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "emcee_id",
          old_value: String(line.emcee_id ?? ""),
          new_value: String(emceeVal ?? ""),
        }));
        await adminClient.from("edit_history").insert(historyRows);
        existing.forEach(
          (line: any) => line.battle_id && battleIds.add(line.battle_id),
        );
      }

      const { error: updateError } = await adminClient
        .from("lines")
        .update({ emcee_id: emceeVal })
        .in("id", lineIds);

      if (updateError) throw updateError;
    } else if (action === "delete") {
      const { data: existing, error: selectError } = await adminClient
        .from("lines")
        .select("id, content, battle_id")
        .in("id", lineIds);

      if (selectError) throw selectError;

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "deleted",
          old_value: line.content,
          new_value: "",
        }));
        await adminClient.from("edit_history").insert(historyRows);
        existing.forEach(
          (line: any) => line.battle_id && battleIds.add(line.battle_id),
        );
      }

      const { error: deleteError } = await adminClient
        .from("lines")
        .delete()
        .in("id", lineIds);

      if (deleteError) throw deleteError;
    }

    for (const bId of battleIds) {
      await invalidateCache(`battle:${bId}`);
    }

    return NextResponse.json({ success: true, count: lineIds.length });
  } catch (err) {
    console.error("Batch operation error:", err);
    return NextResponse.json(
      { error: "Batch operation failed." },
      { status: 500 },
    );
  }
}
