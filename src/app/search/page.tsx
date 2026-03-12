"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuthStore } from "@/stores/auth-store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import { SearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";

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

function SearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(!!query);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const [prevQuery, setPrevQuery] = useState(query);
  const { canEdit, isUserLoggedIn } = useAuthStore();

  // Reset loading state when query changes via URL
  if (query !== prevQuery) {
    setPrevQuery(query);
    if (!!query) setLoading(true);
  }

  const fetchResults = useCallback(
    async (q: string, p: number, signal?: AbortSignal) => {
      if (!q) {
        setLoading(false);
        setResults([]);
        setTotal(0);
        setTotalPages(0);
        setIsInitialLoad(false);
        return;
      }

      setLoading(true);
      setError("");

      const MAX_RETRIES = 2;
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

          const data = await res.json();
          if (!signal?.aborted) {
            setResults(data.results);
            setTotal(data.total);
            setTotalPages(data.totalPages);
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />

      {/* Search bar */}
      <div className="bg-background/95 sticky top-14 z-30 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <SearchBar initialQuery={query} size="sm" />
        </div>
      </div>

      {/* Results */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Result count */}
        {!loading && !isInitialLoad && !error && query && (
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
            <h1 className="text-foreground text-lg font-semibold whitespace-nowrap">
              {total === 0 ? "No results" : `${total} results`}
            </h1>
            <p className="text-muted-foreground min-w-0 truncate text-sm">
              for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}
        {/* Disclaimer */}
        {!loading && !error && query && results.length > 0 && (
          <div className="border-primary/10 bg-primary/5 mb-4 rounded-xl border p-4 backdrop-blur-sm sm:p-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <AlertCircle className="text-primary h-4 w-4" />
                <p className="text-muted-foreground max-w-xl text-[11px] leading-relaxed">
                  Some labels (e.g. speaker_01) or arrangements are automated
                  and awaiting review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div id="results" className="scroll-mt-32">
          {/* Results list */}
          {!loading && !error && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={result.id}>
                  {i > 0 && <Separator className="my-2" />}
                  <ResultCard
                    result={result}
                    isLoggedIn={canEdit}
                    isUserLoggedIn={isUserLoggedIn}
                    onEdited={() => {
                      fetchResults(query, page);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Error state */}
        {error && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mb-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchResults(query, page)}
              className="border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-8 px-3 text-xs font-bold"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                {i > 0 && <Separator className="my-6" />}
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
        )}

        {/* Empty state */}
        {!loading &&
          !isInitialLoad &&
          !error &&
          query &&
          results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="text-muted-foreground/30 mb-4 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                No lines matched &ldquo;{query}&rdquo;
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                Try searching for an emcee name, a punchline, or a phrase.
              </p>
            </div>
          )}

        {/* Initial state (no query) */}
        {!query && (
          <div className="flex flex-col items-center justify-center px-4 py-28 text-center">
            <h2 className="text-foreground mb-3 text-2xl font-black tracking-tight">
              Try searching now
            </h2>
            <p className="text-muted-foreground mx-auto max-w-md text-base leading-relaxed">
              Find lines, punchlines, or track down matches by entering an
              emcee&apos;s name or a phrase.
            </p>
          </div>
        )}

        {/* Results list */}
        {!loading && !error && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={result.id}>
                {i > 0 && <Separator className="my-2" />}
                <ResultCard
                  result={result}
                  isLoggedIn={canEdit}
                  isUserLoggedIn={isUserLoggedIn}
                  onEdited={() => {
                    fetchResults(query, page);
                  }}
                />
              </div>
            ))}
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

                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  // Show pages around current, plus first and last
                  if (
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 2 && p <= page + 2)
                  ) {
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={page === p}
                          onClick={() => handlePageChange(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  // Show ellipsis
                  if (p === page - 3 || p === page + 3) {
                    return (
                      <PaginationItem key={p}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
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
      </main>

      <Footer />
    </div>
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
