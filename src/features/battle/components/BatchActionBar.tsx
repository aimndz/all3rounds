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
  selectedIds: _selectedIds, // Prefixed as unused but kept for interface consistency
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
  onAction: (config: {
    action: "set_round" | "set_emcee" | "update" | "delete";
    value?: string;
    updates?: {
      round_number?: number | null;
      emcee_id?: string | null;
    };
  }) => Promise<void>;
  onClear: () => void;
  saving: boolean;
  canDelete?: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Pending attribute states (null = no change, 'none' = clear field)
  const [activeEmceeId, setActiveEmceeId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<string | null>(null);

  const hasChanges = activeEmceeId !== null || activeRound !== null;

  /**
   * Consolidates pending changes and triggers the batch update action
   */
  const handleApply = async () => {
    if (!hasChanges) return;
    
    const updates: { round_number?: number | null; emcee_id?: string | null } = {};
    
    if (activeRound !== null) {
      updates.round_number = activeRound === "none" ? null : Number(activeRound);
    }
    
    if (activeEmceeId !== null) {
      updates.emcee_id = activeEmceeId === "none" ? null : activeEmceeId;
    }

    await onAction({
      action: "update",
      updates,
    });

    // Reset local selection state after successful apply
    setActiveRound(null);
    setActiveEmceeId(null);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* 
          Floating Batch Action Bar 
          - Desktop: Floating container with rounded corners
          - Mobile: Fixed pinned to bottom with horizontal scrolling for emcees
      */}
      <div className="border-border bg-card/98 fixed inset-x-0 bottom-0 z-50 border-t shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md md:bottom-4 md:inset-x-4 md:mx-auto md:max-w-5xl md:rounded-2xl md:border md:shadow-2xl">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-6 md:px-6 md:py-3">
          
          {/* Header Area: Selection Info & Mobile Clear */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="flex flex-col">
              <span className="text-primary text-[10px] font-black tracking-widest uppercase opacity-80">
                Selected
              </span>
              <span className="text-foreground text-sm font-bold md:text-base">
                {selectedCount} line{selectedCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={saving}
                className="h-8 px-2 text-xs font-bold uppercase tracking-tight"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:gap-8">
            
            {/* Round Selection Section */}
            <div className="flex shrink-0 flex-col gap-1.5">
              <span className="text-muted-foreground/50 text-[9px] font-bold tracking-[0.2em] uppercase">
                Round
              </span>
              <div className="flex gap-1">
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
                        // Toggle logic: Click active to unselect
                        setActiveRound(activeRound === r.id ? null : r.id);
                      }}
                      className="h-8 min-w-[38px] px-0 text-[11px] font-bold transition-all md:h-8.5 md:min-w-9"
                    >
                      {r.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Emcee Selection Section: Scrollable on Mobile */}
            <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
              <span className="text-muted-foreground/50 text-[9px] font-bold tracking-[0.2em] uppercase">
                Emcee
              </span>
              <div className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
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
                        // Toggle logic: Click active to unselect
                        setActiveEmceeId(
                          activeEmceeId === p.emcee!.id ? null : p.emcee!.id,
                        );
                      }}
                      className="h-8 whitespace-nowrap px-3 text-[11px] font-semibold transition-all md:h-8.5"
                    >
                      {p.emcee.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 pt-1 md:ml-auto md:pt-0">
            {hasChanges && (
              <Button
                variant="default"
                disabled={saving}
                onClick={handleApply}
                className="bg-primary hover:bg-primary/90 flex-1 px-6 font-bold shadow-lg shadow-primary/20 md:h-9 md:flex-none"
              >
                {saving ? "Saving..." : "Apply"}
              </Button>
            )}

            <div className="flex gap-1 md:gap-2">
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={saving}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9 w-9 transition-colors md:w-auto md:px-3"
                  title="Delete selected lines"
                >
                  <Trash2 className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden text-xs font-bold uppercase tracking-wider md:inline">
                    Delete
                  </span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                disabled={saving}
                className="text-muted-foreground h-9 w-9 md:w-auto md:px-3"
                title="Cancel selection"
              >
                <X className="h-4 w-4 md:mr-1.5" />
                <span className="hidden text-xs font-bold uppercase tracking-wider md:inline">
                  Cancel
                </span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Safe Area Inset Bottom for Mobile Home Indicator */}
        <div className="h-[env(safe-area-inset-bottom)] md:hidden" />
      </div>

      {/* ── Batch Delete Confirmation Dialog ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} line{selectedCount !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the selected lines from the transcript. This action cannot be undone.
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
                await onAction({ action: "delete" });
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
