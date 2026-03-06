"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Mic2,
  Search,
  ArrowUpDown,
  X,
  ListFilter,
  Edit2,
  Loader2,
  Check,
  MousePointerClick,
  Ban,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  score?: number; // Optional relevance score from search API
};

type EventGroup = {
  name: string;
  date: string | null;
  battles: Battle[];
  maxScore: number;
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

/**
 * Groups battles by event name and sorts those groups based on either date or
 * search relevance scores. If searching, the group with the highest-scoring
 * battle will bubble to the top.
 */
function groupByEvent(
  battles: Battle[],
  sortBy: string = "latest",
  isSearching: boolean = false,
): EventGroup[] {
  const groups = new Map<string, EventGroup>();

  for (const battle of battles) {
    const key = battle.event_name || "Other Battles";
    if (!groups.has(key)) {
      groups.set(key, {
        name: key,
        date: battle.event_date,
        battles: [],
        maxScore: 0,
      });
    }
    const group = groups.get(key)!;
    group.battles.push(battle);

    // Track the highest relevance score in this group to use for group sorting
    if (battle.score && battle.score > group.maxScore) {
      group.maxScore = battle.score;
    }
  }

  // Sort the resulting event groups
  return Array.from(groups.values()).sort((a, b) => {
    // If a search is active, prioritize groups with higher relevance scores
    if (isSearching) {
      if (b.maxScore !== a.maxScore) {
        return b.maxScore - a.maxScore;
      }
    }

    // Default: Sort by date
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return sortBy === "latest" ? dateB - dateA : dateA - dateB;
  });
}

// ============================================================================
// Battle Card
// ============================================================================

function BattleCard({
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
        "overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:shadow-md",
        selectable && selected
          ? "border-primary ring-2 ring-primary/30"
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
        <div className="absolute inset-0 bg-linear-to-bl from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Status Badge */}
        <div className="absolute right-2 top-2">
          <StatusBadge
            status={battle.status}
            noTooltip
            className="backdrop-blur-xl"
          />
        </div>

        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute left-2 top-2">
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-black/40 border-white/60 backdrop-blur-sm",
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {battle.title}
        </h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
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

// ============================================================================
// Event Section
// ============================================================================

function EventSection({
  group,
  defaultOpen = true,
  onToggle,
  isSuperadmin = false,
  onRenameGroup,
  allEventNames = [],
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: {
  group: EventGroup;
  defaultOpen?: boolean;
  onToggle?: (name: string, isOpen: boolean) => void;
  isSuperadmin?: boolean;
  onRenameGroup?: (oldName: string, newName: string) => void;
  allEventNames?: string[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(group.name, next);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === group.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/battles/event-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: group.name, newName: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to rename");
      }
      const finalName =
        newName.trim() === "Other Battles" ? "" : newName.trim();
      onRenameGroup?.(group.name, finalName);
      toast({
        title: "Event renamed",
        description: `Renamed ${group.battles.length} battle(s).`,
      });
      setIsRenameOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h2
                className={cn(
                  "text-lg font-bold tracking-tight transition-colors duration-300",
                  isOpen ? "text-foreground" : "text-foreground/80",
                )}
              >
                {group.name}
              </h2>

              {isSuperadmin && !selectionMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewName(
                      group.name === "Other Battles" ? "" : group.name,
                    );
                    setIsRenameOpen(true);
                  }}
                  className="rounded-full p-1.5 text-muted-foreground/40 hover:bg-primary/10 hover:text-primary transition-all"
                  title="Rename event"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}

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
              <BattleCard
                key={battle.id}
                battle={battle}
                selectable={selectionMode}
                selected={selectedIds?.has(battle.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      {isSuperadmin && (
        <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Rename Event</DialogTitle>
              <DialogDescription>
                This will update the event name for all{" "}
                <strong>{group.battles.length}</strong> battle
                {group.battles.length !== 1 && "s"} in &quot;{group.name}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                list="event-suggestions"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. "Ahon 16"'
                disabled={isSubmitting}
                autoFocus
              />
              <datalist id="event-suggestions">
                {allEventNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={
                  isSubmitting ||
                  !newName.trim() ||
                  newName.trim() === group.name
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
  initialEventNames = [],
}: {
  initialBattles: Battle[];
  initialCount: number;
  initialYears: string[];
  initialEventNames?: string[];
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
    initialBattles.length === 48 ? true : false,
  );
  const [totalCount, setTotalCount] = useState<number | null>(initialCount);
  const [dbYears, setDbYears] = useState<string[]>(initialYears);
  const [userRole, setUserRole] = useState("viewer");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  // -- Filter State from URL --
  const filter = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const yearFilter = searchParams.get("year") || "all";
  const sortBy = searchParams.get("sort") || "latest";

  // -- Local UI State --
  const [searchInput, setSearchInput] = useState(filter);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  // -- Superadmin: Global Battle Selection --
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBattles, setSelectedBattles] = useState<
    Record<string, Battle>
  >({});

  const selectedBattleIds = useMemo(
    () => new Set(Object.keys(selectedBattles)),
    [selectedBattles],
  );
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetName, setMoveTargetName] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();

  const toggleBattleSelection = (id: string) => {
    setSelectedBattles((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        const battle = battles.find((b) => b.id === id);
        if (battle) next[id] = battle;
      }
      return next;
    });
  };

  const handleMoveSelected = async () => {
    if (!moveTargetName.trim() || selectedBattleIds.size === 0) return;
    setIsMoving(true);
    try {
      const res = await fetch("/api/battles/event-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          newName: moveTargetName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move battles");
      }
      const finalName =
        moveTargetName.trim() === "Other Battles" ? "" : moveTargetName.trim();
      setBattles((prev) =>
        prev.map((b) =>
          selectedBattleIds.has(b.id) ? { ...b, event_name: finalName } : b,
        ),
      );
      toast({
        title: "Battles moved",
        description: `Moved ${selectedBattleIds.size} battle(s) to "${moveTargetName.trim()}".`,
      });
      setSelectedBattles({});
      setIsMoveDialogOpen(false);
      setSelectionMode(false);
      setMoveTargetName("");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  // -- Exclude Selected --
  const [isExcludeDialogOpen, setIsExcludeDialogOpen] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleExcludeSelected = async () => {
    if (selectedBattleIds.size === 0) return;
    setIsExcluding(true);
    try {
      const res = await fetch("/api/battles/batch-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          status: "excluded",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to exclude battles");
      }
      // Remove excluded battles from the local list
      setBattles((prev) => prev.filter((b) => !selectedBattleIds.has(b.id)));
      toast({
        title: "Battles excluded",
        description: `Excluded ${selectedBattleIds.size} battle(s).`,
      });
      setSelectedBattles({});
      setIsExcludeDialogOpen(false);
      setSelectionMode(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsExcluding(false);
    }
  };

  // Get selected battles info for preview
  const selectedBattlesInfo = useMemo(
    () => Object.values(selectedBattles),
    [selectedBattles],
  );

  const ITEMS_PER_PAGE = 48;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchInput(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateSearch({ q: newVal });
    }, 300);
  };

  useEffect(() => {
    // Only update on initial filter mount or explicit URL changes that don't match the input
    if (filter !== searchInput && debounceTimerRef.current === null) {
      setSearchInput(filter);
    }
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
    () => groupByEvent(filteredBattles, sortBy, !!filter),
    [filteredBattles, sortBy, filter],
  );

  const clearFilters = () => {
    setSearchInput("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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
                <span>{config.label}</span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between bg-muted/20 border-border/50 h-10 rounded-xl focus:ring-primary/5 text-foreground px-3 font-normal cursor-pointer hover:bg-muted/20 transition-all hover:scale-[1.02]"
            >
              {yearFilter === "all" ? "All Years" : yearFilter}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] p-2">
            <div className="grid grid-cols-4 gap-1.5">
              <DropdownMenuItem
                className={cn(
                  "col-span-4 justify-center font-medium cursor-pointer rounded-lg",
                  yearFilter === "all"
                    ? "bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
                    : "bg-muted/50 focus:bg-muted",
                )}
                onClick={() => updateSearch({ year: "all" })}
              >
                All Years
              </DropdownMenuItem>
              {availableYears.map((y) => (
                <DropdownMenuItem
                  key={y}
                  className={cn(
                    "justify-center cursor-pointer rounded-lg transition-colors",
                    yearFilter === y
                      ? "bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground focus:bg-muted/50",
                  )}
                  onClick={() => updateSearch({ year: y })}
                >
                  {y}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-10 px-4 text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted/30 rounded-xl"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full">
        <div className="sticky top-14 z-30 -mx-4 mb-8 bg-background/95 px-4 py-4 backdrop-blur-sm border-b border-border/10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
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
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    type="text"
                    placeholder="Search battles or events..."
                    className="w-full h-11 rounded-2xl border border-border/50 bg-muted/10 pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/40 focus:bg-muted/20 focus:ring-4 focus:ring-primary/5"
                    value={searchInput}
                    onChange={handleSearchChange}
                    onBlur={() => {
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = null;
                      }
                      updateSearch({ q: searchInput });
                    }}
                  />
                  {/* Internal Loading / Clear States */}
                  <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    {searchInput && !loading && totalCount !== null && (
                      <span className="text-[10px] font-medium text-muted-foreground/60 mr-1 hidden sm:inline-block">
                        {totalCount} results
                      </span>
                    )}
                    {loading && searchInput && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
                    )}
                    {searchInput && !loading && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          if (debounceTimerRef.current)
                            clearTimeout(debounceTimerRef.current);
                          updateSearch({ q: "" });
                        }}
                        className="h-4 w-4 rounded-full bg-muted-foreground/20 text-muted-foreground flex justify-center items-center hover:bg-muted-foreground/40 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {filter ? (
              <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            ) : (
              <Mic2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            )}
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {filter ? "No results found" : "No battles yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {filter
                ? `We couldn't find anything matching "${filter}". Try adjusting your spellings or using fewer keywords.`
                : "No battles have been transcribed yet."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-6" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {eventGroups.map((group) => (
              <EventSection
                key={group.name}
                group={group}
                defaultOpen={filter ? true : expandedGroups.has(group.name)}
                onToggle={handleToggleGroup}
                isSuperadmin={userRole === "superadmin"}
                allEventNames={initialEventNames}
                selectionMode={selectionMode}
                selectedIds={selectedBattleIds}
                onToggleSelect={toggleBattleSelection}
                onRenameGroup={(oldName: string, newName: string) => {
                  setBattles((prev) =>
                    prev.map((b) =>
                      b.event_name === oldName ||
                      (!b.event_name && oldName === "Other Battles")
                        ? { ...b, event_name: newName }
                        : b,
                    ),
                  );
                }}
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

      {/* ── Superadmin: Floating Selection Bar ── */}
      {userRole === "superadmin" && (
        <>
          {/* Toggle Selection Mode Button — in bottom-right */}
          {!selectionMode && (
            <button
              onClick={() => setSelectionMode(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
            >
              <MousePointerClick className="h-4 w-4" />
              Select Battles
            </button>
          )}

          {/* Floating Action Bar */}
          {selectionMode && (
            <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
              {/* Preview Panel */}
              {previewOpen && selectedBattlesInfo.length > 0 && (
                <div className="border-b border-border/30 bg-muted/20">
                  <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Selected Battles
                      </span>
                      <button
                        onClick={() => setPreviewOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {selectedBattlesInfo.map((battle) => (
                        <div
                          key={battle.id}
                          className="flex items-center gap-2 shrink-0 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 group/preview"
                        >
                          <Image
                            src={`https://img.youtube.com/vi/${battle.youtube_id}/default.jpg`}
                            alt={battle.title}
                            width={40}
                            height={30}
                            className="rounded object-cover"
                            unoptimized
                          />
                          <span className="text-xs font-medium max-w-[140px] truncate">
                            {battle.title}
                          </span>
                          <button
                            onClick={() => toggleBattleSelection(battle.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {selectedBattleIds.size} battle
                    {selectedBattleIds.size !== 1 && "s"} selected
                  </span>
                  {selectedBattleIds.size > 0 && (
                    <>
                      <button
                        onClick={() => setPreviewOpen(!previewOpen)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <ChevronUp
                          className={cn(
                            "h-3 w-3 transition-transform",
                            previewOpen && "rotate-180",
                          )}
                        />
                        {previewOpen ? "Hide" : "Preview"}
                      </button>
                      <button
                        onClick={() => setSelectedBattles({})}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedBattles({});
                      setPreviewOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedBattleIds.size === 0}
                    onClick={() => setIsExcludeDialogOpen(true)}
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    Exclude
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedBattleIds.size === 0}
                    onClick={() => {
                      setMoveTargetName("");
                      setIsMoveDialogOpen(true);
                    }}
                  >
                    Change Event
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Move Dialog */}
          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Event Name</DialogTitle>
                <DialogDescription>
                  Assign {selectedBattleIds.size} selected battle
                  {selectedBattleIds.size !== 1 && "s"} to a new event.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  list="move-event-suggestions"
                  value={moveTargetName}
                  onChange={(e) => setMoveTargetName(e.target.value)}
                  placeholder='e.g. "Ahon 16"'
                  disabled={isMoving}
                  autoFocus
                />
                <datalist id="move-event-suggestions">
                  {initialEventNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsMoveDialogOpen(false)}
                  disabled={isMoving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMoveSelected}
                  disabled={isMoving || !moveTargetName.trim()}
                >
                  {isMoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    `Move ${selectedBattleIds.size} Battle${selectedBattleIds.size !== 1 ? "s" : ""}`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Exclude Confirmation Dialog */}
          <Dialog
            open={isExcludeDialogOpen}
            onOpenChange={setIsExcludeDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exclude Battles</DialogTitle>
                <DialogDescription>
                  Are you sure you want to exclude{" "}
                  <strong>{selectedBattleIds.size}</strong> battle
                  {selectedBattleIds.size !== 1 && "s"}? They will be hidden
                  from the directory and skipped by the pipeline.
                </DialogDescription>
              </DialogHeader>
              {/* Preview in dialog */}
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
                {selectedBattlesInfo.map((battle) => (
                  <div
                    key={battle.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Image
                      src={`https://img.youtube.com/vi/${battle.youtube_id}/default.jpg`}
                      alt={battle.title}
                      width={48}
                      height={36}
                      className="rounded object-cover shrink-0"
                      unoptimized
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {battle.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {battle.event_name || "Other Battles"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsExcludeDialogOpen(false)}
                  disabled={isExcluding}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleExcludeSelected}
                  disabled={isExcluding}
                >
                  {isExcluding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluding...
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Exclude {selectedBattleIds.size} Battle
                      {selectedBattleIds.size !== 1 && "s"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
