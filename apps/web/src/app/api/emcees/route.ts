import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

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
  const cacheKey = query ? `emcees:q:${query}` : "emcees:all";
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  const supabase = await createClient();

  // Fetch emcees along with their battle participation counts for metadata
  let dbQuery = supabase
    .from("emcees")
    .select(
      `
      id,
      name,
      aka,
      battle_count:battle_participants(count)
    `,
    )
    .order("name");

  if (query) {
    const safeQ = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    dbQuery = dbQuery.ilike("name", `%${safeQ}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Error fetching emcees:", error);
    return NextResponse.json(
      { error: "Failed to fetch emcees." },
      { status: 500 },
    );
  }

  // Flatten the count
  const result = (data || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    aka: e.aka || [],
    battle_count: e.battle_count?.[0]?.count || 0,
  }));
  await setCached(cacheKey, result, 600); // 10 minutes

  return NextResponse.json(result);
}
