import Link from "next/link";
import Image from "next/image";
import { Check, Youtube, Info } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InlineBattleStatusSelect } from "@/features/battles/components/InlineBattleStatusSelect";
import type { Battle } from "@/features/battles/hooks/use-battles-data";

export function BattleCard({
  battle,
  canEditStatus = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  onStatusUpdated,
}: {
  battle: Battle;
  canEditStatus?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onStatusUpdated?: (battleId: string, status: Battle["status"]) => void;
}) {
  const youtubeUrl =
    battle.url || `https://www.youtube.com/watch?v=${battle.youtube_id}`;

  return (
    <div
      className={cn(
        "surface-card surface-card--interactive group relative flex flex-col overflow-hidden transition-all duration-300",
        selectable && selected
          ? "border-primary ring-primary/30 ring-2"
          : selectable
            ? "cursor-pointer"
            : "",
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
      <Link
        href={`/battles/${battle.id}`}
        prefetch={false}
        className="relative aspect-video w-full overflow-hidden bg-black"
        onClick={(e) => selectable && e.preventDefault()}
      >
        <Image
          src={`https://img.youtube.com/vi/${battle.youtube_id}/mqdefault.jpg`}
          alt={battle.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/60 bg-black/40 backdrop-blur-sm",
              )}
            >
              {selected && <Check className="h-4 w-4 stroke-3" />}
            </div>
          </div>
        )}
      </Link>

      <div className="absolute top-2 right-2 z-10">
        <InlineBattleStatusSelect
          battleId={battle.id}
          status={battle.status}
          canEditStatus={canEditStatus}
          badgeClassName="backdrop-blur-xl"
          onStatusUpdated={(status) => onStatusUpdated?.(battle.id, status)}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex-1">
          <Link
            href={`/battles/${battle.id}`}
            prefetch={false}
            onClick={(e) => selectable && e.preventDefault()}
          >
            <h3 className="text-foreground decoration-primary/30 group-hover:text-primary line-clamp-2 text-sm leading-snug font-bold decoration-2 underline-offset-4 transition-all hover:underline">
              {battle.title}
            </h3>
          </Link>

          <div className="mt-1.5 flex items-center gap-3">
            {battle.event_date && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium sm:text-[11px]">
                {formatDate(battle.event_date)}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="w-full text-[10px] font-bold"
          >
            <Link href={`/battles/${battle.id}`} prefetch={false}>
              <Info className="mr-1.5 h-3 w-3" />
              View Details
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            variant="secondary"
            className="w-full text-[10px] font-bold"
          >
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Watch ${battle.title} on YouTube`}
            >
              <Youtube className="mr-1.5 h-3.5 w-3.5" />
              YouTube
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
