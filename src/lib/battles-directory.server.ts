import type { Battle } from "@/features/battles/hooks/use-battles-data";
import { createPublicClient } from "@/lib/supabase/server";
import {
  getUniqueBattleLeagues,
  normalizeBattleLeague,
  PUBLIC_BATTLE_STATUSES,
} from "@/lib/battles";
import {
  getOrderedBattleEventKeys,
  orderBattlesByEventKeys,
} from "@/lib/battle-events";
import { buildBattleEventFilter } from "@/lib/postgrest";

const INITIAL_EVENTS_PER_PAGE = 5;

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
  const orderedEventKeys = getOrderedBattleEventKeys(allEventRows, sort);

  const initialTotalEvents = orderedEventKeys.length;
  const firstPageEventKeys = orderedEventKeys.slice(
    0,
    INITIAL_EVENTS_PER_PAGE,
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

  const initialResponse =
    firstPageEventKeys.length > 0
      ? await buildInitialBattlesQuery()
          .or(buildBattleEventFilter(firstPageEventKeys))
          .order("event_date", {
            ascending: sort === "oldest",
            nullsFirst: false,
          })
      : { data: [], error: null };

  if (initialResponse.error) {
    console.error(
      "Error fetching initial battles page:",
      initialResponse.error,
    );
  }

  const initialBattles = orderBattlesByEventKeys(
    (initialResponse.data || []) as Battle[],
    firstPageEventKeys,
    sort,
  );

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
