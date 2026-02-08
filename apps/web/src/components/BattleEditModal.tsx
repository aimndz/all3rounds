"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

export default function BattleEditModal({
  line,
  emcees: externalEmcees,
  onClose,
  onSaved,
}: {
  line: BattleLine;
  emcees?: Emcee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(line.content);
  const [roundNumber, setRoundNumber] = useState(
    line.round_number?.toString() || "none",
  );
  const [emceeId, setEmceeId] = useState(line.emcee?.id || "none");
  const [emcees, setEmcees] = useState<Emcee[]>(externalEmcees || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!externalEmcees) {
      fetch("/api/emcees")
        .then((r) => r.json())
        .then(setEmcees)
        .catch(() => {});
    }
  }, [externalEmcees]);

  const handleSave = async (field: string, value: string | number) => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/lines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: line.id, field, value }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Line</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="battle-edit-content">Line Content</Label>
            <Textarea
              id="battle-edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => handleSave("content", content)}
              disabled={saving || content === line.content}
            >
              Save Content
            </Button>
          </div>

          {/* Emcee */}
          <div className="space-y-2">
            <Label>Emcee</Label>
            <Select value={emceeId} onValueChange={setEmceeId}>
              <SelectTrigger>
                <SelectValue placeholder="Unknown" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unknown</SelectItem>
                {emcees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() =>
                handleSave("emcee_id", emceeId === "none" ? "" : emceeId)
              }
              disabled={saving || emceeId === (line.emcee?.id || "none")}
            >
              Save Emcee
            </Button>
          </div>

          {/* Round */}
          <div className="space-y-2">
            <Label>Round Number</Label>
            <Select value={roundNumber} onValueChange={setRoundNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Unknown" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unknown</SelectItem>
                <SelectItem value="1">Round 1</SelectItem>
                <SelectItem value="2">Round 2</SelectItem>
                <SelectItem value="3">Round 3</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() =>
                handleSave(
                  "round_number",
                  roundNumber !== "none" ? parseInt(roundNumber) : "",
                )
              }
              disabled={
                saving ||
                roundNumber === (line.round_number?.toString() || "none")
              }
            >
              Save Round
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
