import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  isMeilisearchConfigured,
  searchMeilisearchLines,
} from "@/lib/meilisearch/server";
import { parseSearchQuery } from "@/lib/search-query";
import type { SearchResult, BattleStatus, SearchQueryMeta } from "@/lib/types";

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

type SearchRpcName = "search_fast" | "search_lines_filtered";
type PublicSupabaseClient = ReturnType<typeof createPublicClient>;

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

const SEARCH_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=59",
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

async function searchWithSupabase(params: {
  supabase: PublicSupabaseClient;
  text: string;
  hasStructuredFilters: boolean;
  appliedFilters: SearchQueryMeta["appliedFilters"];
  offset: number;
  limit: number;
}): Promise<{ data: SearchRpcRow[]; countRows: number }> {
  const rpcName: SearchRpcName = params.hasStructuredFilters
    ? "search_lines_filtered"
    : "search_fast";
  const rpcArgs = params.hasStructuredFilters
    ? {
        search_term: params.text || null,
        p_emcee_name: params.appliedFilters.emcee || null,
        p_battle_term: params.appliedFilters.battle || null,
        p_event_term: params.appliedFilters.event || null,
      }
    : { search_term: params.text };

  const {
    data: searchData,
    error: searchError,
    count,
  } = await params.supabase
    .rpc(rpcName, rpcArgs, { count: "exact" })
    .range(params.offset, params.offset + params.limit - 1);

  if (searchError) {
    throw searchError;
  }

  return {
    data: (searchData as SearchRpcRow[]) || [],
    countRows: typeof count === "number" ? count : 0,
  };
}

async function searchWithMeilisearch(params: {
  text: string;
  appliedFilters: SearchQueryMeta["appliedFilters"];
  page: number;
  limit: number;
}): Promise<{ data: SearchRpcRow[]; countRows: number }> {
  const response = await searchMeilisearchLines({
    text: params.text,
    appliedFilters: params.appliedFilters,
    page: params.page,
    limit: params.limit,
  });

  return {
    data: response.hits.map((row) => ({
      id: row.id,
      content: row.content,
      start_time: row.start_time,
      end_time: row.end_time,
      round_number: row.round_number,
      speaker_label: row.speaker_label,
      emcee_id: row.emcee_id,
      emcee_name: row.emcee_name,
      battle_id: row.battle_id,
      battle_title: row.battle_title,
      battle_youtube_id: row.battle_youtube_id,
      battle_event_name: row.battle_event_name,
      battle_event_date: row.battle_event_date,
      battle_status: row.battle_status,
      speaker_ids: row.speaker_ids,
      rank: row._rankingScore ?? 0,
    })),
    countRows: response.total,
  };
}

