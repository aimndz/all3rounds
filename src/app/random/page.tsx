"use client";

import { useAuthStore } from "@/stores/auth-store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
import { cn, formatTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRandomLine } from "@/features/random/hooks/use-random-line";
import { useVideoLooping } from "@/features/random/hooks/use-video-looping";

function RandomLineSkeleton() {
  return (
    <div className="animate-in fade-in grid items-start gap-8 duration-500 lg:grid-cols-[2fr_1fr]">
      {/* Left Column: Video */}
      <div className="flex flex-col gap-4">
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <Skeleton className="h-7 w-2/3" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Skeleton className="h-4 w-24" />
              <div className="bg-border h-1 w-1 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="bg-border h-1 w-1 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Content/Editor */}
      <div className="w-full space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-35 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function RandomPage() {
  const { canEdit, isUserLoggedIn } = useAuthStore();

  const {
    line,
    content,
    setContent,
    loading,
    saving,
    saved,
    error,
    loadRandomLine,
    performAutoSave,
    submitSuggestion,
  } = useRandomLine(canEdit);

  const { isLooping, setIsLooping, seekToStart } = useVideoLooping(
    line?.battle.youtube_id,
    line?.start_time,
    line?.end_time,
    "youtube-player-random",
  );

  const speaker = line?.emcee?.name || line?.speaker_label || "Unknown";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <div>
            <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl">
              Random Line
            </h1>
            <p className="text-muted-foreground w-full max-w-xl text-sm">
              Discover random moments or help improve battle transcriptions.
            </p>
          </div>
        </div>

        {loading ? (
          <RandomLineSkeleton />
        ) : error && !line ? (
          <div className="flex h-[60vh] flex-col items-center justify-center text-center">
            <p className="mb-4 text-red-500">{error}</p>
            <Button onClick={loadRandomLine}>Try Again</Button>
          </div>
        ) : line ? (
          <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
            {/* Left: Large Video */}
            <div className="flex flex-col gap-4">
              <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <div className="relative aspect-video w-full bg-black">
                  <div
                    id="youtube-player-random"
                    className="absolute inset-0 h-full w-full"
                  ></div>
                </div>

                <div className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/battle/${line.battle.id}?t=${Math.floor(line.start_time)}`}
                      className="hover:text-primary group/link flex items-center gap-1 text-lg font-bold transition-colors hover:underline"
                      title="Jump to this line in the full transcript"
                    >
                      <h1 className="line-clamp-1">{line.battle.title}</h1>
                      <ChevronRight className="text-muted-foreground group-hover/link:text-primary h-5 w-5 shrink-0 transition-colors" />
                    </Link>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                    {line.battle.event_name && (
                      <>
                        <span className="line-clamp-1">
                          {line.battle.event_name}
                        </span>
                        <span className="text-border">|</span>
                      </>
                    )}
                    <StatusBadge
                      status={line.battle.status}
                      className="origin-left scale-90"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Editing & Info */}
            <div className="w-full">
              <div className="grid gap-4">
                <div>
                  <div className="mb-3 flex flex-row items-center justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-muted-foreground text-[10px] leading-none font-bold tracking-[0.2em] uppercase">
                          Transcript
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
                              className="bg-popover border-border/50 max-w-60 space-y-2 p-3"
                            >
                              <h4 className="text-foreground flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase">
                                <Info className="text-primary h-3 w-3" />
                                Transcription Tips
                              </h4>
                              <ul className="text-muted-foreground border-border/40 list-inside list-disc space-y-1.5 border-t pt-2 text-[11px]">
                                <li>Only edit text within the timestamp.</li>
                                <li>
                                  Enable{" "}
                                  <span className="text-foreground font-medium">
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
                        <p className="text-muted-foreground/70 flex items-center gap-1 text-[10px] font-medium">
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
                          "h-8 w-8 cursor-pointer transition-all",
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
                        onClick={seekToStart}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground h-8 cursor-pointer px-2.5 font-mono text-[10px] font-medium transition-all"
                        title={`Jump to ${formatTime(line.start_time)}`}
                      >
                        {formatTime(line.start_time)} -{" "}
                        {formatTime(line.end_time)}
                      </Button>
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2 pl-1">
                    <div className="bg-primary h-3.5 w-1 rounded-full" />
                    <span className="text-primary text-xs font-bold tracking-widest uppercase">
                      {speaker}
                    </span>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!isUserLoggedIn || saving || saved || loading}
                    spellCheck={false}
                    className={cn(
                      "bg-card/50 border-border focus:bg-card min-h-35 resize-none rounded-xl p-4 text-base leading-relaxed shadow-inner transition-all",
                      !isUserLoggedIn &&
                        "bg-muted/50 cursor-not-allowed border-transparent opacity-80",
                    )}
                    placeholder="Line content..."
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2">
                      {!isUserLoggedIn ? (
                        <div className="text-muted-foreground text-[10px] font-medium">
                          <Link
                            href="/login"
                            className="text-primary hover:underline"
                          >
                            Log in
                          </Link>{" "}
                          to suggest corrections.
                        </div>
                      ) : error ? (
                        <div className="text-xs font-medium text-red-500">
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
                          disabled={saving || saved || loading}
                          className="h-9 text-xs"
                        >
                          Discard
                        </Button>
                      )}

                      {content === line.content ? (
                        <Button
                          onClick={loadRandomLine}
                          disabled={loading || saving || saved}
                          className="h-9 gap-2 px-4 font-bold"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Shuffle className="h-4 w-4" />
                              Next Random
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={
                            canEdit
                              ? () => performAutoSave(true)
                              : submitSuggestion
                          }
                          disabled={saving || saved || loading}
                          className="h-9 gap-2 px-4 font-bold transition-all"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {canEdit ? "Saving..." : "Submitting..."}
                            </>
                          ) : saved ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {canEdit ? "Saved!" : "Submitted!"}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              {canEdit ? "Submit" : "Submit Suggestion"}
                            </>
                          )}
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
