import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import EmceesDirectory from "./EmceesDirectory";

export const revalidate = 600; // 10 minutes

export default async function EmceesPage() {
  const supabase = await createClient();

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
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground animate-pulse text-sm font-black tracking-widest uppercase">
            Loading Emcees...
          </div>
        </div>
      }
    >
      <EmceesDirectory 
        initialEmcees={flattenedEmcees} 
        initialCount={count || 0} 
      />
    </Suspense>
  );
}
