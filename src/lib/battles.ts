function mapSpecialSlugCharacters(value: string): string {
  return value.replace(/\$/g, "s").replace(/@/g, "a");
}

function normalizeBattleRouteSegment(value: string, fallback: string): string {
  const normalized = mapSpecialSlugCharacters(value.trim().toLowerCase())
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._/\s+-]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function normalizeBattleLeague(value: string): string {
  return normalizeBattleRouteSegment(value, "fliptop");
}

export function formatBattleLeagueLabel(value?: string | null): string {
  if (!value) return "Unknown League";

  const normalized = normalizeBattleLeague(value);
  const knownLabels: Record<string, string> = {
    fliptop: "FlipTop",
  };

  if (knownLabels[normalized]) {
    return knownLabels[normalized];
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getUniqueBattleLeagues(
  battles: { league?: string | null }[],
): string[] {
  return Array.from(
    new Set(
      battles
        .map((battle) => battle.league)
        .filter((league): league is string => Boolean(league)),
    ),
  ).sort((a, b) =>
    formatBattleLeagueLabel(a).localeCompare(formatBattleLeagueLabel(b)),
  );
}

export function normalizeBattleSlug(value: string): string {
  return normalizeBattleRouteSegment(value, "battle");
}

export function getBattlePath(league: string, slug: string): string {
  return `/battles/${encodeURIComponent(league)}/${encodeURIComponent(slug)}`;
}

export function getBattleHref(battle: {
  id: string;
  league?: string | null;
  slug?: string | null;
}): string {
  if (battle.league && battle.slug) {
    return getBattlePath(battle.league, battle.slug);
  }

  return `/battles/${encodeURIComponent(battle.id)}`;
}
