import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCached } from "@/lib/cache";
import type { SearchResult } from "@/lib/types";

interface SearchRpcRow {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee_id: string | null;
  emcee_name: string | null;
  battle_id: string;
  battle_title: string;
  battle_youtube_id: string;
  battle_event_name: string | null;
  battle_event_date: string | null;
  battle_status: string;
  rank: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!query || query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "Search query must be between 2 and 200 characters." },
      { status: 400 },
    );
  }

  const maxPage = 50;
  if (page > maxPage) {
    return NextResponse.json(
      { error: "Page number too large." },
      { status: 400 },
    );
  }

  // --- Rate limiting ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSuperadmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isSuperadmin = profile?.role === "superadmin";
  }

  if (!isSuperadmin) {
    const rateLimitKey = user
      ? `user:${user.id}`
      : `ip:${request.headers.get("x-forwarded-for") || "unknown"}`;

    const rateRes = await checkRateLimit(rateLimitKey, "search");

    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateRes),
        },
      );
    }
  }

  // --- Cache check ---
  const cacheKey = `search:${query}:${page}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // --- Search ---
  // Using the hybrid search RPC function that combines FTS and Trigrams
  const { data, error, count } = await supabase
    .rpc("search_all_hybrid", { search_term: query }, { count: "exact" })
    .range(offset, offset + limit - 1);

  // Map the flat RPC result back to the expected nested structure for the frontend
  const formattedData = (data as SearchRpcRow[] | null)?.map((row) => ({
    id: row.id,
    content: row.content,
    start_time: row.start_time,
    end_time: row.end_time,
    round_number: row.round_number,
    speaker_label: row.speaker_label,
    emcee: row.emcee_id ? { id: row.emcee_id, name: row.emcee_name } : null,
    battle: {
      id: row.battle_id,
      title: row.battle_title,
      youtube_id: row.battle_youtube_id,
      event_name: row.battle_event_name,
      event_date: row.battle_event_date,
      status: row.battle_status,
      // URL is a generated column in battles table, we reconstruct it here or fetch it
      url: `https://www.youtube.com/watch?v=${row.battle_youtube_id}`,
    },
    rank: row.rank,
    prev_line: undefined as SearchResult["prev_line"],
    next_line: undefined as SearchResult["next_line"],
  }));

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
  }

  // --- Fetch Context Lines ---
  if (formattedData && formattedData.length > 0) {
    const contextIds = new Set<number>();
    formattedData.forEach((row) => {
      contextIds.add(row.id - 1);
      contextIds.add(row.id + 1);
    });

    const queryIds = Array.from(contextIds);

    // Only fetch if we have ids
    if (queryIds.length > 0) {
      const { data: contextLines } = await supabase
        .from("lines")
        .select("id, content, battle_id, speaker_label, round_number")
        .in("id", queryIds);

      if (contextLines) {
        const contextMap = new Map();
        contextLines.forEach((line) => contextMap.set(line.id, line));

        formattedData.forEach((row) => {
          const prev = contextMap.get(row.id - 1);
          if (prev && prev.battle_id === row.battle.id) {
            row.prev_line = {
              id: prev.id,
              content: prev.content,
              speaker_label: prev.speaker_label,
              round_number: prev.round_number,
            };
          }

          const next = contextMap.get(row.id + 1);
          if (next && next.battle_id === row.battle.id) {
            row.next_line = {
              id: next.id,
              content: next.content,
              speaker_label: next.speaker_label,
              round_number: next.round_number,
            };
          }
        });
      }
    }
  }

  const result = {
    results: formattedData || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };

  // --- Cache store ---
  await setCached(cacheKey, result, 120); // 2 minutes

  return NextResponse.json(result);
}
