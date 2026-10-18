import { describe, expect, it } from "vitest";
import {
  getLeagueDefinition,
  mergePublicLeagueCounts,
  leagueDefinitions,
} from "../leagues";

describe("league catalog", () => {
  it("defines the ingestion-supported leagues with stable metadata", () => {
    expect(leagueDefinitions.map((league) => league.slug)).toEqual([
      "fliptop",
      "motus",
    ]);
    expect(getLeagueDefinition("fliptop")).toMatchObject({
      name: "FlipTop",
      channelUrl: "https://www.youtube.com/@fliptopbattles",
    });
  });

  it("merges public counts, filters empty leagues, and preserves registry order", () => {
    expect(
      mergePublicLeagueCounts(
        new Map([
          ["motus", 4],
          ["fliptop", 12],
          ["unregistered", 99],
        ]),
      ).map(({ slug, battleCount }) => ({ slug, battleCount })),
    ).toEqual([
      { slug: "fliptop", battleCount: 12 },
      { slug: "motus", battleCount: 4 },
    ]);

    expect(
      mergePublicLeagueCounts(new Map([["fliptop", 12]])).map(
        (league) => league.slug,
      ),
    ).toEqual(["fliptop"]);
  });
});
