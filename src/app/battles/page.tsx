import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import BattlesDirectory from "./BattlesDirectory";
import { BattlesSkeleton } from "@/components/PageSkeletons";

// ============================================================================
// Page Export (Server Component)
// ============================================================================

export const revalidate = 86400; // 24 hours (1 day)

export default async function BattlesPage() {
  const supabase = createPublicClient();

  // Fetch initial data on the server
  // Note: We use the same parameters as the default client state
  const {
    data: initialBattles,
    error,
    count,
  } = await supabase
    .from("battles")
    .select("id, title, youtube_id, event_name, event_date, status, url", {
      count: "exact",
    })
    .neq("status", "excluded")
    .order("event_date", { ascending: false, nullsFirst: false });

  // Fetch all filter data once
  const { data: filterData } = await supabase
    .from("battles")
    .select("event_date, event_name")
    .neq("status", "excluded");

  const initialYears = filterData
    ? Array.from(
        new Set(
          filterData
            .filter((d) => d.event_date)
            .map((d) => d.event_date!.split("-")[0]),
        ),
      ).sort((a, b) => b.localeCompare(a))
    : [];

  const initialEventNames = filterData
    ? Array.from(new Set(filterData.map((d) => d.event_name).filter(Boolean)))
        .sort((a, b) => a!.localeCompare(b!))
        .filter((n): n is string => n !== null)
    : [];

  if (error) {
    console.error("Error fetching battles on server:", error);
  }

  return (
    <Suspense fallback={<BattlesSkeleton />}>
      <BattlesDirectory
        initialBattles={initialBattles || []}
        initialCount={count || 0}
        initialYears={initialYears}
        initialEventNames={initialEventNames}
      />
    </Suspense>
  );
}
