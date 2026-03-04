import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("emcees:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const adminClient = createAdminClient();

  // Fetch all emcees with their counts
  let query = adminClient
    .from("emcees")
    .select(
      "id, name, aka, created_at, battle_participants(count), lines(count)",
    )
    .order("name", { ascending: true });

  if (q) {
    // Escape special ILIKE characters (%) and (_) to prevent pattern injection
    const safeQ = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("name", `%${safeQ}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch emcees error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emcees." },
      { status: 500 },
    );
  }

  // Format the counts properly
  const formattedData = data.map((emcee: any) => ({
    id: emcee.id,
    name: emcee.name,
    aka: emcee.aka || [],
    created_at: emcee.created_at,
    battle_count: emcee.battle_participants?.[0]?.count ?? 0,
    line_count: emcee.lines?.[0]?.count ?? 0,
  }));

  return NextResponse.json(formattedData);
}
