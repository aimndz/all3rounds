import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import {
  getCached,
  setCached,
  invalidateCache,
  invalidateCachePattern,
} from "@/lib/cache";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { sortParticipantsByTitle } from "@/features/battle/utils/participant-grouping";
import { z } from "zod";

const UpdateBattleSchema = z.object({
  status: z.enum(["raw", "arranged", "reviewing", "reviewed", "excluded"], {
    message: "Invalid status",
  }),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateRes = await checkRateLimit(`ip:${ip}:battle`, "anonymous");
  if (!rateRes.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { 
        status: 429,
        headers: {
          ...getRateLimitHeaders(rateRes),
          "Retry-After": "60",
        }
      }
    );
  }

  const cacheKey = `battle:${id}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
  }

  const supabase = await createClient();

  // Fetch battle details
  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .select("id, title, youtube_id, event_name, event_date, url, status")
    .eq("id", id)
    .single();

  if (battleError || !battle) {
    console.error("Battle fetch error:", battleError, "for ID:", id);
    return NextResponse.json(
      { error: "Battle not found.", details: battleError?.message },
      { status: 404 },
    );
  }

  const { data: rawParticipants } = await supabase
    .from("battle_participants")
    .select("label, emcee:emcees ( id, name, aka )")
    .eq("battle_id", id);

  const normalized = (rawParticipants ?? []).map((p) => ({
    ...p,
    emcee: Array.isArray(p.emcee) ? (p.emcee[0] ?? null) : p.emcee,
  }));

  const participants = sortParticipantsByTitle(normalized, battle.title ?? "");

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
      emcee_id,
      speaker_ids,
      emcee:emcees ( id, name )
    `,
    )
    .eq("battle_id", id)
    .order("start_time", { ascending: true });

  if (linesError) {
    console.error("Lines fetch error:", linesError);
    return NextResponse.json(
      { error: "Failed to fetch lines.", details: linesError.message },
      { status: 500 },
    );
  }

  // Create a map to look up emcee information locally if needed
  const emceeMap = new Map<string, { id: string; name: string }>();
  if (participants) {
    participants.forEach((p) => {
      if (p.emcee) {
        // Handle potential array return from supabase
        const e = Array.isArray(p.emcee) ? p.emcee[0] : p.emcee;
        emceeMap.set(e.id, e);
      }
    });
  }

  interface RawLine {
    id: number;
    content: string;
    start_time: number;
    end_time: number;
    round_number: number | null;
    speaker_label: string | null;
    emcee_id: string | null;
    speaker_ids: string[] | null;
    emcee: { id: string; name: string } | { id: string; name: string }[] | null;
  }

  // ── Transform Data for Frontend ──
  // We transform the flat line data into a structure that the frontend expects.
  // The 'speaker_ids' array tells us which emcees spoke this line.
  // We use the 'emceeMap' (built from battle_participants) to attach full emcee info.
  const transformedLines = (lines || []).map((line: RawLine) => {
    const mappedEmcees: { id: string; name: string }[] = [];

    // 1. Resolve multi-speakers via the 'speaker_ids' array
    if (line.speaker_ids && Array.isArray(line.speaker_ids)) {
      line.speaker_ids.forEach((id: string) => {
        const found = emceeMap.get(id);
        if (found) mappedEmcees.push(found);
      });
    }

    // 2. Identify single speaker (legacy/fallback) if speaker_ids is empty
    const fallbackEmcee = Array.isArray(line.emcee)
      ? line.emcee[0]
      : line.emcee;

    return {
      ...line,
      // The frontend uses the 'emcees' array for 2v2/multi-speaker display
      emcees:
        mappedEmcees.length > 0
          ? mappedEmcees
          : fallbackEmcee
            ? [fallbackEmcee]
            : [],
    };
  });

  const result = {
    battle,
    participants: participants || [],
    lines: transformedLines,
  };

  await setCached(cacheKey, result, 3600); // Cache for 1 hour

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
    },
  });
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = UpdateBattleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const { status } = parsed.data;

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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
    console.error("DELETE /api/battles/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
