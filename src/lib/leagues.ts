export type LeagueDefinition = {
  readonly slug: string;
  readonly name: string;
  readonly logoSrc?: string;
  readonly channelUrl: string;
  readonly sortOrder: number;
};

export type PublicLeague = LeagueDefinition & {
  readonly battleCount: number;
};

export function formatPublicBattleCount(count: number): string {
  return `${count.toLocaleString()} public battle${count === 1 ? "" : "s"}`;
}

export const leagueDefinitions = [
  {
    slug: "fliptop",
    name: "FlipTop",
    logoSrc: "/leagues/fliptop.png",
    channelUrl: "https://www.youtube.com/@fliptopbattles",
    sortOrder: 1,
  },
  {
    slug: "motus",
    name: "Motus",
    channelUrl: "https://www.youtube.com/@motusbattle",
    sortOrder: 2,
  },
] as const satisfies readonly LeagueDefinition[];

function normalizeLeagueKey(value: string): string {
  return value.trim().toLowerCase();
}

export function getLeagueDefinition(
  slug: string,
): LeagueDefinition | undefined {
  const normalizedSlug = normalizeLeagueKey(slug);
  return leagueDefinitions.find((league) => league.slug === normalizedSlug);
}

export function mergePublicLeagueCounts(
  counts: ReadonlyMap<string, number>,
): PublicLeague[] {
  return leagueDefinitions
    .map((league) => ({
      ...league,
      battleCount: counts.get(league.slug) ?? 0,
    }))
    .filter((league) => league.battleCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
