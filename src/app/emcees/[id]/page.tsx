import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmceeProfile from "./EmceeProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { Battle } from "@/features/battles/hooks/use-battles-data";

export const revalidate = 600; // 10 minutes

export default async function EmceeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch emcee basic info
  const emceePromise = supabase
    .from("emcees")
    .select("id, name, aka")
    .eq("id", id)
    .single();

  // 2. Fetch battles where emcee is a participant
  const battlesPromise = supabase
    .from("battle_participants")
    .select(
      `
      battles (
        id,
        title,
        youtube_id,
        event_name,
        event_date,
        url,
        status
      )
    `,
    )
    .eq("emcee_id", id)
    .order("event_date", { foreignTable: "battles", ascending: false });

  // 3. Fetch total lines
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
      notFound();
    }
    console.error("Error fetching emcee profile:", emceeRes.error);
    throw new Error("Failed to load emcee profile");
  }

  const emcee = emceeRes.data as {
    id: string;
    name: string;
    aka: string[] | null;
  };
  const rawBattles =
    (battlesRes.data as unknown as { battles: Battle | null }[]) || [];
  const battles = rawBattles
    .map((pb) => pb.battles)
    .filter(
      (b): b is Battle => b !== null && (b.status as string) !== "excluded",
    );

  const totalBattles = battles.length;
  const totalLines = linesRes.count || 0;
  const events = Array.from(
    new Set(
      battles
        .map((b) => b.event_name)
        .filter((name): name is string => Boolean(name)),
    ),
  );

  const profileData = {
    id: emcee.id,
    name: emcee.name,
    aka: emcee.aka || [],
    stats: {
      total_battles: totalBattles,
      total_lines: totalLines,
      unique_events: events.length,
    },
    battles,
    events,
  };

  return (
    <Suspense fallback={<EmceeProfileSkeleton />}>
      <EmceeProfile data={profileData} />
    </Suspense>
  );
}

function EmceeProfileSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
      <div className="mb-12 space-y-4">
        <Skeleton className="h-12 w-64 md:h-16" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-video rounded-xl" />
        ))}
      </div>
    </div>
  );
}
