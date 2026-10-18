import { buildQueryString, type SearchParamValues } from "@/lib/utils";

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

const DIRECTORY_QUERY_KEYS = ["q", "status", "year", "sort", "page"];

export function formatPublicBattleCount(count: number): string {
  return `${count.toLocaleString()} public battle${count === 1 ? "" : "s"}`;
}

export function getLeagueDirectoryPath(
  slug: string,
  params: SearchParamValues = {},
): string {
  return `/leagues/${encodeURIComponent(slug)}${buildQueryString(params, DIRECTORY_QUERY_KEYS)}`;
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
    logoSrc: "/leagues/motus.png",
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
