"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";

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

const EVENTS_PER_PAGE = 5;

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
  initialTotalEvents: number,
  _initialYears: string[],
) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [battles, setBattles] = useState<Battle[]>(initialBattles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState<number | null>(initialCount);
  const [totalEvents, setTotalEvents] = useState<number>(initialTotalEvents);
  // -- Filter State from URL --
  const filter = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const yearFilter = searchParams.get("year") || "all";
  const sortBy = searchParams.get("sort") || "latest";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // -- Local UI State --
  const [searchInput, setSearchInput] = useState(filter);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch ALL battles matching filters (no per-row pagination)
  const fetchBattles = useCallback(
    async (
      currentPage: number,
      currentFilters: {
        q: string;
        status: string;
        year: string;
        sort: string;
      },
    ) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (currentFilters.q) params.set("q", currentFilters.q);
        if (currentFilters.status && currentFilters.status !== "all")
          params.set("status", currentFilters.status);
        if (currentFilters.year && currentFilters.year !== "all")
          params.set("year", currentFilters.year);
        if (currentFilters.sort && currentFilters.sort !== "latest")
          params.set("sort", currentFilters.sort);
        params.set("page", String(Math.max(1, currentPage)));
        params.set("eventLimit", String(EVENTS_PER_PAGE));

        const res = await fetch(`/api/battles?${params.toString()}`);

        if (!res.ok) {
          let msg = "Failed to fetch battles.";
          if (res.status === 429)
            msg = "Too many requests. Please wait a moment.";
          throw new Error(msg);
        }

        const {
          battles: incomingBattles,
          count,
          totalEvents: incomingTotalEvents,
        } = await res.json();

        setBattles(incomingBattles || []);
        setTotalCount(count);
        setTotalEvents(
          typeof incomingTotalEvents === "number" ? incomingTotalEvents : 0,
        );
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch battles.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Effect: fetch when page/filters change
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const isFiltered =
        filter ||
        statusFilter !== "all" ||
        yearFilter !== "all" ||
        sortBy !== "latest";
      if (!isFiltered && page === 1 && initialBattles.length > 0) {
        return; // Use initial server data for default first-page load
      }
    }

    fetchBattles(page, {
      q: filter,
      status: statusFilter,
      year: yearFilter,
      sort: sortBy,
    });
  }, [
    filter,
    statusFilter,
    yearFilter,
    sortBy,
    page,
    fetchBattles,
    initialBattles.length,
  ]);

  // Update URL helpers
  const commitSearch = useCallback(
    (nextParams: URLSearchParams, replace = false) => {
      const queryString = nextParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (typeof window === "undefined") {
        return;
      }

      if (replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }
    },
    [pathname],
  );

  const updateSearch = useCallback(
    (
      params: Record<string, string | null>,
      options?: { replace?: boolean },
    ) => {
      const newParams = new URLSearchParams(searchParams.toString());

      // Reset page when filters change (not when page itself is being set)
      if (!("page" in params) && newParams.has("page")) {
        newParams.delete("page");
      }

      Object.entries(params).forEach(([key, value]) => {
        if (
          value === null ||
          value === "all" ||
          value === "" ||
          (key === "page" && value === "1")
        ) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      commitSearch(newParams, options?.replace ?? !("page" in params));
    },
    [searchParams, commitSearch],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      setSearchInput(newVal);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateSearch({ q: newVal }, { replace: true });
      }, 300);
    },
    [updateSearch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateSearch({ page: newPage > 1 ? newPage.toString() : null }, { replace: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateSearch],
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
    const currentYear = new Date().getFullYear();
    const years: string[] = [];

    for (let year = currentYear; year >= 2010; year -= 1) {
      years.push(String(year));
    }

    if (yearFilter !== "all" && !years.includes(yearFilter)) {
      years.unshift(yearFilter);
    }

    return years;
  }, [yearFilter]);

  // All event groups from all battles
  const eventGroups = useMemo(
    () => groupByEvent(battles, sortBy, !!filter),
    [battles, sortBy, filter],
  );

  // Server-side event-based pagination
  const totalPages = Math.max(1, Math.ceil(totalEvents / EVENTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedEventGroups = eventGroups;

  const clearFilters = useCallback(() => {
    setSearchInput("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    commitSearch(new URLSearchParams(), true);
  }, [commitSearch]);

  const hasActiveFilters =
    filter ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    sortBy !== "latest";

  return {
    battles,
    setBattles,
    loading,
    error,
    totalCount,
    totalEvents,
    page: safePage,
    totalPages,
    eventGroups,
    paginatedEventGroups,
    handlePageChange,
    filter,
    statusFilter,
    yearFilter,
    sortBy,
    searchInput,
    setSearchInput,
    expandedGroups,
    debounceTimerRef,
    handleSearchChange,
    updateSearch,
    handleToggleGroup,
    availableYears,
    clearFilters,
    hasActiveFilters,
  };
}
