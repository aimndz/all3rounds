import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  formatPublicBattleCount,
  type PublicLeague,
} from "@/lib/leagues";

type LeagueDirectoryHeaderProps = {
  league: PublicLeague;
};

export function LeagueDirectoryHeader({ league }: LeagueDirectoryHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/leagues"
        prefetch={false}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to Leagues
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="border-border/50 bg-background/50 relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-control) border sm:size-20">
            {league.logoSrc ? (
              <Image
                src={league.logoSrc}
                alt={league.name}
                fill
                sizes="80px"
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <div
                role="img"
                aria-label={`${league.name} fallback`}
                className="text-muted-foreground px-2 text-center text-xs font-black tracking-[0.12em] uppercase"
              >
                {league.name}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-bold tracking-[0.18em] uppercase">
              League directory
            </p>
            <h1 className="page-heading truncate">{league.name} Battles</h1>
            <p className="page-meta">
              {formatPublicBattleCount(league.battleCount)}
            </p>
          </div>
        </div>

        <a
          href={league.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Official ${league.name} channel`}
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 text-xs transition-colors"
        >
          Official channel
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
