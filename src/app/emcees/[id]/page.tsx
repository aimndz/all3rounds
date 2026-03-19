import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import EmceeProfile from "./EmceeProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { Battle } from "@/features/battles/hooks/use-battles-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers as nextHeaders } from "next/headers";

export const revalidate = 86400; // 24 hours (1 day)

export default async function EmceeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const headersList = await nextHeaders();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateRes = await checkRateLimit(`ip:${ip}:emcee`, "anonymous");
  
  if (!rateRes.allowed) {
    throw new Error("Too many requests from this IP. Please wait a moment.");
  }

  const supabase = createPublicClient();

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
    <div className="min-h-screen bg-[#09090b]">
      <div className="bg-[#09090b] h-16 border-b border-white/5 animate-pulse" /> {/* Header spacer */}
      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        {/* Back Link Skeleton */}
        <div className="mb-8 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>

        {/* Heading Skeleton */}
        <div className="mb-12">
          <Skeleton className="mb-4 h-12 w-2/3 md:h-16 lg:w-1/2" />
        </div>

        <Skeleton className="mb-12 h-px w-full bg-white/5" />

        {/* Battle History Header */}
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Battles Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3 opacity-50" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
