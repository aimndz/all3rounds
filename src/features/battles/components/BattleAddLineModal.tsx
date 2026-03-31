"use client";

import { useMemo, useState } from "react";
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
import { formatTimeInputValue, parseTimeInputValue } from "@/lib/time-input";

function TimeInputHint({
  parsed,
}: {
  parsed: ReturnType<typeof parseTimeInputValue>;
}) {
  if (!parsed.ok) {
    return <p className="text-destructive text-[11px]">{parsed.error}</p>;
  }

  return (
    <p className="text-muted-foreground text-[11px]">
      {parsed.seconds.toFixed(2).replace(/\.00$/, "")}s
    </p>
  );
}

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
  const initialStartSeconds = initialData?.start_time ?? currentTime;
  const initialEndSeconds =
    initialData?.end_time ?? initialStartSeconds + 1;
  const initialDisplayStartSeconds = Math.floor(initialStartSeconds);
  const initialDisplayEndSeconds = Math.max(
    Math.floor(initialEndSeconds),
    initialDisplayStartSeconds + 1,
  );

  const [content, setContent] = useState("");
  const [startTime, setStartTime] = useState(
    formatTimeInputValue(initialDisplayStartSeconds, {
      includeDecimals: false,
    }),
  );
  const [endTime, setEndTime] = useState(
    formatTimeInputValue(initialDisplayEndSeconds, {
      includeDecimals: false,
    }),
  );
  const [roundNumber, setRoundNumber] = useState(
    initialData?.round_number?.toString() || "1",
  );
  const [activeEmceeIds, setActiveEmceeIds] = useState<string[]>(
    initialData?.emcee_id && initialData.emcee_id !== "none" ? [initialData.emcee_id] : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startTimePreview = useMemo(
    () => parseTimeInputValue(startTime),
    [startTime],
  );
  const endTimePreview = useMemo(() => parseTimeInputValue(endTime), [endTime]);

  const participantGroups = useMemo(
    () => groupParticipants(participants),
    [participants],
  );

  const normalizeTimeField = (
    value: string,
    setter: (nextValue: string) => void,
  ) => {
    const parsed = parseTimeInputValue(value);
    if (parsed.ok) {
      setter(parsed.normalized);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    const parsedStart = parseTimeInputValue(startTime);
    if (!parsedStart.ok) {
      setError(`Start time: ${parsedStart.error}`);
      return;
    }

    const parsedEnd = parseTimeInputValue(endTime);
    if (!parsedEnd.ok) {
      setError(`End time: ${parsedEnd.error}`);
      return;
    }

    if (parsedEnd.seconds <= parsedStart.seconds) {
      setError("End time must be later than start time.");
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
          start_time: parsedStart.seconds,
          end_time: parsedEnd.seconds,
          speaker_ids: activeEmceeIds,
          round_number: roundNumber,
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
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError("");
              }}
              className="h-24 resize-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Start Time
              </Label>
              <Input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (error) setError("");
                }}
                onBlur={() => normalizeTimeField(startTime, setStartTime)}
                placeholder="75, 2:15, 1:02:15"
              />
              <TimeInputHint parsed={startTimePreview} />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                End Time
              </Label>
              <Input
                type="text"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  if (error) setError("");
                }}
                onBlur={() => normalizeTimeField(endTime, setEndTime)}
                placeholder="77, 2:17, 1:02:17"
              />
              <TimeInputHint parsed={endTimePreview} />
            </div>
          </div>

          <div className="space-y-4">
            {/* Round */}
            <div className="space-y-2">
              <Label>Round</Label>
              <div className="flex flex-wrap gap-2">
                {[
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
                      onClick={() => {
                        setRoundNumber(r.id);
                        if (error) setError("");
                      }}
                      className="h-8 px-2.5 text-xs font-semibold shadow-sm"
                    >
                      {r.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Emcee</Label>
              {participantGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {participantGroups.map((group) => {
                    const groupIds = group.emcees.map((emcee) => emcee.id);
                    const groupName = group.emcees.map((emcee) => emcee.name).join(" / ");
                    const isActive =
                      groupIds.length > 0 &&
                      groupIds.every((id) => activeEmceeIds.includes(id)) &&
                      groupIds.length === activeEmceeIds.length;

                    return (
                      <Button
                        key={`${group.label}-${groupIds.join("-")}`}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setActiveEmceeIds(groupIds);
                          if (error) setError("");
                        }}
                        className="h-8 px-2.5 text-[11px] font-semibold shadow-sm transition-all"
                      >
                        {groupName}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  No linked emcees for this battle yet.
                </p>
              )}
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
