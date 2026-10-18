import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getLeagueDefinition } from "@/lib/leagues";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  revalidateBattleDiscovery: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/revalidation", () => ({
  revalidateBattleDiscovery: mocks.revalidateBattleDiscovery,
}));

import { POST } from "../transcripts/route";

const validTranscript = {
  league: "unknown-league",
  youtube_id: "video-1",
  title: "Unknown League Battle",
  participants: [],
  segments: [
    {
      speaker: "MC1",
      text: "A line",
      start: 0,
      end: 1,
    },
  ],
};

function makeSelectQuery<T>(result: T) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function makeInsertQuery() {
  const query = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    onConflictDoUpdate: vi.fn(),
    then: (resolve: (value: undefined) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve, reject),
  };

  query.values.mockReturnValue(query);
  query.onConflictDoNothing.mockReturnValue(query);
  query.onConflictDoUpdate.mockReturnValue(query);
  return query;
}

function makeIngestDb() {
  const selectQueries = [
    makeSelectQuery([]),
    makeSelectQuery([]),
    makeSelectQuery([]),
  ];
  const insertQueries = [makeInsertQuery(), makeInsertQuery(), makeInsertQuery()];
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
  };

  db.select
    .mockImplementationOnce(() => selectQueries[0])
    .mockImplementationOnce(() => selectQueries[1])
    .mockImplementationOnce(() => selectQueries[2]);
  db.insert
    .mockImplementationOnce(() => insertQueries[0])
    .mockImplementationOnce(() => insertQueries[1])
    .mockImplementationOnce(() => insertQueries[2]);

  return { db, insertQueries };
}

describe("transcript ingestion League validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INGEST_API_TOKEN", "expected-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["fliptop", "fliptop"],
    ["FlipTop", "fliptop"],
    ["motus", "motus"],
  ])("resolves the registered %s League slug", (input, expectedSlug) => {
    expect(getLeagueDefinition(input)?.slug).toBe(expectedSlug);
  });

  it.each([
    ["fliptop", "fliptop"],
    ["FlipTop", "fliptop"],
    ["motus", "motus"],
  ])("accepts registered %s at the POST boundary", async (input, expectedSlug) => {
    const { db, insertQueries } = makeIngestDb();
    mocks.getDb.mockReturnValue(db);

    const request = new NextRequest("http://localhost/api/ingest/transcripts", {
      method: "POST",
      headers: {
        authorization: "Bearer expected-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...validTranscript, league: input }),
    });

    const response = await POST(request);
    const responseBody = await response.json();
    const insertedRows = insertQueries.flatMap((query) =>
      query.values.mock.calls.map(([values]) => values),
    );

    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({ line_count: 1, repaired: false });
    expect(insertedRows).toEqual(
      expect.arrayContaining([expect.objectContaining({ league: expectedSlug })]),
    );
    expect(mocks.revalidateBattleDiscovery).toHaveBeenCalledWith([expectedSlug]);
  });

  it("rejects an unknown League before opening the database", async () => {
    const request = new NextRequest("http://localhost/api/ingest/transcripts", {
      method: "POST",
      headers: {
        authorization: "Bearer expected-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(validTranscript),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Unsupported League slug: unknown-league",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
