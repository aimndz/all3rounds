import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
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
    // Profiling check via Pooler instead of REST
    const profileRes = await db.query(
      "SELECT role FROM user_profiles WHERE id = $1 LIMIT 1",
      [user.id]
    );
    isSuperadmin = profileRes.rows[0]?.role === "superadmin";
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
          headers: {
            ...getRateLimitHeaders(rateRes),
            "Retry-After": "60",
          },
        },
      );
    }
  }

  // --- Cache check ---
  const cacheKey = `search:v2:${query}:${page}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
      },
    });
  }

  // --- Hybrid Search with pooled connection ---
  let data: SearchRpcRow[] = [];
  let count = 0;

  try {
    // 1. Get the paginated results
    // The RPC returns 500 max by default in its definition, but we paginate here.
    const searchRes = await db.query<SearchRpcRow>(
      `SELECT * FROM search_all_hybrid($1) OFFSET $2 LIMIT $3`,
      [query, offset, limit],
    );
    data = searchRes.rows.map((row: SearchRpcRow) => ({
      ...row,
      id: Number(row.id), // Handle BIGINT string
    }));

    // 2. Get the total count if we have results
    // Optimization: If results < limit and page 1, count is just data.length
    if (page === 1 && data.length < limit) {
      count = data.length;
    } else {
      const countRes = await db.query<{ count: string }>(
        `SELECT count(*) FROM search_all_hybrid($1)`,
        [query],
      );
      count = parseInt(countRes.rows[0].count, 10);
    }
  } catch (err: unknown) {
    // Type narrowing for database errors
    if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
      const error = err as { code: string; message?: string };
      // Check for statement timeout (57014)
      if (error.code === "57014") {
        console.warn(`Search timeout for "${query}" through pooler.`);
        return NextResponse.json(
          {
            error:
              "The database is currently under heavy load. Please try again in a few seconds.",
          },
          { status: 503, headers: { "Retry-After": "5" } },
        );
      }
    }

    console.error("Search Pooler error:", err);
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

    const [emceesResult, participantsResult, contextResult] = await Promise.all([
      uniqueEmceeIds.size > 0
        ? db.query<{ id: string; name: string }>(
            "SELECT id, name FROM emcees WHERE id = ANY($1)",
            [Array.from(uniqueEmceeIds)]
          )
        : Promise.resolve({ rows: [] as { id: string; name: string }[] }),

      uniqueBattleIds.length > 0
        ? db.query<{
            battle_id: string;
            label: string;
            emcee_id: string | null;
            emcee_name: string | null;
          }>(
            `SELECT bp.battle_id, bp.label, e.id as emcee_id, e.name as emcee_name 
             FROM battle_participants bp
             LEFT JOIN emcees e ON bp.emcee_id = e.id
             WHERE bp.battle_id = ANY($1)`,
            [uniqueBattleIds]
          )
        : Promise.resolve({
            rows: [] as {
              battle_id: string;
              label: string;
              emcee_id: string | null;
              emcee_name: string | null;
            }[],
          }),

      queryIds.length > 0
        ? db.query<{
            id: number | string;
            content: string;
            battle_id: string;
            speaker_label: string | null;
            round_number: number | null;
          }>(
            "SELECT id, content, battle_id, speaker_label, round_number FROM lines WHERE id = ANY($1)",
            [queryIds]
          )
        : Promise.resolve({
            rows: [] as {
              id: number | string;
              content: string;
              battle_id: string;
              speaker_label: string | null;
              round_number: number | null;
            }[],
          }),
    ]);

    if (emceesResult.rows.length > 0) {
      const emceeMap = new Map(emceesResult.rows.map((e) => [e.id, e]));
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

    if (participantsResult.rows.length > 0) {
      const participantMap = new Map<
        string,
        { label: string; emcee: { id: string; name: string } | null }[]
      >();
      participantsResult.rows.forEach((p) => {
        if (!participantMap.has(p.battle_id))
          participantMap.set(p.battle_id, []);
        participantMap.get(p.battle_id)?.push({
          label: p.label,
          emcee: p.emcee_id ? { id: p.emcee_id, name: p.emcee_name || "Unknown" } : null,
        });
      });
      formattedData.forEach((row) => {
        row.battle.participants = participantMap.get(row.battle.id) || [];
      });
    }

    if (contextResult.rows.length > 0) {
      const contextMap = new Map(
        contextResult.rows.map((line) => [Number(line.id), line]),
      );
      formattedData.forEach((row) => {
        const prev = contextMap.get(row.id - 1);
        if (prev && prev.battle_id === row.battle.id) {
          row.prev_line = {
            id: Number(prev.id),
            content: prev.content,
            speaker_label: prev.speaker_label,
            round_number: prev.round_number,
          };
        }
        const next = contextMap.get(row.id + 1);
        if (next && next.battle_id === row.battle.id) {
          row.next_line = {
            id: Number(next.id),
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

  await setCached(cacheKey, result, 3600); // 1 hour Redis cache
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
    },
  });
}
