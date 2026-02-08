import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query" },
      { status: 400 },
    );
  }

  // --- Rate limiting ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rateLimitKey = user
    ? `user:${user.id}`
    : `ip:${request.headers.get("x-forwarded-for") || "unknown"}`;
  const rateLimitConfig = user
    ? RATE_LIMITS.authenticated
    : RATE_LIMITS.anonymous;

  const { allowed, remaining } = checkRateLimit(rateLimitKey, rateLimitConfig);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": remaining.toString() },
      },
    );
  }

  // --- Search ---
  // Use ILIKE with trigram index for fuzzy matching
  const { data, error, count } = await supabase
    .from("lines")
    .select(
      `
      id,
      content,
      start_time,
      end_time,
      round_number,
      speaker_label,
      emcee:emcees ( id, name ),
      battle:battles ( id, title, youtube_id, event_name, event_date, url )
    `,
      { count: "exact" },
    )
    .ilike("content", `%${query}%`)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    results: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
