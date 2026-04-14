import { describe, expect, it } from "vitest";
import {
  getBattleHref,
  getBattlePath,
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
