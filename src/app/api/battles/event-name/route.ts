import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { normalizeBattleLeague } from "@/lib/battles";
import {
  getBattleLeagues,
  revalidateBattleDiscovery,
} from "@/lib/revalidation";
import { z } from "zod";

const EventNameSchema = z
  .object({
    oldName: z.string().optional(),
    newName: z
      .string()
      .min(1, "New name cannot be empty")
      .max(200, "New name is too long"),
    league: z.string().min(1).max(80).optional(),
    eventName: z.string().max(200).nullable().optional(),
    battleIds: z.array(z.string().uuid("Invalid battle ID")).optional(),
  })
  .refine(
    (data) => data.oldName || (data.battleIds && data.battleIds.length > 0),
    {
      message: "Either oldName or battleIds is required.",
    },
  );

/**
 * PATCH /api/battles/event-name
 *
 * Two modes:
 *  1. Rename all battles in a group:
 *     { oldName: string, newName: string }
 *
 *  2. Move specific battles to a new event name:
 *     { battleIds: string[], newName: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    // ── CSRF Check ──
    if (!verifyCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    // 1. Check permission — superadmin only
    const { error: permError } = await requirePermission(
      "battles:edit_event_name",
    );
    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: permError.status },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = EventNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      oldName,
      newName,
      league: rawLeague,
      eventName,
      battleIds,
    } = parsed.data;
    const league = rawLeague ? normalizeBattleLeague(rawLeague) : undefined;

    // Map "Other Battles" to null
    const finalNewName = newName === "Other Battles" ? null : newName;

    const supabaseAdmin = createAdminClient();

    // ── Mode 2: Move specific battles ──
    if (Array.isArray(battleIds) && battleIds.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from("battles")
        .update({ event_name: finalNewName })
        .in("id", battleIds)
        .select("id, league");

      if (error) {
        console.error("Move battles event name failed:", error);
        return NextResponse.json(
          { error: "Failed to update event names." },
          { status: 500 },
        );
      }

      await revalidateBattleDiscovery(getBattleLeagues(updated || []));

      return NextResponse.json({
        success: true,
        updatedCount: updated?.length ?? 0,
      });
    }

    // ── Mode 1: Rename all battles in a group ──

    // Build the update query — handle "Other Battles" (null event_name)
    let query = supabaseAdmin
      .from("battles")
      .update({ event_name: finalNewName });

    if (eventName !== undefined) {
      query =
        eventName === null
          ? query.is("event_name", null)
          : query.eq("event_name", eventName);
    } else if (oldName === "Other Battles") {
      query = query.is("event_name", null);
    } else {
      query = query.eq("event_name", oldName);
    }
    if (league) query = query.eq("league", league);

    const { data: updated, error } = await query.select("id, league");

    if (error) {
      console.error("Batch rename event name failed:", error);
      return NextResponse.json(
        { error: "Failed to update event names." },
        { status: 500 },
      );
    }

    await revalidateBattleDiscovery(getBattleLeagues(updated || []));

    return NextResponse.json({
      success: true,
      updatedCount: updated?.length ?? 0,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/battles/event-name error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
