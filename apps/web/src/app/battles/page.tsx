import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import BattlesDirectory from "./BattlesDirectory";

// ============================================================================
// Page Export (Server Component)
// ============================================================================

export const revalidate = 300; // 5 minutes

export default async function BattlesPage() {
  const supabase = await createClient();

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
    .order("event_date", { ascending: false, nullsFirst: false })
    .range(0, 23);

  // Fetch all years once for the filter dropdown
  const { data: yearData } = await supabase
    .from("battles")
    .select("event_date")
    .not("event_date", "is", null)
    .neq("status", "excluded");

  const initialYears = yearData
    ? Array.from(
        new Set(yearData.map((d) => d.event_date!.split("-")[0])),
      ).sort((a, b) => b.localeCompare(a))
    : [];

  if (error) {
    console.error("Error fetching battles on server:", error);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <BattlesDirectory
        initialBattles={initialBattles || []}
        initialCount={count || 0}
        initialYears={initialYears}
      />
    </Suspense>
  );
}
