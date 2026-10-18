import { describe, expect, it, vi, beforeEach } from "vitest";
import LeagueDirectoryPage from "../page";

const mocks = vi.hoisted(() => ({
  getLeagueDefinition: vi.fn(),
  getPublicLeagues: vi.fn(),
  getBattleDirectoryData: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  permanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/lib/leagues", () => ({
  getLeagueDefinition: mocks.getLeagueDefinition,
}));

vi.mock("@/lib/leagues.server", () => ({
  getPublicLeagues: mocks.getPublicLeagues,
}));

vi.mock("@/lib/battles-directory.server", () => ({
  getBattleDirectoryData: mocks.getBattleDirectoryData,
}));

vi.mock("@/app/battles/BattlesDirectory", () => ({
  default: () => null,
}));

const fliptop = {
  slug: "fliptop",
  name: "FlipTop",
  logoSrc: "/leagues/fliptop.png",
  channelUrl: "https://www.youtube.com/@fliptopbattles",
  sortOrder: 1,
  battleCount: 12,
};

describe("LeagueDirectoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBattleDirectoryData.mockResolvedValue({
      initialBattles: [],
      initialCount: 0,
      initialTotalEvents: 0,
      initialYears: [],
      initialEventNames: [],
      initialAvailableLeagues: ["fliptop"],
    });
  });

  it("returns not found for an unknown League", async () => {
    mocks.getLeagueDefinition.mockReturnValue(undefined);

    await expect(
      LeagueDirectoryPage({
        params: Promise.resolve({ slug: "unknown" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("returns not found for a registered League with no public Battles", async () => {
    mocks.getLeagueDefinition.mockReturnValue({ ...fliptop, slug: "motus" });
    mocks.getPublicLeagues.mockResolvedValue([]);

    await expect(
      LeagueDirectoryPage({
        params: Promise.resolve({ slug: "motus" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("loads only the selected populated League directory", async () => {
    mocks.getLeagueDefinition.mockReturnValue(fliptop);
    mocks.getPublicLeagues.mockResolvedValue([fliptop]);

    await LeagueDirectoryPage({
      params: Promise.resolve({ slug: "fliptop" }),
      searchParams: Promise.resolve({ sort: "oldest" }),
    });

    expect(mocks.getBattleDirectoryData).toHaveBeenCalledWith({
      league: "fliptop",
      sort: "oldest",
      initialCount: 12,
    });
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });
});
