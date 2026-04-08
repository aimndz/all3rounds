"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  Suspense,
  useRef,
  useMemo,
  memo,
} from "react";
import { useAuthStore } from "@/stores/auth-store";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import {
  buildSearchQuery,
  getAppliedSearchFilters,
  parseSearchQuery,
} from "@/lib/search-query";
import type {
  SearchResult,
  SearchQueryMeta,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Search, AlertCircle } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { StickyPageHeader } from "@/components/StickyPageHeader";
import { PageShell } from "@/components/ui/page-shell";

type SearchResultsListProps = {
  results: SearchResult[];
  canEdit: boolean;
  isUserLoggedIn: boolean;
  onResultEdited: () => void;
};

type SearchApiResponse = {
  results: SearchResult[];
  total: number;
  totalPages: number;
  query: SearchQueryMeta;
};

const SEARCH_RESULTS_CACHE_TTL_MS = 30_000;
const SEARCH_PLACEHOLDER = "Search lines or add a filter";

const SearchResultsList = memo(function SearchResultsList({
  results,
  canEdit,
  isUserLoggedIn,
  onResultEdited,
}: SearchResultsListProps) {
  return (
    <div className="flex flex-col">
      {results.map((result, i) => (
        <div key={result.id}>
          {i > 0 && <Separator />}
          <ResultCard
            result={result}
            isLoggedIn={canEdit}
            isUserLoggedIn={isUserLoggedIn}
            onEdited={onResultEdited}
          />
        </div>
      ))}
    </div>
  );
});

