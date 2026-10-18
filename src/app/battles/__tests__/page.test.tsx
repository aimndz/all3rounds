import { beforeEach, describe, expect, it, vi } from "vitest";
import BattlesPage from "../page";

const mocks = vi.hoisted(() => ({
  getBattleDirectoryData: vi.fn(),
  getLeagueDefinition: vi.fn(),
  getLeagueDirectoryPath: vi.fn(() => "/leagues/fliptop?q=loonie+vs+abra&status=reviewed&year=2024&sort=oldest&page=2"),
  permanentRedirect: vi.fn(() => {
    throw new Error("PERMANENT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/lib/battles-directory.server", () => ({
  getBattleDirectoryData: mocks.getBattleDirectoryData,
}));

vi.mock("@/lib/leagues", () => ({
  getLeagueDefinition: mocks.getLeagueDefinition,
  getLeagueDirectoryPath: mocks.getLeagueDirectoryPath,
}));

vi.mock("../BattlesDirectory", () => ({
  default: () => null,
}));

describe("BattlesPage compatibility routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBattleDirectoryData.mockResolvedValue({
      initialBattles: [],
      initialCount: 0,
      initialTotalEvents: 0,
      initialYears: [],
      initialEventNames: [],
      initialAvailableLeagues: [],
    });
  });

  it("redirects known legacy League filters and preserves supported filters", async () => {
    mocks.getLeagueDefinition.mockReturnValue({ slug: "fliptop" });

    await expect(
      BattlesPage({
        searchParams: Promise.resolve({
          league: "FlipTop",
          q: "loonie vs abra",
          status: "reviewed",
          year: "2024",
          sort: "oldest",
          page: "2",
          eventLimit: "20",
        }),
      }),
    ).rejects.toThrow("PERMANENT_REDIRECT");

    expect(mocks.permanentRedirect).toHaveBeenCalledWith(
      "/leagues/fliptop?q=loonie+vs+abra&status=reviewed&year=2024&sort=oldest&page=2",
    );
    expect(mocks.getLeagueDirectoryPath).toHaveBeenCalledWith(
      "fliptop",
      expect.objectContaining({
        q: "loonie vs abra",
        status: "reviewed",
        year: "2024",
        sort: "oldest",
        page: "2",
        eventLimit: "20",
      }),
    );
    expect(mocks.getBattleDirectoryData).not.toHaveBeenCalled();
  });

  it("keeps the root route as the all-Leagues directory", async () => {
    mocks.getLeagueDefinition.mockReturnValue(undefined);
    mocks.getBattleDirectoryData.mockResolvedValue({
      initialBattles: [],
      initialCount: 0,
      initialTotalEvents: 0,
      initialYears: [],
      initialEventNames: [],
      initialAvailableLeagues: [],
    });

    await BattlesPage({
      searchParams: Promise.resolve({ league: "all" }),
    });

    expect(mocks.getBattleDirectoryData).toHaveBeenCalledWith({
      league: undefined,
      sort: "latest",
    });
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it("renders a bare root request as the all-Leagues directory", async () => {
    mocks.getLeagueDefinition.mockReturnValue(undefined);

    await BattlesPage({
      searchParams: Promise.resolve({}),
    });

    expect(mocks.getBattleDirectoryData).toHaveBeenCalledWith({
      league: undefined,
      sort: "latest",
    });
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });
});
