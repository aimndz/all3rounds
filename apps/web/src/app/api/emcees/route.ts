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

  let dbQuery = supabase.from("emcees").select("id, name").order("name");

  if (query) {
    // Escape special ILIKE characters (%) and (_) to prevent pattern injection
    const safeQ = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    dbQuery = dbQuery.ilike("name", `%${safeQ}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch emcees." },
      { status: 500 },
    );
  }

  // --- Cache store ---
  const result = data || [];
  await setCached(cacheKey, result, 600); // 10 minutes

  return NextResponse.json(result);
}
