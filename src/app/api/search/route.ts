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
  speaker_ids: string[] | null;
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
  const cacheKey = `search:v2:${query}:${page}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // --- Hybrid Search with retry on timeout ---
  const MAX_RETRIES = 2;
  let data: SearchRpcRow[] | null = null;
  let error: { code?: string; message?: string } | null = null;
  let count: number | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await supabase
      .rpc("search_all_hybrid", { search_term: query }, { count: "exact" })
      .range(offset, offset + limit - 1);

    data = result.data;
    error = result.error;
    count = result.count;

    if (!error) break;

    // Only retry on statement timeout (PostgreSQL error 57014)
    const isTimeout = error.code === "57014";
    if (isTimeout && attempt < MAX_RETRIES) {
      console.warn(
        `Search timeout for "${query}" (attempt ${attempt + 1}), retrying...`,
      );
      continue;
    }

    console.error("Search RPC error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
  }

  // ── Construct Initial Result Structure ──
  const formattedData = (data as SearchRpcRow[] | null)?.map((row) => ({
    id: row.id,
    content: row.content,
    start_time: row.start_time,
    end_time: row.end_time,
    round_number: row.round_number,
    speaker_label: row.speaker_label,
    speaker_ids: row.speaker_ids,
    emcee: row.emcee_id
      ? { id: row.emcee_id, name: row.emcee_name || "Unknown" }
      : null,
    battle: {
      id: row.battle_id,
      title: row.battle_title,
      youtube_id: row.battle_youtube_id,
      event_name: row.battle_event_name,
      event_date: row.battle_event_date,
      status: row.battle_status,
      url: `https://www.youtube.com/watch?v=${row.battle_youtube_id}`,
      participants: [] as {
        label: string;
        emcee: { id: string; name: string } | null;
      }[],
    },
    rank: row.rank,
    prev_line: undefined as SearchResult["prev_line"],
    next_line: undefined as SearchResult["next_line"],
    emcees: [] as { id: string; name: string }[],
  }));

  // ── Batch Fetch Remaining Data (Emcees, Participants, Context) ──
  if (formattedData && formattedData.length > 0) {
    const uniqueEmceeIds = new Set<string>();
    formattedData.forEach((row) => {
      row.speaker_ids?.forEach((id) => uniqueEmceeIds.add(id));
      if (row.emcee?.id) uniqueEmceeIds.add(row.emcee.id);
    });

    const uniqueBattleIds = Array.from(
      new Set(formattedData.map((row) => row.battle.id)),
    );

    const contextLineIds = new Set<number>();
    formattedData.forEach((row) => {
      contextLineIds.add(row.id - 1);
      contextLineIds.add(row.id + 1);
    });
    const queryIds = Array.from(contextLineIds);

    const [emceesResult, participantsResult, contextResult] = await Promise.all(
      [
        uniqueEmceeIds.size > 0
          ? supabase
              .from("emcees")
              .select("id, name")
              .in("id", Array.from(uniqueEmceeIds))
          : Promise.resolve({
              data: [] as { id: string; name: string }[] | null,
              error: null,
            }),

        uniqueBattleIds.length > 0
          ? supabase
              .from("battle_participants")
              .select("battle_id, label, emcee:emcees ( id, name )")
              .in("battle_id", uniqueBattleIds)
          : Promise.resolve({
              data: [] as
                | {
                    battle_id: string;
                    label: string;
                    emcee: { id: string; name: string } | null;
                  }[]
                | null,
              error: null,
            }),

        queryIds.length > 0
          ? supabase
              .from("lines")
              .select("id, content, battle_id, speaker_label, round_number")
              .in("id", queryIds)
          : Promise.resolve({
              data: [] as
                | {
                    id: number;
                    content: string;
                    battle_id: string;
                    speaker_label: string | null;
                    round_number: number | null;
                  }[]
                | null,
              error: null,
            }),
      ],
    );

    if (emceesResult.data) {
      const emceeMap = new Map(emceesResult.data.map((e) => [e.id, e]));
      formattedData.forEach((row) => {
        const resolved: { id: string; name: string }[] = [];
        row.speaker_ids?.forEach((id) => {
          const e = emceeMap.get(id);
          if (e) resolved.push(e);
        });
        if (resolved.length === 0 && row.emcee) {
          resolved.push(row.emcee);
        }
        row.emcees = resolved;
      });
    }

    if (participantsResult.data) {
      const participantMap = new Map<
        string,
        { label: string; emcee: { id: string; name: string } | null }[]
      >();
      participantsResult.data.forEach((p) => {
        if (!participantMap.has(p.battle_id))
          participantMap.set(p.battle_id, []);
        participantMap.get(p.battle_id)?.push({
          label: p.label,
          emcee: Array.isArray(p.emcee) ? p.emcee[0] : p.emcee,
        });
      });
      formattedData.forEach((row) => {
        row.battle.participants = participantMap.get(row.battle.id) || [];
      });
    }

    if (contextResult.data) {
      const contextMap = new Map(
        contextResult.data.map((line) => [line.id, line]),
      );
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

  const result = {
    results: formattedData || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };

  await setCached(cacheKey, result, 120);
  return NextResponse.json(result);
}
