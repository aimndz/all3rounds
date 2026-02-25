"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  selectedIds,
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

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-xl md:shadow-lg safe-bottom">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 p-3 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3">
          <div className="flex items-center justify-between md:justify-start md:gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 md:text-sm md:font-medium md:normal-case md:text-foreground">
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
            {/* Set Round */}
            <Select
              disabled={saving}
              onValueChange={(val) => onAction("set_round", val)}
            >
              <SelectTrigger className="h-8 flex-1 md:h-9 md:w-[130px] md:flex-none">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Clear Round</SelectItem>
                <SelectItem value="1">Round 1</SelectItem>
                <SelectItem value="2">Round 2</SelectItem>
                <SelectItem value="3">Round 3</SelectItem>
              </SelectContent>
            </Select>

            {/* Set Emcee */}
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
                    className="h-8 md:h-9 text-[11px] md:text-xs font-semibold px-3"
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
