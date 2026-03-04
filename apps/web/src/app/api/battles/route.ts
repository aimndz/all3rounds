import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCached, setCached } from "@/lib/cache";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

// Use same constant as frontend
const ITEMS_PER_PAGE = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "all";
  const year = searchParams.get("year") || "all";
  const sort = searchParams.get("sort") || "latest";

  const rawPage = parseInt(searchParams.get("page") || "0", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;

  // --- Rate limiting ---
  const rateLimitKey = `battles_dir:${request.headers.get("x-forwarded-for") || "unknown"}`;
  const rateRes = await checkRateLimit(rateLimitKey, "directory");

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
  // Create a deterministic cache key based on query params
  const cacheKey = `battles:page:${page}:q:${q || "none"}:status:${status}:year:${year}:sort:${sort}`;

  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // --- Database Fetch ---
  try {
    const supabase = await createClient();

    let query = supabase
      .from("battles")
      .select("id, title, youtube_id, event_name, event_date, status, url", {
        count: "exact",
      })
      .neq("status", "excluded");

    // Apply Search
    if (q) {
      // Escape special ILIKE characters (%) and (_) to prevent pattern injection
      const safeQ = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`title.ilike.%${safeQ}%,event_name.ilike.%${safeQ}%`);
    }

    // Apply Status Filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply Year Filter
    if (year !== "all") {
      query = query
        .gte("event_date", `${year}-01-01`)
        .lte("event_date", `${year}-12-31`);
    }

    // Apply Sort
    query = query.order("event_date", {
      ascending: sort === "oldest",
      nullsFirst: false,
    });

    // Apply Pagination
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("DB Fetch Error:", error);
      throw error;
    }

    const payload = {
      battles: data || [],
      count: count || 0,
      hasMore: (data || []).length === ITEMS_PER_PAGE,
    };

    // --- Cache Save ---
    // Cache for 5 minutes (300 seconds) to match SSR reval
    await setCached(cacheKey, payload, 300);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Battles fetch route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles." },
      { status: 500 },
    );
  }
}
