"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import { SearchResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
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
          setError(
            "Sobrang dami ng search mo, pre. Sandali lang, try mo ulit.",
          );
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
        setError("May problema sa search. Try mo ulit.");
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

      {/* Search bar (compact, sticky below header) */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <SearchBar initialQuery={query} size="sm" />
        </div>
      </div>

      {/* Results */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Result count */}
        {!loading && !error && query && (
          <p className="mb-4 text-sm text-muted-foreground">
            {total === 0
              ? `Walang nahanap para sa "${query}"`
              : `${total} result${total !== 1 ? "s" : ""} para sa "${query}"`}
          </p>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-center text-red-700 dark:text-red-300">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
                  <div className="mt-4 h-9 w-40 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results list */}
        {!loading && !error && (
          <div className="space-y-4">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                isLoggedIn={isLoggedIn}
                onEdited={() => doSearch(page)}
                query={query}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSearch(page - 1)}
              disabled={page <= 1}
            >
              ← Prev
            </Button>
            <span className="px-4 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSearch(page + 1)}
              disabled={page >= totalPages}
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
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
