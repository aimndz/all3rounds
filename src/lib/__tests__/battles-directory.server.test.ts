/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPublicClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createPublicClient: mocks.createPublicClient,
}));

import { getBattleDirectoryData } from "../battles-directory.server";

const initialBattles = [
  {
    id: "fliptop-finals",
    league: "fliptop",
    slug: "fliptop-finals",
    title: "FlipTop Finals",
    youtube_id: "fliptop-video",
    event_name: 'Season 1 "Finals"',
    event_date: "2025-03-01",
    status: "reviewed",
    url: "https://youtube.com/watch?v=fliptop-video",
  },
];

function createQuery() {
  const query: any = {
    selectSpec: "*",
    selectOptions: undefined,
    eventFilter: undefined,
    select: vi.fn((columns: string, options?: unknown) => {
      query.selectSpec = columns;
      query.selectOptions = options;
      return query;
    }),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn((expression: string) => {
      query.eventFilter = expression;
      return query;
    }),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: vi.fn((onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
      Promise.resolve(
        query.selectOptions?.head
          ? { data: null, error: null, count: 1 }
          : query.eventFilter
            ? { data: initialBattles, error: null, count: null }
            : { data: [{ league: "fliptop" }, { league: "motus" }], error: null, count: null },
      ).then(onFulfilled, onRejected),
    ),
  };

  return query;
}

describe("getBattleDirectoryData grouped Event path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: [{ league: "fliptop", event_name: 'Season 1 "Finals"' }],
      error: null,
      count: 1,
    });
    mocks.from.mockImplementation(() => createQuery());
    mocks.createPublicClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  });

  it("uses D1 Event aggregation for the initial directory page", async () => {
    const directory = await getBattleDirectoryData({ sort: "oldest" });

    expect(directory.initialTotalEvents).toBe(1);
    expect(directory.initialBattles).toEqual(initialBattles);
    expect(mocks.rpc).toHaveBeenCalledWith("get_battle_event_groups", {
      league: "all",
      status: "all",
      year: "all",
      sort: "oldest",
      page: 1,
      event_limit: 5,
    });

    const queries = mocks.from.mock.results.map((result) => result.value);
    expect(
      queries.some((query) => query.selectSpec === "event_name, event_date, league"),
    ).toBe(false);
    expect(
      queries.find((query) => query.eventFilter)?.eventFilter,
    ).toContain('and(league.eq.fliptop,event_name.eq."Season 1 ""Finals""")');
  });
});
