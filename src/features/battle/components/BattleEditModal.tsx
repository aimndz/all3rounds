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
import { groupParticipants } from "../utils/participant-grouping";

type BattleLine = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee: { id: string; name: string } | null;
  emcees?: { id: string; name: string }[];
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
  const [activeEmceeIds, setActiveEmceeIds] = useState<string[]>(
    line.emcees?.map((e) => e.id) || (line.emcee ? [line.emcee.id] : []),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Line</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">
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

          <div className="space-y-2">
            <Label>Emcee</Label>
            <div className="flex flex-wrap gap-2">
                {(() => {
                  const groups = groupParticipants(participants);

                  return groups.map((group) => {
                    const groupIds = group.emcees.map(e => e.id);
                    const groupName = group.emcees.map(e => e.name).join(" / ");
                    const isActive = groupIds.length > 0 && groupIds.every(id => activeEmceeIds.includes(id)) && groupIds.length === activeEmceeIds.length;
                    
                    return (
                      <Button
                        key={group.label + groupIds.join('-')}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveEmceeIds(groupIds)}
                        className="h-9 px-3 text-xs font-semibold shadow-sm transition-all"
                      >
                        {groupName}
                      </Button>
                    );
                  });
                })()}
                <Button
                  type="button"
                  variant={activeEmceeIds.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEmceeIds([])}
                  className="h-9 px-3 text-xs font-semibold shadow-sm transition-all"
                >
                  Unknown
                </Button>
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
                // Use the batch endpoint for simpler implementation of multi-speaker updates
                const res = await fetch("/api/lines/batch", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    lineIds: [line.id],
                    action: "update",
                    updates: {
                      round_number: roundNumber === "none" ? null : parseInt(roundNumber),
                      speaker_ids: activeEmceeIds,
                    },
                  }),
                });

                if (!res.ok) throw new Error("Failed to save changes");

                // Content update (still separate for now to match edit history expectations if needed, 
                // but we could also merge this into a more robust batch API later)
                if (content !== line.content) {
                  const contentRes = await fetch("/api/lines", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lineId: line.id,
                      field: "content",
                      value: content,
                    }),
                  });
                  if (!contentRes.ok) throw new Error("Failed to save text content");
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
                JSON.stringify(activeEmceeIds.sort()) === JSON.stringify((line.emcees?.map(e => e.id) || (line.emcee ? [line.emcee.id] : [])).sort()) &&
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
