"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  useTransition,
  memo,
  Fragment,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  X,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Calendar,
  Mic2,
  Clock,
  ArrowLeft,
  Play,
  Plus,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, STATUS_CONFIG } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BatchActionBar from "@/components/BatchActionBar";
import BattleEditModal from "@/components/BattleEditModal";
import BattleAddLineModal from "@/components/BattleAddLineModal";
import Footer from "@/components/Footer";
import type { Emcee } from "@/lib/types";
import type { UserRole } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

type BattleLine = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee: { id: string; name: string } | null;
};

type BattleStatus = "raw" | "arranged" | "reviewing" | "reviewed";

type BattleData = {
  battle: {
    id: string;
    title: string;
    youtube_id: string;
    event_name: string | null;
    event_date: string | null;
    url: string;
    status: BattleStatus;
  };
  participants: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  lines: BattleLine[];
};

type Turn = {
  speaker: string;
  lines: BattleLine[];
};

type RoundGroup = {
  round: number | null;
  turns: Turn[];
};

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Distinct colors for different speakers (flat, no glow)
const SPEAKER_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {};
const COLOR_PALETTE = [
  {
    bg: "bg-amber-500/8 dark:bg-amber-400/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-sky-500/8 dark:bg-sky-400/10",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  {
    bg: "bg-emerald-500/8 dark:bg-emerald-400/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-violet-500/8 dark:bg-violet-400/10",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-rose-500/8 dark:bg-rose-400/10",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-teal-500/8 dark:bg-teal-400/10",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-orange-500/8 dark:bg-orange-400/10",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-indigo-500/8 dark:bg-indigo-400/10",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
];

function getSpeakerColor(speaker: string, index: number) {
  if (!SPEAKER_COLORS[speaker]) {
    SPEAKER_COLORS[speaker] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  }
  return SPEAKER_COLORS[speaker];
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components for performance
// ────────────────────────────────────────────────────────────────────────────

const LineItem = memo(
  ({
    line,
    editMode,
    isSelected,
    isActive,
    isLastClicked,
    inlineEditingId,
    inlineContent,
    onToggleSelect,
    onStartInlineEdit,
    onInlineSave,
    onSetInlineEditingId,
    onSetInlineContent,
    onSeek,
    onEditClick,
    onAddClick,
    showBeforeInsert,
  }: {
    line: BattleLine;
    editMode: boolean;
    isSelected: boolean;
    isActive: boolean;
    isLastClicked: boolean;
    inlineEditingId: number | null;
    inlineContent: string;
    onToggleSelect: (id: number) => void;
    onStartInlineEdit: (line: BattleLine) => void;
    onInlineSave: (id: number, moveToNext?: boolean) => void;
    onSetInlineEditingId: (id: number | null) => void;
    onSetInlineContent: (val: string) => void;
    onSeek: (time: number) => void;
    onEditClick: (line: BattleLine) => void;
    onAddClick: (lineId: number, pos: "before" | "after") => void;
    showBeforeInsert?: boolean;
  }) => {
    return (
      <Fragment>
        {showBeforeInsert && editMode && (
          <div className="relative h-4 w-full group/insert flex items-center justify-center -mt-2 mb-2 z-20">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full border-t border-dashed border-primary/20 lg:border-primary/0 lg:group-hover/insert:border-primary/30 transition-colors" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddClick(line.id, "before")}
              className="h-5 w-5 rounded-full bg-background border border-primary/20 text-primary opacity-100 lg:opacity-0 lg:group-hover/insert:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground scale-100 lg:scale-75 lg:group-hover/insert:scale-100 shadow-md hover:shadow-primary/20 cursor-pointer z-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {editMode ? (
          <div
            data-line-id={line.id}
            className={cn(
              "group/line flex items-start gap-2 rounded-md px-2 py-0.5 transition-all duration-200",
              isSelected || isActive ? "bg-primary/10" : "hover:bg-muted/40",
              (isLastClicked || isActive) &&
                "border-l-2 border-primary rounded-l-none",
            )}
          >
            {isActive && (
              <div className="absolute -left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse hidden lg:block" />
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(line.id)}
              className="mt-1 h-3.5 w-3.5 shrink-0"
            />
            {inlineEditingId === line.id ? (
              <Textarea
                autoFocus
                value={inlineContent}
                onChange={(e) => onSetInlineContent(e.target.value)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                onBlur={() => onInlineSave(line.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onInlineSave(line.id, true);
                  } else if (e.key === "Escape") {
                    onSetInlineEditingId(null);
                  }
                }}
                className="resize-none min-h-0 flex-1 border-none bg-transparent p-0 text-base md:text-[13px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <span
                className="flex-1 cursor-text text-[13px] leading-relaxed text-foreground transition-colors hover:text-primary/80"
                onClick={() => onStartInlineEdit(line)}
              >
                {line.content}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditClick(line)}
              className="h-5 w-5 shrink-0 text-muted-foreground opacity-100 lg:opacity-0 lg:transition-opacity hover:bg-muted hover:text-foreground lg:group-hover/line:opacity-100 focus:opacity-100"
              title="Edit this line"
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
          </div>
        ) : (
          <button
            data-line-id={line.id}
            onClick={() => onSeek(line.start_time)}
            className={cn(
              "group/line flex w-full items-baseline gap-3 rounded-md px-1.5 py-0.5 text-left text-[13px] transition-all duration-300 ease-in-out",
              isActive
                ? "bg-primary/10 border-l-2 border-primary rounded-l-none font-semibold"
                : "hover:bg-muted/30 text-foreground/80 border-l-2 border-transparent",
            )}
          >
            <div className="flex min-w-[32px] items-center gap-1 shrink-0">
              {isActive ? (
                <Play className="h-2 w-2 fill-primary text-primary animate-pulse" />
              ) : (
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground/30 transition-colors group-hover/line:text-muted-foreground">
                  {formatTime(line.start_time)}
                </span>
              )}
            </div>
            <span
              className={cn(
                "leading-relaxed transition-colors",
                isActive
                  ? "text-foreground"
                  : "group-hover/line:text-foreground",
              )}
            >
              {line.content}
            </span>
          </button>
        )}

        {editMode && (
          <div className="relative h-4 w-full group/insert flex items-center justify-center -my-0.5 z-10">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full border-t border-dashed border-primary/20 lg:border-primary/0 lg:group-hover/insert:border-primary/30 transition-colors" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddClick(line.id, "after")}
              className="h-5 w-5 rounded-full bg-background border border-primary/20 text-primary opacity-100 lg:opacity-0 lg:group-hover/insert:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground scale-100 lg:scale-75 lg:group-hover/insert:scale-100 shadow-md hover:shadow-primary/20 cursor-pointer z-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </Fragment>
    );
  },
);
LineItem.displayName = "LineItem";

// ============================================================================
// Main Component
// ============================================================================

export default function BattlePage() {
  // -- Hooks & Params --
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const battleId = params.id as string;

  // -- Data State --
  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -- Player & Scroll State --
  const [player, setPlayer] = useState<any>(null);
  const [activeTime, setActiveTime] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const playerRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const ytPlayerInstance = useRef<any>(null);
  const lastUrlSeek = useRef<string | null>(null);

  // -- Active Line Logic --
  const activeLineId = useMemo(() => {
    return data?.lines.find(
      (l) =>
        activeTime >= l.start_time &&
        activeTime < (l.end_time || l.start_time + 1),
    )?.id;
  }, [activeTime, data?.lines]);

  // -- Edit Mode State --
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastClickedLineId, setLastClickedLineId] = useState<number | null>(
    null,
  );
  const [editingLine, setEditingLine] = useState<BattleLine | null>(null);
  const [addingLine, setAddingLine] = useState(false);
  const [addingLineData, setAddingLineData] = useState<{
    start_time?: number;
    end_time?: number;
    round_number?: number | null;
    emcee_id?: string | null;
  } | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const canEdit = ["superadmin", "admin", "editor"].includes(userRole);
  const canBatchEdit = ["superadmin", "admin"].includes(userRole);
  const canDelete = userRole === "superadmin";
  const [batchSaving, setBatchSaving] = useState(false);
  const [emcees, setEmcees] = useState<Emcee[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // -- Collapsible UI State --
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(
    new Set(),
  );
  const [collapsedTurns, setCollapsedTurns] = useState<Set<string>>(new Set());

  // -- Inline Edit State --
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineContent, setInlineContent] = useState("");
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // ────────────────────────────────────────────────────────────────────────────
  // Effects & Data Fetching
  // ────────────────────────────────────────────────────────────────────────────

  const fetchBattle = useCallback(() => {
    fetch(`/api/battles/${battleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Battle not found."))
      .finally(() => setLoading(false));
  }, [battleId]);

  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editMode && emcees.length === 0) {
      fetch("/api/emcees")
        .then((r) => r.json())
        .then(setEmcees)
        .catch(() => {});
    }
  }, [editMode, emcees.length]);

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

  // -- YouTube IFrame API Initialization --
  useEffect(() => {
    if (!data?.battle.youtube_id) return;

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
        "youtube-player",
        {
          videoId: data?.battle.youtube_id,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (event: any) => {
              setPlayer(event.target);
            },
          },
        },
      );
    }
  }, [data?.battle.youtube_id]);

  // -- Handle initial seek or URL-based seeking --
  useEffect(() => {
    if (!player || typeof player.seekTo !== "function") return;
    const t = searchParams.get("t");
    // Only seek if 't' is present and it's different from our last URL-triggered seek
    if (t && t !== lastUrlSeek.current) {
      const seconds = parseInt(t);
      if (!isNaN(seconds)) {
        player.seekTo(seconds, true);
        player.playVideo();
        lastUrlSeek.current = t;
      }
    }
  }, [player, searchParams]);

  // -- Player Playback Sync --
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      if (player && typeof player.getCurrentTime === "function") {
        setActiveTime(player.getCurrentTime());
      }
    }, 100); // 10Hz for tighter sync
    return () => clearInterval(interval);
  }, [player]);

  // -- Spotify-Style Auto-Scroll --
  useEffect(() => {
    if (!transcriptContainerRef.current || editMode || !activeLineId) return;

    const container = transcriptContainerRef.current;
    const activeEl = container.querySelector(
      `[data-line-id="${activeLineId}"]`,
    ) as HTMLElement;

    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const containerMiddle = containerRect.top + containerRect.height / 2;

      // Only scroll if active line has dropped below the midpoint
      if (elRect.top > containerMiddle) {
        // Cancel any pending animation to prevent "jaggery" fighting
        if (scrollAnimationFrameRef.current) {
          cancelAnimationFrame(scrollAnimationFrameRef.current);
        }

        const start = container.scrollTop;
        const targetScrollTop =
          start +
          (elRect.top - containerRect.top) -
          containerRect.height / 2 +
          elRect.height / 2;

        const change = targetScrollTop - start;
        const duration = 700; // Optimal duration for weighted feel
        let startTime: number | null = null;

        const animateScroll = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = timestamp - startTime;
          const percentage = Math.min(progress / duration, 1);

          // Smoother Ease-Out-Quart animation
          const easing = 1 - Math.pow(1 - percentage, 4);

          container.scrollTop = start + change * easing;

          if (progress < duration) {
            scrollAnimationFrameRef.current =
              requestAnimationFrame(animateScroll);
          } else {
            scrollAnimationFrameRef.current = null;
          }
        };

        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      }
    }

    return () => {
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, [activeLineId, editMode]);

  // Scroll to last clicked line when entering edit mode
  useEffect(() => {
    if (editMode && lastClickedLineId && transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      // Wait a tiny bit for the DOM to switch to edit mode render
      setTimeout(() => {
        const targetEl = container.querySelector(
          `[data-line-id="${lastClickedLineId}"]`,
        ) as HTMLElement;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [editMode, lastClickedLineId]);

  // ────────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ────────────────────────────────────────────────────────────────────────────

  const handleSeek = useCallback(
    (seconds: number) => {
      if (player && typeof player.seekTo === "function") {
        player.seekTo(seconds, true);
        player.playVideo();
        playerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else {
        const url = `https://www.youtube.com/watch?v=${data?.battle.youtube_id}&t=${Math.floor(seconds)}s`;
        window.open(url, "_blank");
      }
    },
    [player, data?.battle.youtube_id],
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

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

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectTurn = useCallback(
    (turnLines: BattleLine[]) => {
      const turnIds = turnLines.map((l) => l.id);
      const allSelected = turnIds.every((id) => selectedIds.has(id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          turnIds.forEach((id) => next.delete(id));
        } else {
          turnIds.forEach((id) => next.add(id));
        }
        return next;
      });
    },
    [selectedIds],
  );

  const handleToggleEditMode = () => {
    if (!canEdit) {
      window.location.href = "/login";
      return;
    }
    startTransition(() => {
      if (editMode) {
        setSelectedIds(new Set());
        setEditMode(false);
      } else {
        setEditMode(true);
        // Prioritize the currently playing line, fallback to last clicked
        const targetId = activeLineId || lastClickedLineId;
        if (targetId) {
          setSelectedIds(new Set([targetId]));
          // Update lastClickedLineId so the effect scrolls to it
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
  // ────────────────────────────────────────────────────────────────────────────
  // Battle Action Handlers
  // ────────────────────────────────────────────────────────────────────────────

  const handleBatchAction = async (
    action: "set_round" | "set_emcee" | "delete",
    value?: string,
  ) => {
    if (selectedIds.size === 0) return;
    setBatchSaving(true);
    try {
      const res = await fetch("/api/lines/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineIds: Array.from(selectedIds),
          action,
          value: value ?? null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Batch operation failed.");
        return;
      }
      setSelectedIds(new Set());
      fetchBattle();
    } finally {
      setBatchSaving(false);
    }
  };

  const startInlineEdit = useCallback((line: BattleLine) => {
    setInlineEditingId(line.id);
    setInlineContent(line.content);
    setLastClickedLineId(line.id);
  }, []);

  /**
   * Saves content for a single line (Inline Mode).
   * Updates local state optimistically for instant feedback.
   */
  const handleInlineSave = useCallback(
    async (id: number, moveToNext = false) => {
      if (!canEdit) return;
      const originalLine = data?.lines.find((l) => l.id === id);
      if (!originalLine) {
        setInlineEditingId(null);
        return;
      }

      if (inlineContent === originalLine.content) {
        setInlineEditingId(null);
        if (moveToNext) focusNextLine(id);
        return;
      }

      // -- Optimistic Update --
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.id === id ? { ...l, content: inlineContent } : l,
          ),
        };
      });

      try {
        const res = await fetch("/api/lines", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: id,
            field: "content",
            value: inlineContent,
          }),
        });
        if (!res.ok) throw new Error("Failed to save");

        if (moveToNext) focusNextLine(id);
      } catch (err) {
        console.error("Inline save error:", err);
        fetchBattle(); // Sync back on error
      } finally {
        setInlineEditingId(null);
      }
    },
    [canEdit, data?.lines, inlineContent, focusNextLine, fetchBattle],
  );

  function focusNextLine(currentId: number) {
    const currentIndex = data?.lines.findIndex((l) => l.id === currentId);
    if (
      currentIndex !== undefined &&
      currentIndex !== -1 &&
      data?.lines[currentIndex + 1]
    ) {
      const nextLine = data.lines[currentIndex + 1];
      setTimeout(() => startInlineEdit(nextLine), 10);
    }
  }

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

    const speakers = [
      ...new Set(
        lines.map((l) => l.emcee?.name || l.speaker_label || "Unknown"),
      ),
    ];
    speakers.forEach((s, i) => getSpeakerColor(s, i));

    const groups: RoundGroup[] = [];
    let currentRoundId: number | null = undefined as unknown as number | null;
    let currentTurnGrp: Turn | null = null;

    lines.forEach((line) => {
      const round = line.round_number;
      const speaker = line.emcee?.name || line.speaker_label || "Unknown";

      if (round !== currentRoundId) {
        currentRoundId = round;
        currentTurnGrp = { speaker, lines: [line] };
        groups.push({ round, turns: [currentTurnGrp] });
      } else if (currentTurnGrp && speaker === currentTurnGrp.speaker) {
        currentTurnGrp.lines.push(line);
      } else {
        currentTurnGrp = { speaker, lines: [line] };
        groups[groups.length - 1].turns.push(currentTurnGrp);
      }
    });

    return { roundGroups: groups, speakerSet: speakers };
  }, [lines]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
          <div className="flex h-full min-h-0 flex-col gap-6 pt-4 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
            {/* Left Column: Video Skeleton */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="mb-4 h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="aspect-video w-full rounded-xl bg-muted animate-pulse shadow-sm" />
              <div className="mt-6 space-y-4 px-2">
                <div className="h-8 w-2/3 rounded-lg bg-muted animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right Column: Transcript Skeleton */}
            <div className="flex flex-1 flex-col overflow-hidden pb-4 lg:col-span-5 lg:h-full lg:pb-6 xl:col-span-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-7 w-16 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="flex-1 space-y-6 overflow-hidden pr-2">
                {[...Array(3)].map((_, ri) => (
                  <div key={ri} className="space-y-3">
                    <div className="h-5 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="ml-4 space-y-2 border-l-2 border-muted/20 pl-4">
                      {[...Array(4)].map((_, li) => (
                        <div key={li} className="flex gap-3">
                          <div className="h-4 w-8 rounded bg-muted/40 animate-pulse" />
                          <div className="h-4 flex-1 rounded bg-muted/40 animate-pulse" />
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Mic2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-xl font-semibold text-foreground">
            Battle Not Found
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
        {/* ── Two-Column Layout ── */}
        <div className="flex h-full min-h-0 flex-col gap-6 pt-4 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
          {/* Left Column: Video (Sticky/Docked) */}
          <div className="z-30 lg:col-span-7 xl:col-span-8">
            <button
              onClick={() => router.back()}
              className="mb-3 ml-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors hover:text-foreground sm:ml-0 lg:mb-4 cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              Go Back
            </button>
            <div className="overflow-hidden border-b border-border bg-card/95 shadow-sm backdrop-blur-sm transition-all duration-500 -mx-4 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg sm:hover:shadow-xl">
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
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Image
                      src={`https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`}
                      alt={battle.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 896px"
                      className="object-cover opacity-50 grayscale"
                    />
                    <div className="z-10 flex flex-col items-center gap-3">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Loading video...
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Badge Over Video (smaller, less intrusive) */}
                <div className="absolute right-3 top-3 z-30">
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-5 py-3 sm:px-6">
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {battle.title}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {battle.event_name && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Mic2 className="h-3 w-3 text-muted-foreground" />
                        {battle.event_name}
                      </span>
                    )}
                    {battle.event_date && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(battle.event_date)}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {lines.length} lines
                    </span>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <a
                    href={battle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Transcript (Scrollable) ── */}
          <div className="flex flex-1 flex-col min-h-0 lg:col-span-5 lg:h-full lg:pb-6 xl:col-span-4">
            <div
              className={cn(
                "flex h-full flex-col overflow-hidden transition-colors duration-300",
                isTranscriptExpanded
                  ? "fixed inset-0 z-50 bg-background p-4 pt-12 pb-8 animate-in slide-in-from-bottom-full duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:p-8"
                  : "relative pb-4",
              )}
            >
              <div className="mb-2 md:mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
                    Transcript
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted/80 active:scale-90 transition-all lg:hidden"
                    onClick={() =>
                      setIsTranscriptExpanded(!isTranscriptExpanded)
                    }
                  >
                    {isTranscriptExpanded ? (
                      <Minimize2 className="h-5 w-5 text-primary animate-in spin-in-90 duration-300" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
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
                        className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
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
                      className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider underline-none cursor-pointer"
                    >
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
                <div className="px-3 py-1.5 md:px-5 md:py-2 border-b border-border/10 bg-primary/5 animate-in slide-in-from-top-1 duration-500">
                  <div className="flex flex-col gap-1 items-center">
                    <p className="text-[10px] font-bold tracking-widest text-primary/80 uppercase">
                      Editing Mode
                    </p>
                    <p className="text-[9px] font-medium tracking-wider text-muted-foreground/60 uppercase text-center">
                      <span className="md:hidden">
                        Tap text to edit • Saves automatically
                      </span>
                      <span className="hidden md:inline">
                        Click text to edit •{" "}
                        <span className="text-foreground/70 font-bold border rounded px-1 py-0.5 text-[7px] border-border bg-background shadow-xs">
                          ENTER
                        </span>{" "}
                        SAVE & NEXT •{" "}
                        <span className="text-foreground/70 font-bold border rounded px-1 py-0.5 text-[7px] border-border bg-background shadow-xs">
                          ESC
                        </span>{" "}
                        CANCEL
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div
                ref={transcriptContainerRef}
                className="flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--muted)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted"
              >
                <div className="space-y-1">
                  {roundGroups.map((group: RoundGroup, gi: number) => {
                    const isRoundCollapsed = collapsedRounds.has(gi);
                    const roundLabel = group.round
                      ? `Round ${group.round}`
                      : "Unassigned";
                    const lineCount = group.turns.reduce(
                      (sum: number, t: Turn) => sum + t.lines.length,
                      0,
                    );

                    return (
                      <div key={gi}>
                        {/* Round header (Sticky within scroll area) */}
                        <div className="sticky top-0 z-20 bg-background/95 py-1 backdrop-blur-sm">
                          <Button
                            variant="ghost"
                            onClick={() => toggleRoundCollapse(gi)}
                            className="h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                          >
                            {isRoundCollapsed ? (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                              {roundLabel}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {lineCount}
                            </span>
                          </Button>
                        </div>

                        {/* Round children */}
                        {!isRoundCollapsed && (
                          <div className="ml-2 border-l-2 border-border/40 pl-3 space-y-0.5">
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
                                  <div className="sticky top-[38px] z-10 -ml-1 flex items-center gap-1.5 bg-background/80 py-0.5 backdrop-blur-sm">
                                    <Button
                                      variant="ghost"
                                      onClick={() =>
                                        toggleTurnCollapse(turnKey)
                                      }
                                      className={`h-auto justify-start gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/50 ${speakerColor.text}`}
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
                                        className="ml-1 h-3.5 w-3.5"
                                        onCheckedChange={() =>
                                          toggleSelectTurn(turn.lines)
                                        }
                                      />
                                    )}
                                  </div>

                                  {/* Lines */}
                                  {!isTurnCollapsed && (
                                    <div className="ml-2 border-l border-border/20 pl-3 py-0.5">
                                      {turn.lines.map(
                                        (line: BattleLine, li: number) => (
                                          <LineItem
                                            key={line.id}
                                            line={line}
                                            editMode={editMode}
                                            isSelected={selectedIds.has(
                                              line.id,
                                            )}
                                            isActive={activeLineId === line.id}
                                            isLastClicked={
                                              lastClickedLineId === line.id
                                            }
                                            inlineEditingId={inlineEditingId}
                                            inlineContent={inlineContent}
                                            onToggleSelect={toggleSelect}
                                            onStartInlineEdit={startInlineEdit}
                                            onInlineSave={handleInlineSave}
                                            onSetInlineEditingId={
                                              setInlineEditingId
                                            }
                                            onSetInlineContent={
                                              setInlineContent
                                            }
                                            onSeek={handleSeek}
                                            onEditClick={setEditingLine}
                                            onAddClick={handleAddLineAt}
                                            showBeforeInsert={
                                              gi === 0 && ti === 0 && li === 0
                                            }
                                          />
                                        ),
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
                <div className="mt-12 border-t border-border pt-6 text-center space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    {lines.length} lines transcribed • Community edits welcome
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
          emcees={emcees}
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
          emcees={emcees}
          onClose={() => setEditingLine(null)}
          onSaved={() => {
            setEditingLine(null);
            fetchBattle();
          }}
        />
      )}
      {/* Add-line modal */}
      {addingLine && (
        <BattleAddLineModal
          battleId={battleId}
          currentTime={activeTime}
          emcees={emcees}
          initialData={addingLineData || undefined}
          onClose={() => {
            setAddingLine(false);
            setAddingLineData(null);
          }}
          onSaved={() => {
            setAddingLine(false);
            setAddingLineData(null);
            fetchBattle();
          }}
        />
      )}
      <Footer />
    </div>
  );
}
