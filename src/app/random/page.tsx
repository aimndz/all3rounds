"use client";

import { useState } from "react";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Info,
  Loader2,
  Repeat,
  Shuffle,
} from "lucide-react";

import { LoginModal } from "@/components/LoginModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRandomLine } from "@/features/random/hooks/use-random-line";
import { useVideoLooping } from "@/features/random/hooks/use-video-looping";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

function RandomLineSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-8 sm:px-6 sm:pb-10">
      <div className="flex shrink-0 flex-col gap-1 pt-3 pb-3 sm:pt-5 sm:pb-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>

      <div className="animate-in fade-in flex flex-col gap-4 duration-500 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="z-20 lg:col-span-7 xl:col-span-8">
          <div className="border-border bg-card/95 -mx-4 overflow-hidden border-b shadow-sm backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg">
            <Skeleton className="aspect-video max-h-[32svh] min-h-[11.75rem] w-full rounded-none sm:max-h-none" />
            <div className="border-border border-t px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-18 rounded-full" />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:col-span-5 lg:pt-1 lg:pb-6 xl:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-1 rounded-full" />
            <Skeleton className="h-4 w-18" />
          </div>
          <div className="border-border/60 bg-background/70 rounded-[var(--radius-surface)] border shadow-inner">
            <Skeleton className="h-[7.5rem] w-full rounded-[var(--radius-surface)] border-0 bg-white/4" />
          </div>
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center justify-end gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RandomPage() {
  const { canEdit, isUserLoggedIn } = useAuthStore();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    <>
      {loading ? (
        <RandomLineSkeleton />
      ) : error && !line ? (
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="flex shrink-0 flex-col gap-1 pt-3 pb-3 sm:pt-5 sm:pb-4">
            <h1 className="text-foreground text-[1.75rem] font-black tracking-tight sm:text-[2rem]">
              Random
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Discover random or help improve battle transcripts.
            </p>
          </div>

          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="surface-card flex w-full max-w-md flex-col items-center gap-4 px-6 py-8 text-center">
              <p className="text-sm font-medium text-red-400">{error}</p>
              <Button onClick={loadRandomLine} className="h-10 px-5 font-semibold">
                Try Again
              </Button>
            </div>
          </div>
        </main>
      ) : line ? (
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="flex shrink-0 flex-col gap-1 pt-3 pb-3 sm:pt-5 sm:pb-4">
            <h1 className="text-foreground text-[1.75rem] font-black tracking-tight sm:text-[2rem]">
              Random
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Discover random or help improve battle transcripts.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="z-20 lg:col-span-7 xl:col-span-8">
              <div className="border-border bg-card/95 -mx-4 overflow-hidden border-b shadow-sm backdrop-blur-sm transition-all duration-300 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg">
                <div className="relative aspect-video max-h-[32svh] min-h-[11.75rem] w-full overflow-hidden bg-black sm:max-h-none">
                  <div
                    id="youtube-player-random"
                    className="absolute inset-0 h-full w-full"
                  />
                </div>

                <div className="border-border border-t px-4 py-2.5 sm:px-6 sm:py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/battles/${line.battle.id}?t=${Math.floor(line.start_time)}`}
                        prefetch={false}
                        className="group/link text-foreground hover:text-primary inline-flex max-w-full items-center gap-1.5 transition-colors"
                        title="Jump to this line in the full transcript"
                      >
                        <h2 className="truncate text-[15px] font-bold tracking-tight sm:text-xl">
                          {line.battle.title}
                        </h2>
                        <ChevronRight className="text-muted-foreground group-hover/link:text-primary h-4 w-4 shrink-0 transition-colors sm:h-5 sm:w-5" />
                      </Link>

                      <div className="text-muted-foreground/70 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium sm:gap-x-3 sm:text-xs">
                        {line.battle.event_name && (
                          <span className="text-foreground/75 max-w-52 truncate sm:max-w-none">
                            {line.battle.event_name}
                          </span>
                        )}
                        {line.battle.event_date && (
                          <>
                            {line.battle.event_name && (
                              <span className="text-border/40">|</span>
                            )}
                            <span>{formatDate(line.battle.event_date)}</span>
                          </>
                        )}
                        {(line.battle.event_name || line.battle.event_date) && (
                          <span className="text-border/40">|</span>
                        )}
                        <StatusBadge
                          status={line.battle.status}
                          className="origin-left scale-90"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:col-span-5 lg:pt-1 lg:pb-6 xl:col-span-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="text-foreground/70 text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Transcript
                  </h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground/55 hover:text-primary rounded-sm transition-colors outline-none">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="end"
                        className="bg-popover border-border/50 max-w-64 space-y-2.5 p-4 shadow-xl sm:max-w-72"
                      >
                        <h4 className="text-foreground flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase">
                          <Info className="text-primary h-3.5 w-3.5" />
                          Transcription Guide
                        </h4>
                        <ul className="text-muted-foreground border-border/40 ml-4 list-outside list-disc space-y-2 border-t pt-3 text-[11px] leading-relaxed">
                          <li>
                            <span className="text-foreground font-semibold">
                              Match audio exactly
                            </span>{" "}
                            - type everything as heard in the segment.
                          </li>
                          <li>
                            Use{" "}
                            <span className="text-foreground font-semibold">
                              Loop Mode
                            </span>{" "}
                            to repeat the audio while you transcribe.
                          </li>
                          <li>
                            Click{" "}
                            <span className="text-foreground font-semibold">
                              Next Random
                            </span>{" "}
                            if the line is too difficult to understand.
                          </li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsLooping(!isLooping)}
                    className={cn(
                      "h-8 w-8 rounded-md transition-colors",
                      isLooping
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    title={isLooping ? "Looping enabled" : "Looping disabled"}
                  >
                    <Repeat
                      className={cn("h-4 w-4", !isLooping && "opacity-70")}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={seekToStart}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground h-8 px-2.5 font-mono text-[10px] font-semibold sm:px-3"
                    title={`Jump to ${formatTime(line.start_time)}`}
                  >
                    {formatTime(line.start_time)} - {formatTime(line.end_time)}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-primary h-4 w-1 rounded-full" />
                <span className="text-primary text-[11px] font-bold tracking-[0.2em] uppercase">
                  {speaker}
                </span>
                {line.round_number && (
                  <span className="ui-chip border-border/40 bg-muted/25 text-muted-foreground">
                    Round {line.round_number}
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "border-input bg-input/35 hover:bg-input/50 focus-within:border-ring focus-within:ring-ring/50 focus-within:bg-input/55 relative rounded-[var(--radius-surface)] border shadow-xs transition-[background-color,border-color,box-shadow]",
                  !isUserLoggedIn && "bg-input/25 hover:bg-input/25 border-input/60 opacity-85",
                )}
              >
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!isUserLoggedIn || saving || saved || loading}
                  spellCheck={false}
                  rows={4}
                  className="h-[7.5rem] resize-none overflow-hidden border-0 bg-transparent px-4 py-3 text-sm leading-6 shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[15px]"
                  placeholder="Line content..."
                />
                {!isUserLoggedIn && (
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setIsLoginModalOpen(true)}
                    title="Log in to suggest correction"
                  />
                )}
              </div>

              {!isUserLoggedIn ? (
                <div className="text-muted-foreground text-[11px] leading-relaxed">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Log in
                  </button>{" "}
                  to suggest corrections.
                </div>
              ) : error ? (
                <div className="text-[11px] font-medium text-red-400">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {content !== line.content && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setContent(line.content)}
                    disabled={saving || saved || loading}
                    className="h-9 px-3 text-sm font-semibold"
                  >
                    Discard
                  </Button>
                )}

                {content === line.content ? (
                  <Button
                    onClick={loadRandomLine}
                    disabled={loading || saving || saved}
                    className="h-9 gap-2 px-4 text-sm font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading
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
                    className="h-9 gap-2 px-4 text-sm font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {canEdit ? "Saving" : "Submitting"}
                      </>
                    ) : saved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        {canEdit ? "Saved" : "Submitted"}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {canEdit ? "Save And Next" : "Submit Suggestion"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : null}

      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
