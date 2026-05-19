import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import type { SearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 6;
const MAX_BATCH_SIZE = 12;
const RANDOM_ELIGIBLE_STATUSES = ["reviewing"] as const;
const ELIGIBLE_STATUS_SET = new Set<string>(RANDOM_ELIGIBLE_STATUSES);

type RawRandomLine = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  battle:
    | {
        id: string;
        league: string;
        slug: string;
        title: string;
        youtube_id: string;
        event_name: string | null;
        event_date: string | null;
        url: string;
        status: string;
        battle_participants?: {
          label: string;
          emcee:
            | { id: string; name: string }
            | { id: string; name: string }[]
            | null;
        }[];
      }
    | {
        id: string;
        league: string;
        slug: string;
        title: string;
        youtube_id: string;
        event_name: string | null;
        event_date: string | null;
        url: string;
        status: string;
        battle_participants?: {
          label: string;
          emcee:
            | { id: string; name: string }
            | { id: string; name: string }[]
            | null;
        }[];
      }[]
    | null;
};

function parseLimit(request: NextRequest) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const parsed = Number.parseInt(limitParam || `${DEFAULT_BATCH_SIZE}`, 10);

  if (Number.isNaN(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(Math.max(parsed, 1), MAX_BATCH_SIZE);
}

function normalizeRandomLine(rawLine: RawRandomLine): SearchResult | null {
  const battle = Array.isArray(rawLine.battle)
    ? rawLine.battle[0]
    : rawLine.battle;

  if (!battle || !ELIGIBLE_STATUS_SET.has(battle.status)) {
    return null;
  }

  const participants = (battle.battle_participants || []).map((participant) => ({
    label: participant.label,
    emcee: Array.isArray(participant.emcee)
      ? (participant.emcee[0] ?? null)
      : participant.emcee,
  }));

  return {
    id: rawLine.id,
    content: rawLine.content,
    start_time: rawLine.start_time,
    end_time: rawLine.end_time,
    round_number: rawLine.round_number,
    speaker_label: rawLine.speaker_label,
    emcee: Array.isArray(rawLine.emcee) ? rawLine.emcee[0] : rawLine.emcee,
    battle: {
      id: battle.id,
      league: battle.league,
      slug: battle.slug,
      title: battle.title,
      youtube_id: battle.youtube_id,
      event_name: battle.event_name,
      event_date: battle.event_date,
      url: battle.url,
      status: battle.status as SearchResult["battle"]["status"],
      participants,
    },
  };
}

export async function GET(request: NextRequest) {
  const supabase = createPublicClient();
  const limit = parseLimit(request);

  const { data: randomRows, error: randomError } = await supabase.rpc(
    "get_random_valid_line_ids",
    {
      sample_size: limit,
      allowed_statuses: [...RANDOM_ELIGIBLE_STATUSES],
    },
  );

  if (randomError) {
    console.error("Failed to get random line IDs:", randomError);
    return NextResponse.json(
      { error: "Failed to fetch random lines" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const randomLineIds = Array.from(
    new Set(
      (((randomRows || []) as { id: number | null }[]) || [])
        .map((row) => row.id)
        .filter((id): id is number => Number.isInteger(id)),
    ),
  );

  if (randomLineIds.length === 0) {
    return NextResponse.json(
      { error: "No eligible random lines available" },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

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
        league,
        slug,
        title,
        youtube_id,
        event_name,
        event_date,
        url,
        status,
        battle_participants (
          label,
          emcee:emcees ( id, name )
        )
      )
    `,
    )
    .in("id", randomLineIds);

  if (error) {
    console.error("Failed to fetch random line data:", error);
    return NextResponse.json(
      { error: "Failed to fetch random lines" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const normalizedLines = ((data || []) as RawRandomLine[])
    .map((rawLine) => normalizeRandomLine(rawLine))
    .filter((line: SearchResult | null): line is SearchResult => line !== null);

  const lineMap = new Map<number, SearchResult>(
    normalizedLines.map((line: SearchResult) => [line.id, line]),
  );

  const lines = randomLineIds
    .map((id) => lineMap.get(id))
    .filter((line): line is SearchResult => line !== undefined);

  if (lines.length === 0) {
    return NextResponse.json(
      { error: "No eligible random lines available" },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    { line: lines[0], lines },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    },
  );
}
