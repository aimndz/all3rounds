import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("lines")
    .select("*, battle:battles!inner(status)", { count: "exact", head: true })
    .neq("battle.status", "raw");

  if (countError || !count) {
    console.error("Failed to get lines count:", countError);
    return NextResponse.json(
      { error: "Failed to fetch random line" },
      { status: 500 },
    );
  }

  // Pick a random offset
  const randomOffset = Math.floor(Math.random() * count);

  // Fetch the line at that offset
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
    .neq("battle.status", "raw")
    .range(randomOffset, randomOffset);

  if (error || !data || data.length === 0) {
    console.error("Failed to fetch random line:", error);
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
