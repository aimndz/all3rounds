import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Auth & Permission Check
  const auth = await requirePermission("emcees:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "latest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const adminClient = createAdminClient();

  // Fetch battles with their participants
  let query = adminClient
    .from("battles")
    .select(
      `
        id, 
        title, 
        youtube_id, 
        event_name, 
        event_date, 
        status, 
        created_at,
        battle_participants(
          id,
          emcee_id,
          label,
          emcees (
            id,
            name,
            aka
          )
        )
      `,
      { count: "exact" }
    );

  if (q) {
    // Escape special ILIKE characters (%) and (_) to prevent pattern injection
    const safeQ = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("title", `%${safeQ}%`);
  }

  // Handle sorting
  if (sort === "title_asc") {
    query = query.order("title", { ascending: true });
  } else if (sort === "title_desc") {
    query = query.order("title", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("event_date", { ascending: true, nullsFirst: false });
  } else {
    // default to latest (event_date)
    query = query.order("event_date", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("Fetch admin battles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    limit,
  });
}
