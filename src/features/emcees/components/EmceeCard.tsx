import { memo } from "react";
import Link from "next/link";
import { getEmceePath } from "@/lib/emcees";
import { Emcee } from "../types";

interface EmceeCardProps {
  emcee: Emcee;
}

export const EmceeCard = memo(function EmceeCard({ emcee }: EmceeCardProps) {
  return (
    <Link
      href={getEmceePath(emcee.slug)}
      prefetch={false}
      className="surface-card surface-card--interactive group relative flex min-h-28 flex-col justify-between p-4 transition-all duration-500 hover:shadow-2xl active:scale-[0.99] sm:min-h-32 sm:p-5"
    >
      <div className="bg-primary/5 absolute top-0 right-0 h-20 w-20 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-100 sm:h-24 sm:w-24" />

      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="group-hover:text-primary text-base leading-tight font-bold tracking-tight text-white transition-colors sm:text-lg">
            {emcee.name}
          </h2>
          <div className="border-border/50 bg-muted/5 text-muted-foreground group-hover:border-primary/10 group-hover:bg-primary/5 group-hover:text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 transition-all duration-500 sm:px-2.5">
            <span className="text-[10px] leading-none">{emcee.battle_count}</span>
            <span className="text-[9px] leading-none tracking-tight uppercase opacity-70 sm:text-[10px]">
              Battles
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});

EmceeCard.displayName = "EmceeCard";
