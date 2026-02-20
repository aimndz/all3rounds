"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Mic2,
  Search,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Battle = {
  id: string;
  title: string;
  youtube_id: string;
  event_name: string | null;
  event_date: string | null;
  url: string;
};

type EventGroup = {
  name: string;
  date: string | null;
  battles: Battle[];
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
  });
}

/** Group battles by event_name, sorted by most recent event first. */
function groupByEvent(battles: Battle[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();

  for (const battle of battles) {
    const key = battle.event_name || "Other Battles";
    if (!groups.has(key)) {
      groups.set(key, { name: key, date: battle.event_date, battles: [] });
    }
    groups.get(key)!.battles.push(battle);
  }

  // Sort groups: most recent event date first
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// ============================================================================
// Battle Card
// ============================================================================

function BattleCard({ battle }: { battle: Battle }) {
  return (
    <Link href={`/battle/${battle.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={`https://img.youtube.com/vi/${battle.youtube_id}/mqdefault.jpg`}
            alt={battle.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        {/* Info */}
        <div className="p-3.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {battle.title}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {battle.event_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {formatDate(battle.event_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Event Section
// ============================================================================

function EventSection({
  group,
  defaultOpen = true,
}: {
  group: EventGroup;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="space-y-4">
      {/* Event Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group/header flex w-full items-center gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover/header:text-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover/header:text-foreground" />
          )}
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {group.name}
          </h2>
        </div>

        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {group.battles.length}
        </span>

        {group.date && (
          <span className="ml-auto text-xs text-muted-foreground">
            {formatEventDate(group.date)}
          </span>
        )}
      </button>

      {/* Battle Grid */}
      {isOpen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function BattlesDirectory() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetchBattles() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("battles")
          .select("*")
          .order("event_date", { ascending: false });

        if (error) throw error;
        setBattles(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch battles.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBattles();
  }, []);

  // Filter battles by search query
  const filteredBattles = useMemo(
    () =>
      battles.filter(
        (b) =>
          b.title.toLowerCase().includes(filter.toLowerCase()) ||
          b.event_name?.toLowerCase().includes(filter.toLowerCase()),
      ),
    [battles, filter],
  );

  // Group filtered results by event
  const eventGroups = useMemo(
    () => groupByEvent(filteredBattles),
    [filteredBattles],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Battles
            </h1>
            <p className="text-sm text-muted-foreground">
              {battles.length} battles across{" "}
              {new Set(battles.map((b) => b.event_name).filter(Boolean)).size}{" "}
              events
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search battles or events..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-10">
            {[...Array(2)].map((_, gi) => (
              <div key={gi} className="space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse overflow-hidden rounded-lg border border-border"
                    >
                      <div className="aspect-video w-full bg-muted" />
                      <div className="space-y-2 p-3.5">
                        <div className="h-4 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredBattles.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <Mic2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filter
                ? `No battles found matching "${filter}"`
                : "No battles have been transcribed yet."}
            </p>
          </div>
        ) : (
          /* Event Groups */
          <div className="space-y-10">
            {eventGroups.map((group, idx) => (
              <EventSection
                key={group.name}
                group={group}
                defaultOpen={idx < 3}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function BattlesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <BattlesDirectory />
    </Suspense>
  );
}
