"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import BatchActionBar from "@/components/BatchActionBar";
import BattleEditModal from "@/components/BattleEditModal";
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

type BattleData = {
  battle: {
    id: string;
    title: string;
    youtube_id: string;
    event_name: string | null;
    event_date: string | null;
    url: string;
  };
  participants: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  lines: BattleLine[];
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

// ============================================================================
// Component
// ============================================================================

export default function BattlePage() {
  const params = useParams();
  const battleId = params.id as string;

  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingLine, setEditingLine] = useState<BattleLine | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const canEdit = ["superadmin", "admin", "editor"].includes(userRole);
  const canBatchEdit = ["superadmin", "admin"].includes(userRole);
  const canDelete = userRole === "superadmin";
  const [batchSaving, setBatchSaving] = useState(false);
  const [emcees, setEmcees] = useState<Emcee[]>([]);

  // Collapsible state
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(
    new Set(),
  );
  const [collapsedTurns, setCollapsedTurns] = useState<Set<string>>(new Set());

  const toggleRoundCollapse = (roundIndex: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundIndex)) next.delete(roundIndex);
      else next.add(roundIndex);
      return next;
    });
  };

  const toggleTurnCollapse = (turnKey: string) => {
    setCollapsedTurns((prev) => {
      const next = new Set(prev);
      if (next.has(turnKey)) next.delete(turnKey);
      else next.add(turnKey);
      return next;
    });
  };

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

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectTurn = (turnLines: BattleLine[]) => {
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
  };

  const handleToggleEditMode = () => {
    if (!canEdit) {
      window.location.href = "/login";
      return;
    }
    if (editMode) {
      setSelectedIds(new Set());
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

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

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="aspect-3/1 w-full rounded-xl bg-muted" />
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="mt-8 space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
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

  const { battle, lines } = data;

  // Build speaker color map
  const speakerSet = [
    ...new Set(lines.map((l) => l.emcee?.name || l.speaker_label || "Unknown")),
  ];
  speakerSet.forEach((s, i) => getSpeakerColor(s, i));

  // Group lines by round and speaker turns
  type Turn = { speaker: string; lines: BattleLine[] };
  type RoundGroup = { round: number | null; turns: Turn[] };
  const roundGroups: RoundGroup[] = [];

  let currentRound: number | null = undefined as unknown as number | null;
  let currentTurn: Turn | null = null;

  lines.forEach((line) => {
    const round = line.round_number;
    const speaker = line.emcee?.name || line.speaker_label || "Unknown";

    if (round !== currentRound) {
      currentRound = round;
      currentTurn = { speaker, lines: [line] };
      roundGroups.push({ round, turns: [currentTurn] });
    } else if (currentTurn && speaker === currentTurn.speaker) {
      currentTurn.lines.push(line);
    } else {
      currentTurn = { speaker, lines: [line] };
      roundGroups[roundGroups.length - 1].turns.push(currentTurn);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          href="/battles"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All battles
        </Link>

        {/* ── Hero Card ── */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
          {/* Thumbnail */}
          <div className="relative aspect-3/1 w-full overflow-hidden bg-muted">
            <Image
              src={`https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`}
              alt={battle.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 896px"
              className="object-cover"
            />
            {/* Scrim for legibility */}
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

            {/* Title on image */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {battle.title}
              </h1>
            </div>
          </div>

          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-5 py-3 sm:px-6">
            {battle.event_name && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Mic2 className="h-3.5 w-3.5 text-muted-foreground" />
                {battle.event_name}
              </span>
            )}
            {battle.event_date && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(battle.event_date)}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {lines.length} lines
            </span>

            <div className="ml-auto flex items-center gap-2">
              <a
                href={battle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-3 w-3" />
                YouTube
              </a>
              {canEdit && (
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleEditMode}
                  className="h-8 text-xs"
                >
                  {editMode ? (
                    <>
                      <X className="mr-1 h-3 w-3" />
                      Exit Edit
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Transcript ── */}
        <div className="space-y-1">
          {roundGroups.map((group, gi) => {
            const isRoundCollapsed = collapsedRounds.has(gi);
            const roundLabel = group.round
              ? `Round ${group.round}`
              : "Unassigned";
            const lineCount = group.turns.reduce(
              (sum, t) => sum + t.lines.length,
              0,
            );

            return (
              <div key={gi}>
                {/* Round header */}
                <button
                  onClick={() => toggleRoundCollapse(gi)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  {isRoundCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    {roundLabel}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {lineCount}
                  </span>
                </button>

                {/* Round children */}
                {!isRoundCollapsed && (
                  <div className="ml-3 border-l-2 border-border/60 pl-4 space-y-0.5">
                    {group.turns.map((turn, ti) => {
                      const turnKey = `${gi}-${ti}`;
                      const isTurnCollapsed = collapsedTurns.has(turnKey);
                      const speakerColor = getSpeakerColor(
                        turn.speaker,
                        speakerSet.indexOf(turn.speaker),
                      );
                      const turnAllSelected =
                        editMode &&
                        turn.lines.every((l) => selectedIds.has(l.id));

                      return (
                        <div key={ti}>
                          {/* Speaker header */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleTurnCollapse(turnKey)}
                              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 ${speakerColor.text}`}
                            >
                              {isTurnCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                              )}
                              <span
                                className={`h-2 w-2 rounded-full ${speakerColor.dot}`}
                              />
                              <span className="font-medium">
                                {turn.speaker}
                              </span>
                              <span className="text-xs opacity-50">
                                {turn.lines.length}
                              </span>
                            </button>

                            {editMode && (
                              <Checkbox
                                checked={turnAllSelected}
                                className="ml-1"
                                onCheckedChange={() =>
                                  toggleSelectTurn(turn.lines)
                                }
                              />
                            )}
                          </div>

                          {/* Lines */}
                          {!isTurnCollapsed && (
                            <div className="ml-3 border-l border-border/40 pl-4 py-0.5">
                              {turn.lines.map((line) => {
                                const ytLink = `https://www.youtube.com/watch?v=${battle.youtube_id}&t=${Math.floor(line.start_time)}s`;
                                const isSelected = selectedIds.has(line.id);

                                if (editMode) {
                                  return (
                                    <div
                                      key={line.id}
                                      className={`group/line flex items-start gap-2 rounded-md px-2 py-1 transition-colors ${
                                        isSelected
                                          ? "bg-primary/10"
                                          : "hover:bg-muted/40"
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() =>
                                          toggleSelect(line.id)
                                        }
                                        className="mt-1 shrink-0"
                                      />
                                      <span
                                        className="flex-1 cursor-pointer text-sm leading-relaxed text-foreground"
                                        onClick={() => toggleSelect(line.id)}
                                      >
                                        {line.content}
                                      </span>
                                      <button
                                        onClick={() => setEditingLine(line)}
                                        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/line:opacity-100 focus:opacity-100"
                                        title="Edit this line"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    key={line.id}
                                    href={ytLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/line flex items-baseline gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/40"
                                  >
                                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/50 transition-colors group-hover/line:text-muted-foreground">
                                      {formatTime(line.start_time)}
                                    </span>
                                    <span className="leading-relaxed text-foreground/90 transition-colors group-hover/line:text-foreground">
                                      {line.content}
                                    </span>
                                  </a>
                                );
                              })}
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
        <div className="mt-16 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {lines.length} lines transcribed • Community edits welcome
          </p>
        </div>

        {editMode && selectedIds.size > 0 && <div className="h-20" />}
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
          line={editingLine}
          emcees={emcees}
          onClose={() => setEditingLine(null)}
          onSaved={() => {
            setEditingLine(null);
            fetchBattle();
          }}
        />
      )}
    </div>
  );
}
