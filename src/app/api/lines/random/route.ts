import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // Completely disable caching for this route

export async function GET() {
  const supabase = await createClient();

  // 1. Get a random valid line ID instantly using the Postgres function
  const { data: randomLineId, error: randomError } = await supabase
    .rpc("get_random_valid_line_id");

  if (randomError || !randomLineId) {
    console.error("Failed to get random line ID:", randomError);
    return NextResponse.json(
      { error: "Failed to fetch random line ID" },
      { status: 500 },
    );
  }

  // 2. Fetch the full nested data for that exact ID
  const { data, error } = await supabase
    .from("lines")
    .select(
      `
      id,
      content,
      start_time,
      end_time,
      round_number,
      speaker_label,
      emcee:emcees (
        id,
        name
      ),
      battle:battles!inner (
        id,
        title,
        youtube_id,
        event_name,
        event_date,
        url,
        status
      )
    `,
    )
    .eq("id", randomLineId);

  if (error || !data || data.length === 0) {
    console.error("Failed to fetch random line data:", error);
    return NextResponse.json(
      { error: "Failed to fetch random line" },
      { status: 500 },
    );
  }

  const rawLine = data[0];
  const battle = Array.isArray(rawLine.battle)
    ? rawLine.battle[0]
    : rawLine.battle;

  // Fetch battle participants
  const { data: participants } = await supabase
    .from("battle_participants")
    .select("label, emcee:emcees ( id, name )")
    .eq("battle_id", battle.id);

  const line = {
    ...rawLine,
    emcee: Array.isArray(rawLine.emcee) ? rawLine.emcee[0] : rawLine.emcee,
    battle: {
      ...battle,
      participants: participants || [],
    },
  };

  return NextResponse.json({ line });
}