const SearchResultsLoadingSkeleton = memo(
  function SearchResultsLoadingSkeleton() {
    return (
      <div className="w-full flex flex-col gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-6" />}
            <div className="flex animate-pulse gap-4 sm:gap-6">
              <div className="bg-muted hidden aspect-video w-40 shrink-0 self-start rounded-md sm:block" />
              <div className="flex-1 space-y-4 py-1">
                <div className="bg-muted h-4 w-1/3 max-w-50 rounded" />
                <div className="border-muted space-y-2 border-l-2 pl-3">
                  <div className="bg-muted/60 h-3 w-5/6 rounded" />
                  <div className="bg-muted h-4 w-full rounded" />
                  <div className="bg-muted/60 h-3 w-4/6 rounded" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="bg-muted h-8 w-24 rounded" />
                  <div className="bg-muted h-8 w-16 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

function SearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [queryMeta, setQueryMeta] = useState<SearchQueryMeta>(() => ({
    text: parsedQuery.text,
    appliedFilters: parsedQuery.appliedFilters,
  }));
  const [loading, setLoading] = useState(!!query);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const prevQueryRef = useRef(query);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseCacheRef = useRef<
    Map<string, { data: SearchApiResponse; cachedAt: number }>
  >(new Map());
  const { canEdit, isUserLoggedIn } = useAuthStore();
  const activeFilters = useMemo(
    () => getAppliedSearchFilters(queryMeta.appliedFilters),
    [queryMeta],
  );
  const hasExactEmceeFilter = Boolean(queryMeta.appliedFilters.emcee);
  const textMentionFallbackQuery = useMemo(() => {
    const emceeFilter = queryMeta.appliedFilters.emcee;
    if (!emceeFilter) return "";

    const nextFilters = { ...queryMeta.appliedFilters };
    delete nextFilters.emcee;

    const nextText = [queryMeta.text, emceeFilter].filter(Boolean).join(" ");
    return buildSearchQuery(nextText, nextFilters);
  }, [queryMeta]);
  const noEmceeFilterQuery = useMemo(() => {
    const emceeFilter = queryMeta.appliedFilters.emcee;
    if (!emceeFilter) return "";

    const nextFilters = { ...queryMeta.appliedFilters };
    delete nextFilters.emcee;
    return buildSearchQuery(queryMeta.text, nextFilters);
  }, [queryMeta]);

  useEffect(() => {
    if (query !== prevQueryRef.current) {
      prevQueryRef.current = query;
      if (query) {
        setLoading(true);
      }
    }
  }, [query]);

  useEffect(() => {
    setQueryMeta({
      text: parsedQuery.text,
      appliedFilters: parsedQuery.appliedFilters,
    });
  }, [parsedQuery]);

  const fetchResults = useCallback(
    async (
      q: string,
      p: number,
      signal?: AbortSignal,
      options?: { forceRefresh?: boolean },
    ) => {
      if (!q) {
        setLoading(false);
        setResults([]);
        setTotal(0);
        setTotalPages(0);
        setQueryMeta({ text: "", appliedFilters: {} });
        setIsInitialLoad(false);
        return;
      }

      const cacheKey = `${q.toLowerCase()}::${p}`;
      const now = Date.now();
      const cached = responseCacheRef.current.get(cacheKey);
      const useCachedData =
        !options?.forceRefresh &&
        cached &&
        now - cached.cachedAt <= SEARCH_RESULTS_CACHE_TTL_MS;

      if (useCachedData) {
        setError("");
        setResults(cached.data.results);
        setTotal(cached.data.total);
        setTotalPages(cached.data.totalPages);
        setQueryMeta(cached.data.query);
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }

      setLoading(true);
      setError("");

      const MAX_RETRIES = 0; // Disabled during spike to prevent retry storms
      let attempt = 0;

      const performFetch = async (): Promise<void> => {
        try {
          const timeoutSignal = AbortSignal.timeout(10000);
          const combinedSignal = signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}&page=${p}`,
            { signal: combinedSignal },
          );

          if (res.status === 429) {
            setError("Too many requests — slow down and try again.");
            setLoading(false);
            setIsInitialLoad(false);
            return;
          }

          if (!res.ok) throw new Error("Search failed");

          const data = (await res.json()) as SearchApiResponse;

          responseCacheRef.current.set(cacheKey, {
            data,
            cachedAt: Date.now(),
          });

          if (!signal?.aborted) {
            setResults(data.results);
            setTotal(data.total);
            setTotalPages(data.totalPages);
            setQueryMeta(data.query);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            if (attempt < MAX_RETRIES && !signal?.aborted) {
              attempt++;
              const delay = Math.pow(2, attempt) * 500;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return performFetch();
            }
            if (signal?.aborted) return;
          }

          if (attempt < MAX_RETRIES && !signal?.aborted) {
            attempt++;
            const delay = Math.pow(2, attempt) * 500;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return performFetch();
          }

          setError(
            err instanceof Error && err.name === "AbortError"
              ? "Search timed out. Please check your connection."
              : "Search failed. Please try again.",
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
            setIsInitialLoad(false);
          }
        }
      };

      await performFetch();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(query, page, controller.signal);
    return () => controller.abort();
  }, [query, page, fetchResults]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const scheduleRefresh = useCallback(
    (q: string, p: number) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void fetchResults(q, p, undefined, { forceRefresh: true });
        refreshTimerRef.current = null;
      }, 250);
    },
    [fetchResults],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [pathname, router, searchParams],
  );

  const paginationItems = useMemo(() => {
    return Array.from({ length: totalPages }).map((_, i) => {
      const p = i + 1;

      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        return { type: "page" as const, page: p };
      }

      if (p === page - 3 || p === page + 3) {
        return { type: "ellipsis" as const, page: p };
      }

      return null;
    });
  }, [page, totalPages]);

  const handleResultEdited = useCallback(() => {
    scheduleRefresh(query, page);
  }, [scheduleRefresh, query, page]);
  const handleFallbackSearch = useCallback(
    (nextQuery: string) => {
      if (!nextQuery) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("q", nextQuery);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [pathname, router, searchParams],
  );

  const resultsSummary = useMemo(() => {
    const summaryParts: string[] = [];
    if (queryMeta.text) {
      summaryParts.push(`for "${queryMeta.text}"`);
    }
    if (activeFilters.length > 0) {
      summaryParts.push(
        `in ${activeFilters.map((filter) => `${filter.label}: ${filter.value}`).join(", ")}`,
      );
    }
    return summaryParts.join(" ");
  }, [activeFilters, queryMeta.text]);
  const resultsLabel = total === 0
    ? "No results"
    : total >= 500
      ? "500+ results"
      : `${total} results`;

  return (
    <>
      {/* Top Search bar (Sticky) - Only show when there is a search query */}
      {query && (
        <StickyPageHeader>
          <div className="bg-background/95 border-border/40 mx-auto mb-0 w-full max-w-4xl border-b px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <SearchBar
              key={query}
              initialQuery={query}
              size="lg"
              placeholder={SEARCH_PLACEHOLDER}
            />
          </div>
        </StickyPageHeader>
      )}

      {/* Results or Middle Search */}
      <PageShell
        className={cn(
          "max-w-4xl pb-12",
          !query &&
            "flex min-h-[70vh] flex-col items-center justify-center py-0",
        )}
      >
        <div className="w-full">
          {/* Result count */}
          {!loading && !isInitialLoad && !error && query && (
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
              <h1 className="text-foreground text-lg font-semibold whitespace-nowrap">
                {resultsLabel}
              </h1>
              <p className="text-muted-foreground min-w-0 truncate text-sm">
                {resultsSummary || `for "${query}"`}
              </p>
            </div>
          )}
          <div id="results" className="w-full scroll-mt-32">
            {/* Results list */}
            {!loading && !error && results.length > 0 && (
              <SearchResultsList
                results={results}
                canEdit={canEdit}
                isUserLoggedIn={isUserLoggedIn}
                onResultEdited={handleResultEdited}
              />
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="border-destructive/30 bg-destructive/5 text-destructive mb-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  fetchResults(query, page, undefined, { forceRefresh: true })
                }
                className="border-destructive/20 hover:bg-destructive/10 hover:text-destructive text-xs font-bold"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && <SearchResultsLoadingSkeleton />}

          {/* Empty state */}
          {!loading &&
            !isInitialLoad &&
            !error &&
            query &&
            results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Search className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  No lines matched {resultsSummary || `"${query}"`}
                </p>
                {hasExactEmceeFilter ? (
                  <>
                    <p className="text-muted-foreground/60 mt-1 max-w-md text-center text-xs">
                      This emcee filter only shows tagged speaker lines. Some
                      lines may not be assigned yet.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {textMentionFallbackQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleFallbackSearch(textMentionFallbackQuery)
                          }
                          className="text-xs font-bold"
                        >
                          Search mentions instead
                        </Button>
                      )}
                      {noEmceeFilterQuery && noEmceeFilterQuery !== textMentionFallbackQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFallbackSearch(noEmceeFilterQuery)}
                          className="text-xs font-bold"
                        >
                          Remove emcee filter
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground/60 mt-1 text-xs">
                    Try searching for a phrase, or narrow by emcee, battle, or event.
                  </p>
                )}
              </div>
            )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-12">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => page > 1 && handlePageChange(page - 1)}
                      className={`cursor-pointer ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>

                  {paginationItems.map((item) => {
                    if (!item) return null;

                    if (item.type === "ellipsis") {
                      return (
                        <PaginationItem key={`ellipsis-${item.page}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={item.page}>
                        <PaginationLink
                          isActive={page === item.page}
                          onClick={() => handlePageChange(item.page)}
                          className="cursor-pointer"
                        >
                          {item.page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        page < totalPages && handlePageChange(page + 1)
                      }
                      className={`cursor-pointer ${page === totalPages ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Initial state (no query) - Middle Search Bar */}
        {!query && (
          <div className="w-full max-w-2xl space-y-8 px-4 text-center sm:px-6">
            <div className="space-y-3">
              <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
                Explore Battle Rap <span className="block">Through Search</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Search lines, then narrow by emcee or battle.
              </p>
            </div>
            <div className="mx-auto max-w-xl">
              <SearchBar
                key="search-empty"
                initialQuery=""
                size="lg"
                placeholder={SEARCH_PLACEHOLDER}
              />
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}


