import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCached, setCached } from "@/lib/cache";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { uuidSchema } from "@/lib/schemas";
import { Battle } from "@/features/battles/hooks/use-battles-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Validate ID
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return apiError("Invalid emcee ID", 400);
  }

  // 3. Cache check
  const cacheKey = `emcee:${id}`;
  const cachedData = await getCached(cacheKey);
  if (cachedData) {
    return apiSuccess(cachedData);
  }

  const supabase = await createClient();

  // 4. Query Data
  // Fetch emcee basic info
  const emceePromise = supabase
    .from("emcees")
    .select("id, name, aka")
    .eq("id", id)
    .single();

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
    .eq("emcee_id", id)
    .order("event_date", { foreignTable: "battles", ascending: false });

  // Fetch total lines
  const linesCountPromise = supabase
    .from("lines")
    .select("*", { count: "exact", head: true })
    .eq("emcee_id", id);

  const [emceeRes, battlesRes, linesRes] = await Promise.all([
    emceePromise,
    battlesPromise,
    linesCountPromise,
  ]);

  if (emceeRes.error || !emceeRes.data) {
    if (emceeRes.error?.code === "PGRST116") {
      return apiError("Emcee not found", 404);
    }
    console.error("Error fetching emcee:", emceeRes.error);
    return apiError("Failed to fetch emcee", 500);
  }

  const emcee = emceeRes.data;
  
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

  // 5. Cache result
  await setCached(cacheKey, result, 600); // 10 minutes (600 seconds)

  return apiSuccess(result);
}
