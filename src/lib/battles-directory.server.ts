import type { Battle } from "@/features/battles/hooks/use-battles-data";
import { createPublicClient } from "@/lib/supabase/server";
import {
  getUniqueBattleLeagues,
  normalizeBattleLeague,
  PUBLIC_BATTLE_STATUSES,
} from "@/lib/battles";

const INITIAL_EVENTS_PER_PAGE = 5;
const OTHER_BATTLES_KEY = "Other Battles";

export type BattleDirectoryData = {
  initialBattles: Battle[];
  initialCount: number;
  initialTotalEvents: number;
  initialYears: string[];
  initialEventNames: string[];
  initialAvailableLeagues: string[];
};

export type BattleDirectoryOptions = {
  league?: string;
  sort?: "latest" | "oldest";
  initialCount?: number;
};

export async function getBattleDirectoryData(
  options: BattleDirectoryOptions = {},
): Promise<BattleDirectoryData> {
  const sort = options.sort === "oldest" ? "oldest" : "latest";
  const league = options.league ? normalizeBattleLeague(options.league) : "all";
  const supabase = createPublicClient();

  const countQuery =
    options.initialCount === undefined
      ? supabase
          .from("battles")
          .select("id", { count: "exact", head: true })
          .in("status", PUBLIC_BATTLE_STATUSES)
          .eq("public_visible", true)
      : Promise.resolve({ count: options.initialCount });
  let eventsMetaBaseQuery = supabase
    .from("battles")
    .select("event_name, event_date, league")
    .in("status", PUBLIC_BATTLE_STATUSES)
    .eq("public_visible", true);

  if (league !== "all") {
    eventsMetaBaseQuery = eventsMetaBaseQuery.eq("league", league);
  }

  const eventsMetaQuery = eventsMetaBaseQuery
    .order("event_date", { ascending: sort === "oldest" })
    .limit(5000);

  const leaguesQuery =
    league === "all"
      ? supabase
          .from("battles")
          .select("league")
          .in("status", PUBLIC_BATTLE_STATUSES)
          .eq("public_visible", true)
          .limit(10000)
      : Promise.resolve({ data: [{ league }], error: null });

  const [{ count: initialCount }, eventsMetaResponse, leaguesResponse] =
    await Promise.all([countQuery, eventsMetaQuery, leaguesQuery]);

  if (eventsMetaResponse.error) {
    console.error(
      "Error fetching battles event metadata on server:",
      eventsMetaResponse.error,
    );
  }

  const allEventRows = eventsMetaResponse.data || [];
  const eventMeta = new Map<string, { min: number; max: number }>();

  for (const row of allEventRows) {
    const key = row.event_name || OTHER_BATTLES_KEY;
    const date = row.event_date ? new Date(row.event_date).getTime() : 0;
    const current = eventMeta.get(key) || {
      min: Infinity,
      max: -Infinity,
    };

    if (date < current.min) current.min = date;
    if (date > current.max) current.max = date;
    eventMeta.set(key, current);
  }

  const orderedEventNames = Array.from(eventMeta.entries())
    .sort((a, b) => {
      const dateA = sort === "oldest" ? a[1].min : a[1].max;
      const dateB = sort === "oldest" ? b[1].min : b[1].max;

      if (dateA !== dateB) {
        return sort === "oldest" ? dateA - dateB : dateB - dateA;
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([name]) => name);

  const initialTotalEvents = orderedEventNames.length;
  const firstPageEventNames = orderedEventNames.slice(
    0,
    INITIAL_EVENTS_PER_PAGE,
  );
  const includeOtherBattles = firstPageEventNames.includes(OTHER_BATTLES_KEY);
  const namedEvents = firstPageEventNames.filter(
    (name) => name !== OTHER_BATTLES_KEY,
  );

  const buildInitialBattlesQuery = () => {
    let query = supabase
      .from("battles")
      .select(
        "id, league, slug, title, youtube_id, event_name, event_date, status, url",
      )
      .in("status", PUBLIC_BATTLE_STATUSES)
      .eq("public_visible", true);

    if (league !== "all") {
      query = query.eq("league", league);
    }

    return query;
  };

  const [namedEventsResponse, otherBattlesResponse] = await Promise.all([
    namedEvents.length > 0
      ? buildInitialBattlesQuery()
          .in("event_name", namedEvents)
          .order("event_date", {
            ascending: sort === "oldest",
            nullsFirst: false,
          })
      : Promise.resolve({ data: [], error: null }),
    includeOtherBattles
      ? buildInitialBattlesQuery()
          .is("event_name", null)
          .order("event_date", {
            ascending: sort === "oldest",
            nullsFirst: false,
          })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (namedEventsResponse.error) {
    console.error(
      "Error fetching initial battles page for named events:",
      namedEventsResponse.error,
    );
  }
  if (otherBattlesResponse.error) {
    console.error(
      "Error fetching initial battles page for unnamed events:",
      otherBattlesResponse.error,
    );
  }

  const eventOrder = new Map(
    firstPageEventNames.map((name, idx) => [name, idx]),
  );
  const initialBattles = [
    ...(namedEventsResponse.data || []),
    ...(otherBattlesResponse.data || []),
  ].sort((a, b) => {
    const keyA = a.event_name || OTHER_BATTLES_KEY;
    const keyB = b.event_name || OTHER_BATTLES_KEY;
    const groupA = eventOrder.get(keyA) ?? Number.MAX_SAFE_INTEGER;
    const groupB = eventOrder.get(keyB) ?? Number.MAX_SAFE_INTEGER;

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    return sort === "oldest" ? dateA - dateB : dateB - dateA;
  }) as Battle[];

  const initialEventNames = Array.from(
    new Set(initialBattles.map((battle) => battle.event_name).filter(Boolean)),
  )
    .sort((a, b) => a!.localeCompare(b!))
    .filter((name): name is string => name !== null);

  const initialAvailableLeagues = getUniqueBattleLeagues(
    leaguesResponse.data || [],
  );

  return {
    initialBattles,
    initialCount: initialCount || 0,
    initialTotalEvents,
    initialYears: [],
    initialEventNames,
    initialAvailableLeagues,
  };
}
