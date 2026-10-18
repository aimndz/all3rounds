import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBattleEventKey } from "@/lib/battle-events";
import { buildBattleEventFilter } from "@/lib/postgrest";

const mocks = vi.hoisted(() => ({
  getD1Async: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getD1Async: mocks.getD1Async,
}));

import { D1CompatClient } from "../compat";

const battleRows = [
  {
    id: "fliptop-finals",
    league: "fliptop",
    event_name: 'Season 1 "Finals"',
  },
  {
    id: "motus-finals",
    league: "motus",
    event_name: 'Season 1 "Finals"',
  },
  { id: "motus-other", league: "motus", event_name: null },
  { id: "fliptop-other", league: "fliptop", event_name: null },
];

function createD1Mock() {
  const prepare = vi.fn((sql: string) => {
    const statement = {
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          if (sql.includes('FROM "battles"') && sql.includes('GROUP BY')) {
            return {
              results: [
                {
                  league: "fliptop",
                  event_name: 'Season 1 "Finals"',
                  total_events: 2,
                },
                { league: "motus", event_name: null, total_events: 2 },
              ],
            };
          }

          const matchingRows = battleRows.filter(
            (row) =>
              (row.league === params[0] && row.event_name === params[1]) ||
              (row.league === params[2] && row.event_name === params[3]) ||
              (row.league === params[4] && row.event_name === null),
          );

          return { results: matchingRows };
        }),
        first: vi.fn(async () => ({ count: 2 })),
        run: vi.fn(async () => ({ meta: {} })),
      })),
    };

    return statement;
  });

  return { prepare };
}

describe("D1 compatibility adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes nested League/Event predicates with quoted Event values", async () => {
    const db = createD1Mock();
    mocks.getD1Async.mockResolvedValue(db);

    const filter = buildBattleEventFilter([
      getBattleEventKey("fliptop", 'Season 1 "Finals"'),
      getBattleEventKey("motus", 'Season 1 "Finals"'),
      getBattleEventKey("motus", null),
    ]);

    const response = await new D1CompatClient()
      .from("battles")
      .select("id, league, event_name")
      .or(filter);

    expect(response.error).toBeNull();
    expect(response.data).toEqual([
      { id: "fliptop-finals", league: "fliptop", event_name: 'Season 1 "Finals"' },
      { id: "motus-finals", league: "motus", event_name: 'Season 1 "Finals"' },
      { id: "motus-other", league: "motus", event_name: null },
    ]);

    const [sql] = db.prepare.mock.calls[0];
    expect(sql).toContain('"event_name" = ?');
    expect(sql).toContain('"event_name" IS NULL');
    expect(db.prepare.mock.results[0].value.bind).toHaveBeenCalledWith(
      "fliptop",
      'Season 1 "Finals"',
      "motus",
      'Season 1 "Finals"',
      "motus",
      "motus",
      "",
    );
  });

  it("returns grouped Event keys and their total without loading battle rows", async () => {
    const db = createD1Mock();
    mocks.getD1Async.mockResolvedValue(db);

    const response = await new D1CompatClient().rpc("get_battle_event_groups", {
      league: "all",
      status: "all",
      year: "all",
      sort: "latest",
      page: 1,
      event_limit: 5,
    });

    expect(response.error).toBeNull();
    expect(response.count).toBe(2);
    expect(response.data).toEqual([
      { league: "fliptop", event_name: 'Season 1 "Finals"' },
      { league: "motus", event_name: null },
    ]);
    expect(db.prepare.mock.calls.some(([sql]) => sql.includes("GROUP BY"))).toBe(
      true,
    );
    expect(
      db.prepare.mock.calls.every(([sql]) => !sql.includes('SELECT * FROM "battles"')),
    ).toBe(true);
    const groupedQuery = db.prepare.mock.calls.find(([sql]) =>
      sql.includes("page_context"),
    )?.[0];
    expect(groupedQuery).toContain('COUNT(*) OVER () AS "total_events"');
    expect(groupedQuery).toContain('ROW_NUMBER() OVER');
    expect(groupedQuery).toContain('NULLIF("event_name", \'\')');
  });
});
