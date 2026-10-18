import { normalizeBattleLeague } from "@/lib/battles";

export const OTHER_BATTLES_KEY = "Other Battles";

export type BattleEventIdentity = {
  league: string;
  eventName: string | null;
};

export type BattleEventRow = {
  league?: string | null;
  event_name?: string | null;
  event_date?: string | null;
  score?: number;
};

export type BattleEventGroupRow = {
  league: string;
  event_name: string | null;
};

/**
 * Event identity is scoped to a league. JSON keeps the key reversible even
 * when an event name contains punctuation that would be awkward as a
 * delimiter.
 */
export function getBattleEventKey(
  league: string | null | undefined,
  eventName: string | null | undefined,
): string {
  return JSON.stringify([
    normalizeBattleLeague(league || "fliptop"),
    eventName || null,
  ]);
}

export function getBattleEventKeyFromBattle(battle: {
  league?: string | null;
  event_name?: string | null;
}): string {
  return getBattleEventKey(battle.league, battle.event_name);
}

export function parseBattleEventKey(key: string): BattleEventIdentity {
  try {
    const parsed: unknown = JSON.parse(key);
    if (
      Array.isArray(parsed) &&
      typeof parsed[0] === "string" &&
      (typeof parsed[1] === "string" || parsed[1] === null)
    ) {
      return { league: parsed[0], eventName: parsed[1] };
    }
  } catch {
    // Fall through to a safe legacy interpretation for cached/old keys.
  }

  return {
    league: "fliptop",
    eventName: key === OTHER_BATTLES_KEY ? null : key,
  };
}

export function getBattleEventLabel(
  eventName: string | null | undefined,
): string {
  return eventName || OTHER_BATTLES_KEY;
}

export function getOrderedBattleEventKeys(
  rows: readonly BattleEventRow[],
  sort: "latest" | "oldest",
  options?: { scoreFirst?: boolean },
): string[] {
  const meta = new Map<
    string,
    { maxScore: number; minDate: number; maxDate: number }
  >();

  for (const row of rows) {
    const key = getBattleEventKeyFromBattle(row);
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
      if (options?.scoreFirst && b[1].maxScore !== a[1].maxScore) {
        return b[1].maxScore - a[1].maxScore;
      }

      const dateA = sort === "oldest" ? a[1].minDate : a[1].maxDate;
      const dateB = sort === "oldest" ? b[1].minDate : b[1].maxDate;
      if (dateA !== dateB) {
        return sort === "oldest" ? dateA - dateB : dateB - dateA;
      }

      const identityA = parseBattleEventKey(a[0]);
      const identityB = parseBattleEventKey(b[0]);
      const labelOrder = getBattleEventLabel(
        identityA.eventName,
      ).localeCompare(getBattleEventLabel(identityB.eventName));
      if (labelOrder !== 0) return labelOrder;

      const eventOrder = (identityA.eventName || "").localeCompare(
        identityB.eventName || "",
      );
      return eventOrder !== 0
        ? eventOrder
        : identityA.league.localeCompare(identityB.league);
    })
    .map(([key]) => key);
}

export function orderBattlesByEventKeys<T extends BattleEventRow>(
  rows: readonly T[],
  eventKeys: readonly string[],
  sort: "latest" | "oldest",
  options?: { scoreFirst?: boolean },
): T[] {
  const eventOrder = new Map(eventKeys.map((key, index) => [key, index]));
  const pageKeys = new Set(eventKeys);

  return rows
    .map((row) => ({ row, key: getBattleEventKeyFromBattle(row) }))
    .filter(({ key }) => pageKeys.has(key))
    .sort(({ row: a, key: keyA }, { row: b, key: keyB }) => {
      const groupA = eventOrder.get(keyA) ?? Number.MAX_SAFE_INTEGER;
      const groupB = eventOrder.get(keyB) ?? Number.MAX_SAFE_INTEGER;
      if (groupA !== groupB) return groupA - groupB;

      if (options?.scoreFirst && (b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }

      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return sort === "oldest" ? dateA - dateB : dateB - dateA;
    })
    .map(({ row }) => row);
}
