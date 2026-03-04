"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Mic2,
  Search,
  FileText,
  Filter,
  ArrowUpDown,
  X,
  ListFilter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatusBadge, STATUS_CONFIG } from "@/components/StatusBadge";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Types
// ============================================================================

type BattleStatus = "raw" | "arranged" | "reviewing" | "reviewed";

type Battle = {
  id: string;
  title: string;
  youtube_id: string;
  event_name: string | null;
  event_date: string | null;
  url: string;
  status: BattleStatus;
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

/** Group battles by event_name, respecting the selected sort order. */
function groupByEvent(
  battles: Battle[],
  sortBy: string = "latest",
): EventGroup[] {
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
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return sortBy === "latest" ? dateB - dateA : dateA - dateB;
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
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <Image
            src={`https://img.youtube.com/vi/${battle.youtube_id}/mqdefault.jpg`}
            alt={battle.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* Top-right scrim for badge legibility */}
          <div className="absolute inset-0 bg-linear-to-bl from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Status Badge Over Image */}
          <div className="absolute right-2 top-2">
            <StatusBadge
              status={battle.status}
              noTooltip
              className="backdrop-blur-xl"
            />
          </div>
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
  onToggle,
}: {
  group: EventGroup;
  defaultOpen?: boolean;
  onToggle?: (name: string, isOpen: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Sync internal state with prop changes (for URL sync)
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(group.name, next);
  };

  return (
    <section className="group/section">
      {/* Event Header */}
      <div
        onClick={handleToggle}
        className={cn(
          "flex cursor-pointer items-center gap-4 py-4 transition-all duration-300",
          "border-b border-border/50 hover:border-primary/30",
          isOpen ? "mb-6" : "mb-2",
        )}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Accent Line + Chevron */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-[3px] rounded-full transition-all duration-500",
                isOpen ? "bg-primary scale-y-100" : "bg-muted scale-y-50",
              )}
            />
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background transition-transform duration-300",
                isOpen ? "rotate-180 border-primary/20" : "rotate-0",
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isOpen ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
          </div>

          {/* Event Info */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h2
                className={cn(
                  "text-lg font-black tracking-tight transition-colors duration-300",
                  isOpen ? "text-foreground" : "text-foreground/80",
                )}
              >
                {group.name}
              </h2>

              {/* Battle Count Tag - Moved here */}
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition-all duration-500",
                  isOpen
                    ? "border-primary/10 bg-primary/5 text-primary"
                    : "border-border/50 bg-muted/5 text-muted-foreground",
                )}
              >
                <span className="text-[10px]">{group.battles.length}</span>
                <span className="text-[10px] uppercase tracking-tighter opacity-70">
                  Battles
                </span>
              </div>
            </div>
            {group.date && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {formatEventDate(group.date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Battle Grid */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-500",
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none",
        )}
      >
        <div className="min-h-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-12">
            {group.battles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BattlesDirectory({
  initialBattles,
  initialCount,
  initialYears,
}: {
  initialBattles: Battle[];
  initialCount: number;
  initialYears: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [battles, setBattles] = useState<Battle[]>(initialBattles);
  const [loading, setLoading] = useState(false); // Initial load is done on server
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(
    initialBattles.length === 24 ? true : false,
  );
  const [totalCount, setTotalCount] = useState<number | null>(initialCount);
  const [dbYears, setDbYears] = useState<string[]>(initialYears);

  // -- Filter State from URL --
  const filter = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const yearFilter = searchParams.get("year") || "all";
  const sortBy = searchParams.get("sort") || "latest";

  // -- Local UI State --
  const [searchInput, setSearchInput] = useState(filter);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 24;

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filter) {
        updateSearch({ q: searchInput });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, filter]);

  useEffect(() => {
    // Sync search input with URL if changed externally (e.g. back button)
    setSearchInput(filter);
  }, [filter]);

  useEffect(() => {
    // Fallback to LocalStorage for "memory" only (No URL sync for expansion)
    const saved = localStorage.getItem("a3r_expanded_groups");
    if (saved) {
      setExpandedGroups(new Set(saved.split("|")));
    }
  }, []);

  async function fetchBattles(
    currentPage: number,
    currentFilters: {
      q: string;
      status: string;
      year: string;
      sort: string;
    },
    isInitial = false,
  ) {
    if (isInitial) setLoading(true);
    else {
      setIsFetchingMore(true);
    }

    try {
      // Build query string
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      if (currentFilters.q) params.set("q", currentFilters.q);
      if (currentFilters.status && currentFilters.status !== "all")
        params.set("status", currentFilters.status);
      if (currentFilters.year && currentFilters.year !== "all")
        params.set("year", currentFilters.year);
      if (currentFilters.sort && currentFilters.sort !== "latest")
        params.set("sort", currentFilters.sort);

      const res = await fetch(`/api/battles?${params.toString()}`);

      if (!res.ok) {
        let msg = "Failed to fetch battles.";
        if (res.status === 429)
          msg = "Too many requests. Please wait a moment.";
        throw new Error(msg);
      }

      const { battles: incomingBattles, count, hasMore } = await res.json();

      if (isInitial) {
        setBattles(incomingBattles || []);
      } else if (incomingBattles) {
        setBattles((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const uniqueNewBattles = incomingBattles.filter(
            (b: Battle) => !existingIds.has(b.id),
          );
          return [...prev, ...uniqueNewBattles];
        });
      }

      setTotalCount(count);
      setHasMore(hasMore);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch battles.");
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }

  // Effect to handle INITIAL fetch when filters change
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const isFiltered =
        filter ||
        statusFilter !== "all" ||
        yearFilter !== "all" ||
        sortBy !== "latest";
      if (!isFiltered) return;
    }

    setPage(0);
    fetchBattles(
      0,
      { q: filter, status: statusFilter, year: yearFilter, sort: sortBy },
      true,
    );
  }, [filter, statusFilter, yearFilter, sortBy]);

  // Infinite Scroll Handler
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          !isFetchingMore
        ) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBattles(
            nextPage,
            { q: filter, status: statusFilter, year: yearFilter, sort: sortBy },
            false,
          );
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [
    hasMore,
    loading,
    isFetchingMore,
    page,
    filter,
    statusFilter,
    yearFilter,
    sortBy,
  ]);

  // Update URL helpers
  const updateSearch = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  const handleToggleGroup = (name: string, isOpen: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);

      const nextStr = Array.from(next).join("|");

      // Update LocalStorage for long-term memory
      localStorage.setItem("a3r_expanded_groups", nextStr);

      return next;
    });
  };

  const availableYears = useMemo(() => {
    const years = new Set(dbYears);
    battles.forEach((b) => {
      if (b.event_date) {
        years.add(b.event_date.split("-")[0]);
      }
    });

    if (yearFilter !== "all") {
      years.add(yearFilter);
    }

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [dbYears, battles, yearFilter]);

  const filteredBattles = battles;

  const eventGroups = useMemo(
    () => groupByEvent(filteredBattles, sortBy),
    [filteredBattles, sortBy],
  );

  const clearFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters =
    filter ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    sortBy !== "latest";

  const FilterContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={cn(
        "flex flex-col gap-6",
        !mobile && "sm:flex-row sm:items-center sm:gap-4",
      )}
    >
      {/* Status Filter */}
      <div className="space-y-2 flex-1">
        {mobile && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Status
          </label>
        )}
        <Select
          value={statusFilter}
          onValueChange={(v) => updateSearch({ status: v })}
        >
          <SelectTrigger className="w-full sm:w-[150px] bg-muted/20 border-border/50 h-10 rounded-xl focus:ring-primary/5">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([id, config]) => (
              <SelectItem key={id} value={id}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-3.5 w-3.5" />
                  <span>{config.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Filter */}
      <div className="space-y-2 flex-1 text-white">
        {mobile && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Year
          </label>
        )}
        <Select
          value={yearFilter}
          onValueChange={(v) => updateSearch({ year: v })}
        >
          <SelectTrigger className="w-full sm:w-[120px] bg-muted/20 border-border/50 h-10 rounded-xl focus:ring-primary/5 text-white">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 flex-1">
        {mobile && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Sort By
          </label>
        )}
        <Select value={sortBy} onValueChange={(v) => updateSearch({ sort: v })}>
          <SelectTrigger className="w-full sm:w-[140px] bg-muted/20 border-border/50 h-10 rounded-xl focus:ring-primary/5">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-10 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Battles
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wider opacity-60">
              {totalCount !== null ? totalCount : battles.length} battles •{" "}
              {new Set(battles.map((b) => b.event_name).filter(Boolean)).size}{" "}
              events
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <form
              className="relative flex-1 lg:w-[320px]"
              onSubmit={(e) => {
                e.preventDefault();
                updateSearch({ q: searchInput });
              }}
            >
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Search battles or events..."
                className="w-full h-11 rounded-2xl border border-border/50 bg-muted/10 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/40 focus:bg-muted/20 focus:ring-4 focus:ring-primary/5"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => updateSearch({ q: searchInput })}
              />
            </form>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden h-11 w-11 shrink-0 bg-muted/10 border-border/50 rounded-2xl hover:bg-muted/20 transition-all"
                >
                  <ListFilter className="h-5 w-5 text-muted-foreground/60" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-auto max-h-[70vh] border-t border-border/10 bg-background/95 backdrop-blur-3xl p-6 pb-10 shadow-2xl"
              >
                <SheetTitle className="sr-only">Filters</SheetTitle>
                <div className="mt-2">
                  <FilterContent mobile />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden lg:block ml-2">
              <FilterContent />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-10">
            {[...Array(2)].map((_, gi) => (
              <div key={gi} className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <Skeleton className="aspect-video w-full rounded-none" />
                      <div className="space-y-2 p-3.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredBattles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Mic2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filter
                ? `No battles found matching "${filter}"`
                : "No battles have been transcribed yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {eventGroups.map((group, idx) => (
              <EventSection
                key={group.name}
                group={group}
                defaultOpen={
                  expandedGroups.has(group.name) ||
                  (expandedGroups.size === 0 && idx === 0)
                }
                onToggle={handleToggleGroup}
              />
            ))}

            <div
              ref={observerTarget}
              className="flex justify-center py-12 w-full"
            >
              {isFetchingMore && (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    Loading more
                  </span>
                </div>
              )}

              {!hasMore && battles.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-px w-24 bg-border/50" />
                  <p className="text-xs font-medium text-muted-foreground/30 uppercase tracking-wider">
                    You've reached the end
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
