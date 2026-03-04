import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import {
  getCached,
  setCached,
  invalidateCache,
  invalidateCachePattern,
} from "@/lib/cache";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const cacheKey = `battle:${id}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  const supabase = await createClient();

  // Fetch battle details
  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .select("id, title, youtube_id, event_name, event_date, url, status")
    .eq("id", id)
    .single();

  if (battleError || !battle) {
    return NextResponse.json({ error: "Battle not found." }, { status: 404 });
  }

  // Fetch participants (emcees in this battle)
  const { data: participants } = await supabase
    .from("battle_participants")
    .select("label, emcee:emcees ( id, name )")
    .eq("battle_id", id);

  // Fetch all lines for this battle, ordered by timestamp
  const { data: lines, error: linesError } = await supabase
    .from("lines")
    .select(
      `
      id,
      content,
      start_time,
      end_time,
      round_number,
      speaker_label,
      emcee:emcees ( id, name )
    `,
    )
    .eq("battle_id", id)
    .order("start_time", { ascending: true });

  if (linesError) {
    return NextResponse.json(
      { error: "Failed to fetch lines." },
      { status: 500 },
    );
  }

  const result = {
    battle,
    participants: participants || [],
    lines: lines || [],
  };

  await setCached(cacheKey, result, 300); // 5 minutes

  return NextResponse.json(result);
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── CSRF Check ──
    if (!verifyCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    // 1. Check permission
    const { error: permError } = await requirePermission("battles:edit_status");
    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: permError.status },
      );
    }

    // 2. Parse body
    const body = await request.json();
    const { status } = body;

    const VALID_STATUSES = [
      "raw",
      "arranged",
      "reviewing",
      "reviewed",
      "excluded",
    ];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // 3. Update status using Admin Client to bypass RLS
    const supabaseAdmin = createAdminClient();
    const { data: updated, error } = await supabaseAdmin
      .from("battles")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Battle status update failed:", error);
      return NextResponse.json(
        { error: "Failed to update battle status." },
        { status: 500 },
      );
    }

    await invalidateCache(`battle:${id}`);
    await invalidateCachePattern("battles:page:*");

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/battles/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── CSRF Check ──
    if (!verifyCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    // 1. Check permission
    const { error: permError } = await requirePermission("battles:delete");
    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: permError.status },
      );
    }

    // 2. Mark as excluded and wipe heavy data using Admin Client
    const supabaseAdmin = createAdminClient();

    // First, clear the lines and participants (the heavy data)
    const { error: deleteLinesError } = await supabaseAdmin
      .from("lines")
      .delete()
      .eq("battle_id", id);
    if (deleteLinesError)
      console.error("Line deletion failed:", deleteLinesError);

    const { error: deletePartsError } = await supabaseAdmin
      .from("battle_participants")
      .delete()
      .eq("battle_id", id);
    if (deletePartsError)
      console.error("Participants deletion failed:", deletePartsError);

    // Then, update the status to 'excluded' so the pipeline skips it in the future
    const { error } = await supabaseAdmin
      .from("battles")
      .update({ status: "excluded" })
      .eq("id", id);

    if (error) {
      console.error("Battle exclusion failed:", error);
      return NextResponse.json(
        { error: "Failed to delete/exclude battle data." },
        { status: 500 },
      );
    }

    await invalidateCache(`battle:${id}`);
    await invalidateCachePattern("battles:page:*");

    return NextResponse.json({
      success: true,
      message: "Battle excluded and space cleared.",
    });
  } catch (err: any) {
    console.error("DELETE /api/battles/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
