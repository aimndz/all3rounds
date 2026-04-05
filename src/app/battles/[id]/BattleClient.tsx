"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/use-toast";
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
  Mic2,
  ArrowLeft,
  Plus,
  Maximize2,
  Minimize2,
  Trash2,
  ArrowUp,
  Youtube,
} from "lucide-react";
import Footer from "@/components/Footer";
import { cn, formatDate, formatSpeakerName } from "@/lib/utils";
import { getSpeakerColor } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import BatchActionBar from "@/features/battles/components/BatchActionBar";
import { useAuthStore } from "@/stores/auth-store";
import type { SearchResult } from "@/lib/types";
import { LineItem } from "@/features/battles/components/LineItem";
import { InlineBattleStatusSelect } from "@/features/battles/components/InlineBattleStatusSelect";
import { useBattleData } from "@/features/battles/hooks/use-battle-data";
import type {
  BattleLine,
  BattleData,
  Turn,
  RoundGroup,
} from "@/features/battles/hooks/use-battle-data";
import { useYouTubePlayer } from "@/features/battles/hooks/use-youtube-player";
import { useLineSelection } from "@/features/battles/hooks/use-line-selection";
import { useInlineEdit } from "@/features/battles/hooks/use-inline-edit";
import { useAutoScroll } from "@/features/battles/hooks/use-auto-scroll";
import {
  applyLineUpdatesToBattleData,
  removeLinesFromBattleData,
  type BattleLineUpdate,
} from "@/features/battles/utils/line-updates";

const BattleEditModal = dynamic(
  () => import("@/features/battles/components/BattleEditModal"),
  { ssr: false },
);
const BattleAddLineModal = dynamic(
  () => import("@/features/battles/components/BattleAddLineModal"),
  { ssr: false },
);
const SuggestCorrectionModal = dynamic(
  () => import("@/components/SuggestCorrectionModal"),
  { ssr: false },
);
const LoginModal = dynamic(
  () => import("@/components/LoginModal").then((m) => m.LoginModal),
  { ssr: false },
);

// ============================================================================
// Helpers
// ============================================================================

// local date helper removed in favor of lib/utils version

function buildBatchLineUpdate(config: {
  action: "set_round" | "set_emcee" | "update" | "delete";
  value?: string;
  updates?: {
    round_number?: number | null;
    emcee_id?: string | null;
    speaker_ids?: string[] | null;
  };
}): BattleLineUpdate | null {
  const { action, value, updates } = config;

  if (action === "delete") {
    return null;
  }

  const nextUpdates: BattleLineUpdate = {};

  if (action === "set_round") {
    nextUpdates.round_number =
      value === null || value === undefined || value === "" || value === "none"
        ? null
        : Number(value);
  } else if (action === "set_emcee") {
    nextUpdates.emcee_id =
      value === null || value === undefined || value === "" || value === "none"
        ? null
        : value;
  } else if (action === "update" && updates) {
    if (Object.prototype.hasOwnProperty.call(updates, "round_number")) {
      nextUpdates.round_number = updates.round_number;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "emcee_id")) {
      nextUpdates.emcee_id = updates.emcee_id;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "speaker_ids")) {
      nextUpdates.speaker_ids = updates.speaker_ids ?? [];
      nextUpdates.emcee_id = (updates.speaker_ids ?? [])[0] ?? null;
    }
  }

  return Object.keys(nextUpdates).length > 0 ? nextUpdates : null;
}

// ============================================================================
// Main Component
// ============================================================================

