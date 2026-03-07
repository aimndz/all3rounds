"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, X } from "lucide-react";
export default function BatchActionBar({
  selectedCount,
  selectedIds: _selectedIds,
  participants,
  onAction,
  onClear,
  saving,
  canDelete,
}: {
  selectedCount: number;
  selectedIds: Set<number>;
  participants?: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  onAction: (
    action: "set_round" | "set_emcee" | "delete",
    value?: string,
  ) => Promise<void>;
  onClear: () => void;
  saving: boolean;
  canDelete?: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeEmceeId, setActiveEmceeId] = useState<string>("");
  const [activeRound, setActiveRound] = useState<string>("");

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="border-border bg-card/95 safe-bottom fixed inset-x-0 bottom-0 z-50 border-t shadow-xl backdrop-blur-sm md:shadow-lg">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 p-3 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3">
          <div className="flex items-center justify-between md:justify-start md:gap-3">
            <span className="text-muted-foreground/80 md:text-foreground text-xs font-bold tracking-wider uppercase md:text-sm md:font-medium md:normal-case">
              {selectedCount} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={saving}
              className="h-7 px-2 md:hidden"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1.5 md:gap-2">
            {/* Set Round Chips */}
            <div className="flex items-center gap-1">
              {[
                { id: "1", label: "R1" },
                { id: "2", label: "R2" },
                { id: "3", label: "R3" },
                { id: "4", label: "OT" },
              ].map((r) => {
                const isActive = activeRound === r.id;
                return (
                  <Button
                    key={r.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setActiveRound(r.id);
                      onAction("set_round", r.id);
                    }}
                    className="h-8 min-w-9 px-2.5 text-[11px] font-bold md:h-9 md:text-xs"
                  >
                    {r.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setActiveRound("none");
                  onAction("set_round", "none");
                }}
                className="h-8 px-2 text-[10px] opacity-50 hover:opacity-100 md:h-9"
                title="Clear Round"
              >
                Clear
              </Button>
            </div>

            <div className="bg-border/50 mx-1 hidden h-6 w-px md:block" />

            {/* Set Emcee Chips */}
            <div className="flex flex-wrap items-center gap-1">
              {participants?.map((p) => {
                if (!p.emcee) return null;
                const isActive = activeEmceeId === p.emcee.id;
                return (
                  <Button
                    key={p.emcee.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setActiveEmceeId(p.emcee!.id);
                      onAction("set_emcee", p.emcee!.id);
                    }}
                    className="h-8 px-3 text-[11px] font-semibold md:h-9 md:text-xs"
                  >
                    {p.emcee.name}
                  </Button>
                );
              })}
            </div>

            {/* Delete */}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 flex-1 md:h-9 md:flex-none"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={saving}
              className="hidden h-9 md:flex"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} line{selectedCount !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the selected lines. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={async () => {
                await onAction("delete");
                setShowDeleteConfirm(false);
              }}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
