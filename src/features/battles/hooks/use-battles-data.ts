"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

export type BattleStatus = "raw" | "arranged" | "reviewing" | "reviewed";

export type Battle = {
  id: string;
  title: string;
  youtube_id: string;
  event_name: string | null;
  event_date: string | null;
  url: string;
  status: BattleStatus;
  score?: number;
};

export type EventGroup = {
  name: string;
  date: string | null;
  battles: Battle[];
  maxScore: number;
};

// ============================================================================
// Helpers
// ============================================================================

export function groupByEvent(
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

    if (battle.score && battle.score > group.maxScore) {
      group.maxScore = battle.score;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (isSearching) {
      if (b.maxScore !== a.maxScore) {
        return b.maxScore - a.maxScore;
      }
    }

    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return sortBy === "latest" ? dateB - dateA : dateA - dateB;
  });
}

// ============================================================================
// Hook
// ============================================================================

export function useBattlesData(
  initialBattles: Battle[],
  initialCount: number,
  initialYears: string[],
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [battles, setBattles] = useState<Battle[]>(initialBattles);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialBattles.length === 48);
  const [totalCount, setTotalCount] = useState<number | null>(initialCount);
  const dbYears = initialYears;

  // -- Filter State from URL --
  const filter = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const yearFilter = searchParams.get("year") || "all";
  const sortBy = searchParams.get("sort") || "latest";

  // -- Local UI State --
  const [searchInput, setSearchInput] = useState(filter);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      setSearchInput(newVal);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateSearch({ q: newVal });
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (filter !== searchInput && debounceTimerRef.current === null) {
      setSearchInput(filter);
    }
  }, [filter, searchInput]);

  useEffect(() => {
    const saved = localStorage.getItem("a3r_expanded_groups");
    if (saved) {
      setExpandedGroups(new Set(saved.split("|")));
    }
  }, []);

  const fetchBattles = useCallback(
    async (
      currentPage: number,
      currentFilters: {
        q: string;
        status: string;
        year: string;
        sort: string;
      },
      isInitial = false,
    ) => {
      if (isInitial) setLoading(true);
      else setIsFetchingMore(true);

      try {
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
        setError(
          err instanceof Error ? err.message : "Failed to fetch battles.",
        );
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [],
  );

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
  }, [filter, statusFilter, yearFilter, sortBy, fetchBattles]);

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
    fetchBattles,
  ]);

  // Update URL helpers

  const updateSearch = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "all" || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleToggleGroup = useCallback((name: string, isOpen: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);

      const nextStr = Array.from(next).join("|");
      localStorage.setItem("a3r_expanded_groups", nextStr);

      return next;
    });
  }, []);

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

  const eventGroups = useMemo(
    () => groupByEvent(battles, sortBy, !!filter),
    [battles, sortBy, filter],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters =
    filter ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    sortBy !== "latest";

  return {
    battles,
    setBattles,
    loading,
    isFetchingMore,
    error,
    hasMore,
    totalCount,
    filter,
    statusFilter,
    yearFilter,
    sortBy,
    searchInput,
    setSearchInput,
    expandedGroups,
    observerTarget,
    debounceTimerRef,
    handleSearchChange,
    updateSearch,
    handleToggleGroup,
    availableYears,
    eventGroups,
    clearFilters,
    hasActiveFilters,
  };
}
