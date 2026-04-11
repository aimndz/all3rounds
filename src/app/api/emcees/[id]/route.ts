import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { uuidSchema } from "@/lib/schemas";
import { Battle } from "@/features/battles/hooks/use-battles-data";
import { normalizeEmceeSlug } from "@/lib/emcees";

const EMCEE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=59",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: identifier } = await params;

  const supabase = await createClient();

  const emceeById =
    uuidSchema.safeParse(identifier).success
      ? await supabase
          .from("emcees")
          .select("id, slug, name, aka")
          .eq("id", identifier)
          .maybeSingle()
      : null;

  const emceeRes =
    emceeById?.data
      ? emceeById
      : await supabase
          .from("emcees")
          .select("id, slug, name, aka")
          .eq("slug", normalizeEmceeSlug(identifier))
          .maybeSingle();

  if (emceeRes.error || !emceeRes.data) {
    if (emceeRes.error?.code === "PGRST116" || !emceeRes.data) {
      return apiError("Emcee not found", 404);
    }
    console.error("Error fetching emcee:", emceeRes.error);
    return apiError("Failed to fetch emcee", 500);
  }

  const emcee = emceeRes.data;

  // Fetch battles where emcee is a participant
  // We join with battles to filter by status and get battle details
  const battlesPromise = supabase
    .from("battle_participants")
    .select(`
      battles (
        id,
        title,
        youtube_id,
        event_name,
        event_date,
        url,
        status
      )
    `)
    .eq("emcee_id", emcee.id)
    .order("event_date", { foreignTable: "battles", ascending: false });

  // Fetch total lines
  const linesCountPromise = supabase
    .from("lines")
    .select("*", { count: "exact", head: true })
    .eq("emcee_id", emcee.id);

  const [battlesRes, linesRes] = await Promise.all([
    battlesPromise,
    linesCountPromise,
  ]);

  // Flatten battles and filter out excluded ones
  // Note: the .neq filter in Supabase on joined tables can be tricky, 
  // so we filter in JS to be safe and clear.
  const rawBattles = (battlesRes.data as unknown as { battles: Battle | null }[]) || [];
  const battles = rawBattles
    .map((pb) => pb.battles)
    .filter((b): b is Battle => b !== null && (b.status as string) !== "excluded");
  
  const totalBattles = battles.length;
  const totalLines = linesRes.count || 0;
  const events = Array.from(new Set(battles.map((b) => b.event_name).filter(Boolean)));

  const result = {
    ...emcee,
    stats: {
      total_battles: totalBattles,
      total_lines: totalLines,
      unique_events: events.length,
    },
    battles,
    events,
  };

  return apiSuccess(result, 200, EMCEE_CACHE_HEADERS);
}
