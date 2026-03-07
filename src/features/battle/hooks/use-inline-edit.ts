"use client";

import { useState, useCallback } from "react";
import type {
  BattleLine,
  BattleData,
} from "@/features/battle/hooks/use-battle-data";

export function useInlineEdit(
  data: BattleData | null,
  setData: React.Dispatch<React.SetStateAction<BattleData | null>>,
  canEdit: boolean,
  fetchBattle: () => Promise<BattleData | null>,
) {
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineContent, setInlineContent] = useState("");

  const startInlineEdit = useCallback((line: BattleLine) => {
    setInlineEditingId(line.id);
    setInlineContent(line.content);
  }, []);

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

      // Optimistic update
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
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("Rate limit");
          }
          throw new Error("Failed to save");
        }
        if (moveToNext) focusNextLine(id);
      } catch {
        fetchBattle();
      } finally {
        setInlineEditingId(null);
      }
    },
    [canEdit, data?.lines, inlineContent, setData, fetchBattle],
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

  return {
    inlineEditingId,
    setInlineEditingId,
    inlineContent,
    setInlineContent,
    startInlineEdit,
    handleInlineSave,
  };
}
