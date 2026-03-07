"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  RotateCcw,
  Clock,
  ExternalLink,
  History,
  UndoIcon,
} from "lucide-react";
import YouTubeLoopPlayer from "@/components/YouTubeLoopPlayer";
import Link from "next/link";

type ReviewAudit = {
  id: string;
  line_id: number;
  user_id: string;
  suggested_content: string;
  original_content: string;
  status: string; // 'approved' | 'rejected'
  created_at: string;
  reviewed_at: string;
  review_note: string | null;
  reviewer: { display_name: string } | null;
  user: { display_name: string } | null;
  lines: {
    content: string;
    start_time: number;
    end_time: number;
    battle: { id: string; title: string; youtube_id: string };
  };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [playerKeys, setPlayerKeys] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch review audit log.");
      const data = await res.json();
      setReviews(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleOverride = async (id: string, currentStatus: string) => {
    const newAction = currentStatus === "approved" ? "reject" : "approve";
    const confirmMsg =
      newAction === "approve"
        ? "Override rejection and APPROVE this suggestion instead?"
        : "Override approval and REJECT this suggestion instead (reverting the text)?";

    if (!confirm(confirmMsg)) return;

    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAction }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process override.");
      }

      const data = await res.json();

      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: data.newStatus } : r)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(null);
    }
  };

  const reloadPlayer = (id: string) => {
    setPlayerKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />
        <div className="border-border/40 mb-10 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
          <div className="flex items-center gap-3 space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
              <History className="text-primary h-8 w-8" />
              REVIEW AUDIT LOG
            </h1>
            <div className="flex h-9 items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold tracking-tighter text-white/60">
              {reviews.length} ITEMS
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-white/10 bg-[#141417] p-1">
              {["all", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-4 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all ${
                    statusFilter === status
                      ? "bg-primary text-black"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchReviews}
              className="hover:bg-primary/5 hover:text-primary h-9 w-9 rounded-xl border-white/10 bg-transparent text-white transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative">
              <div className="border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border-2">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
              <div className="bg-primary/5 absolute inset-0 -z-10 h-12 w-12 animate-ping rounded-2xl" />
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[2.5rem] border border-dashed border-white/10 bg-white/5 py-40 text-center">
            <History className="mx-auto mb-4 h-12 w-12 text-white/10" />
            <p className="text-sm font-bold text-white/20">
              No audit records found.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`group relative flex flex-col gap-0 overflow-hidden rounded-3xl border bg-[#141417] transition-all duration-500 md:flex-row ${r.status === "approved" ? "border-primary/20" : "border-destructive/20"} `}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black md:w-[320px]">
                  <YouTubeLoopPlayer
                    key={`${r.id}-${playerKeys[r.id] || 0}`}
                    videoId={r.lines.battle.youtube_id}
                    startTime={r.lines.start_time}
                    endTime={r.lines.end_time}
                    autoplay={!!playerKeys[r.id]}
                    className="absolute inset-0 h-full w-full grayscale-[0.3] transition-all duration-700 group-hover:grayscale-0"
                    playerKey={playerKeys[r.id]}
                  />
                </div>

                <div className="flex flex-1 flex-col p-6 lg:px-8">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/battle/${r.lines.battle.id}?t=${Math.floor(r.lines.start_time)}`}
                        target="_blank"
                        className="text-primary/60 hover:text-primary flex items-center gap-1.5 font-bold tracking-wider transition-all active:scale-95"
                      >
                        <span>{r.lines.battle.title.toUpperCase()}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => reloadPlayer(r.id)}
                        className="hover:bg-primary/10 hover:text-primary flex h-6 w-fit items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-white/60 transition-all active:scale-95"
                      >
                        <Clock className="h-2.5 w-2.5" />
                        <span className="text-[9px] font-black">
                          {formatTime(r.lines.start_time)}-
                          {formatTime(r.lines.end_time)}
                        </span>
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${r.status === "approved" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"} `}
                      >
                        {r.status}
                      </span>
                      <p className="mt-1 text-[10px] font-bold text-white/40">
                        Reviewed by:{" "}
                        <span className="text-white">
                          {r.reviewer?.display_name || "Unknown"}
                        </span>
                      </p>
                      <p className="text-[9px] font-bold text-white/20">
                        Suggested by: {r.user?.display_name || "Anon"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black tracking-[0.2em] text-white/20 uppercase">
                        ORIGINAL
                      </span>
                      <p
                        className={`border-l-2 pl-3 text-sm leading-relaxed font-medium ${r.status === "rejected" ? "border-primary/50 text-white" : "border-white/5 text-white/40 line-through"} `}
                      >
                        {r.original_content}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-black tracking-[0.2em] text-white/20 uppercase">
                        SUGGESTION
                      </span>
                      <p
                        className={`border-l-2 pl-3 text-sm leading-relaxed font-medium ${r.status === "approved" ? "text-primary border-primary" : "decoration-destructive/50 border-white/5 text-white/40 line-through"} `}
                      >
                        {r.suggested_content}
                      </p>
                    </div>
                    {r.review_note && (
                      <div className="mt-2 rounded-xl bg-white/5 p-3 text-xs whitespace-pre-wrap text-white/60">
                        <span className="mr-2 text-[10px] font-bold text-white/40 uppercase">
                          Note:
                        </span>
                        {r.review_note}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOverride(r.id, r.status)}
                      disabled={!!processing}
                      className="h-8 rounded-xl border-white/10 px-4 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white/5 hover:text-white"
                    >
                      {processing === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                      ) : (
                        <>
                          <UndoIcon className="mr-1.5 h-3 w-3" />
                          Override{" "}
                          {r.status === "approved"
                            ? "to Rejection"
                            : "to Approval"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
