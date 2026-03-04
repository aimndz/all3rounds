"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
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
    } catch (err: any) {
      setError(err.message);
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-border/40 pb-6 gap-4">
          <div className="space-y-1 flex gap-3 items-center">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <History className="h-8 w-8 text-primary" />
              REVIEW AUDIT LOG
            </h1>
            <div className="h-9 flex items-center bg-white/5 rounded-xl px-4 font-bold text-xs tracking-tighter border border-white/5 text-white/60">
              {reviews.length} ITEMS
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#141417] border border-white/10 rounded-xl p-1">
              {["all", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
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
              className="h-9 w-9 border-white/10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:scale-95 text-white bg-transparent"
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
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl border-2 border-primary/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 h-12 w-12 animate-ping -z-10 bg-primary/5 rounded-2xl" />
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-40 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5">
            <History className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm font-bold text-white/20">
              No audit records found.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`group relative flex flex-col md:flex-row gap-0 overflow-hidden rounded-3xl border transition-all duration-500 bg-[#141417]
                  ${r.status === "approved" ? "border-primary/20" : "border-destructive/20"}
                `}
              >
                <div className="relative aspect-video w-full md:w-[320px] bg-black shrink-0 overflow-hidden">
                  <YouTubeLoopPlayer
                    key={`${r.id}-${playerKeys[r.id] || 0}`}
                    videoId={r.lines.battle.youtube_id}
                    startTime={r.lines.start_time}
                    endTime={r.lines.end_time}
                    autoplay={!!playerKeys[r.id]}
                    className="absolute inset-0 h-full w-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                    playerKey={playerKeys[r.id]}
                  />
                </div>

                <div className="flex flex-1 flex-col p-6 lg:px-8">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/battle/${r.lines.battle.id}?t=${Math.floor(r.lines.start_time)}`}
                        target="_blank"
                        className="flex items-center gap-1.5 font-bold text-primary/60 hover:text-primary transition-all active:scale-95 tracking-wider"
                      >
                        <span>{r.lines.battle.title.toUpperCase()}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => reloadPlayer(r.id)}
                        className="flex w-fit h-6 items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 text-white/60 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
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
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider
                        ${r.status === "approved" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}
                      `}
                      >
                        {r.status}
                      </span>
                      <p className="text-[10px] font-bold text-white/40 mt-1">
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

                  <div className="flex flex-col gap-4 flex-1">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                        ORIGINAL
                      </span>
                      <p
                        className={`text-sm leading-relaxed font-medium pl-3 border-l-2
                        ${r.status === "rejected" ? "text-white border-primary/50" : "text-white/40 border-white/5 line-through"}
                      `}
                      >
                        {r.original_content}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                        SUGGESTION
                      </span>
                      <p
                        className={`text-sm leading-relaxed font-medium pl-3 border-l-2
                        ${r.status === "approved" ? "text-primary border-primary" : "text-white/40 border-white/5 line-through decoration-destructive/50"}
                      `}
                      >
                        {r.suggested_content}
                      </p>
                    </div>
                    {r.review_note && (
                      <div className="mt-2 text-xs text-white/60 bg-white/5 p-3 rounded-xl whitespace-pre-wrap">
                        <span className="font-bold text-white/40 mr-2 uppercase text-[10px]">
                          Note:
                        </span>
                        {r.review_note}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-white/5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOverride(r.id, r.status)}
                      disabled={!!processing}
                      className="h-8 px-4 text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5 hover:text-white rounded-xl transition-all"
                    >
                      {processing === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                      ) : (
                        <>
                          <UndoIcon className="h-3 w-3 mr-1.5" />
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
