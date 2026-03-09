"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus } from "lucide-react";
import { groupParticipants } from "../utils/participant-grouping";
export default function BattleAddLineModal({
  battleId,
  currentTime,
  participants,
  onClose,
  onSaved,
  initialData,
}: {
  battleId: string;
  currentTime: number;
  participants?: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  onClose: () => void;
  onSaved: () => void;
  initialData?: {
    start_time?: number;
    end_time?: number;
    round_number?: number | null;
    emcee_id?: string | null;
  };
}) {
  const [content, setContent] = useState("");
  const [startTime, setStartTime] = useState(
    initialData?.start_time?.toFixed(2) || currentTime.toFixed(2),
  );
  const [endTime, setEndTime] = useState(
    initialData?.end_time?.toFixed(2) || (currentTime + 2).toFixed(2),
  );
  const [roundNumber, setRoundNumber] = useState(
    initialData?.round_number?.toString() || "1",
  );
  const [activeEmceeIds, setActiveEmceeIds] = useState<string[]>(
    initialData?.emcee_id && initialData.emcee_id !== "none" ? [initialData.emcee_id] : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
          const res = await fetch("/api/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battle_id: battleId,
          content: content.trim(),
          start_time: parseFloat(startTime),
          end_time: parseFloat(endTime),
          speaker_ids: activeEmceeIds,
          round_number: roundNumber === "none" ? "" : roundNumber,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save.");
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="text-primary h-4 w-4" />
            Add New Line
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-2 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="add-line-content">Content</Label>
            <Textarea
              id="add-line-content"
              placeholder="What was said?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-24 resize-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Start (s)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                End (s)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Round */}
            <div className="space-y-2">
              <Label>Round</Label>
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
                      className="h-8 px-2.5 text-xs font-semibold shadow-sm"
                    >
                      {r.label}
                    </Button>
                  );
                })}
              </div>
            </div>

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
                      className="h-8 px-2.5 text-[11px] font-semibold transition-all shadow-sm"
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
                className="h-8 px-2.5 text-[11px] font-semibold transition-all shadow-sm"
              >
                Unknown
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add Line"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
