import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSearchTokens, scoreBattle } from "@/lib/fuzzy-utils";

const OTHER_BATTLES_KEY = "Other Battles";

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
  eq: (column: string, value: string) => FilterableQuery;
  in: (column: string, value: string[]) => FilterableQuery;
  gte: (column: string, value: string) => FilterableQuery;
  lte: (column: string, value: string) => FilterableQuery;
};

const PUBLIC_BATTLE_STATUSES = ["raw", "arranged", "reviewing", "reviewed"];

function getEventKey(battle: Pick<BattleRow, "event_name">): string {
  return battle.event_name || OTHER_BATTLES_KEY;
}

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

function getOrderedEventKeys(
  rows: { event_name: string | null; event_date: string | null; score?: number }[],
  cleanSort: string,
  isSearch: boolean = false,
): string[] {
  const meta = new Map<
    string,
    { maxScore: number; minDate: number; maxDate: number }
  >();

  for (const row of rows) {
    const key = row.event_name || OTHER_BATTLES_KEY;
    const date = row.event_date ? new Date(row.event_date).getTime() : 0;
    const score = row.score || 0;
    const current = meta.get(key) || {
      maxScore: -Infinity,
      minDate: Infinity,
      maxDate: -Infinity,
    };

    if (score > current.maxScore) current.maxScore = score;
    if (date < current.minDate) current.minDate = date;
    if (date > current.maxDate) current.maxDate = date;
    meta.set(key, current);
  }

  return Array.from(meta.entries())
    .sort((a, b) => {
      if (isSearch && b[1].maxScore !== a[1].maxScore) {
        return b[1].maxScore - a[1].maxScore;
      }
      const dateA = cleanSort === "oldest" ? a[1].minDate : a[1].maxDate;
      const dateB = cleanSort === "oldest" ? b[1].minDate : b[1].maxDate;

      if (dateA !== dateB) {
        return cleanSort === "oldest" ? dateA - dateB : dateB - dateA;
      }
      return a[0].localeCompare(b[0]);
    })
    .map(([key]) => key);
}

function applyCommonFilters<T>(
  query: T,
  cleanStatus: string,
  cleanYear: string,
): T {
  let next = (query as unknown as FilterableQuery).in(
    "status",
    PUBLIC_BATTLE_STATUSES,
  );

  if (cleanStatus !== "all") {
    next = next.eq("status", cleanStatus);
  }

  if (cleanYear !== "all") {
    next = next
      .gte("event_date", `${cleanYear}-01-01`)
      .lte("event_date", `${cleanYear}-12-31`);
  }

  return next as unknown as T;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const year = searchParams.get("year") || "all";
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

  // Normalize parameters to prevent cache key pollution
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
  const cleanSort = sort === "oldest" ? "oldest" : "latest";

  // --- Early return for invalid status ---
  if (cleanStatus === "invalid") {
    return NextResponse.json({ battles: [], count: 0, totalEvents: 0 });
  }

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

          const orderedEventKeys = getOrderedEventKeys(
            scored.map((s) => ({ ...s.battle, score: s.score })),
            cleanSort,
            true,
          );

          totalEvents = orderedEventKeys.length;
          const effectivePage = getEffectivePage(page, totalEvents, eventLimit);
          const pageEventKeys = paginateEventKeys(
            orderedEventKeys,
            effectivePage,
            eventLimit,
          );
          const pageSet = new Set(pageEventKeys);
          const keyOrder = new Map(pageEventKeys.map((key, idx) => [key, idx]));

          data = scored
            .filter(({ battle }: ScoredBattle) =>
              pageSet.has(getEventKey(battle)),
            )
            .map(({ battle, score }: ScoredBattle) => ({ ...battle, score }))
            .sort((a: BattleRow, b: BattleRow) => {
              const groupA =
                keyOrder.get(getEventKey(a)) ?? Number.MAX_SAFE_INTEGER;
              const groupB =
                keyOrder.get(getEventKey(b)) ?? Number.MAX_SAFE_INTEGER;

              if (groupA !== groupB) {
                return groupA - groupB;
              }

              if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
              }

              const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
              const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
              return cleanSort === "oldest" ? dateA - dateB : dateB - dateA;
            });
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
        ),
        applyCommonFilters(
          supabase
            .from("battles")
            .select("event_name, event_date")
            .limit(10000),
          cleanStatus,
          cleanYear,
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
      const orderedEventKeys = getOrderedEventKeys(eventRows, cleanSort, false);

      totalEvents = orderedEventKeys.length;
      const effectivePage = getEffectivePage(page, totalEvents, eventLimit);
      const pageEventKeys = paginateEventKeys(
        orderedEventKeys,
        effectivePage,
        eventLimit,
      );
      const includeOtherBattles = pageEventKeys.includes(OTHER_BATTLES_KEY);
      const namedEvents = pageEventKeys.filter(
        (key) => key !== OTHER_BATTLES_KEY,
      );

      if (pageEventKeys.length === 0) {
        data = [];
      } else {
        const orConditions = [];
        if (namedEvents.length > 0) {
          // Wrap event names in parentheses and quote them for Supabase .in() equivalent in .or()
          const inList = namedEvents
            .map((name) => `"${name.replace(/"/g, '""')}"`)
            .join(",");
          orConditions.push(`event_name.in.(${inList})`);
        }
        if (includeOtherBattles) {
          orConditions.push(`event_name.is.null`);
        }

        const battlesResponse = await applyCommonFilters(
          supabase
            .from("battles")
            .select(
              "id, league, slug, title, youtube_id, event_name, event_date, status, url",
            )
            .or(orConditions.join(",")),
          cleanStatus,
          cleanYear,
        ).order("event_date", {
          ascending: cleanSort === "oldest",
          nullsFirst: false,
        });

        if (battlesResponse.error) {
          error = battlesResponse.error;
        }

        const order = new Map(pageEventKeys.map((key, idx) => [key, idx]));
        data = (battlesResponse.data || []).sort((a: BattleRow, b: BattleRow) => {
          const keyA = getEventKey(a);
          const keyB = getEventKey(b);
          const groupA = order.get(keyA) ?? Number.MAX_SAFE_INTEGER;
          const groupB = order.get(keyB) ?? Number.MAX_SAFE_INTEGER;

          if (groupA !== groupB) {
            return groupA - groupB;
          }

          const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
          const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
          return cleanSort === "oldest" ? dateA - dateB : dateB - dateA;
        });
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

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
  } catch (error) {
    console.error("Battles fetch route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles." },
      { status: 500 },
    );
  }
}
