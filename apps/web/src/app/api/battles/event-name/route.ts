import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";

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

    // 2. Parse body
    const body = await request.json();
    const { oldName, newName, battleIds } = body;

    const trimmedNewName = newName?.trim();
    if (!trimmedNewName) {
      return NextResponse.json(
        { error: "newName is required." },
        { status: 400 },
      );
    }

    // Map "Other Battles" to null
    const finalNewName =
      trimmedNewName === "Other Battles" ? null : trimmedNewName;

    const supabaseAdmin = createAdminClient();

    // ── Mode 2: Move specific battles ──
    if (Array.isArray(battleIds) && battleIds.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from("battles")
        .update({ event_name: finalNewName })
        .in("id", battleIds)
        .select("id");

      if (error) {
        console.error("Move battles event name failed:", error);
        return NextResponse.json(
          { error: "Failed to update event names." },
          { status: 500 },
        );
      }

      // Invalidate caches
      await invalidateCachePattern("battles:page:*");
      if (updated) {
        await Promise.all(
          updated.map((b) => invalidateCachePattern(`battle:${b.id}`)),
        );
      }

      return NextResponse.json({
        success: true,
        updatedCount: updated?.length ?? 0,
      });
    }

    // ── Mode 1: Rename all battles in a group ──
    if (!oldName || typeof oldName !== "string") {
      return NextResponse.json(
        { error: "Either oldName or battleIds is required." },
        { status: 400 },
      );
    }

    // Build the update query — handle "Other Battles" (null event_name)
    let query = supabaseAdmin
      .from("battles")
      .update({ event_name: finalNewName });

    if (oldName === "Other Battles") {
      query = query.is("event_name", null);
    } else {
      query = query.eq("event_name", oldName);
    }

    const { data: updated, error } = await query.select("id");

    if (error) {
      console.error("Batch rename event name failed:", error);
      return NextResponse.json(
        { error: "Failed to update event names." },
        { status: 500 },
      );
    }

    // Invalidate caches
    await invalidateCachePattern("battles:page:*");
    if (updated) {
      await Promise.all(
        updated.map((b) => invalidateCachePattern(`battle:${b.id}`)),
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: updated?.length ?? 0,
    });
  } catch (err: any) {
    console.error("PATCH /api/battles/event-name error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
