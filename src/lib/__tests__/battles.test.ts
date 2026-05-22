import { describe, expect, it } from "vitest";
import {
  formatBattleLeagueLabel,
  getBattleHref,
  getBattlePath,
  getUniqueBattleLeagues,
  normalizeBattleLeague,
  normalizeBattleSlug,
} from "../battles";

describe("battle route helpers", () => {
  it("normalizes league and battle slug values", () => {
    expect(normalizeBattleLeague("FlipTop")).toBe("fliptop");
    expect(normalizeBattleSlug("Loonie vs Abra")).toBe("loonie-vs-abra");
    expect(normalizeBattleSlug("A$AP vs M@ster")).toBe("asap-vs-master");
  });

  it("builds canonical battle paths", () => {
    expect(getBattlePath("fliptop", "loonie-vs-abra")).toBe(
      "/battles/fliptop/loonie-vs-abra",
    );
  });

  it("formats league labels for badges and filters", () => {
    expect(formatBattleLeagueLabel("fliptop")).toBe("FlipTop");
    expect(formatBattleLeagueLabel("underground-league")).toBe(
      "Underground League",
    );
  });

  it("deduplicates and sorts league values by display label", () => {
    expect(
      getUniqueBattleLeagues([
        { league: "sunugan" },
        { league: "fliptop" },
        { league: "sunugan" },
        { league: null },
      ]),
    ).toEqual(["fliptop", "sunugan"]);
  });

  it("falls back to the legacy id route when canonical fields are missing", () => {
    expect(
      getBattleHref({
        id: "battle-1",
        league: "fliptop",
        slug: "loonie-vs-abra",
      }),
    ).toBe("/battles/fliptop/loonie-vs-abra");

    expect(
      getBattleHref({
        id: "battle-1",
      }),
    ).toBe("/battles/battle-1");
  });
});
