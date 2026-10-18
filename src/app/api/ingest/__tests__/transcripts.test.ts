import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getLeagueDefinition } from "@/lib/leagues";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: mocks.getDb,
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

describe("transcript ingestion League validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INGEST_API_TOKEN", "expected-token");
  });

  it.each([
    ["fliptop", "fliptop"],
    ["FlipTop", "fliptop"],
    ["motus", "motus"],
  ])("resolves the registered %s League slug", (input, expectedSlug) => {
    expect(getLeagueDefinition(input)?.slug).toBe(expectedSlug);
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
