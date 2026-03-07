import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCached, setCached } from "@/lib/cache";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { parseSearchTokens, scoreBattle } from "@/lib/fuzzy-utils";

// Use same constant as frontend
const ITEMS_PER_PAGE = 48;

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

    let data, error, count;

    if (q) {
      // 1. Parse search query into meaningful tokens (stripping "vs", etc.)
      const tokens = parseSearchTokens(q);

      if (tokens.length === 0) {
        data = [];
        count = 0;
      } else {
        // 2. Broad Candidate Fetch
        // We fetch matches for ANY token to ensure we don't miss reversed names or partials.
        // We fetch up to 500 candidates to re-rank in-memory for precision.
        let query = supabase
          .from("battles")
          .select("id, title, youtube_id, event_name, event_date, status, url")
          .neq("status", "excluded");

        if (status !== "all") {
          query = query.eq("status", status);
        }

        if (year !== "all") {
          query = query
            .gte("event_date", `${year}-01-01`)
            .lte("event_date", `${year}-12-31`);
        }

        // Combine all tokens into a single OR query for efficiency
        const orConditions = tokens
          .map((token) => {
            const safeToken = token.replace(/%/g, "\\%").replace(/_/g, "\\_");
            return `title.ilike.%${safeToken}%,event_name.ilike.%${safeToken}%`;
          })
          .join(",");

        query = query.or(orConditions).limit(500);

        const broadResult = await query;
        if (broadResult.error) {
          error = broadResult.error;
        } else {
          // 3. Precision Scoring & Re-ranking
          // The database handles the broad filtering, but we handle the sorting Logic
          // (order independent matching, sequence bonuses, and typos) in TypeScript.
          const candidates = broadResult.data || [];

          const scored = candidates
            .map((battle) => ({
              battle,
              score: scoreBattle(battle, tokens),
            }))
            .filter((b) => b.score > 0) // Filter out noise matches
            .sort((a, b) => {
              // Primary sort: Search Relevance Score
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              // Secondary sort: Recency (date)
              const dateA = a.battle.event_date
                ? new Date(a.battle.event_date).getTime()
                : 0;
              const dateB = b.battle.event_date
                ? new Date(b.battle.event_date).getTime()
                : 0;
              if (sort === "oldest") return dateA - dateB;
              return dateB - dateA;
            });

          // 4. Pagination
          count = scored.length;
          const from = page * ITEMS_PER_PAGE;
          data = scored
            .slice(from, from + ITEMS_PER_PAGE)
            .map((s) => ({ ...s.battle, score: s.score }));
        }
      }
    } else {
      // Standard fetch when no search query
      let query = supabase
        .from("battles")
        .select("id, title, youtube_id, event_name, event_date, status, url", {
          count: "exact",
        })
        .neq("status", "excluded");

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

      const result = await query;
      data = result.data;
      error = result.error;
      count = result.count;
    }

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

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      },
    });
  } catch (error) {
    console.error("Battles fetch route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles." },
      { status: 500 },
    );
  }
}
