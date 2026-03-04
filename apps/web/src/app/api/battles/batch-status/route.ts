import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";

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
 * PATCH /api/battles/batch-status
 *
 * Batch‐update the status of multiple battles at once.
 *
 * Body: { battleIds: string[], status: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!verifyCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    // Only superadmins can batch-exclude
    const { error: permError } = await requirePermission("battles:delete");
    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: permError.status },
      );
    }

    const body = await request.json();
    const { battleIds, status } = body;

    if (!Array.isArray(battleIds) || battleIds.length === 0) {
      return NextResponse.json(
        { error: "battleIds must be a non-empty array." },
        { status: 400 },
      );
    }

    const VALID = ["raw", "arranged", "reviewing", "reviewed", "excluded"];
    if (!status || !VALID.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID.join(", ")}` },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // If excluding, wipe the heavy data (lines/participants) first
    if (status === "excluded") {
      const { error: linesErr } = await supabaseAdmin
        .from("lines")
        .delete()
        .in("battle_id", battleIds);
      if (linesErr) console.error("Batch lines deletion failed:", linesErr);

      const { error: partsErr } = await supabaseAdmin
        .from("battle_participants")
        .delete()
        .in("battle_id", battleIds);
      if (partsErr)
        console.error("Batch participants deletion failed:", partsErr);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("battles")
      .update({ status })
      .in("id", battleIds)
      .select("id");

    if (error) {
      console.error("Batch status update failed:", error);
      return NextResponse.json(
        { error: "Failed to update battle statuses." },
        { status: 500 },
      );
    }

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
    console.error("PATCH /api/battles/batch-status error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
