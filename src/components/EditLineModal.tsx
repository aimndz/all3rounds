"use client";

import { SearchResult, Emcee } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import EmceeSearchModal from "./EmceeSearchModal";
import { Search } from "lucide-react";
import { groupParticipants } from "@/features/battle/utils/participant-grouping";

export default function EditLineModal({
  result,
  onClose,
  onSaved,
}: {
  result: SearchResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(result.content);
  const [roundNumber, setRoundNumber] = useState(
    result.round_number?.toString() || "none",
  );
  const [activeEmceeIds, setActiveEmceeIds] = useState<string[]>(
    result.emcees?.map((e) => e.id) || (result.emcee ? [result.emcee.id] : []),
  );
  const [emceeId, setEmceeId] = useState(result.emcee?.id || "none");
  const [emcees, setEmcees] = useState<Emcee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEmceeModalOpen, setIsEmceeModalOpen] = useState(false);


  useEffect(() => {
    fetch("/api/emcees")
      .then((r) => r.json())
      .then(setEmcees)
      .catch(() => {});
  }, []);

  const handleSavePatch = async (field: string, value: string | number | null) => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/lines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: result.id, field, value }),
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

  const handleSaveUpdate = async (updates: Record<string, unknown>) => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/lines/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineIds: [result.id],
        action: "update",
        updates,
      }),
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
          <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-content">Line Content</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button
              size="sm"
              onClick={() => handleSavePatch("content", content)}
              disabled={saving || content === result.content}
            >
              Save Content
            </Button>
          </div>

          {/* Emcee Selection */}
          <div className="space-y-2">
            <Label>Emcee</Label>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const groups = groupParticipants(result.battle.participants);

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
                      className="h-8 px-2.5 text-xs font-semibold shadow-sm"
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
                className="h-8 px-2.5 text-xs font-semibold shadow-sm"
              >
                Unknown
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEmceeModalOpen(true)}
                className="h-8 w-8"
                title="Search more emcees"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              className="mt-2 w-fit"
              onClick={() => handleSaveUpdate({ speaker_ids: activeEmceeIds })}
              disabled={
                saving || 
                JSON.stringify(activeEmceeIds.sort()) === JSON.stringify((result.emcees?.map(e => e.id) || (result.emcee ? [result.emcee.id] : [])).sort())
              }
            >
              Save Emcees
            </Button>

            <EmceeSearchModal
              isOpen={isEmceeModalOpen}
              onClose={() => setIsEmceeModalOpen(false)}
              emcees={emcees}
              selectedId={emceeId}
              onSelect={(id) => {
                setEmceeId(id);
                if (id !== "none") setActiveEmceeIds([id]);
                else setActiveEmceeIds([]);
              }}
            />
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
                    className="h-8 px-2.5 text-xs font-semibold shadow-sm"
                  >
                    {r.label}
                  </Button>
                );
              })}
            </div>
            <Button
              size="sm"
              onClick={() =>
                handleSavePatch(
                  "round_number",
                  roundNumber !== "none" ? parseInt(roundNumber) : "",
                )
              }
              disabled={
                saving ||
                roundNumber === (result.round_number?.toString() || "none")
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
