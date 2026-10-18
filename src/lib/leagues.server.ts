import { getD1Async } from "@/db/client";
import { mergePublicLeagueCounts, type PublicLeague } from "./leagues";

export const PUBLIC_BATTLE_STATUSES = [
  "raw",
  "arranged",
  "reviewing",
  "reviewed",
] as const;

type PublicLeagueCountRow = {
  league: string;
  battle_count: number;
};

export async function getPublicLeagueCounts(): Promise<Map<string, number>> {
  const db = await getD1Async();
  const placeholders = PUBLIC_BATTLE_STATUSES.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT league, COUNT(*) AS battle_count
       FROM battles
       WHERE public_visible = 1
         AND status IN (${placeholders})
       GROUP BY league`,
    )
    .bind(...PUBLIC_BATTLE_STATUSES)
    .all<PublicLeagueCountRow>();

  return new Map(
    (result.results ?? []).map((row: PublicLeagueCountRow) => [
      String(row.league),
      Number(row.battle_count),
    ]),
  );
}

export async function getPublicLeagues(): Promise<PublicLeague[]> {
  return mergePublicLeagueCounts(await getPublicLeagueCounts());
}
