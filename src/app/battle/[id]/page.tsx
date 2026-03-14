"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pencil,
  X,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Mic2,
  ArrowLeft,
  Plus,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { cn, formatDateLong, formatSpeakerName } from "@/lib/utils";
import { getSpeakerColor } from "@/lib/constants";
import { StatusBadge, STATUS_CONFIG } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BatchActionBar from "@/features/battle/components/BatchActionBar";
import BattleEditModal from "@/features/battle/components/BattleEditModal";
import BattleAddLineModal from "@/features/battle/components/BattleAddLineModal";
import SuggestCorrectionModal from "@/components/SuggestCorrectionModal";
import { LoginModal } from "@/components/LoginModal";
import { useAuthStore } from "@/stores/auth-store";
import type { SearchResult } from "@/lib/types";
import { LineItem } from "@/features/battle/components/LineItem";
import { useBattleData } from "@/features/battle/hooks/use-battle-data";
import type {
  BattleLine,
  BattleStatus,
  BattleData,
  Turn,
  RoundGroup,
} from "@/features/battle/hooks/use-battle-data";
import { useYouTubePlayer } from "@/features/battle/hooks/use-youtube-player";
import { useLineSelection } from "@/features/battle/hooks/use-line-selection";
import { useInlineEdit } from "@/features/battle/hooks/use-inline-edit";
import { useAutoScroll } from "@/features/battle/hooks/use-auto-scroll";

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return formatDateLong(dateStr);
}

// ============================================================================
// Main Component
// ============================================================================

