"use client";

import { useState, useCallback } from "react";
import type { BattleLine, Turn } from "@/features/battle/hooks/use-battle-data";

export function useLineSelection(lines: BattleLine[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastClickedLineId, setLastClickedLineId] = useState<number | null>(
    null,
  );

  const toggleSelect = useCallback(
    (id: number, isShift?: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (isShift && lastClickedLineId !== null && lines) {
          const currentIndex = lines.findIndex((l) => l.id === id);
          const lastIndex = lines.findIndex((l) => l.id === lastClickedLineId);

          if (currentIndex !== -1 && lastIndex !== -1) {
            const start = Math.min(currentIndex, lastIndex);
            const end = Math.max(currentIndex, lastIndex);
            const linesToSelect = lines.slice(start, end + 1);

            const shouldSelect = !prev.has(id);
            linesToSelect.forEach((l) => {
              if (shouldSelect) next.add(l.id);
              else next.delete(l.id);
            });
            return next;
          }
        }

        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastClickedLineId(id);
    },
    [lines, lastClickedLineId],
  );

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
      if (turnLines.length > 0) {
        setLastClickedLineId(turnLines[turnLines.length - 1].id);
      }
    },
    [selectedIds],
  );

  const toggleSelectRound = useCallback(
    (roundTurns: Turn[]) => {
      const roundLines = roundTurns.flatMap((t) => t.lines);
      const roundIds = roundLines.map((l) => l.id);
      const allSelected = roundIds.every((id) => selectedIds.has(id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          roundIds.forEach((id) => next.delete(id));
        } else {
          roundIds.forEach((id) => next.add(id));
        }
        return next;
      });
      if (roundLines.length > 0) {
        setLastClickedLineId(roundLines[roundLines.length - 1].id);
      }
    },
    [selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    lastClickedLineId,
    setLastClickedLineId,
    toggleSelect,
    toggleSelectTurn,
    toggleSelectRound,
    clearSelection,
  };
}
