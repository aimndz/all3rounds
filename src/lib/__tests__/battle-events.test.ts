import { describe, expect, it } from "vitest";
import {
  getBattleEventKey,
  getBattleEventLabel,
  getOrderedBattleEventKeys,
  orderBattlesByEventKeys,
  parseBattleEventKey,
} from "@/lib/battle-events";
import { buildBattleEventFilter } from "@/lib/postgrest";

describe("league-scoped battle event identity", () => {
  it("round-trips event names containing punctuation", () => {
    const key = getBattleEventKey("Motus", "Season 1, Finals (Live)");

    expect(parseBattleEventKey(key)).toEqual({
      league: "motus",
      eventName: "Season 1, Finals (Live)",
    });
  });

  it("keeps unnamed events keyed by league", () => {
    expect(getBattleEventKey("fliptop", null)).not.toBe(
      getBattleEventKey("motus", null),
    );
    expect(getBattleEventLabel(null)).toBe("Other Battles");
  });

  it("keeps a literal Other Battles event distinct from the unnamed bucket", () => {
    const literal = getBattleEventKey("fliptop", "Other Battles");
    const unnamed = getBattleEventKey("fliptop", null);

    expect(literal).not.toBe(unnamed);
  });

  it("builds pairwise league and event predicates", () => {
    const filter = buildBattleEventFilter([
      getBattleEventKey("fliptop", "A"),
      getBattleEventKey("motus", "B"),
      getBattleEventKey("motus", null),
    ]);

    expect(filter).toBe(
      'and(league.eq.fliptop,event_name.eq."A"),and(league.eq.motus,event_name.eq."B"),and(league.eq.motus,event_name.is.null)',
    );
  });

  it("orders only the requested event keys while keeping duplicate names separate", () => {
    const rows = [
      {
        id: "motus-late",
        league: "motus",
        event_name: "Finals",
        event_date: "2025-03-01",
      },
      {
        id: "fliptop-early",
        league: "fliptop",
        event_name: "Finals",
        event_date: "2025-01-01",
      },
      {
        id: "other",
        league: "fliptop",
        event_name: "Other",
        event_date: "2025-02-01",
      },
    ];

    const ordered = orderBattlesByEventKeys(
      rows,
      [getBattleEventKey("fliptop", "Finals")],
      "latest",
    );

    expect(ordered.map((row) => row.id)).toEqual(["fliptop-early"]);
  });

  it("keeps event-name tie ordering ahead of league ordering", () => {
    const ordered = getOrderedBattleEventKeys(
      [
        {
          league: "motus",
          event_name: "A",
          event_date: "2025-01-01",
        },
        {
          league: "fliptop",
          event_name: "Z",
          event_date: "2025-01-01",
        },
      ],
      "latest",
    );

    expect(ordered).toEqual([
      getBattleEventKey("motus", "A"),
      getBattleEventKey("fliptop", "Z"),
    ]);
  });
});