export default function BattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // -- Auth --
  const { isUserLoggedIn, canEdit, canDelete } = useAuthStore();

  // -- Custom Hooks --
  const { data, setData, loading, error, fetchBattle } =
    useBattleData(battleId);
  const { player, activeTime, playerRef, seekTo } = useYouTubePlayer(
    data?.battle.youtube_id,
    "youtube-player",
  );
  const {
    selectedIds,
    setSelectedIds,
    lastClickedLineId,
    setLastClickedLineId,
    toggleSelect,
    toggleSelectTurn,
    toggleSelectRound,
    clearSelection,
  } = useLineSelection(data?.lines);
  const {
    inlineEditingId,
    setInlineEditingId,
    inlineContent,
    setInlineContent,
    startInlineEdit: rawStartInlineEdit,
    handleInlineSave,
  } = useInlineEdit(data, setData, canEdit, fetchBattle);

  // -- Local UI State --
  const [editMode, setEditMode] = useState(false);
  const [editingLine, setEditingLine] = useState<BattleLine | null>(null);
  const [addingLine, setAddingLine] = useState(false);
  const [addingLineData, setAddingLineData] = useState<{
    start_time?: number;
    end_time?: number;
    round_number?: number | null;
    emcee_id?: string | null;
  } | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingBattle, setDeletingBattle] = useState(false);
  const [suggestingLine, setSuggestingLine] = useState<BattleLine | null>(null);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(
    new Set(),
  );
  const [collapsedTurns, setCollapsedTurns] = useState<Set<string>>(new Set());
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // -- Active Line --
  const activeLineId = useMemo(() => {
    return data?.lines.find(
      (l) =>
        activeTime >= l.start_time &&
        activeTime < (l.end_time || l.start_time + 1),
    )?.id;
  }, [activeTime, data?.lines]);

  // -- Auto-scroll --
  const { transcriptContainerRef } = useAutoScroll(
    activeLineId,
    editMode,
    lastClickedLineId,
  );

  // Wrap startInlineEdit to also track lastClickedLineId
  const startInlineEdit = useCallback(
    (line: BattleLine) => {
      rawStartInlineEdit(line);
      setLastClickedLineId(line.id);
    },
    [rawStartInlineEdit, setLastClickedLineId],
  );

  // -- Effects --
  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  useEffect(() => {
    if (isTranscriptExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isTranscriptExpanded]);

  // -- Handlers --
  const handleSeek = useCallback(
    (seconds: number) => {
      if (player && typeof player.seekTo === "function") {
        seekTo(seconds);
      } else {
        const url = `https://www.youtube.com/watch?v=${data?.battle.youtube_id}&t=${Math.floor(seconds)}s`;
        window.open(url, "_blank");
      }
    },
    [player, data?.battle.youtube_id, seekTo],
  );

  const handleStatusChange = async (newStatus: BattleStatus) => {
    if (!canEdit) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update status");

      setData((prev) =>
        prev
          ? {
              ...prev,
              battle: { ...prev.battle, status: resData.status || newStatus },
            }
          : null,
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      const isRateLimit = message.includes("429");
      toast({
        variant: isRateLimit ? "default" : "destructive",
        title: isRateLimit ? "Rate Limit" : "Error",
        description: isRateLimit
          ? "Too many requests. Please try again later."
          : message || "Failed to update status",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteBattle = async () => {
    if (!canDelete) return;
    if (
      !window.confirm(
        "Are you sure you want to delete this entire battle and all its transcriptions? This cannot be undone.",
      )
    )
      return;

    setDeletingBattle(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete battle");
      }
      router.push("/battles");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      const isRateLimit = message.includes("429");
      toast({
        variant: isRateLimit ? "default" : "destructive",
        title: isRateLimit ? "Rate Limit" : "Error",
        description: isRateLimit
          ? "Too many requests. Please try again later."
          : message || "An error occurred while deleting the battle.",
      });
      setDeletingBattle(false);
    }
  };

  const handleSuggestClick = useCallback(
    (line: BattleLine) => {
      if (isUserLoggedIn) {
        setSuggestingLine(line);
      } else {
        setIsLoginModalOpen(true);
      }
    },
    [isUserLoggedIn],
  );

  const toggleRoundCollapse = useCallback((roundIndex: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundIndex)) next.delete(roundIndex);
      else next.add(roundIndex);
      return next;
    });
  }, []);

  const toggleTurnCollapse = useCallback((turnKey: string) => {
    setCollapsedTurns((prev) => {
      const next = new Set(prev);
      if (next.has(turnKey)) next.delete(turnKey);
      else next.add(turnKey);
      return next;
    });
  }, []);

  const handleToggleEditMode = () => {
    if (!canEdit) {
      window.location.href = "/login";
      return;
    }
    startTransition(() => {
      if (editMode) {
        clearSelection();
        setEditMode(false);
      } else {
        setEditMode(true);
        const targetId = activeLineId || lastClickedLineId;
        if (targetId) {
          setSelectedIds(new Set([targetId]));
          setLastClickedLineId(targetId);
        }
      }
    });
  };

  const handleAddLineAt = useCallback(
    (lineId: number, position: "before" | "after") => {
      if (!data) return;
      const idx = data.lines.findIndex((l) => l.id === lineId);
      if (idx === -1) return;

      const line = data.lines[idx];
      if (position === "before") {
        setAddingLineData({
          start_time: Math.max(0, line.start_time - 2),
          end_time: line.start_time,
          round_number: line.round_number,
          emcee_id: line.emcee?.id,
        });
      } else {
        const nextLine = data.lines[idx + 1];
        setAddingLineData({
          start_time: line.end_time || line.start_time + 1,
          end_time:
            nextLine?.start_time || (line.end_time || line.start_time + 1) + 2,
          round_number: line.round_number,
          emcee_id: line.emcee?.id,
        });
      }
      setAddingLine(true);
    },
    [data],
  );

  /**
   * Executes a batch action on selected lines (update attributes or delete)
   */
  const handleBatchAction = useCallback(
    async (config: {
      action: "set_round" | "set_emcee" | "update" | "delete";
      value?: string;
      updates?: {
        round_number?: number | null;
        emcee_id?: string | null;
        speaker_ids?: string[] | null;
      };
    }) => {
      const { action, value, updates } = config;
      if (selectedIds.size === 0) return;

      setBatchSaving(true);

      // Track a target line to scroll to after the operation (mostly for deletion)
      let targetLineId: number | null = null;
      if (data?.lines) {
        if (action === "delete") {
          // If deleting, find the nearest line that STAYS to maintain scroll position
          const firstIdx = data.lines.findIndex((l) => selectedIds.has(l.id));
          if (firstIdx !== -1) {
            // Try to find a line before the selection
            for (let i = firstIdx - 1; i >= 0; i--) {
              if (!selectedIds.has(data.lines[i].id)) {
                targetLineId = data.lines[i].id;
                break;
              }
            }
            // If no line before, try to find a line after
            if (targetLineId === null) {
              for (let i = firstIdx + 1; i < data.lines.length; i++) {
                if (!selectedIds.has(data.lines[i].id)) {
                  targetLineId = data.lines[i].id;
                  break;
                }
              }
            }
          }
        } else {
          // For updates, just stay on the first selected line
          const firstSelected = data.lines.find((l) => selectedIds.has(l.id));
          if (firstSelected) targetLineId = firstSelected.id;
        }
      }

      try {
        const res = await fetch("/api/lines/batch", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineIds: Array.from(selectedIds),
            action,
            value: value ?? null,
            updates,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          const isRateLimit = res.status === 429;
          toast({
            variant: isRateLimit ? "default" : "destructive",
            title: isRateLimit ? "Rate Limit" : "Action Failed",
            description: isRateLimit
              ? "Too many requests. Please try again later."
              : d.error || "Batch operation failed.",
          });
          return;
        }

        // Deletion resets the selection UI
        if (action === "delete") {
          clearSelection();
        }

        // Refresh data
        const newBattleData = await fetchBattle();

        toast({
          title: "Success",
          description:
            action === "delete"
              ? `Successfully deleted ${selectedIds.size} lines.`
              : `Successfully updated ${selectedIds.size} lines.`,
        });

        // Maintain scroll position if we have a target line
        if (targetLineId !== null && newBattleData?.lines) {
          setTimeout(() => {
            const container = transcriptContainerRef.current;
            const targetEl = container?.querySelector(
              `[data-line-id="${targetLineId}"]`,
            ) as HTMLElement;

            if (targetEl && container) {
              const containerRect = container.getBoundingClientRect();
              const targetRect = targetEl.getBoundingClientRect();
              container.scrollTo({
                top:
                  container.scrollTop +
                  (targetRect.top - containerRect.top) -
                  60,
                behavior: "smooth",
              });
            }
          }, 100);
        }
      } catch (err) {
        console.error("Batch UI handler error:", err);
        toast({
          variant: "destructive",
          title: "System Error",
          description:
            "A network error occurred while performing the batch action.",
        });
      } finally {
        setBatchSaving(false);
      }
    },
    [
      selectedIds,
      data?.lines,
      clearSelection,
      fetchBattle,
      toast,
      transcriptContainerRef,
    ],
  );

  const { battle, lines } = data || {
    battle: {} as BattleData["battle"],
    lines: [] as BattleLine[],
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render Logic (Memoized)
  // ────────────────────────────────────────────────────────────────────────────

  // Build speaker set and group lines by round and speaker turns
  const { roundGroups, speakerSet } = useMemo(() => {
    if (!lines || lines.length === 0) {
      return { roundGroups: [], speakerSet: [] };
    }

    const speakers = (
      [
        ...new Set(
          lines.map((l) => {
            if (l.emcees && l.emcees.length > 0) {
              return l.emcees.map((e) => formatSpeakerName(e.name)).join(" / ");
            }
            return formatSpeakerName(l.emcee?.name || l.speaker_label);
          }),
        ),
      ].filter((s): s is string => s !== null) as string[]
    ).filter((s) => s.trim().length > 0);
    speakers.forEach((s, i) => getSpeakerColor(s, i));

    const groups: RoundGroup[] = [];
    let currentRoundId: number | null = undefined as unknown as number | null;
    let currentTurnGrp: Turn | null = null;

    lines.forEach((line) => {
      const round = line.round_number;
      let speaker: string | null = null;
      if (line.emcees && line.emcees.length > 0) {
        speaker = line.emcees.map((e) => formatSpeakerName(e.name)).join(" / ");
      } else {
        speaker = formatSpeakerName(line.emcee?.name || line.speaker_label);
      }

      if (round !== currentRoundId) {
        currentRoundId = round;
        currentTurnGrp = { speaker: speaker || "", lines: [line] };
        groups.push({ round, turns: [currentTurnGrp] });
      } else if (currentTurnGrp && (speaker || "") === currentTurnGrp.speaker) {
        currentTurnGrp.lines.push(line);
      } else {
        currentTurnGrp = { speaker: speaker || "", lines: [line] };
        groups[groups.length - 1].turns.push(currentTurnGrp);
      }
    });

    return { roundGroups: groups, speakerSet: speakers };
  }, [lines]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
          <div className="flex h-full min-h-0 flex-col gap-6 pt-4 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
            {/* Left Column: Video Skeleton */}
            <div className="lg:col-span-7 xl:col-span-8">
              <Skeleton className="mb-4 h-3 w-24" />
              <Skeleton className="aspect-video w-full rounded-xl shadow-sm" />
              <div className="mt-6 space-y-4 px-2">
                <Skeleton className="h-8 w-2/3 rounded-lg" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>

            {/* Right Column: Transcript Skeleton */}
            <div className="flex flex-1 flex-col overflow-hidden pb-4 lg:col-span-5 lg:h-full lg:pb-6 xl:col-span-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
              <div className="flex-1 space-y-6 overflow-hidden pr-2">
                {[...Array(3)].map((_, ri) => (
                  <div key={ri} className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <div className="border-muted/20 ml-4 space-y-2 border-l-2 pl-4">
                      {[...Array(4)].map((_, li) => (
                        <div key={li} className="flex gap-3">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Mic2 className="text-muted-foreground/40 mx-auto mb-4 h-12 w-12" />
          <h1 className="text-foreground text-xl font-semibold">
            Battle Not Found
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/battles">← Back to battles</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render Layout
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
        {/* ── Two-Column Layout ── */}
        <div className="flex h-full min-h-0 flex-col gap-4 pt-2 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
          {/* Left Column: Video (Sticky/Docked) */}
          <div className="z-30 lg:col-span-7 xl:col-span-8">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground/60 hover:text-foreground mb-2 ml-1 inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors sm:ml-0 lg:mb-4"
            >
              <ArrowLeft className="h-3 w-3" />
              Go Back
            </button>
            <div className="border-border bg-card/95 -mx-4 overflow-hidden border-b shadow-sm backdrop-blur-sm transition-all duration-500 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg sm:hover:shadow-xl">
              {/* Player Container */}
              <div
                ref={playerRef}
                className="relative aspect-video w-full overflow-hidden bg-black"
              >
                <div
                  id="youtube-player"
                  className="absolute inset-0 h-full w-full"
                />

                {/* Loading state / Placeholder when no player */}
                {!player && (
                  <div className="bg-muted absolute inset-0 flex items-center justify-center">
                    <Image
                      src={`https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`}
                      alt={battle.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 896px"
                      className="object-cover opacity-50 grayscale"
                      unoptimized
                    />
                    <div className="z-10 flex flex-col items-center gap-3">
                      <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
                      <p className="text-muted-foreground text-sm font-medium">
                        Loading video...
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Badge Over Video (smaller, less intrusive) */}
                <div className="absolute top-3 right-3 z-30">
                  {canEdit ? (
                    <Select
                      disabled={updatingStatus}
                      value={battle.status}
                      onValueChange={(val) =>
                        handleStatusChange(val as BattleStatus)
                      }
                    >
                      <SelectTrigger className="h-auto w-auto border-none bg-transparent p-0 shadow-none ring-0 focus:ring-0 [&>svg]:hidden">
                        <SelectValue>
                          <StatusBadge
                            status={battle.status}
                            noTooltip
                            className={cn(
                              "cursor-pointer shadow-lg backdrop-blur-md hover:brightness-110",
                              updatingStatus && "opacity-50",
                            )}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end">
                        {(Object.keys(STATUS_CONFIG) as BattleStatus[]).map(
                          (s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const Icon = STATUS_CONFIG[s].icon;
                                  return <Icon className="h-3.5 w-3.5" />;
                                })()}
                                <span>{STATUS_CONFIG[s].label}</span>
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge
                      status={battle.status}
                      className="backdrop-blur-md"
                    />
                  )}
                </div>
              </div>

              {/* Meta bar */}
              <div className="border-border border-t px-4 py-2.5 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h1
                      className="text-foreground truncate text-[15px] font-bold tracking-tight sm:text-xl"
                      title={battle.title}
                    >
                      {battle.title}
                    </h1>
                    <div className="text-muted-foreground/60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium sm:gap-x-3 sm:text-xs">
                      {battle.event_name && (
                        <span className="text-foreground/70 max-w-[120px] truncate sm:max-w-none">
                          {battle.event_name}
                        </span>
                      )}
                      {battle.event_name &&
                        (battle.event_date || lines.length > 0) && (
                          <span className="opacity-30">•</span>
                        )}
                      {battle.event_date && (
                        <span>{formatDate(battle.event_date)}</span>
                      )}
                      {(battle.event_date || battle.event_name) &&
                        lines.length > 0 && (
                          <span className="opacity-30">•</span>
                        )}
                      <span>{lines.length} lines</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:gap-2">
                    <a
                      href={battle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-bold tracking-wider uppercase transition-colors sm:h-8 sm:px-3 sm:text-xs sm:font-medium sm:tracking-normal"
                      title="Watch on YouTube"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden sm:inline">Watch on YouTube</span>
                      <span className="sm:hidden">Watch</span>
                    </a>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingBattle}
                        onClick={handleDeleteBattle}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 p-0 transition-colors sm:h-8 sm:w-8"
                        title="Delete entire battle"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Transcript (Scrollable) ── */}
          <div className="flex min-h-0 flex-1 flex-col lg:col-span-5 lg:h-full lg:pb-6 xl:col-span-4">
            <div
              className={cn(
                "flex h-full flex-col overflow-hidden transition-colors duration-300",
                isTranscriptExpanded
                  ? "bg-background animate-in slide-in-from-bottom-full fixed inset-0 z-50 p-4 pt-12 pb-8 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:p-8"
                  : "relative pb-1",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between px-1 md:mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-foreground/70 text-[11px] font-semibold tracking-[0.2em] uppercase">
                      Transcript
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted/80 h-8 w-8 rounded-full transition-all active:scale-90 lg:hidden"
                    onClick={() =>
                      setIsTranscriptExpanded(!isTranscriptExpanded)
                    }
                  >
                    {isTranscriptExpanded ? (
                      <Minimize2 className="text-primary animate-in spin-in-90 h-5 w-5 duration-300" />
                    ) : (
                      <Maximize2 className="text-muted-foreground h-4 w-4 transition-transform group-hover:scale-110" />
                    )}
                  </Button>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingLine(true)}
                        className="h-7 cursor-pointer px-3 text-[10px] font-bold tracking-wider uppercase"
                      >
                        <Plus className="mr-1.5 h-3 w-3" />
                        Add Line
                      </Button>
                    )}
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      disabled={isPending}
                      onClick={handleToggleEditMode}
                      className="underline-none h-7 cursor-pointer px-3 text-[10px] font-bold tracking-wider uppercase"
                    >
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="border-primary-foreground h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
                          <span>Switching...</span>
                        </div>
                      ) : editMode ? (
                        <>
                          <X className="mr-1.5 h-3 w-3" />
                          Exit Edit
                        </>
                      ) : (
                        <>
                          <Pencil className="mr-1.5 h-3 w-3" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {editMode && (
                <div className="border-border/10 bg-primary/5 animate-in slide-in-from-top-1 border-b px-3 py-1.5 duration-500 md:px-5 md:py-2">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-primary/80 text-[10px] font-bold tracking-widest uppercase">
                      Editing Mode
                    </p>
                    <p className="text-muted-foreground/60 text-center text-[9px] font-medium tracking-wider uppercase">
                      <span className="md:hidden">
                        Tap text to edit • Saves automatically
                      </span>
                      <span className="hidden md:inline">
                        Click text to edit •{" "}
                        <span className="text-foreground/70 border-border bg-background rounded border px-1 py-0.5 text-[7px] font-bold shadow-xs">
                          ENTER
                        </span>{" "}
                        SAVE & NEXT •{" "}
                        <span className="text-foreground/70 border-border bg-background rounded border px-1 py-0.5 text-[7px] font-bold shadow-xs">
                          ESC
                        </span>{" "}
                        CANCEL •{" "}
                        <span className="text-primary/70 font-bold">
                          SHIFT+CLICK
                        </span>{" "}
                        SELECT RANGE
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div
                ref={transcriptContainerRef}
                className="[&::-webkit-scrollbar-thumb]:bg-muted flex-1 overflow-y-auto pr-1 [scrollbar-color:var(--muted)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="space-y-1">
                  {roundGroups.map((group: RoundGroup, gi: number) => {
                    const isRoundCollapsed = collapsedRounds.has(gi);
                    const roundLabel =
                      group.round === 4
                        ? "OT"
                        : group.round
                          ? `Round ${group.round}`
                          : "Unassigned";
                    const lineCount = group.turns.reduce(
                      (sum: number, t: Turn) => sum + t.lines.length,
                      0,
                    );

                    const roundAllSelected =
                      editMode &&
                      group.turns.every((t: Turn) =>
                        t.lines.every((l: BattleLine) => selectedIds.has(l.id)),
                      );

                    return (
                      <div key={gi}>
                        {/* Round header (Sticky within scroll area) */}
                        <div className="bg-background/95 sticky top-0 z-20 flex items-center gap-1 py-1 backdrop-blur-sm">
                          <Button
                            variant="ghost"
                            onClick={() => toggleRoundCollapse(gi)}
                            className="hover:bg-muted/50 h-auto flex-1 justify-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                          >
                            {isRoundCollapsed ? (
                              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                            )}
                            <span className="text-foreground text-xs font-bold tracking-widest uppercase">
                              {roundLabel}
                            </span>
                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                              {lineCount}
                            </span>
                          </Button>
                          {editMode && (
                            <div className="flex items-center gap-2 pr-2">
                              <span className="text-muted-foreground/40 hidden text-[10px] font-bold tracking-tighter uppercase sm:block">
                                Select Round
                              </span>
                              <Checkbox
                                checked={roundAllSelected}
                                onCheckedChange={() =>
                                  toggleSelectRound(group.turns)
                                }
                                className="h-4 w-4 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>

                        {/* Round children */}
                        {!isRoundCollapsed && (
                          <div className="border-border/40 ml-2 space-y-0.5 border-l-2 pl-3">
                            {group.turns.map((turn: Turn, ti: number) => {
                              const turnKey = `${gi}-${ti}`;
                              const isTurnCollapsed =
                                collapsedTurns.has(turnKey);
                              const speakerColor = getSpeakerColor(
                                turn.speaker,
                                speakerSet.indexOf(turn.speaker),
                              );
                              const turnAllSelected =
                                editMode &&
                                turn.lines.every((l: BattleLine) =>
                                  selectedIds.has(l.id),
                                );

                              return (
                                <div key={ti}>
                                  {/* Speaker header (Sticky below Round header) */}
                                    {turn.speaker && (
                                      <div className="bg-background/80 sticky top-8.5 z-10 -ml-1 flex items-center gap-1.5 py-0.5 backdrop-blur-sm">
                                        <Button
                                          variant="ghost"
                                          onClick={() =>
                                            toggleTurnCollapse(turnKey)
                                          }
                                          className={`hover:bg-muted/50 h-auto justify-start gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors ${speakerColor.text}`}
                                        >
                                          {isTurnCollapsed ? (
                                            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                                          )}
                                          <span
                                            className={`h-1.5 w-1.5 rounded-full ${speakerColor.dot}`}
                                          />
                                          <span className="font-bold tracking-tight">
                                            {turn.speaker}
                                          </span>
                                        </Button>

                                        {editMode && (
                                          <Checkbox
                                            checked={turnAllSelected}
                                            className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                            onCheckedChange={() =>
                                              toggleSelectTurn(turn.lines)
                                            }
                                          />
                                        )}
                                      </div>
                                    )}

                                  {/* Lines */}
                                  {!isTurnCollapsed && (
                                    <div className="border-border/20 ml-2 border-l py-0 pl-3">
                                      {turn.lines.map(
                                        (line: BattleLine, li: number) => {
                                          const prevLine =
                                            li > 0 ? turn.lines[li - 1] : null;
                                          let gapMargin = 0;
                                          if (prevLine) {
                                            const gap = Math.max(
                                              0,
                                              line.start_time -
                                                (prevLine.end_time ||
                                                  prevLine.start_time),
                                            );
                                            if (gap > 0.5) {
                                              // 1 second gap = 24px, max out at 24px gap
                                              gapMargin = Math.min(
                                                Math.floor(gap * 24),
                                                24,
                                              );
                                            }
                                          }

                                          return (
                                            <div
                                              key={line.id}
                                              style={{
                                                marginTop:
                                                  gapMargin > 0
                                                    ? `${gapMargin}px`
                                                    : undefined,
                                              }}
                                            >
                                              <LineItem
                                                line={line}
                                                editMode={editMode}
                                                isSelected={selectedIds.has(
                                                  line.id,
                                                )}
                                                isActive={
                                                  activeLineId === line.id
                                                }
                                                isLastClicked={
                                                  lastClickedLineId === line.id
                                                }
                                                inlineEditingId={
                                                  inlineEditingId
                                                }
                                                inlineContent={inlineContent}
                                                onToggleSelect={toggleSelect}
                                                onStartInlineEdit={
                                                  startInlineEdit
                                                }
                                                onInlineSave={handleInlineSave}
                                                onSetInlineEditingId={
                                                  setInlineEditingId
                                                }
                                                onSetInlineContent={
                                                  setInlineContent
                                                }
                                                onSeek={handleSeek}
                                                onEditClick={setEditingLine}
                                                onSuggestClick={
                                                  handleSuggestClick
                                                }
                                                onAddClick={handleAddLineAt}
                                                canEdit={canEdit}
                                                showBeforeInsert={
                                                  gi === 0 &&
                                                  ti === 0 &&
                                                  li === 0
                                                }
                                              />
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="border-border mt-4 space-y-2 border-t pt-4 text-center">
                  <p className="text-muted-foreground/50 text-[9px] tracking-widest uppercase">
                    {lines.length} lines • Community transcription
                  </p>
                </div>

                {editMode && selectedIds.size > 0 && <div className="h-20" />}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Batch action bar */}
      {editMode && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          selectedIds={selectedIds}
          participants={data?.participants}
          onAction={handleBatchAction}
          onClear={() => setSelectedIds(new Set())}
          saving={batchSaving}
          canDelete={canDelete}
        />
      )}

      {/* Single-line edit modal */}
      {editingLine && (
        <BattleEditModal
          line={editingLine as BattleLine}
          participants={data?.participants}
          onClose={() => setEditingLine(null)}
          onSaved={() => {
            setEditingLine(null);
            toast({
              title: "Line Saved",
              description: "The line has been updated successfully.",
            });
            fetchBattle();
          }}
        />
      )}

      {suggestingLine && (
        <SuggestCorrectionModal
          result={{
            ...suggestingLine,
            battle: data.battle as SearchResult["battle"],
          }}
          onClose={() => setSuggestingLine(null)}
        />
      )}

      {/* Add-line modal */}
      {addingLine && (
        <BattleAddLineModal
          battleId={battleId}
          currentTime={activeTime}
          participants={data?.participants}
          initialData={addingLineData || undefined}
          onClose={() => {
            setAddingLine(false);
            setAddingLineData(null);
          }}
          onSaved={() => {
            setAddingLine(false);
            setAddingLineData(null);
            toast({
              title: "Line Added",
              description: "New line has been added to the transcript.",
            });
            fetchBattle();
          }}
        />
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </div>
  );
}
