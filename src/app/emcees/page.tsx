import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import EmceesDirectory from "./EmceesDirectory";

export const revalidate = 600; // 10 minutes

export default async function EmceesPage() {
  const supabase = await createClient();

  const { data: initialEmcees, error } = await supabase
    .from("emcees")
    .select(
      `
      id,
      name,
      aka,
      battle_count:battle_participants(count)
    `,
    )
    .order("name");

  if (error) {
    console.error("Error fetching emcees on server:", error);
  }

  const flattenedEmcees = (initialEmcees || []).map(
    (e: {
      id: string;
      name: string;
      aka: string[] | null;
      battle_count: { count: number }[];
    }) => ({
      id: e.id,
      name: e.name,
      aka: e.aka || [],
      battle_count: e.battle_count?.[0]?.count || 0,
    }),
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
      <EmceesDirectory initialEmcees={flattenedEmcees} />
    </Suspense>
  );
}
