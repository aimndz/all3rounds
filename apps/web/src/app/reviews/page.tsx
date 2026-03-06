"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
  Clock,
  ExternalLink,
} from "lucide-react";
import YouTubeLoopPlayer from "@/components/YouTubeLoopPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";

type Suggestion = {
  id: string;
  line_id: number;
  user_id: string;
  suggested_content: string;
  original_content: string;
  status: string;
  created_at: string;
  lines: {
    content: string;
    start_time: number;
    end_time: number;
    battle: {
      id: string;
      title: string;
      youtube_id: string;
    };
  };
  user: {
    display_name: string;
  };
};

export default function ReviewsPage() {
  /** Map of pending transcript corrections */
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  /** Global loading state for fetching items */
  const [loading, setLoading] = useState(true);
  /** ID of the suggestion currently being processed (approved/rejected) */
  const [processing, setProcessing] = useState<string | null>(null);
  /** Error message to display at the top of the queue */
  const [error, setError] = useState("");
  /** Map of unique keys to force re-render specific video players */
  const [playerKeys, setPlayerKeys] = useState<Record<string, number>>({});

  /** Pagination State */
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchSuggestions = async (pageNum = page) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/suggestions?status=pending,flagged&page=${pageNum}&limit=${itemsPerPage}`,
      );
      if (!res.ok) throw new Error("Failed to fetch suggestions.");
      const result = await res.json();
      setSuggestions(result.data);
      setTotalItems(result.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(page);
  }, [page]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          review_note: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process.");
      }

      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setTotalItems((prev) => prev - 1);

      // If we cleared the page, go to previous if possible
      if (suggestions.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const reloadPlayer = (id: string) => {
    setPlayerKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-primary/20">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Header Section */}
        <div className="mb-10 flex items-end justify-between border-b border-border/40 pb-6">
          <div className="space-y-1 flex gap-3">
            <h1 className="text-3xl font-black  tracking-tight text-white">
              PENDING FIXES
            </h1>
            <div className="h-9 flex items-center bg-white/5 rounded-xl px-4 font-bold text-xs tracking-tighter border border-white/5 text-white/60">
              {totalItems} ITEMS
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchSuggestions(page)}
              className="h-9 w-9 border-white/10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:scale-95 text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row gap-0 overflow-hidden rounded-3xl border border-white/5 bg-[#141417]"
              >
                <div className="relative aspect-video w-full md:w-[340px] bg-black/20 shrink-0">
                  <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
                </div>
                <div className="flex flex-1 flex-col p-6 lg:px-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-2 w-12" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <Skeleton className="h-8 w-24 rounded-xl" />
                    <Skeleton className="h-8 w-28 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-40 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5">
            <Check className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm font-bold text-white/20">
              "Zero pending items. The database is clean."
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="group relative flex flex-col md:flex-row gap-0 overflow-hidden rounded-3xl border border-white/5 bg-[#141417] transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
              >
                {/* Compact Looping Player using the specialized LoopPlayer component */}
                <div className="relative aspect-video w-full md:w-[340px] bg-black shrink-0 overflow-hidden">
                  <YouTubeLoopPlayer
                    key={`${s.id}-${playerKeys[s.id] || 0}`}
                    videoId={s.lines.battle.youtube_id}
                    startTime={s.lines.start_time}
                    endTime={s.lines.end_time}
                    autoplay={!!playerKeys[s.id]}
                    className="absolute inset-0 h-full w-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                    playerKey={playerKeys[s.id]}
                  />
                </div>

                {/* Content section */}
                <div className="flex flex-1 flex-col p-6 lg:px-8">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/battle/${s.lines.battle.id}?t=${Math.floor(s.lines.start_time)}`}
                        target="_blank"
                        title="View Full Battle"
                        className="flex items-center gap-1.5 font-bold text-primary/60 hover:text-primary transition-all active:scale-95 tracking-wider"
                      >
                        <span>{s.lines.battle.title.toUpperCase()}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reloadPlayer(s.id)}
                          className="flex h-6 items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 text-white/60 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                          title="Replay Segment"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          <span className="text-[9px] font-black">
                            {formatTime(s.lines.start_time)}-
                            {formatTime(s.lines.end_time)}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-[9px] font-bold text-white/20 whitespace-nowrap">
                        SUBMITTED_BY:{" "}
                        {s.user?.display_name?.toUpperCase() || "ANON"}
                      </p>
                      <p className="text-[10px] font-black  text-white/10">
                        S_#{s.line_id.toString().padStart(4, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 flex-1">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 text-center">
                        CURRENT
                      </span>
                      <p className="text-sm text-white/40 leading-relaxed font-medium pl-3 border-l-2 border-white/5">
                        "{s.original_content}"
                      </p>
                    </div>
                    <div className="space-y-1 relative">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/60">
                        SUGGESTION
                      </span>
                      <p className="text-base font-semibold text-white leading-tight tracking-tight pl-3 border-l-2 border-primary transition-all">
                        {s.suggested_content}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-white/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReview(s.id, "reject")}
                      disabled={!!processing}
                      className="h-8 px-4 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-destructive/5 hover:text-destructive rounded-xl transition-all"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview(s.id, "approve")}
                      disabled={!!processing}
                      className="h-8 px-6 text-[10px] font-black uppercase rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-all bg-primary text-black hover:bg-primary/90"
                    >
                      {processing === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1.5" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalItems > itemsPerPage && (
          <div className="mt-12">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`cursor-pointer ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
                  />
                </PaginationItem>

                {Array.from({
                  length: Math.ceil(totalItems / itemsPerPage),
                }).map((_, i) => {
                  const p = i + 1;
                  // Basic pagination logic: show first, last, and around current
                  if (
                    p === 1 ||
                    p === Math.ceil(totalItems / itemsPerPage) ||
                    (p >= page - 1 && p <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={page === p}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (p === page - 2 || p === page + 2) {
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
                      setPage((p) =>
                        Math.min(Math.ceil(totalItems / itemsPerPage), p + 1),
                      )
                    }
                    className={`cursor-pointer ${page === Math.ceil(totalItems / itemsPerPage) ? "pointer-events-none opacity-50" : ""}`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
}
