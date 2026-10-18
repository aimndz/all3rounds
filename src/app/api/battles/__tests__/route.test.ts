/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  matchPublicApiCache: vi.fn(),
  storePublicApiCache: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/public-api-cache", () => ({
  buildPublicApiCacheKey: vi.fn(() => "cache-key"),
  matchPublicApiCache: mocks.matchPublicApiCache,
  storePublicApiCache: mocks.storePublicApiCache,
}));

import { GET } from "../route";

const battles = [
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
  {
    id: "motus-finals",
    league: "motus",
    slug: "motus-finals",
    title: "Motus Finals",
    youtube_id: "motus-video",
    event_name: 'Season 1 "Finals"',
    event_date: "2025-02-01",
    status: "reviewed",
    url: "https://youtube.com/watch?v=motus-video",
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
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    or: vi.fn((expression: string) => {
      query.eventFilter = expression;
      return query;
    }),
    order: vi.fn(() => query),
    then: vi.fn((onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
      Promise.resolve(
        query.selectOptions?.head
          ? { data: null, error: null, count: 2 }
          : query.eventFilter
            ? { data: battles, error: null, count: null }
            : { data: [], error: null, count: null },
      ).then(onFulfilled, onRejected),
    ),
  };

  return query;
}

describe("GET /api/battles grouped Event path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.matchPublicApiCache.mockResolvedValue(null);
    mocks.storePublicApiCache.mockImplementation((_request, _key, response) => response);
    mocks.rpc.mockResolvedValue({
      data: [
        { league: "fliptop", event_name: 'Season 1 "Finals"' },
        { league: "motus", event_name: 'Season 1 "Finals"' },
      ],
      error: null,
      count: 2,
    });
    mocks.from.mockImplementation(() => createQuery());
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
  });

  it("keeps page totals and League/Event predicates while avoiding raw Event metadata scans", async () => {
    const response = await GET(
      new NextRequest(
        "https://example.com/api/battles?league=motus&status=reviewed&year=2024&sort=oldest&page=2&eventLimit=2",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      count: 2,
      totalEvents: 2,
      battles,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_battle_event_groups", {
      league: "motus",
      status: "reviewed",
      year: "2024",
      sort: "oldest",
      page: 2,
      event_limit: 2,
    });

    const queries = mocks.from.mock.results.map((result) => result.value);
    expect(
      queries.some((query) => query.selectSpec === "event_name, event_date, league"),
    ).toBe(false);
    expect(
      queries.find((query) => query.eventFilter)?.eventFilter,
    ).toContain('and(league.eq.fliptop,event_name.eq."Season 1 ""Finals""")');
    expect(
      queries.find((query) => query.eventFilter)?.eventFilter,
    ).toContain('and(league.eq.motus,event_name.eq."Season 1 ""Finals""")');
  });
});
