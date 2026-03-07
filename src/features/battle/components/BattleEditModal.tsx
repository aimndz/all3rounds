"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  participants,
  onClose,
  onSaved,
}: {
  line: BattleLine;
  participants?: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(line.content);
  const [roundNumber, setRoundNumber] = useState(
    line.round_number?.toString() || "none",
  );
  const [emceeId, setEmceeId] = useState(line.emcee?.id || "none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
              className="resize-none"
            />
          </div>

          {/* Emcee */}
          <div className="space-y-2">
            <Label>Emcee</Label>
            <div className="flex flex-wrap gap-2">
              {participants?.map((p) => {
                if (!p.emcee) return null;
                const isActive = emceeId === p.emcee.id;
                return (
                  <Button
                    key={p.emcee.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEmceeId(p.emcee!.id)}
                    className="h-9 px-3 text-xs font-semibold shadow-sm transition-all"
                  >
                    {p.emcee.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Round */}
          <div className="space-y-2">
            <Label>Round Number</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "none", label: "Unk" },
                { id: "1", label: "R1" },
                { id: "2", label: "R2" },
                { id: "3", label: "R3" },
                { id: "4", label: "OT" },
              ].map((r) => {
                const isActive = roundNumber === r.id;
                return (
                  <Button
                    key={r.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRoundNumber(r.id)}
                    className="h-9 px-3 text-xs font-semibold shadow-sm transition-all"
                  >
                    {r.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                // Save content if changed
                if (content !== line.content) {
                  const res = await fetch("/api/lines", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lineId: line.id,
                      field: "content",
                      value: content,
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to save content");
                }
                // Save emcee if changed
                if (emceeId !== (line.emcee?.id || "none")) {
                  const res = await fetch("/api/lines", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lineId: line.id,
                      field: "emcee_id",
                      value: emceeId === "none" ? "" : emceeId,
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to save emcee");
                }
                // Save round if changed
                const currentRound =
                  roundNumber !== "none" ? parseInt(roundNumber) : null;
                if (currentRound !== line.round_number) {
                  const res = await fetch("/api/lines", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lineId: line.id,
                      field: "round_number",
                      value: currentRound === null ? "" : currentRound,
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to save round");
                }
                onSaved();
              } catch (err: unknown) {
                setError(
                  err instanceof Error ? err.message : "An error occurred",
                );
                setSaving(false);
              }
            }}
            disabled={
              saving ||
              (content === line.content &&
                emceeId === (line.emcee?.id || "none") &&
                roundNumber === (line.round_number?.toString() || "none"))
            }
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
