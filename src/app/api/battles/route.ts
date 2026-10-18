import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasOnlySearchParams } from "@/lib/api-utils";
import { parseSearchTokens, scoreBattle } from "@/lib/fuzzy-utils";
import { normalizeBattleLeague, PUBLIC_BATTLE_STATUSES } from "@/lib/battles";
import {
  getOrderedBattleEventKeys,
  orderBattlesByEventKeys,
} from "@/lib/battle-events";
import { buildBattleEventFilter } from "@/lib/postgrest";
import {
  buildPublicApiCacheKey,
  matchPublicApiCache,
  storePublicApiCache,
} from "@/lib/public-api-cache";

type BattleRow = {
  id: string;
  league: string;
  slug: string;
  title: string;
  youtube_id: string;
  event_name: string | null;
  event_date: string | null;
  status: "raw" | "arranged" | "reviewing" | "reviewed";
  url: string;
  score?: number;
};

type ScoredBattle = {
  battle: BattleRow;
  score: number;
};

type FilterableQuery = {
  neq: (column: string, value: string) => FilterableQuery;
  eq: (column: string, value: unknown) => FilterableQuery;
  in: (column: string, value: string[]) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
};

function paginateEventKeys(
  eventKeys: string[],
  page: number,
  eventLimit: number,
): string[] {
  const start = (page - 1) * eventLimit;
  return eventKeys.slice(start, start + eventLimit);
}

function getEffectivePage(
  page: number,
  totalEvents: number,
  eventLimit: number,
): number {
  const totalPages = Math.max(1, Math.ceil(totalEvents / eventLimit));
  return Math.min(Math.max(1, page), totalPages);
}