function formatSearchResults(data: SearchRpcRow[]): SearchResult[] {
  return data.map((row) => ({
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
}

async function hydrateSearchResults(
  supabase: PublicSupabaseClient,
  formattedData: SearchResult[],
) {
  if (formattedData.length === 0) {
    return;
  }

  const uniqueBattleIds = Array.from(
    new Set(formattedData.map((row) => row.battle.id)),
  );
  const contextLineIds = Array.from(
    new Set(formattedData.flatMap((row) => [row.id - 1, row.id + 1])),
  );

  const [participantsResult, contextResult] = await Promise.all([
    uniqueBattleIds.length > 0
      ? supabase
          .from("battle_participants")
          .select("battle_id, label, emcee:emcees(id, name)")
          .in("battle_id", uniqueBattleIds)
      : Promise.resolve({
          data: [] as ParticipantRow[] | null,
          error: null,
        }),

    contextLineIds.length > 0
      ? supabase
          .from("lines")
          .select("id, content, battle_id, speaker_label, round_number")
          .in("id", contextLineIds)
      : Promise.resolve({ data: [] as LineRow[] | null, error: null }),
  ]);

  const participantsData =
    (participantsResult.data as unknown as ParticipantRow[]) || [];
  const contextData = (contextResult.data as unknown as LineRow[]) || [];

  const emceeMap = new Map<string, { id: string; name: string }>();

  if (participantsData.length > 0) {
    const participantMap = new Map<
      string,
      { label: string; emcee: { id: string; name: string } | null }[]
    >();

    participantsData.forEach((participant) => {
      if (!participantMap.has(participant.battle_id)) {
        participantMap.set(participant.battle_id, []);
      }

      const emceeObj = Array.isArray(participant.emcee)
        ? participant.emcee[0]
        : participant.emcee;

      if (emceeObj) {
        emceeMap.set(emceeObj.id, emceeObj);
      }

      participantMap.get(participant.battle_id)?.push({
        label: participant.label,
        emcee: (emceeObj as { id: string; name: string }) || null,
      });
    });

    formattedData.forEach((row) => {
      row.battle.participants = participantMap.get(row.battle.id) || [];
    });
  }

  formattedData.forEach((row) => {
    if (row.emcee) {
      const known = emceeMap.get(row.emcee.id);
      if (known && row.emcee.name === "Unknown") {
        row.emcee.name = known.name;
      }
    }

    const resolved: { id: string; name: string }[] = [];
    row.speaker_ids?.forEach((speakerId) => {
      const known = emceeMap.get(speakerId);
      if (known) {
        resolved.push(known);
      }
    });

    if (resolved.length === 0 && row.emcee) {
      resolved.push(row.emcee);
    }

    row.emcees = resolved;
  });

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
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const maxPage = 50;
  if (page > maxPage) {
    return NextResponse.json(
      { error: "Page number too large." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsedQuery = parseSearchQuery(query);
  if (!parsedQuery.hasSearchIntent) {
    return NextResponse.json(
      { error: "Search query must include text or a filter value." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const supabase = createPublicClient();

  let data: SearchRpcRow[] = [];
  let countRows = 0;
  let activeBackend: "meilisearch" | "supabase" = "supabase";

  try {
    if (isMeilisearchConfigured()) {
      const meiliResult = await searchWithMeilisearch({
        text: parsedQuery.text,
        appliedFilters: parsedQuery.appliedFilters,
        page,
        limit,
      });
      data = meiliResult.data;
      countRows = meiliResult.countRows;
      activeBackend = "meilisearch";
    } else {
      const supabaseResult = await searchWithSupabase({
        supabase,
        text: parsedQuery.text,
        hasStructuredFilters: parsedQuery.hasStructuredFilters,
        appliedFilters: parsedQuery.appliedFilters,
        offset,
        limit,
      });
      data = supabaseResult.data;
      countRows = supabaseResult.countRows;
    }
  } catch (err: unknown) {
    if (isMeilisearchConfigured()) {
      console.error("[SEARCH] Meilisearch failed, falling back to Supabase.", err);

      try {
        const fallbackResult = await searchWithSupabase({
          supabase,
          text: parsedQuery.text,
          hasStructuredFilters: parsedQuery.hasStructuredFilters,
          appliedFilters: parsedQuery.appliedFilters,
          offset,
          limit,
        });
        data = fallbackResult.data;
        countRows = fallbackResult.countRows;
        activeBackend = "supabase";
      } catch (fallbackError) {
        console.error("[SEARCH] Supabase fallback failed.", fallbackError);
        return NextResponse.json(
          { error: "Search failed. Please try again." },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    } else {
      console.error("[SEARCH] Search engine error:", err);
      return NextResponse.json(
        { error: "Search failed. Please try again." },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
  }

  // â”€â”€ Construct Initial Result Structure â”€â”€
  const formattedData = formatSearchResults(data);

  // â”€â”€ Batch Fetch Remaining Data (Emcees, Participants, Context) â”€â”€
  try {
    await hydrateSearchResults(supabase, formattedData);
  } catch (subError) {
    console.error("[SEARCH] Secondary fetch failed:", subError);
  }

  const responseQuery: SearchQueryMeta = {
    text: parsedQuery.text,
    appliedFilters: parsedQuery.appliedFilters,
  };

  const result = {
    results: formattedData,
    total: countRows,
    page,
    totalPages: Math.ceil(countRows / limit),
    query: responseQuery,
  };

  return NextResponse.json(result, {
    headers: {
      ...SEARCH_CACHE_HEADERS,
      "X-Search-Backend": activeBackend,
    },
  });
}

