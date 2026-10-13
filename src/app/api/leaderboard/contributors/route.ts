import { NextRequest, NextResponse } from "next/server";
import {
  getContributorLeaderboard,
  LEADERBOARD_REVALIDATE_SECONDS,
  normalizeLeaderboardLimit,
} from "@/lib/contributor-leaderboard";
import { hasOnlySearchParams } from "@/lib/api-utils";
import {
  buildPublicApiCacheKey,
  matchPublicApiCache,
  storePublicApiCache,
} from "@/lib/public-api-cache";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (!hasOnlySearchParams(searchParams, ["limit"])) {
    return NextResponse.json(
      { error: "Unsupported query parameter." },
      { status: 400 },
    );
  }

  const limit = normalizeLeaderboardLimit(searchParams.get("limit"));
  const cacheParams = new URLSearchParams({ limit: String(limit) });
  const cacheKey = buildPublicApiCacheKey(
    request,
    "/api/leaderboard/contributors",
    cacheParams,
  );
  const cachedResponse = await matchPublicApiCache(request, cacheKey);
  if (cachedResponse) return cachedResponse;

  const { data, error } = await getContributorLeaderboard(limit);

  if (error) {
    console.error("Contributor leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributor leaderboard." },
      { status: 500 },
    );
  }

  const response = NextResponse.json(
    { contributors: data },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${LEADERBOARD_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
      },
    },
  );

  return storePublicApiCache(request, cacheKey, response);
}
