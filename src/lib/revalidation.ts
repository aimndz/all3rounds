import { revalidatePath } from "next/cache";
import { getLeagueDefinition } from "@/lib/leagues";
import { normalizeBattleLeague } from "@/lib/battles";
import { invalidatePublicApiCache } from "@/lib/public-api-cache";

export function getBattleLeagues(
  rows: readonly { league?: string | null }[],
): string[] {
  return rows
    .map((row) => row.league)
    .filter((league): league is string => Boolean(league));
}

/**
 * Refresh every public discovery surface touched by a Battle mutation.
 * Unknown leagues are still revalidated so an in-flight registry rollout does
 * not leave a stale scoped page behind.
 */
export async function revalidateBattleDiscovery(
  leagues: Iterable<string> = [],
) {
  revalidatePath("/battles");
  revalidatePath("/api/battles");
  revalidatePath("/leagues");
  await invalidatePublicApiCache("/api/battles");

  const scopedSlugs = new Set<string>();
  for (const league of leagues) {
    if (!league) continue;
    const normalized = normalizeBattleLeague(league);
    scopedSlugs.add(getLeagueDefinition(normalized)?.slug || normalized);
  }

  for (const slug of scopedSlugs) {
    revalidatePath(`/leagues/${slug}`);
  }
}
