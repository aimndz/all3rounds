"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BatchActionBar from "@/components/BatchActionBar";
import BattleEditModal from "@/components/BattleEditModal";
import type { Emcee } from "@/lib/types";

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

// Speaker text colors for lyrics view
const SPEAKER_TEXT_COLORS = [
  "text-foreground",
  "text-stone-500 dark:text-stone-400",
  "text-stone-600 dark:text-stone-300",
  "text-stone-400 dark:text-stone-500",
];

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [emcees, setEmcees] = useState<Emcee[]>([]);

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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Prefetch emcees when entering edit mode
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
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (editMode) {
      // Exiting edit mode
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
        const data = await res.json();
        alert(data.error || "Batch operation failed.");
        return;
      }

      // Refetch battle data and clear selection
      setSelectedIds(new Set());
      fetchBattle();
    } finally {
      setBatchSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-5 w-1/3 rounded bg-muted" />
            <div className="mt-8 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <Card className="mx-auto max-w-md">
            <CardContent className="p-8 space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">
                Battle Not Found
              </h1>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" asChild>
                <Link href="/">← Back to search</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { battle, lines } = data;

  // Build speaker text color map
  const speakerSet = [
    ...new Set(lines.map((l) => l.emcee?.name || l.speaker_label || "Unknown")),
  ];
  const speakerColorMap = new Map<string, string>();
  speakerSet.forEach((s, i) => {
    speakerColorMap.set(s, SPEAKER_TEXT_COLORS[i % SPEAKER_TEXT_COLORS.length]);
  });

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

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Battle header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {battle.title}
            </h1>
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={handleToggleEditMode}
              className="shrink-0"
            >
              {editMode ? (
                <>
                  <X className="h-4 w-4" />
                  Exit Edit
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {battle.event_name && <span>{battle.event_name}</span>}
            {battle.event_date && (
              <>
                <span className="text-border">•</span>
                <span>{formatDate(battle.event_date)}</span>
              </>
            )}
            <span className="text-border">•</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-red-600 hover:text-red-700"
              asChild
            >
              <a href={battle.url} target="_blank" rel="noopener noreferrer">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Watch on YouTube
              </a>
            </Button>
          </div>

          {/* Emcees */}
          <div className="mt-3 flex flex-wrap gap-2">
            {speakerSet.map((speaker) => (
              <Badge
                key={speaker}
                variant="outline"
                className={speakerColorMap.get(speaker)}
              >
                {speaker}
              </Badge>
            ))}
          </div>
        </div>

        {/* Transcription — lyrics style */}
        <div className="space-y-8">
          {roundGroups.map((group, gi) => (
            <div key={gi}>
              {group.round && (
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Round {group.round}:
                </h2>
              )}

              <div className="space-y-6">
                {group.turns.map((turn, ti) => {
                  const colorClass =
                    speakerColorMap.get(turn.speaker) || SPEAKER_TEXT_COLORS[0];
                  const turnAllSelected =
                    editMode && turn.lines.every((l) => selectedIds.has(l.id));

                  return (
                    <div key={ti}>
                      {/* Speaker heading — clickable in edit mode to select entire turn */}
                      <p
                        className={`mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground ${
                          editMode
                            ? "cursor-pointer select-none hover:text-foreground transition-colors"
                            : ""
                        }`}
                        onClick={
                          editMode
                            ? () => toggleSelectTurn(turn.lines)
                            : undefined
                        }
                        title={
                          editMode
                            ? turnAllSelected
                              ? "Deselect all lines"
                              : "Select all lines"
                            : undefined
                        }
                      >
                        {editMode && (
                          <Checkbox
                            checked={turnAllSelected}
                            className="mr-2 align-middle"
                            onCheckedChange={() => toggleSelectTurn(turn.lines)}
                          />
                        )}
                        {turn.speaker}:
                      </p>

                      {/* Lyrics lines */}
                      <div className="space-y-0">
                        {turn.lines.map((line) => {
                          const ytLink = `https://www.youtube.com/watch?v=${battle.youtube_id}&t=${Math.floor(line.start_time)}s`;
                          const isSelected = selectedIds.has(line.id);

                          if (editMode) {
                            return (
                              <div
                                key={line.id}
                                className={`group/line flex items-start gap-2 rounded px-1 py-0.5 transition-colors ${
                                  isSelected
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelect(line.id)}
                                  className="mt-1.5 shrink-0"
                                />
                                <span
                                  className={`flex-1 leading-7 cursor-pointer ${colorClass}`}
                                  onClick={() => toggleSelect(line.id)}
                                >
                                  {line.content}
                                </span>
                                <button
                                  onClick={() => setEditingLine(line)}
                                  className="mt-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/line:opacity-100 focus:opacity-100"
                                  title="Edit this line"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
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
                              className={`block leading-7 transition-colors hover:text-red-500 ${colorClass}`}
                            >
                              {line.content}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 text-center">
          <Separator className="mb-6" />
          <p className="text-xs text-muted-foreground">
            {lines.length} lines transcribed • Community edits welcome
          </p>
        </div>

        {/* Bottom padding when batch bar is visible */}
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
