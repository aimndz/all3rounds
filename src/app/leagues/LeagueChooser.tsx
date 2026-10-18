import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  formatPublicBattleCount,
  type PublicLeague,
} from "@/lib/leagues";

type LeagueChooserProps = {
  leagues: PublicLeague[];
};

export function LeagueChooser({ leagues }: LeagueChooserProps) {
  if (leagues.length === 0) {
    return (
      <div className="surface-card surface-card--muted px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">
          No leagues have public battles yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {leagues.map((league) => (
        <article
          key={league.slug}
          className="surface-card surface-card--muted hover:border-primary/40 overflow-hidden p-4 transition-colors"
        >
          <Link
            href={`/leagues/${encodeURIComponent(league.slug)}`}
            prefetch={false}
            aria-label={`Browse ${league.name} battles`}
            className="group block"
          >
            <div className="border-border/50 bg-background/50 relative flex aspect-[2.4/1] items-center justify-center overflow-hidden rounded-(--radius-control) border">
              {league.logoSrc ? (
                <Image
                  src={league.logoSrc}
                  alt={league.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-contain p-5 transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${league.name} fallback`}
                  className="text-muted-foreground px-5 text-center text-2xl font-black tracking-[0.18em] uppercase"
                >
                  {league.name}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-foreground group-hover:text-primary text-lg font-semibold transition-colors">
                  {league.name}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {formatPublicBattleCount(league.battleCount)}
                </p>
              </div>
              <span className="text-primary text-[10px] font-bold tracking-[0.16em] uppercase">
                Browse
              </span>
            </div>
          </Link>

          <div className="border-border/40 mt-4 border-t pt-3">
            <a
              href={league.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Official ${league.name} channel`}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              Official channel
              <ExternalLink className="size-3" />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
