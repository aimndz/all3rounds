import { parseBattleEventKey } from "@/lib/battle-events";

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildBattleEventFilter(eventKeys: readonly string[]): string {
  return eventKeys
    .flatMap((eventKey) => {
      const { league, eventName } = parseBattleEventKey(eventKey);
      if (eventName === null) {
        return [
          `and(league.eq.${league},event_name.is.null)`,
          `and(league.eq.${league},event_name.eq.${quotePostgrestValue("")})`,
        ];
      }

      return [`and(league.eq.${league},event_name.eq.${quotePostgrestValue(eventName)})`];
    })
    .join(",");
}
