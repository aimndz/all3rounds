import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch battle details
  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .select("id, title, youtube_id, event_name, event_date, url")
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

  return NextResponse.json({
    battle,
    participants: participants || [],
    lines: lines || [],
  });
}
