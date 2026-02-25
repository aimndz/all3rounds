import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const adminClient = createAdminClient();

  // First, get the total count of lines
  const { count, error: countError } = await adminClient
    .from("lines")
    .select("*", { count: "exact", head: true });

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
  const { data, error } = await adminClient
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
      battle:battles (
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
  const { data: participants } = await adminClient
    .from("battle_participants")
    .select("label, emcee:emcees ( id, name )")
    .eq("battle_id", battle.id);

  // Handle single relation vs array (Supabase might return an array or object depending on relation)
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
