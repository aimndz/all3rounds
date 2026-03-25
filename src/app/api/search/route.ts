import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCached, setCached } from "@/lib/cache";
import type { SearchResult, BattleStatus } from "@/lib/types";

interface SearchRpcRow {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee_id: string | null;
  emcee_name: string | null;
  battle_id: string;
  battle_title: string;
  battle_youtube_id: string;
  battle_event_name: string | null;
  battle_event_date: string | null;
  battle_status: string;
  speaker_ids: string[] | null;
  rank: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!query || query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "Search query must be between 2 and 200 characters." },
      { status: 400 },
    );
  }

  const maxPage = 50;
  if (page > maxPage) {
    return NextResponse.json(
      { error: "Page number too large." },
      { status: 400 },
    );
  }

  // --- Cache check ---
  const cacheKey = `search:v2:${query.toLowerCase()}:${page}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
  }

  const supabase = await createClient();

  // --- Hybrid Search with Supabase RPC ---
  // Using .rpc() is Cloudflare-safe (HTTP-based) and avoids TCP pooling issues.
  let data: SearchRpcRow[] = [];
  let countRows = 0;

  try {
    const {
      data: searchData,
      error: searchError,
      count,
    } = await supabase
      .rpc("search_fast", { search_term: query }, { count: "exact" })
      .range(offset, offset + limit - 1);

    if (searchError) throw searchError;

    data = (searchData as SearchRpcRow[]) || [];
    countRows = count || 0;
  } catch (err: unknown) {
    console.error(`Search engine error:`, err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
  }

  // ── Construct Initial Result Structure ──
  const formattedData: SearchResult[] = data.map((row) => ({
    id: row.id,
    content: row.content,
    start_time: row.start_time,
    end_time: row.end_time,
    round_number: row.round_number,
    speaker_label: row.speaker_label,
    speaker_ids: row.speaker_ids,
    emcee: row.emcee_id
      ? { id: row.emcee_id, name: row.emcee_name || "Unknown" }
      : null,
    battle: {
      id: row.battle_id,
      title: row.battle_title,
      youtube_id: row.battle_youtube_id,
      event_name: row.battle_event_name,
      event_date: row.battle_event_date,
      status: row.battle_status as BattleStatus,
      url: `https://www.youtube.com/watch?v=${row.battle_youtube_id}`,
      participants: [],
    },
    rank: row.rank,
    prev_line: undefined,
    next_line: undefined,
    emcees: [],
  }));

  // ── Batch Fetch Remaining Data (Emcees, Participants, Context) ──
  try {
    if (formattedData.length > 0) {
      const uniqueEmceeIds = new Set<string>();
      formattedData.forEach((row) => {
        row.speaker_ids?.forEach((id) => uniqueEmceeIds.add(id));
        if (row.emcee?.id && row.emcee.name === "Unknown") {
          uniqueEmceeIds.add(row.emcee.id);
        }
      });

      const uniqueBattleIds = Array.from(
        new Set(formattedData.map((row) => row.battle.id)),
      );

      const contextLineIds = Array.from(
        new Set(formattedData.flatMap((row) => [row.id - 1, row.id + 1])),
      );

      interface ParticipantRow {
        battle_id: string;
        label: string;
        emcee:
          | { id: string; name: string }
          | { id: string; name: string }[]
          | null;
      }

      interface LineRow {
        id: number;
        content: string;
        battle_id: string;
        speaker_label: string | null;
        round_number: number | null;
      }

      const [emceesResult, participantsResult, contextResult] =
        await Promise.all([
          uniqueEmceeIds.size > 0
            ? supabase
                .from("emcees")
                .select("id, name")
                .in("id", Array.from(uniqueEmceeIds))
            : Promise.resolve({
                data: [] as { id: string; name: string }[] | null,
              }),

          uniqueBattleIds.length > 0
            ? supabase
                .from("battle_participants")
                .select("battle_id, label, emcee:emcees(id, name)")
                .in("battle_id", uniqueBattleIds)
            : Promise.resolve({ data: [] as ParticipantRow[] | null }),

          contextLineIds.length > 0
            ? supabase
                .from("lines")
                .select("id, content, battle_id, speaker_label, round_number")
                .in("id", contextLineIds)
            : Promise.resolve({ data: [] as LineRow[] | null }),
        ]);

      const emceesData = emceesResult.data || [];
      const participantsData =
        (participantsResult.data as unknown as ParticipantRow[]) || [];
      const contextData = (contextResult.data as unknown as LineRow[]) || [];

      if (emceesData.length > 0) {
        const emceeMap = new Map(emceesData.map((e) => [e.id, e]));
        formattedData.forEach((row) => {
          if (row.emcee && row.emcee.name === "Unknown") {
            const e = emceeMap.get(row.emcee.id);
            if (e) row.emcee.name = e.name;
          }

          const resolved: { id: string; name: string }[] = [];
          row.speaker_ids?.forEach((id) => {
            const e = emceeMap.get(id);
            if (e) resolved.push(e);
          });
          if (resolved.length === 0 && row.emcee) {
            resolved.push(row.emcee);
          }
          row.emcees = resolved;
        });
      }

      if (participantsData.length > 0) {
        const participantMap = new Map<
          string,
          { label: string; emcee: { id: string; name: string } | null }[]
        >();
        participantsData.forEach((p) => {
          if (!participantMap.has(p.battle_id))
            participantMap.set(p.battle_id, []);

          const emceeObj = Array.isArray(p.emcee) ? p.emcee[0] : p.emcee;
          participantMap.get(p.battle_id)?.push({
            label: p.label,
            emcee: (emceeObj as { id: string; name: string }) || null,
          });
        });
        formattedData.forEach((row) => {
          row.battle.participants = participantMap.get(row.battle.id) || [];
        });
      }

      if (contextData.length > 0) {
        const contextMap = new Map(contextData.map((line) => [line.id, line]));
        formattedData.forEach((row) => {
          const prev = contextMap.get(row.id - 1);
          if (prev && prev.battle_id === row.battle.id) {
            row.prev_line = {
              id: prev.id,
              content: prev.content,
              speaker_label: prev.speaker_label,
              round_number: prev.round_number,
            };
          }
          const next = contextMap.get(row.id + 1);
          if (next && next.battle_id === row.battle.id) {
            row.next_line = {
              id: next.id,
              content: next.content,
              speaker_label: next.speaker_label,
              round_number: next.round_number,
            };
          }
        });
      }
    }
  } catch (subError) {
    console.error("[SEARCH] Secondary fetch failed:", subError);
  }

  const result = {
    results: formattedData,
    total: countRows,
    page,
    totalPages: Math.ceil(countRows / limit),
  };

  await setCached(cacheKey, result, 3600);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
    },
  });
}
