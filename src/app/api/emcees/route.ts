import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/d1-client";
import { hasOnlySearchParams } from "@/lib/api-utils";
import {
  buildPublicApiCacheKey,
  matchPublicApiCache,
  storePublicApiCache,
} from "@/lib/public-api-cache";

const VALID_SORTS = new Set([
  "name_asc",
  "name_desc",
  "battles_desc",
  "battles_asc",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (
    !hasOnlySearchParams(searchParams, [
      "q",
      "sort",
      "minBattles",
      "page",
      "limit",
    ])
  ) {
    return NextResponse.json(
      { error: "Unsupported query parameter." },
      { status: 400 },
    );
  }

  const query = searchParams.get("q")?.trim();
  const rawSort = searchParams.get("sort") || "name_asc";
  const sort = VALID_SORTS.has(rawSort) ? rawSort : "name_asc";
  const rawMinBattles = parseInt(searchParams.get("minBattles") || "0", 10);
  const minBattles =
    Number.isFinite(rawMinBattles) && rawMinBattles > 0 ? rawMinBattles : 0;
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawLimit = parseInt(searchParams.get("limit") || "48", 10);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : 48, 1),
    50,
  );
  const offset = (page - 1) * limit;

  const cacheParams = new URLSearchParams({
    sort,
    minBattles: String(minBattles),
    page: String(page),
    limit: String(limit),
  });
  if (query) cacheParams.set("q", query);

  const cacheKey = buildPublicApiCacheKey(request, "/api/emcees", cacheParams);
  const cachedResponse = await matchPublicApiCache(request, cacheKey);
  if (cachedResponse) return cachedResponse;

  const dbClient = await createClient();

  // Now querying the 'emcees' table directly since battle_count is denormalized
  let dbQuery = dbClient
    .from("emcees")
    .select("id, slug, name, aka, battle_count", { count: "exact" });

  // 1. Filtering by search query 
  if (query) {
    const safeQ = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    dbQuery = dbQuery.or(`name.ilike.%${safeQ}%,aka.cs.{"${query}"}`);
  }

  // 2. Efficient Filtering by Battle Count in SQL
  if (minBattles > 0) {
    dbQuery = dbQuery.gte("battle_count", minBattles);
  }

  // 3. Sorting in SQL
  if (sort === "name_asc") {
    dbQuery = dbQuery.order("name", { ascending: true });
  } else if (sort === "name_desc") {
    dbQuery = dbQuery.order("name", { ascending: false });
  } else if (sort === "battles_desc") {
    dbQuery = dbQuery.order("battle_count", { ascending: false });
  } else if (sort === "battles_asc") {
    dbQuery = dbQuery.order("battle_count", { ascending: true });
  }

  // 4. Pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error("Error fetching emcees from view:", error);
    return NextResponse.json(
      { error: "Failed to fetch emcees." },
      { status: 500 },
    );
  }

  const response = {
    emcees: data || [],
    totalCount: count || 0,
    hasMore: (count || 0) > offset + limit,
  };

  const jsonResponse = NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=59",
    },
  });
  return storePublicApiCache(request, cacheKey, jsonResponse);
}
