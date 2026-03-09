import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission, hasPermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";

const BatchLinesSchema = z.object({
  lineIds: z
    .array(z.number().int())
    .min(1, "No lines selected")
    .max(200, "Too many lines selected (max 200)"),
  action: z.enum(["set_round", "set_emcee", "update", "delete"], {
    message: "Invalid action",
  }),
  value: z.any().optional(),
  updates: z
    .object({
      round_number: z.union([z.number(), z.null()]).optional(),
      emcee_id: z.union([z.string(), z.null()]).optional(),
    })
    .optional(),
});

/**
 * PATCH /api/lines/batch
 * Performs batch operations on multiple transcript lines:
 * - set_round: Updates round_number for all selected lines
 * - set_emcee: Updates emcee_id for all selected lines
 * - update: Updates multiple fields (round, emcee) simultaneously
 * - delete: Removes lines permanently (superadmin only)
 */
export async function PATCH(request: NextRequest) {
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check ──
  // Batch editing requires 'lines:batch_edit' permission
  const auth = await requirePermission("lines:batch_edit");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user, role } = auth;

  // ── Rate limit ──
  // Skip rate limiting for superadmins to allow heavy editing sessions
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

  // ── Validation ──
  const parsed = BatchLinesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { lineIds, action, value, updates } = parsed.data;

  // ── Specific Permission Checks ──
  if (action === "delete" && !hasPermission(role, "lines:delete")) {
    return NextResponse.json(
      { error: "Only superadmins can delete lines." },
      { status: 403 },
    );
  }

  try {
    const battleIds = new Set<string>();

    // Case 1: Updating attributes
    if (action === "update" || action === "set_round" || action === "set_emcee") {
      const finalUpdates: { round_number?: number | null; emcee_id?: string | null } = {};
      
      // Consolidate updates from legacy or combined actions
      if (action === "set_round") {
        finalUpdates.round_number =
          value === null || value === "" || value === "none"
            ? null
            : Number(value);
      } else if (action === "set_emcee") {
        finalUpdates.emcee_id =
          value === "none" || value === "" || value === null ? null : value;
      } else if (action === "update" && updates) {
        if ("round_number" in updates) finalUpdates.round_number = updates.round_number;
        if ("emcee_id" in updates) finalUpdates.emcee_id = updates.emcee_id;
      }

      if (Object.keys(finalUpdates).length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      // ── Record History & Fetch Battle IDs for Cache Invalidation ──
      const { data: existing, error: selectError } = await adminClient
        .from("lines")
        .select("id, round_number, emcee_id, battle_id")
        .in("id", lineIds);

      if (selectError) throw selectError;

      if (existing) {
        const historyRows: {
          line_id: number;
          user_id: string;
          field_changed: string;
          old_value: string;
          new_value: string;
        }[] = [];

        existing.forEach((line) => {
          // Track round changes
          if ("round_number" in finalUpdates) {
            historyRows.push({
              line_id: line.id,
              user_id: user.id,
              field_changed: "round_number",
              old_value: String(line.round_number ?? ""),
              new_value: String(finalUpdates.round_number ?? ""),
            });
          }
          // Track emcee changes
          if ("emcee_id" in finalUpdates) {
            historyRows.push({
              line_id: line.id,
              user_id: user.id,
              field_changed: "emcee_id",
              old_value: String(line.emcee_id ?? ""),
              new_value: String(finalUpdates.emcee_id ?? ""),
            });
          }
          if (line.battle_id) battleIds.add(line.battle_id);
        });
        
        if (historyRows.length > 0) {
          await adminClient.from("edit_history").insert(historyRows);
        }
      }

      // ── Apply Updates ──
      const { error: updateError } = await adminClient
        .from("lines")
        .update(finalUpdates)
        .in("id", lineIds);

      if (updateError) throw updateError;
    } 
    // Case 2: Deletion
    else if (action === "delete") {
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
          (line) => line.battle_id && battleIds.add(line.battle_id),
        );
      }

      const { error: deleteError } = await adminClient
        .from("lines")
        .delete()
        .in("id", lineIds);

      if (deleteError) throw deleteError;
    }

    // ── Cache Invalidation ──
    for (const bId of battleIds) {
      await invalidateCache(`battle:${bId}`);
    }

    return NextResponse.json({ success: true, count: lineIds.length });
  } catch (err) {
    console.error("Batch operation error:", err);
    return NextResponse.json(
      { error: "Batch operation failed. Please check server logs." },
      { status: 500 },
    );
  }
}
