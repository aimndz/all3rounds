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

const EventDateSchema = z
  .object({
    eventName: z.string().optional(),
    newDate: z
      .string()
      .min(1, "New date cannot be empty")
      .max(200, "New date is too long"),
    league: z.string().min(1).max(80).optional(),
    currentEventName: z.string().max(200).nullable().optional(),
    battleIds: z.array(z.string().uuid("Invalid battle ID")).optional(),
  })
  .refine(
    (data) => data.eventName || (data.battleIds && data.battleIds.length > 0),
    {
      message: "Either eventName or battleIds is required.",
    },
  );

/**
 * PATCH /api/battles/event-date
 *
 * Two modes:
 *  1. Update date for all battles in a group (event_name):
 *     { eventName: string, newDate: string }
 *
 *  2. Update date for specific battles:
 *     { battleIds: string[], newDate: string }
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
      "battles:edit_event_date",
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

    const parsed = EventDateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      eventName,
      currentEventName,
      newDate,
      league: rawLeague,
      battleIds,
    } = parsed.data;
    const league = rawLeague ? normalizeBattleLeague(rawLeague) : undefined;

    const supabaseAdmin = createAdminClient();

    // ── Mode 2: Specific battles ──
    if (Array.isArray(battleIds) && battleIds.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from("battles")
        .update({ event_date: newDate })
        .in("id", battleIds)
        .select("id, league");

      if (error) {
        console.error("Update battles event date failed:", error);
        return NextResponse.json(
          { error: "Failed to update event dates." },
          { status: 500 },
        );
      }

      await revalidateBattleDiscovery(getBattleLeagues(updated || []));

      return NextResponse.json({
        success: true,
        updatedCount: updated?.length ?? 0,
      });
    }

    // ── Mode 1: All battles in a named event ──

    // Build the update query
    let query = supabaseAdmin.from("battles").update({ event_date: newDate });

    if (currentEventName !== undefined) {
      query =
        currentEventName === null
          ? query.is("event_name", null)
          : query.eq("event_name", currentEventName);
    } else if (eventName === "Other Battles") {
      query = query.is("event_name", null);
    } else {
      query = query.eq("event_name", eventName);
    }
    if (league) query = query.eq("league", league);

    const { data: updated, error } = await query.select("id, league");

    if (error) {
      console.error("Batch update event date failed:", error);
      return NextResponse.json(
        { error: "Failed to update event dates." },
        { status: 500 },
      );
    }

    await revalidateBattleDiscovery(getBattleLeagues(updated || []));

    return NextResponse.json({
      success: true,
      updatedCount: updated?.length ?? 0,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/battles/event-date error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
