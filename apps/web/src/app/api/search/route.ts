import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCached } from "@/lib/cache";

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
  const formattedData = (data as any[])?.map((row) => ({
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
  }));

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
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
