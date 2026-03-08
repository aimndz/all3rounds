import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") || "name_asc";
  const minBattles = parseInt(searchParams.get("minBattles") || "0");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "48");
  const offset = (page - 1) * limit;

  // --- Rate limiting ---
  const rateLimitKey = `emcees:${request.headers.get("x-forwarded-for") || "unknown"}`;
  const rateRes = await checkRateLimit(rateLimitKey, "anonymous");

  if (!rateRes.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: getRateLimitHeaders(rateRes),
      },
    );
  }

  // --- Cache check ---
  const cacheKey = `emcees:q:${query || "all"}:s:${sort}:m:${minBattles}:p:${page}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  const supabase = await createClient();

  // Now querying the 'emcees' table directly since battle_count is denormalized
  let dbQuery = supabase
    .from("emcees")
    .select("id, name, battle_count", { count: "exact" });

  // 1. Filtering by search query 
  if (query) {
    const safeQ = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    dbQuery = dbQuery.ilike("name", `%${safeQ}%`);
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
    hasMore: (count || 0) > offset + limit
  };

  await setCached(cacheKey, response, 600); // 10 minutes

  return NextResponse.json(response);
}
