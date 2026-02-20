"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import { SearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle } from "lucide-react";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setCanEdit(["superadmin", "admin", "editor"].includes(data.role));
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (p: number) => {
      if (!query) return;
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&page=${p}`,
        );
        if (res.status === 429) {
          setError("Too many requests — slow down and try again.");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch {
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    setPage(1);
    doSearch(1);
  }, [query, doSearch]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Search bar */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <SearchBar initialQuery={query} size="sm" />
        </div>
      </div>

      {/* Results */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Result count */}
        {!loading && !error && query && (
          <div className="mb-5 flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {total === 0 ? "No results" : `${total} results`}
            </h1>
            <span className="text-sm text-muted-foreground">
              for &ldquo;{query}&rdquo;
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse gap-4 rounded-xl border border-border p-5"
              >
                <div className="hidden h-20 w-32 shrink-0 rounded-lg bg-muted sm:block" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-full rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-8 w-32 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No lines matched &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Try searching for an emcee name, a punchline, or a Tagalog phrase.
            </p>
          </div>
        )}

        {/* Results list */}
        {!loading && !error && results.length > 0 && (
          <div className="space-y-3">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                isLoggedIn={canEdit}
                onEdited={() => doSearch(page)}
                query={query}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSearch(page - 1)}
              disabled={page <= 1}
              className="h-8 text-xs"
            >
              ← Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSearch(page + 1)}
              disabled={page >= totalPages}
              className="h-8 text-xs"
            >
              Next →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
