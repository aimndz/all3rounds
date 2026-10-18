import { parseBattleEventKey } from "@/lib/battle-events";

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildBattleEventFilter(eventKeys: readonly string[]): string {
  return eventKeys
    .map((eventKey) => {
      const { league, eventName } = parseBattleEventKey(eventKey);
      const eventClause =
        eventName === null
          ? "event_name.is.null"
          : `event_name.eq.${quotePostgrestValue(eventName)}`;
      return `and(league.eq.${league},${eventClause})`;
    })
    .join(",");
}
