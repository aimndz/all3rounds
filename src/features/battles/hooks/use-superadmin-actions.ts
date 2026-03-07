"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Battle } from "@/features/battles/hooks/use-battles-data";

export function useSuperadminActions(
  battles: Battle[],
  setBattles: React.Dispatch<React.SetStateAction<Battle[]>>,
  initialEventNames: string[],
) {
  const { toast } = useToast();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBattles, setSelectedBattles] = useState<
    Record<string, Battle>
  >({});

  const selectedBattleIds = useMemo(
    () => new Set(Object.keys(selectedBattles)),
    [selectedBattles],
  );

  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isExcludeDialogOpen, setIsExcludeDialogOpen] = useState(false);
  const [moveTargetName, setMoveTargetName] = useState("");
  const [newDateValue, setNewDateValue] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedBattlesInfo = useMemo(
    () => Object.values(selectedBattles),
    [selectedBattles],
  );

  const toggleBattleSelection = (id: string) => {
    setSelectedBattles((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        const battle = battles.find((b) => b.id === id);
        if (battle) next[id] = battle;
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedBattles({});
    setPreviewOpen(false);
  };

  const handleMoveSelected = async () => {
    if (!moveTargetName.trim() || selectedBattleIds.size === 0) return;
    setIsMoving(true);
    try {
      const res = await fetch("/api/battles/event-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          newName: moveTargetName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move battles");
      }
      const finalName =
        moveTargetName.trim() === "Other Battles" ? "" : moveTargetName.trim();
      setBattles((prev) =>
        prev.map((b) =>
          selectedBattleIds.has(b.id) ? { ...b, event_name: finalName } : b,
        ),
      );
      toast({
        title: "Battles moved",
        description: `Moved ${selectedBattleIds.size} battle(s) to "${moveTargetName.trim()}".`,
      });
      setSelectedBattles({});
      setIsMoveDialogOpen(false);
      setSelectionMode(false);
      setMoveTargetName("");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleUpdateDateSelected = async () => {
    if (!newDateValue || selectedBattleIds.size === 0) return;
    setIsUpdatingDate(true);
    try {
      const res = await fetch("/api/battles/event-date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          newDate: newDateValue,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update dates");
      }
      setBattles((prev) =>
        prev.map((b) =>
          selectedBattleIds.has(b.id) ? { ...b, event_date: newDateValue } : b,
        ),
      );
      toast({
        title: "Dates updated",
        description: `Updated dates for ${selectedBattleIds.size} battle(s).`,
      });
      setSelectedBattles({});
      setIsDateDialogOpen(false);
      setSelectionMode(false);
      setNewDateValue("");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleExcludeSelected = async () => {
    if (selectedBattleIds.size === 0) return;
    setIsExcluding(true);
    try {
      const res = await fetch("/api/battles/batch-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          status: "excluded",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to exclude battles");
      }
      setBattles((prev) => prev.filter((b) => !selectedBattleIds.has(b.id)));
      toast({
        title: "Battles excluded",
        description: `Excluded ${selectedBattleIds.size} battle(s).`,
      });
      setSelectedBattles({});
      setIsExcludeDialogOpen(false);
      setSelectionMode(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsExcluding(false);
    }
  };

  return {
    selectionMode,
    setSelectionMode,
    selectedBattles,
    setSelectedBattles,
    selectedBattleIds,
    selectedBattlesInfo,
    toggleBattleSelection,
    exitSelectionMode,
    previewOpen,
    setPreviewOpen,
    // Move
    isMoveDialogOpen,
    setIsMoveDialogOpen,
    moveTargetName,
    setMoveTargetName,
    isMoving,
    handleMoveSelected,
    // Date
    isDateDialogOpen,
    setIsDateDialogOpen,
    newDateValue,
    setNewDateValue,
    isUpdatingDate,
    handleUpdateDateSelected,
    // Exclude
    isExcludeDialogOpen,
    setIsExcludeDialogOpen,
    isExcluding,
    handleExcludeSelected,
    // Event names for datalist
    initialEventNames,
  };
}