function applyCommonFilters<T>(
  query: T,
  cleanStatus: string,
  cleanYear: string,
  cleanLeague: string,
): T {
  let next = (query as unknown as FilterableQuery).in(
    "status",
    PUBLIC_BATTLE_STATUSES,
  );
  next = next.eq("public_visible", true);

  if (cleanStatus !== "all") {
    next = next.eq("status", cleanStatus);
  }

  if (cleanYear !== "all") {
    next = next
      .gte("event_date", `${cleanYear}-01-01`)
      .lte("event_date", `${cleanYear}-12-31`);
  }

  if (cleanLeague !== "all") {
    next = next.eq("league", cleanLeague);
  }

  return next as unknown as T;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (
    !hasOnlySearchParams(searchParams, [
      "q",
      "year",
      "league",
      "sort",
      "page",
      "eventLimit",
      "limit",
      "status",
    ])
  ) {
    return NextResponse.json(
      { error: "Unsupported query parameter." },
      { status: 400 },
    );
  }

  const q = searchParams.get("q") || "";
  const year = searchParams.get("year") || "all";
  const rawLeague = searchParams.get("league") || "all";
  const sort = searchParams.get("sort") || "latest";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const eventLimit = Math.min(
    Math.max(
      1,
      parseInt(
        searchParams.get("eventLimit") || searchParams.get("limit") || "5",
        10,
      ),
    ),
    20,
  );

  // Normalize parameters to prevent cache key pollution.
  const cleanQ = q.trim().toLowerCase().slice(0, 100);
  const validStatuses = [
    "raw",
    "arranged",
    "reviewing",
    "reviewed",
    "excluded",
  ];
  const rawStatus = (searchParams.get("status") || "all").toLowerCase();
  const cleanStatus = validStatuses.includes(rawStatus)
    ? rawStatus
    : rawStatus === "all"
      ? "all"
      : "invalid";
  const cleanYear = /^\d{4}$/.test(year) ? year : "all";
  const cleanLeague =
    rawLeague.toLowerCase() === "all"
      ? "all"
      : normalizeBattleLeague(rawLeague).slice(0, 64);
  const cleanSort = sort === "oldest" ? "oldest" : "latest";

  // --- Early return for invalid status ---
  if (cleanStatus === "invalid") {
    return NextResponse.json({ battles: [], count: 0, totalEvents: 0 });
  }

  const cacheParams = new URLSearchParams({
    page: String(page),
    eventLimit: String(eventLimit),
    sort: cleanSort,
    status: cleanStatus,
  });
  if (cleanQ) cacheParams.set("q", cleanQ);
  if (cleanYear !== "all") cacheParams.set("year", cleanYear);
  if (cleanLeague !== "all") cacheParams.set("league", cleanLeague);

  const cacheKey = buildPublicApiCacheKey(
    request,
    "/api/battles",
    cacheParams,
  );
  const cachedResponse = await matchPublicApiCache(request, cacheKey);
  if (cachedResponse) return cachedResponse;

  // --- Database Fetch ---
  try {
    const supabase = await createClient();

    let data, error, count;
    let totalEvents = 0;

    if (cleanQ) {
      // 1. Parse search query into meaningful tokens (stripping "vs", etc.)
      const tokens = parseSearchTokens(cleanQ);

      if (tokens.length === 0) {
        data = [];
        count = 0;
      } else {
        // 2. Broad Candidate Fetch
        let query = applyCommonFilters(
          supabase
            .from("battles")
            .select(
              "id, league, slug, title, youtube_id, event_name, event_date, status, url",
            ),
          cleanStatus,
          cleanYear,
          cleanLeague,
        );

        // Combine all tokens into a single OR query for efficiency
        const orConditions = tokens
          .map((token) => {
            const safeToken = token.replace(/%/g, "\\%").replace(/_/g, "\\_");
            return `title.ilike.%${safeToken}%,event_name.ilike.%${safeToken}%`;
          })
          .join(",");

        // Increased candidate limit to 1000 to allow finding more events in search
        query = query.or(orConditions).limit(1000);

        const broadResult = await query;
        if (broadResult.error) {
          error = broadResult.error;
        } else {
          // 3. Precision Scoring & Re-ranking
          const candidates = (broadResult.data || []) as BattleRow[];

          const scored: ScoredBattle[] = candidates
            .map((battle: BattleRow) => ({
              battle,
              score: scoreBattle(battle, tokens),
            }))
            .filter((b: ScoredBattle) => b.score > 0)
            .sort((a: ScoredBattle, b: ScoredBattle) => {
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              const dateA = a.battle.event_date
                ? new Date(a.battle.event_date).getTime()
                : 0;
              const dateB = b.battle.event_date
                ? new Date(b.battle.event_date).getTime()
                : 0;
              if (cleanSort === "oldest") return dateA - dateB;
              return dateB - dateA;
            });

          count = scored.length;

          const orderedEventKeys = getOrderedBattleEventKeys(
            scored.map((s) => ({ ...s.battle, score: s.score })),
            cleanSort === "oldest" ? "oldest" : "latest",
            { scoreFirst: true },
          );

          totalEvents = orderedEventKeys.length;
          const effectivePage = getEffectivePage(page, totalEvents, eventLimit);
          const pageEventKeys = paginateEventKeys(
            orderedEventKeys,
            effectivePage,
            eventLimit,
          );
          data = orderBattlesByEventKeys(
            scored.map(({ battle, score }) => ({ ...battle, score })),
            pageEventKeys,
            cleanSort === "oldest" ? "oldest" : "latest",
            { scoreFirst: true },
          );
        }
      }
    } else {
      // Fetch data with a high limit to ensure all unique events are found
      // across all battles, bypassing PostgREST pagination defaults.
      const [countResponse, eventsMetaResponse] = await Promise.all([
        applyCommonFilters(
          supabase.from("battles").select("id", { count: "exact", head: true }),
          cleanStatus,
          cleanYear,
          cleanLeague,
        ),
        applyCommonFilters(
          supabase
            .from("battles")
            .select("event_name, event_date, league")
            .limit(10000),
          cleanStatus,
          cleanYear,
          cleanLeague,
        ),
      ]);

      if (countResponse.error) {
        error = countResponse.error;
      }
      if (eventsMetaResponse.error) {
        error = eventsMetaResponse.error;
      }

      count = countResponse.count || 0;

      const eventRows = eventsMetaResponse.data || [];
      const orderedEventKeys = getOrderedBattleEventKeys(
        eventRows,
        cleanSort === "oldest" ? "oldest" : "latest",
      );

      totalEvents = orderedEventKeys.length;
      const effectivePage = getEffectivePage(page, totalEvents, eventLimit);
      const pageEventKeys = paginateEventKeys(
        orderedEventKeys,
        effectivePage,
        eventLimit,
      );
      if (pageEventKeys.length === 0) {
        data = [];
      } else {
        const battlesResponse = await applyCommonFilters(
          supabase
            .from("battles")
            .select(
              "id, league, slug, title, youtube_id, event_name, event_date, status, url",
            )
            .or(buildBattleEventFilter(pageEventKeys)),
          cleanStatus,
          cleanYear,
          cleanLeague,
        ).order("event_date", {
          ascending: cleanSort === "oldest",
          nullsFirst: false,
        });

        if (battlesResponse.error) {
          error = battlesResponse.error;
        }

        data = orderBattlesByEventKeys(
          (battlesResponse.data as BattleRow[] | null | undefined) || [],
          pageEventKeys,
          cleanSort === "oldest" ? "oldest" : "latest",
        );
      }
    }

    if (error) {
      console.error("DB Fetch Error:", error);
      throw error;
    }

    const payload = {
      battles: data || [],
      count: count || 0,
      totalEvents,
    };

    const response = NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
    return storePublicApiCache(request, cacheKey, response);
  } catch (error) {
    console.error("Battles fetch route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles." },
      { status: 500 },
    );
  }
}