export default function BattleClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const battleId = params.id as string;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const loadPreviousSentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const lastDeepLinkHandledRef = useRef<number | null>(null);
  const previousScrollTopRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const pendingPrependScrollRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);

  const deepLinkLineId = useMemo(() => {
    const raw = searchParams.get("lineId");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  // -- Auth --
  const { isUserLoggedIn, canEdit, canEditBattleStatus, canDelete } =
    useAuthStore();

  // -- Custom Hooks --
  const {
    data,
    setData,
    loading,
    loadingMore,
    loadingPrevious,
    hasMore,
    hasPrevious,
    error,
    fetchBattle,
    fetchMoreLines,
    fetchPreviousLines,
  } = useBattleData(battleId, deepLinkLineId);
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
  const [deletingBattle, setDeletingBattle] = useState(false);
  const [suggestingLine, setSuggestingLine] = useState<BattleLine | null>(null);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(
    new Set(),
  );
  const [collapsedTurns, setCollapsedTurns] = useState<Set<string>>(new Set());
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [canLoadPreviousOnScroll, setCanLoadPreviousOnScroll] =
    useState(!deepLinkLineId);

  useEffect(() => {
    if (isTranscriptExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTranscriptExpanded]);
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
    void fetchBattle();
  }, [fetchBattle]);

  useEffect(() => {
    setCanLoadPreviousOnScroll(!deepLinkLineId);
    pendingPrependScrollRef.current = null;
    previousScrollTopRef.current = 0;
    touchStartYRef.current = null;
  }, [deepLinkLineId]);

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

  // Auto-load more transcript pages as user reaches the bottom.
  useEffect(() => {
    const root = transcriptContainerRef.current;
    const sentinel = loadMoreSentinelRef.current;

    if (!root || !sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loadingMore) {
          void fetchMoreLines();
        }
      },
      {
        root,
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasMore,
    loadingMore,
    fetchMoreLines,
    transcriptContainerRef,
    data?.lines.length,
  ]);

  const loadPreviousLines = useCallback(() => {
    if (loadingPrevious || !hasPrevious) {
      return Promise.resolve(null);
    }

    const container = transcriptContainerRef.current;
    if (container) {
      pendingPrependScrollRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    }

    return fetchPreviousLines().then((result) => {
      if (!result) {
        pendingPrependScrollRef.current = null;
      }

      return result;
    });
  }, [
    fetchPreviousLines,
    hasPrevious,
    loadingPrevious,
    transcriptContainerRef,
  ]);

  useEffect(() => {
    const root = transcriptContainerRef.current;

    if (!root) {
      return;
    }

    const handleScroll = () => {
      const nextScrollTop = root.scrollTop;
      const isScrollingUp = nextScrollTop < previousScrollTopRef.current;
      previousScrollTopRef.current = nextScrollTop;

      if (!isScrollingUp) {
        return;
      }

      if (!canLoadPreviousOnScroll) {
        setCanLoadPreviousOnScroll(true);
      }

      if (nextScrollTop <= 48 && hasPrevious && !loadingPrevious) {
        void loadPreviousLines();
      }
    };

    const maybeLoadPreviousFromTopIntent = () => {
      if (!canLoadPreviousOnScroll) {
        setCanLoadPreviousOnScroll(true);
      }

      if (root.scrollTop <= 48 && hasPrevious && !loadingPrevious) {
        void loadPreviousLines();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        maybeLoadPreviousFromTopIntent();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touchStartY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY ?? null;

      if (touchStartY === null || currentY === null) {
        return;
      }

      if (currentY - touchStartY > 12) {
        maybeLoadPreviousFromTopIntent();
      }
    };

    root.addEventListener("scroll", handleScroll, { passive: true });
    root.addEventListener("wheel", handleWheel, { passive: true });
    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: true });
    previousScrollTopRef.current = root.scrollTop;

    return () => {
      root.removeEventListener("scroll", handleScroll);
      root.removeEventListener("wheel", handleWheel);
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
    };
  }, [
    canLoadPreviousOnScroll,
    hasPrevious,
    loadPreviousLines,
    loadingPrevious,
    transcriptContainerRef,
  ]);

  useEffect(() => {
    const root = transcriptContainerRef.current;
    const sentinel = loadPreviousSentinelRef.current;

    if (!root || !sentinel || !hasPrevious || !canLoadPreviousOnScroll) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loadingPrevious) {
          void loadPreviousLines();
        }
      },
      {
        root,
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    canLoadPreviousOnScroll,
    data?.lines.length,
    hasPrevious,
    loadPreviousLines,
    loadingPrevious,
    transcriptContainerRef,
  ]);

  useLayoutEffect(() => {
    const pending = pendingPrependScrollRef.current;
    const container = transcriptContainerRef.current;

    if (!pending || !container || loadingPrevious) {
      return;
    }

    const heightDelta = container.scrollHeight - pending.scrollHeight;
    container.scrollTop = pending.scrollTop + heightDelta;
    pendingPrependScrollRef.current = null;
  }, [data?.lines.length, loadingPrevious, transcriptContainerRef]);

  // Ensure deep-linked line is loaded and highlighted even when it is outside
  // the first pagination chunk.
  useEffect(() => {
    if (!deepLinkLineId || !data) {
      return;
    }

    if (lastDeepLinkHandledRef.current === deepLinkLineId) {
      return;
    }

    const hasTargetLine = data.lines.some((line) => line.id === deepLinkLineId);
    if (!hasTargetLine) {
      // The backend API already jumps to the correct pagination offset containing the line.
      // If the line is not found in the initial payload, it likely doesn't exist.
      // We do not poll `fetchMoreLines()` here to prevent fetching the entire transcript.
      return;
    }

    setLastClickedLineId(deepLinkLineId);
    lastDeepLinkHandledRef.current = deepLinkLineId;

    setTimeout(() => {
      const container = transcriptContainerRef.current;
      const el = container?.querySelector(
        `[data-line-id="${deepLinkLineId}"]`,
      ) as HTMLElement | null;

      if (!container || !el) {
        return;
      }

      const duration = 800;
      let startTime: number | null = null;
      const startScrollTop = container.scrollTop;

      // Cache container bounds to prevent unneeded DOM reads
      const cRect = container.getBoundingClientRect();
      const containerMiddle = cRect.top + cRect.height / 2;

      let tRect = el.getBoundingClientRect();
      let idealTarget =
        container.scrollTop + (tRect.top + tRect.height / 2 - containerMiddle);
      let framesSinceLastCheck = 0;

      const animateScroll = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);
        const easing = 1 - Math.pow(1 - percentage, 4);

        // Throttle recalibration to every 5 frames to reduce layout thrashing CPU cost
        framesSinceLastCheck++;
        if (framesSinceLastCheck > 5 && percentage < 0.95) {
          tRect = el.getBoundingClientRect();
          idealTarget =
            container.scrollTop +
            (tRect.top + tRect.height / 2 - containerMiddle);
          framesSinceLastCheck = 0;
        }

        const distance = idealTarget - startScrollTop;
        container.scrollTop = startScrollTop + distance * easing;

        if (progress < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          const finalT = el.getBoundingClientRect();
          container.scrollTop +=
            finalT.top + finalT.height / 2 - containerMiddle;
        }
      };

      requestAnimationFrame(animateScroll);
    }, 150);
  }, [
    deepLinkLineId,
    data,
    hasMore,
    loadingMore,
    fetchMoreLines,
    setLastClickedLineId,
    transcriptContainerRef,
  ]);

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
      const selectedLineIds = Array.from(selectedIds);
      const optimisticUpdates = buildBatchLineUpdate(config);
      const previousData = data;

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
        }
      }

      try {
        if (action === "delete") {
          setData((prev) => removeLinesFromBattleData(prev, selectedLineIds));
        } else if (optimisticUpdates) {
          setData((prev) =>
            applyLineUpdatesToBattleData(
              prev,
              selectedLineIds,
              optimisticUpdates,
            ),
          );
        }

        const res = await fetch("/api/lines/batch", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineIds: selectedLineIds,
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
          if (previousData) {
            setData(previousData);
          }
          return;
        }

        // Deletion resets the selection UI
        if (action === "delete") {
          clearSelection();

          toast({
            title: "Success",
            description: `Successfully deleted ${selectedIds.size} lines.`,
          });

          // Maintain scroll position if we have a target line
          if (targetLineId !== null) {
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
        } else {
          transcriptContainerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
          });

          toast({
            title: "Success",
            description: `Successfully updated ${selectedIds.size} lines.`,
          });
        }
      } catch (err) {
        if (previousData) {
          setData(previousData);
        }
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
    [selectedIds, data, clearSelection, setData, toast, transcriptContainerRef],
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
              return l.emcees
                .map((e) => formatSpeakerName(e.name, true))
                .join(" / ");
            }
            return formatSpeakerName(l.emcee?.name || l.speaker_label, true);
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
        speaker = line.emcees
          .map((e) => formatSpeakerName(e.name, true))
          .join(" / ");
      } else {
        speaker = formatSpeakerName(
          line.emcee?.name || line.speaker_label,
          true,
        );
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
      <>
        <main className="mx-auto flex h-[calc(100vh-var(--smart-header-height,4rem))] w-full max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
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
      </>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <>
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
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render Layout
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <main
        className={cn(
          "mx-auto flex w-full flex-col overflow-hidden",
          isTranscriptExpanded
            ? "bg-background fixed top-(--smart-header-height,4rem) right-0 bottom-0 left-0 z-40 h-[calc(100vh-var(--smart-header-height,4rem))] max-w-none px-4 pt-3 sm:px-8 sm:pt-6"
            : "h-[calc(100vh-var(--smart-header-height,4rem))] max-w-7xl px-4 sm:px-6",
        )}
      >
        {/* ── Two-Column Layout ── */}
        <div
          className={cn(
            "flex h-full min-h-0 flex-col gap-4 pt-2 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6",
            isTranscriptExpanded && "gap-0 pt-0 lg:gap-8 lg:pt-6",
          )}
        >
          {/* Left Column: Video (Sticky/Docked) */}
          <div
            className={cn(
              "z-30 lg:col-span-7 xl:col-span-8",
              isTranscriptExpanded && "hidden lg:block",
            )}
          >
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

                {/* YouTube player already rendered above */}
              </div>

              {/* Meta bar */}
              <div className="border-border border-t px-4 py-3 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-1">
                  {/* First Row: Title and Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <h1
                      className="text-foreground truncate text-[16px] font-bold tracking-tight sm:text-xl"
                      title={battle.title}
                    >
                      {battle.title}
                    </h1>

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <a
                        href={battle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-bold tracking-wider transition-colors sm:h-9 sm:px-4 sm:text-xs sm:font-bold"
                        title="Watch on YouTube"
                      >
                        <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">YouTube</span>
                        <span className="sm:hidden">Youtube</span>
                      </a>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingBattle}
                          onClick={handleDeleteBattle}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 border border-transparent p-0 transition-colors sm:h-9 sm:w-9"
                          title="Delete entire battle"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Second Row: Metadata */}
                  <div className="text-muted-foreground/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium sm:gap-x-3 sm:text-xs">
                    {battle.event_name && (
                      <span className="text-foreground/70 max-w-40 truncate sm:max-w-none">
                        {battle.event_name}
                      </span>
                    )}

                    {battle.event_date && (
                      <>
                        {battle.event_name && (
                          <span className="text-border">|</span>
                        )}
                        <span>{formatDate(battle.event_date)}</span>
                      </>
                    )}

                    {(battle.event_name || battle.event_date) && (
                      <span className="text-border">|</span>
                    )}
                    <span>
                      {data.lines_pagination?.total ?? lines.length} lines
                    </span>

                    <span className="text-border">|</span>

                    {/* Status Badge */}
                    {canEditBattleStatus ? (
                      <InlineBattleStatusSelect
                        battleId={battleId}
                        status={battle.status}
                        canEditStatus={canEditBattleStatus}
                        badgeClassName="origin-left scale-90"
                        onStatusUpdated={(status) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  battle: { ...prev.battle, status },
                                }
                              : null,
                          )
                        }
                      />
                    ) : (
                      <StatusBadge
                        status={battle.status}
                        className="origin-left scale-90"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Transcript (Scrollable) ── */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isTranscriptExpanded
                ? "lg:col-span-12 xl:col-span-12"
                : "lg:col-span-5 xl:col-span-4",
            )}
          >
            {/* Edit Mode & Status Bar */}
            {canEdit && (
              <div
                className={cn(
                  "flex shrink-0 flex-col pt-3 transition-all duration-300 md:pt-0",
                  isTranscriptExpanded ? "mb-1 md:mb-2" : "mb-2 md:mb-3",
                )}
              >
                <div className="flex items-center justify-end px-1 md:px-0">
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
                </div>

                {editMode && (
                  <div className="border-border/10 bg-primary/5 animate-in slide-in-from-top-1 mt-2.5 rounded-lg border px-3 py-1.5 duration-500 md:px-5 md:py-2">
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
              </div>
            )}

            <div className="relative flex h-full flex-col overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-muted/80 absolute z-50 h-8 w-8 rounded-full transition-all active:scale-90 lg:hidden",
                  "top-1 right-2",
                )}
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              >
                {isTranscriptExpanded ? (
                  <Minimize2 className="text-muted-foreground h-5 w-5" />
                ) : (
                  <Maximize2 className="text-muted-foreground h-4 w-4" />
                )}
              </Button>

              <div
                ref={transcriptContainerRef}
                className="[&::-webkit-scrollbar-thumb]:bg-muted flex-1 overflow-y-auto pr-1 [scrollbar-color:var(--muted)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="space-y-1">
                  {hasPrevious && (
                    <div
                      ref={loadPreviousSentinelRef}
                      className="flex w-full items-center justify-center py-3"
                    >
                      <p
                        className={cn(
                          "text-center text-[10px] font-semibold tracking-wider uppercase",
                          loadingPrevious
                            ? "text-muted-foreground animate-pulse"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {loadingPrevious
                          ? "Loading earlier lines..."
                          : "Scroll up for earlier lines"}
                      </p>
                    </div>
                  )}

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
                            <span className="text-foreground text-xs font-bold tracking-tight">
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
                          <div className="border-border/60 ml-2 space-y-0.5 border-l pl-3">
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
                                        className={`hover:bg-muted/50 h-auto flex-1 justify-start gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors ${speakerColor.text} hover:${speakerColor.text}`}
                                      >
                                        {isTurnCollapsed ? (
                                          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                                        )}
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
                                    <div className="border-border/60 ml-2 border-l py-0 pl-3 [contain-intrinsic-size:1px_720px] [content-visibility:auto]">
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
                                              className="[contain-intrinsic-size:1px_56px] [content-visibility:auto]"
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

                  {loadingMore && (
                    <div className="flex w-full items-center justify-center py-8">
                      <p className="text-muted-foreground animate-pulse text-center text-[10px] font-semibold tracking-wider uppercase">
                        Loading more lines...
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-border/10 mt-8 border-t px-4 pt-6 pb-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-muted-foreground/40 text-[9px] font-bold tracking-[0.2em] uppercase">
                        Community Transcription
                      </p>
                      <p className="text-muted-foreground/20 text-[7px] font-medium tracking-widest uppercase">
                        Help us improve this transcript
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        transcriptContainerRef.current?.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        })
                      }
                      className="text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground h-8 w-auto gap-1.5 rounded-lg px-2 text-[9px] font-bold tracking-widest uppercase transition-all active:scale-95 sm:w-auto"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Back to Top</span>
                      <span className="sm:hidden">Top</span>
                    </Button>
                  </div>

                  {hasMore && <div ref={loadMoreSentinelRef} className="h-8" />}
                </div>

                {isTranscriptExpanded && (
                  <div className="-mx-4 border-t transition-all duration-300 sm:-mx-8">
                    <Footer />
                  </div>
                )}

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
          onSaved={({ lineId, updates }) => {
            setEditingLine(null);
            setData((prev) =>
              applyLineUpdatesToBattleData(prev, [lineId], updates),
            );
            toast({
              title: "Line Saved",
              description: "The line has been updated successfully.",
            });
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
          onSaved={async () => {
            setAddingLine(false);
            setAddingLineData(null);
            toast({
              title: "Line Added",
              description: "New line has been added to the transcript.",
            });
            await fetchBattle({ forceFresh: true });
          }}
        />
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
