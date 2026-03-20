import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCached, setCached } from "@/lib/cache";
import { parseSearchTokens, scoreBattle } from "@/lib/fuzzy-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const year = searchParams.get("year") || "all";
  const sort = searchParams.get("sort") || "latest";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "48", 10)),
    50,
  );
  const offset = (page - 1) * limit;

  // Normalize parameters to prevent cache key pollution
  const cleanQ = q.trim().toLowerCase().slice(0, 100);
  const validStatuses = ["raw", "arranged", "reviewing", "reviewed", "excluded"];
  const rawStatus = (searchParams.get("status") || "all").toLowerCase();
  const cleanStatus = validStatuses.includes(rawStatus) ? rawStatus : (rawStatus === "all" ? "all" : "invalid");
  const cleanYear = /^\d{4}$/.test(year) ? year : "all";
  const cleanSort = sort === "oldest" ? "oldest" : "latest";

  // --- Early return for invalid status ---
  if (cleanStatus === "invalid") {
    return NextResponse.json({ battles: [], count: 0 });
  }

  // --- Cache check ---
  const cacheKey = `battles:q:${cleanQ || "none"}:status:${cleanStatus}:year:${cleanYear}:sort:${cleanSort}:p:${page}:l:${limit}`;

  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
  }

  // --- Database Fetch ---
  try {
    const supabase = await createClient();

    let data, error, count;

    if (cleanQ) {
      // 1. Parse search query into meaningful tokens (stripping "vs", etc.)
      const tokens = parseSearchTokens(cleanQ);

      if (tokens.length === 0) {
        data = [];
        count = 0;
      } else {
        // 2. Broad Candidate Fetch
        let query = supabase
          .from("battles")
          .select("id, title, youtube_id, event_name, event_date, status, url")
          .neq("status", "excluded");

        if (cleanStatus !== "all") {
          query = query.eq("status", cleanStatus);
        }

        if (cleanYear !== "all") {
          query = query
            .gte("event_date", `${cleanYear}-01-01`)
            .lte("event_date", `${cleanYear}-12-31`);
        }

        // Combine all tokens into a single OR query for efficiency
        const orConditions = tokens
          .map((token) => {
            const safeToken = token.replace(/%/g, "\\%").replace(/_/g, "\\_");
            return `title.ilike.%${safeToken}%,event_name.ilike.%${safeToken}%`;
          })
          .join(",");

        // Reduced candidate limit for efficiency since we re-rank anyway
        query = query.or(orConditions).limit(200);

        const broadResult = await query;
        if (broadResult.error) {
          error = broadResult.error;
        } else {
          // 3. Precision Scoring & Re-ranking
          const candidates = broadResult.data || [];

          const scored = candidates
            .map((battle) => ({
              battle,
              score: scoreBattle(battle, tokens),
            }))
            .filter((b) => b.score > 0)
            .sort((a, b) => {
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              const dateA = a.battle.event_date
                ? new Date(a.battle.event_date).getTime()
                : 0;
              const dateB = b.battle.event_date
                ? new Date(b.battle.event_date).getTime()
                : 0;
              if (cleanSort === "oldest") return dateA - dateB;
              return dateB - dateA;
            });

          count = scored.length;
          // Split for pagination
          const paginated = scored.slice(offset, offset + limit);
          data = paginated.map((s) => ({ ...s.battle, score: s.score }));
        }
      }
    } else {
      // Standard fetch
      let query = supabase
        .from("battles")
        .select("id, title, youtube_id, event_name, event_date, status, url", {
          count: "exact",
        })
        .neq("status", "excluded");

      // Apply Status Filter
      if (cleanStatus !== "all") {
        query = query.eq("status", cleanStatus);
      }

      // Apply Year Filter
      if (cleanYear !== "all") {
        query = query
          .gte("event_date", `${cleanYear}-01-01`)
          .lte("event_date", `${cleanYear}-12-31`);
      }

      // Apply Sort
      query = query.order("event_date", {
        ascending: cleanSort === "oldest",
        nullsFirst: false,
      });

      // Apply Pagination
      query = query.range(offset, offset + limit - 1);

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
    };

    // --- Cache Save ---
    await setCached(cacheKey, payload, 3600);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
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
