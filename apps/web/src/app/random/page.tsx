"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Shuffle,
  CloudUpload,
  CheckCircle2,
  ChevronRight,
  Mic2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import EmceeSearchModal from "@/components/EmceeSearchModal";
import type { Emcee } from "@/lib/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RandomPage() {
  const [line, setLine] = useState<SearchResult | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  // Emcee state
  const [emcees, setEmcees] = useState<Emcee[]>([]);
  const [emceeId, setEmceeId] = useState<string>("none");
  const [isEmceeModalOpen, setIsEmceeModalOpen] = useState(false);
  const [savingEmcee, setSavingEmcee] = useState(false);
  const saveInProgress = useRef(false);

  // Refs to track latest state for auto-save
  const contentRef = useRef(content);
  const emceeIdRef = useRef(emceeId);
  const lineRef = useRef(line);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    emceeIdRef.current = emceeId;
  }, [emceeId]);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);

  const ytPlayerInstance = useRef<any>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  const selectedEmcee = React.useMemo(() => {
    if (emceeId === "none") return null;
    return emcees.find((e) => e.id === emceeId) || line?.emcee;
  }, [emceeId, emcees, line?.emcee]);

  // Check auth for edit permissions
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (
          data.role &&
          ["superadmin", "admin", "editor"].includes(data.role)
        ) {
          setCanEdit(true);
        }
      })
      .catch(() => {});
  }, []);

  const performAutoSave = useCallback(async () => {
    if (!lineRef.current || !canEdit || saveInProgress.current) return;

    const currentContent = contentRef.current;
    const currentEmceeId = emceeIdRef.current;
    const originalLine = lineRef.current;

    const contentChanged = currentContent !== originalLine.content;
    const emceeChanged = currentEmceeId !== (originalLine.emcee?.id || "none");

    if (!contentChanged && !emceeChanged) return;

    saveInProgress.current = true;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      if (contentChanged) {
        const res = await fetch("/api/lines", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: originalLine.id,
            field: "content",
            value: currentContent,
          }),
        });
        if (!res.ok) throw new Error("Failed to save content");
      }

      if (emceeChanged) {
        const res = await fetch("/api/lines", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: originalLine.id,
            field: "emcee_id",
            value: currentEmceeId === "none" ? "" : currentEmceeId,
          }),
        });
        if (!res.ok) throw new Error("Failed to save emcee");
      }

      setSaved(true);
      // We don't update 'line' state here because it might trigger another effect loop
      // instead we just update the ref and the visual state
      setLine((prev) =>
        prev
          ? {
              ...prev,
              content: currentContent,
              emcee:
                emcees.find((e) => e.id === currentEmceeId) ||
                (currentEmceeId === "none" ? null : prev.emcee),
            }
          : null,
      );
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError("Auto-save failed");
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  }, [canEdit, emcees]);

  const loadRandomLine = useCallback(async () => {
    // Force save if pending changes before moving to next
    if (
      lineRef.current &&
      (contentRef.current !== lineRef.current.content ||
        emceeIdRef.current !== (lineRef.current.emcee?.id || "none"))
    ) {
      await performAutoSave();
    }

    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/lines/random");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLine(data.line);
      setContent(data.line.content);
      setEmceeId(data.line.emcee?.id || "none");
    } catch (err) {
      setError("Failed to fetch random line. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRandomLine();
  }, [loadRandomLine]);

  // Load emcees for editing
  useEffect(() => {
    if (canEdit && emcees.length === 0) {
      fetch("/api/emcees")
        .then((r) => r.json())
        .then(setEmcees)
        .catch(() => {});
    }
  }, [canEdit, emcees.length]);

  // YouTube IFrame API Initialization
  useEffect(() => {
    if (!line?.battle.youtube_id) return;

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      initPlayer();
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    }

    function initPlayer() {
      if (ytPlayerInstance.current) {
        try {
          ytPlayerInstance.current.destroy();
        } catch (e) {}
      }

      ytPlayerInstance.current = new (window as any).YT.Player(
        "youtube-player-random",
        {
          videoId: line?.battle.youtube_id,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(line?.start_time || 0),
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (event: any) => {
              // Auto-play when ready
              event.target.playVideo();
            },
          },
        },
      );
    }

    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
      if (ytPlayerInstance.current) {
        try {
          ytPlayerInstance.current.destroy();
        } catch (e) {}
      }
    };
  }, [line?.battle.youtube_id, line?.start_time]);

  // Video looping logic
  useEffect(() => {
    if (!line || !ytPlayerInstance.current) return;

    if (playInterval.current) {
      clearInterval(playInterval.current);
    }

    playInterval.current = setInterval(() => {
      const player = ytPlayerInstance.current;
      if (player && typeof player.getCurrentTime === "function") {
        const currentTime = player.getCurrentTime();
        // If it reaches end_time, loop back to start_time
        if (currentTime >= line.end_time) {
          player.seekTo(line.start_time, true);
        }
      }
    }, 100);

    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [line]);

  // Handle Emcee change (immediate save)
  useEffect(() => {
    if (line && emceeId !== (line.emcee?.id || "none")) {
      performAutoSave();
    }
  }, [emceeId, line, performAutoSave]);

  // Handle Content change (debounced save)
  useEffect(() => {
    if (!line || content === line.content) return;
    const timer = setTimeout(() => {
      performAutoSave();
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, line, performAutoSave]);

  const speaker = selectedEmcee?.name || line?.speaker_label || "Unknown";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Random Line
            </h1>
            <p className="text-muted-foreground w-full max-w-xl">
              Discover random moments or help correct transcriptions across
              battles.
            </p>
          </div>
          <Button onClick={loadRandomLine} disabled={loading} className="gap-2">
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Next</span> Random
          </Button>
        </div>

        {loading ? (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          </div>
        ) : error && !line ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadRandomLine}>Try Again</Button>
          </div>
        ) : line ? (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr] items-start">
            {/* Left: Large Video */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-video w-full relative bg-black">
                  <div
                    id="youtube-player-random"
                    className="absolute inset-0 h-full w-full"
                  ></div>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/battle/${line.battle.id}?t=${Math.floor(line.start_time)}`}
                      className="text-lg font-bold hover:text-primary transition-colors hover:underline flex items-center gap-1 group/link"
                      title="Jump to this line in the full transcript"
                    >
                      <span className="line-clamp-1">{line.battle.title}</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover/link:text-primary transition-colors" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                      <Mic2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {speaker}
                    </span>
                    <span className="text-border">•</span>
                    <StatusBadge
                      status={line.battle.status}
                      className="scale-90 origin-left"
                    />
                    {line.round_number && (
                      <>
                        <span className="text-border">•</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                          Round {line.round_number}
                        </span>
                      </>
                    )}
                    {line.battle.event_name && (
                      <>
                        <span className="text-border">•</span>
                        <span className="line-clamp-1">
                          {line.battle.event_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Editing & Info */}
            <div className="w-full">
              <div className="grid gap-6">
                <div>
                  <h2 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-widest">
                    Emcee
                  </h2>
                  <Button
                    variant="outline"
                    className="w-full justify-between px-4 h-11 border-border bg-card/50 hover:bg-muted/50 transition-all rounded-xl shadow-sm"
                    onClick={() => canEdit && setIsEmceeModalOpen(true)}
                    disabled={!canEdit}
                  >
                    <span className="text-sm font-medium truncate">
                      {speaker}
                    </span>
                    <Shuffle className="h-4 w-4 text-muted-foreground ml-2 opacity-50" />
                  </Button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                      Line Transcript
                    </h2>
                    <button
                      onClick={() => {
                        if (
                          ytPlayerInstance.current &&
                          typeof ytPlayerInstance.current.seekTo === "function"
                        ) {
                          ytPlayerInstance.current.seekTo(
                            line.start_time,
                            true,
                          );
                          ytPlayerInstance.current.playVideo();
                        }
                      }}
                      className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-mono leading-none hover:bg-primary/20 transition-colors cursor-pointer"
                      title={`Jump to ${formatTime(line.start_time)}`}
                    >
                      {formatTime(line.start_time)} -{" "}
                      {formatTime(line.end_time)}
                    </button>
                  </div>

                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[140px] text-base leading-relaxed resize-none p-4 bg-card/50 border-border rounded-xl focus:bg-card transition-all shadow-inner",
                      !canEdit &&
                        "opacity-80 border-transparent bg-muted/50 cursor-not-allowed",
                    )}
                    placeholder="Line content..."
                  />
                </div>

                {!canEdit && (
                  <p className="text-center text-muted-foreground bg-muted/30 py-4 rounded-xl border border-dashed text-xs px-4">
                    Log in with editor permissions to suggest or make
                    corrections.
                  </p>
                )}

                {canEdit &&
                  (saving ||
                    saved ||
                    error ||
                    content !== line.content ||
                    emceeId !== (line.emcee?.id || "none")) && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/50">
                        <div className="flex items-center gap-2">
                          {saving ? (
                            <div className="flex items-center gap-2 text-primary font-medium text-xs animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving changes...
                            </div>
                          ) : saved ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-medium text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              Saved to database
                            </div>
                          ) : error ? (
                            <div className="text-red-500 text-xs font-medium">
                              {error}
                            </div>
                          ) : (
                            <div className="text-amber-600 dark:text-amber-500 text-xs font-medium flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Unsaved changes
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] text-muted-foreground/50 font-medium">
                          Auto-saving...
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <EmceeSearchModal
                isOpen={isEmceeModalOpen}
                onClose={() => setIsEmceeModalOpen(false)}
                emcees={emcees}
                selectedId={emceeId}
                onSelect={setEmceeId}
              />
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
