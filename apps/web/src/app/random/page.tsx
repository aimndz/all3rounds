"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Shuffle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Repeat,
  HelpCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RandomLineSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr] items-start animate-in fade-in duration-500">
      {/* Left Column: Video */}
      <div className="flex flex-col gap-4">
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="p-4 sm:p-5 flex flex-col gap-4">
            <Skeleton className="h-7 w-2/3" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Skeleton className="h-4 w-24" />
              <div className="h-1 w-1 rounded-full bg-border" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="h-1 w-1 rounded-full bg-border" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Content/Editor */}
      <div className="w-full space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-[140px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function RandomPage() {
  const [line, setLine] = useState<SearchResult | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  const saveInProgress = useRef(false);

  // Emcee state
  const contentRef = useRef(content);
  const lineRef = useRef(line);
  const loadRandomLineRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);

  const ytPlayerInstance = useRef<any>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  // Check auth for edit permissions
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setIsUserLoggedIn(!!data.user);
        if (
          data.role &&
          ["superadmin", "admin", "moderator", "verified_emcee"].includes(
            data.role,
          )
        ) {
          setCanEdit(true);
        }
      })
      .catch(() => {});
  }, []);

  const performAutoSave = useCallback(
    async (shouldNext = false) => {
      if (!lineRef.current || !canEdit || saveInProgress.current) return;

      const currentContent = contentRef.current;
      const originalLine = lineRef.current;

      const contentChanged = currentContent !== originalLine.content;

      if (!contentChanged) return;

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

        setSaved(true);
        setLine((prev) =>
          prev
            ? {
                ...prev,
                content: currentContent,
              }
            : null,
        );

        if (shouldNext) {
          setTimeout(() => {
            setSaved(false);
            loadRandomLineRef.current();
          }, 2000);
        } else {
          setTimeout(() => setSaved(false), 2000);
        }
      } catch (err: any) {
        setError("Auto-save failed");
      } finally {
        setSaving(false);
        saveInProgress.current = false;
      }
    },
    [canEdit],
  );

  const loadRandomLine = useCallback(async () => {
    // Force save if pending changes before moving to next
    if (lineRef.current && contentRef.current !== lineRef.current.content) {
      await performAutoSave(false);
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
    } catch (err) {
      setError("Failed to fetch random line. Try again.");
    } finally {
      setLoading(false);
    }
  }, [performAutoSave]);

  useEffect(() => {
    loadRandomLineRef.current = loadRandomLine;
  }, [loadRandomLine]);

  useEffect(() => {
    loadRandomLine();
  }, [loadRandomLine]);

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

    if (!isLooping) return;

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
  }, [line, isLooping]);

  const submitSuggestion = useCallback(async () => {
    if (!line || content === line.content || saveInProgress.current) return;

    saveInProgress.current = true;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_id: line.id,
          suggested_content: content,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit.");
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        loadRandomLine();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  }, [line, content, loadRandomLine]);

  const speaker = line?.emcee?.name || line?.speaker_label || "Unknown";

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
        </div>

        {loading ? (
          <RandomLineSkeleton />
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
                      <h1 className="line-clamp-1">{line.battle.title}</h1>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover/link:text-primary transition-colors" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
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
              <div className="grid gap-4">
                <div>
                  <div className="flex gap-2 sm:flex-row flex-col justify-between items-start sm:items-center mb-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-none">
                          Line Transcript
                        </h2>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-muted-foreground/50 hover:text-primary transition-colors outline-none">
                                <HelpCircle className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[240px] p-3 space-y-2 bg-popover border-border/50"
                            >
                              <h4 className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 text-foreground">
                                <Info className="h-3 w-3 text-primary" />
                                Transcription Tips
                              </h4>
                              <ul className="text-[11px] list-disc list-inside space-y-1.5 text-muted-foreground border-t pt-2 border-border/40">
                                <li>Only edit text within the timestamp.</li>
                                <li>
                                  Enable{" "}
                                  <span className="font-medium text-foreground">
                                    Loop Mode
                                  </span>{" "}
                                  to repeat the audio.
                                </li>
                                <li>Just click next if unsure.</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {!canEdit && isUserLoggedIn && (
                        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 font-medium">
                          Edit the text to submit a suggestion.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsLooping(!isLooping)}
                        className={cn(
                          "h-8 w-8 transition-all cursor-pointer",
                          isLooping
                            ? "text-primary bg-primary/10 hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                        title={
                          isLooping ? "Looping enabled" : "Looping disabled"
                        }
                      >
                        <Repeat
                          className={cn("h-4 w-4", !isLooping && "opacity-60")}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            ytPlayerInstance.current &&
                            typeof ytPlayerInstance.current.seekTo ===
                              "function"
                          ) {
                            ytPlayerInstance.current.seekTo(
                              line.start_time,
                              true,
                            );
                            ytPlayerInstance.current.playVideo();
                          }
                        }}
                        className="h-8 px-2.5 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                        title={`Jump to ${formatTime(line.start_time)}`}
                      >
                        {formatTime(line.start_time)} -{" "}
                        {formatTime(line.end_time)}
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!isUserLoggedIn}
                    spellCheck={false}
                    className={cn(
                      "min-h-[140px] text-base leading-relaxed resize-none p-4 bg-card/50 border-border rounded-xl focus:bg-card transition-all shadow-inner",
                      !isUserLoggedIn &&
                        "opacity-80 border-transparent bg-muted/50 cursor-not-allowed",
                    )}
                    placeholder="Line content..."
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2">
                      {!isUserLoggedIn ? (
                        <div className="text-[10px] text-muted-foreground font-medium">
                          <Link
                            href="/login"
                            className="text-primary hover:underline"
                          >
                            Log in
                          </Link>{" "}
                          to suggest corrections.
                        </div>
                      ) : saving ? (
                        <div className="flex items-center gap-2 text-primary font-medium text-xs animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {canEdit ? "Saving changes..." : "Submitting..."}
                        </div>
                      ) : saved ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-medium text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          {canEdit ? "Saved to database" : "Submitted!"}
                        </div>
                      ) : error ? (
                        <div className="text-red-500 text-xs font-medium">
                          {error}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {content !== line.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setContent(line.content)}
                          disabled={saving}
                          className="text-xs h-9"
                        >
                          Discard
                        </Button>
                      )}

                      {content === line.content ? (
                        <Button
                          onClick={loadRandomLine}
                          disabled={loading || saving}
                          className="gap-2 font-bold h-9 px-4"
                        >
                          <Shuffle className="h-4 w-4" />
                          Next Random
                        </Button>
                      ) : (
                        <Button
                          onClick={
                            canEdit
                              ? () => performAutoSave(true)
                              : submitSuggestion
                          }
                          disabled={saving}
                          className="gap-2 font-bold h-9 px-4"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {canEdit ? "Submit" : "Submit Suggestion"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
