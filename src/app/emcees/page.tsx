import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import EmceesDirectory from "./EmceesDirectory";
import { EmceesSkeleton } from "@/components/PageSkeletons";

export const revalidate = 86400; // 24 hours (1 day)

export default async function EmceesPage() {
  const supabase = createPublicClient();

  const { data: initialEmcees, error, count } = await supabase
    .from("emcees")
    .select("id, name, battle_count", { count: "exact" })
    .order("name")
    .range(0, 47);

  if (error) {
    console.error("Error fetching emcees on server:", error);
  }

  const flattenedEmcees = (initialEmcees || []).map(
    (e: { id: string; name: string; battle_count: number }) => ({
      id: e.id,
      name: e.name,
      aka: [], // AKA no longer needed in UI
      battle_count: e.battle_count || 0,
    })
  );



  return (
    <Suspense fallback={<EmceesSkeleton />}>
      <EmceesDirectory 
        initialEmcees={flattenedEmcees} 
        initialCount={count || 0} 
      />
    </Suspense>
  );
}
