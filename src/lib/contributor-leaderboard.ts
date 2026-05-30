import { createPublicClient } from "@/db/d1-client";

export const REP_PER_APPROVED_TRANSCRIPT = 1;
export const LEADERBOARD_REVALIDATE_SECONDS = 900;

export type ContributorLeaderboardRow = {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  rep: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  total_suggestions: number;
  last_approved_at: string | null;
};

type RpcContributorRow = {
  rank?: number | string;
  user_id?: string;
  username?: string | null;
  display_name?: string | null;
  rep?: number | string | null;
  approved_count?: number | string | null;
  pending_count?: number | string | null;
  rejected_count?: number | string | null;
  total_suggestions?: number | string | null;
  last_approved_at?: string | number | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function normalizeLeaderboardLimit(value: string | number | null) {
  const parsed = typeof value === "number" ? value : parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateString(value: string | number | null | undefined) {
  if (!value) return null;
  if (typeof value === "number") return new Date(value).toISOString();
  return value;
}

function publicContributorName(row: RpcContributorRow) {
  if (row.username) return row.username;
  return row.display_name || "Anonymous";
}

export async function getContributorLeaderboard(limit = DEFAULT_LIMIT) {
  const dbClient = createPublicClient();
  const rowLimit = normalizeLeaderboardLimit(limit);
  const { data, error } = await dbClient.rpc("get_contributor_leaderboard", {
    row_limit: rowLimit,
  });

  if (error) {
    return { data: [], error };
  }

  return {
    data: ((data || []) as RpcContributorRow[]).map((row, index) => ({
      rank: toNumber(row.rank) || index + 1,
      user_id: row.user_id || "",
      username: publicContributorName(row),
      display_name: row.display_name || "Anonymous",
      rep: toNumber(row.rep),
      approved_count: toNumber(row.approved_count),
      pending_count: toNumber(row.pending_count),
      rejected_count: toNumber(row.rejected_count),
      total_suggestions: toNumber(row.total_suggestions),
      last_approved_at: toDateString(row.last_approved_at),
    })) satisfies ContributorLeaderboardRow[],
    error: null,
  };
}

export async function getContributorRepForUser(userId: string) {
  if (!userId) return 0;

  const dbClient = createPublicClient();
  const { count, error } = await dbClient
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) {
    console.error("Error fetching contributor REP:", error);
    return 0;
  }

  return (count ?? 0) * REP_PER_APPROVED_TRANSCRIPT;
}

export async function findContributorLeaderboardIdentity({
  userId,
  username,
  displayName,
}: {
  userId: string;
  username?: string | null;
  displayName?: string | null;
}) {
  const { data } = await getContributorLeaderboard(MAX_LIMIT);
  return (
    data.find((row) => row.user_id === userId) ??
    data.find((row) => username && row.username === username) ??
    data.find((row) => displayName && row.display_name === displayName) ??
    null
  );
}

export async function getContributorRepForProfile({
  userId,
  username,
  displayName,
}: {
  userId: string;
  username?: string | null;
  displayName?: string | null;
}) {
  const directRep = await getContributorRepForUser(userId);
  if (directRep > 0) return directRep;

  const contributor = await findContributorLeaderboardIdentity({
    userId,
    username,
    displayName,
  });
  return contributor?.rep ?? 0;
}
