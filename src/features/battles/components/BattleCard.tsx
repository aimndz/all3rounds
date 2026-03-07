import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import type { Battle } from "@/features/battles/hooks/use-battles-data";

export function BattleCard({
  battle,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  battle: Battle;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const card = (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-md",
        selectable && selected
          ? "border-primary ring-primary/30 ring-2"
          : selectable
            ? "border-border hover:border-primary/50 cursor-pointer"
            : "border-border hover:border-primary/50",
      )}
      onClick={
        selectable
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.(battle.id);
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <Image
          src={`https://img.youtube.com/vi/${battle.youtube_id}/mqdefault.jpg`}
          alt={battle.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-bl from-black/40 via-transparent to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge
            status={battle.status}
            noTooltip
            className="backdrop-blur-xl"
          />
        </div>

        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute top-2 left-2">
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/60 bg-black/40 backdrop-blur-sm",
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-sm leading-snug font-semibold transition-colors">
          {battle.title}
        </h3>
        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
          {battle.event_date && (
            <span className="flex items-center gap-1">
              {formatDate(battle.event_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (selectable) {
    return <div className="group block">{card}</div>;
  }

  return (
    <Link href={`/battle/${battle.id}`} className="group block">
      {card}
    </Link>
  );
}
