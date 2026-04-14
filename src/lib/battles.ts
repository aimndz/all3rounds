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
