"use client";

import { SearchResult, Emcee } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
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
import EmceeSearchModal from "./EmceeSearchModal";
import { Search, User } from "lucide-react";

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
  const [emceeId, setEmceeId] = useState(result.emcee?.id || "none");
  const [emcees, setEmcees] = useState<Emcee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEmceeModalOpen, setIsEmceeModalOpen] = useState(false);

  const selectedEmcee = useMemo(() => {
    if (emceeId === "none") return null;
    return emcees.find((e) => e.id === emceeId) || result.emcee;
  }, [emceeId, emcees, result.emcee]);

  useEffect(() => {
    fetch("/api/emcees")
      .then((r) => r.json())
      .then(setEmcees)
      .catch(() => {});
  }, []);

  const handleSave = async (field: string, value: string | number) => {
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
            <Label htmlFor="edit-content">Line Content</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => handleSave("content", content)}
              disabled={saving || content === result.content}
            >
              Save Content
            </Button>
          </div>

          {/* Emcee */}
          <div className="space-y-2">
            <Label>Emcee</Label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsEmceeModalOpen(true)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{selectedEmcee?.name || "Unknown / No Emcee"}</span>
                </div>
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              <Button
                size="sm"
                className="w-fit"
                onClick={() =>
                  handleSave("emcee_id", emceeId === "none" ? "" : emceeId)
                }
                disabled={saving || emceeId === (result.emcee?.id || "none")}
              >
                Save Emcee
              </Button>
            </div>

            <EmceeSearchModal
              isOpen={isEmceeModalOpen}
              onClose={() => setIsEmceeModalOpen(false)}
              emcees={emcees}
              selectedId={emceeId}
              onSelect={setEmceeId}
            />
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
