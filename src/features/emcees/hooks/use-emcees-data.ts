"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Emcee, EmceeSortOption } from "../types";

export function useEmceesData(initialEmcees: Emcee[], initialCount: number) {
  const [emcees, setEmcees] = useState<Emcee[]>(initialEmcees);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCount > initialEmcees.length);
  
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<EmceeSortOption>("name_asc");
  const [countRange, setCountRange] = useState("all");

  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEmcees = useCallback(
    async (
      currentPage: number,
      filters: { q: string; sort: string; minBattles: string },
      isInitial = false
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", "48");
        if (filters.q) params.set("q", filters.q);
        if (filters.sort) params.set("sort", filters.sort);
        if (filters.minBattles && filters.minBattles !== "all") {
          const min = filters.minBattles.replace("+", "");
          params.set("minBattles", min);
        }

        const res = await fetch(`/api/emcees?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        
        if (isInitial) {
          setEmcees(data.emcees);
        } else {
          setEmcees((prev) => {
            const existingIds = new Set(prev.map(e => e.id));
            const uniqueNew = data.emcees.filter((e: Emcee) => !existingIds.has(e.id));
            return [...prev, ...uniqueNew];
          });
        }
        
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Error fetching emcees:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Re-fetch when filters change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchEmcees(1, { q: search, sort, minBattles: countRange }, true);
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, sort, countRange, fetchEmcees]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchEmcees(nextPage, { q: search, sort, minBattles: countRange });
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loading, page, search, sort, countRange, fetchEmcees]);

  return {
    emcees,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    countRange,
    setCountRange,
    totalCount,
    hasMore,
    observerTarget,
  };
}
