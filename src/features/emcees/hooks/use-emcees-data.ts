"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { Emcee, EmceeSortOption } from "../types";

const ITEMS_PER_PAGE = 48;

export function useEmceesData(initialEmcees: Emcee[], initialCount: number) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [emcees, setEmcees] = useState<Emcee[]>(initialEmcees);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const page = parseInt(searchParams.get("page") || "1", 10);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<EmceeSortOption>("name_asc");
  const [countRange, setCountRange] = useState("all");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const filtersRef = useRef({ search, sort, countRange });
  filtersRef.current = { search, sort, countRange };
  const lastFetchedPage = useRef(1);

  const fetchEmcees = useCallback(
    async (
      currentPage: number,
      filters: { q: string; sort: string; minBattles: string }
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", ITEMS_PER_PAGE.toString());
        if (filters.q) params.set("q", filters.q);
        if (filters.sort) params.set("sort", filters.sort);
        if (filters.minBattles && filters.minBattles !== "all") {
          const min = filters.minBattles.replace("+", "");
          params.set("minBattles", min);
        }

        const res = await fetch(`/api/emcees?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        setEmcees(data.emcees);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error("Error fetching emcees:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const commitSearch = useCallback(
    (nextParams: URLSearchParams, replace = false) => {
      if (typeof window === "undefined") return;

      const queryString = nextParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }
    },
    [pathname]
  );

  // Effect: When filters change, always fetch page 1 and reset URL page
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      fetchEmcees(1, { q: search, sort, minBattles: countRange });
      lastFetchedPage.current = 1;

      // Reset page in URL if we're not on page 1
      const currentUrlPage = parseInt(
        new URLSearchParams(window.location.search).get("page") || "1",
        10
      );
      if (currentUrlPage > 1) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("page");
        commitSearch(newParams, true);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, sort, countRange, fetchEmcees, commitSearch]);

  // Effect: When page changes via URL (pagination click), fetch that page
  const isFirstPageRun = useRef(true);
  useEffect(() => {
    if (isFirstPageRun.current) {
      isFirstPageRun.current = false;
      if (page === 1) {
        lastFetchedPage.current = 1;
        return; // Initial data covers page 1
      }
      // page > 1 on initial load — fall through to fetch
    }

    if (page === lastFetchedPage.current) return;
    lastFetchedPage.current = page;

    const f = filtersRef.current;
    fetchEmcees(page, { q: f.search, sort: f.sort, minBattles: f.countRange });
  }, [page, fetchEmcees]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) {
        newParams.delete("page");
      } else {
        newParams.set("page", newPage.toString());
      }
      commitSearch(newParams, false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [searchParams, commitSearch]
  );

  return {
    emcees,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    countRange,
    setCountRange,
    page,
    handlePageChange,
    totalCount,
  };
}
