"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Edit2, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn, formatEventDate } from "@/lib/utils";
import { BattleCard } from "@/features/battles/components/BattleCard";
import type { EventGroup } from "@/features/battles/hooks/use-battles-data";

export function EventSection({
  group,
  defaultOpen = true,
  onToggle,
  isSuperadmin = false,
  onRenameGroup,
  onUpdateGroupDate,
  allEventNames = [],
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: {
  group: EventGroup;
  defaultOpen?: boolean;
  onToggle?: (name: string, isOpen: boolean) => void;
  isSuperadmin?: boolean;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onUpdateGroupDate?: (eventName: string, newDate: string) => void;
  allEventNames?: string[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [newDate, setNewDate] = useState(group.date || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(group.name, next);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === group.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/battles/event-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: group.name, newName: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to rename");
      }
      const finalName =
        newName.trim() === "Other Battles" ? "" : newName.trim();
      onRenameGroup?.(group.name, finalName);
      toast({
        title: "Event renamed",
        description: `Renamed ${group.battles.length} battle(s).`,
      });
      setIsRenameOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDate = async () => {
    if (!newDate || newDate === group.date) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/battles/event-date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: group.name,
          newDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update date");
      }
      onUpdateGroupDate?.(group.name, newDate);
      toast({
        title: "Date updated",
        description: `Updated date for ${group.battles.length} battle(s).`,
      });
      setIsDateOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="group/section">
      {/* Event Header */}
      <div
        onClick={handleToggle}
        className={cn(
          "flex cursor-pointer items-center gap-4 py-4 transition-all duration-300",
          "border-border/50 hover:border-primary/30 border-b",
          isOpen ? "mb-6" : "mb-2",
        )}
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-0.75 rounded-full transition-all duration-500",
                isOpen ? "bg-primary scale-y-100" : "bg-muted scale-y-50",
              )}
            />
            <div
              className={cn(
                "border-border bg-background flex h-6 w-6 items-center justify-center rounded-full border transition-transform duration-300",
                isOpen ? "border-primary/20 rotate-180" : "rotate-0",
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isOpen ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h2
                className={cn(
                  "text-lg font-bold tracking-tight transition-colors duration-300",
                  isOpen ? "text-foreground" : "text-foreground/80",
                )}
              >
                {group.name}
              </h2>

              {isSuperadmin && !selectionMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewName(
                      group.name === "Other Battles" ? "" : group.name,
                    );
                    setIsRenameOpen(true);
                  }}
                  className="text-muted-foreground/40 hover:bg-primary/10 hover:text-primary rounded-full p-1.5 transition-all"
                  title="Rename event"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}

              {isSuperadmin && !selectionMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewDate(group.date || "");
                    setIsDateOpen(true);
                  }}
                  className="text-muted-foreground/40 hover:bg-primary/10 hover:text-primary rounded-full p-1.5 transition-all"
                  title="Update event date"
                >
                  <Calendar className="h-3 w-3" />
                </button>
              )}

              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition-all duration-500",
                  isOpen
                    ? "border-primary/10 bg-primary/5 text-primary"
                    : "border-border/50 bg-muted/5 text-muted-foreground",
                )}
              >
                <span className="text-[10px]">{group.battles.length}</span>
                <span className="text-[10px] tracking-tighter uppercase opacity-70">
                  Battles
                </span>
              </div>
            </div>
            {group.date && (
              <p className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
                {formatEventDate(group.date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Battle Grid */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-500",
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.battles.map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                selectable={selectionMode}
                selected={selectedIds?.has(battle.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      {isSuperadmin && (
        <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Rename Event</DialogTitle>
              <DialogDescription>
                This will update the event name for all{" "}
                <strong>{group.battles.length}</strong> battle
                {group.battles.length !== 1 && "s"} in &quot;{group.name}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                list="event-suggestions"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. "Ahon 16"'
                disabled={isSubmitting}
                autoFocus
              />
              <datalist id="event-suggestions">
                {allEventNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={
                  isSubmitting ||
                  !newName.trim() ||
                  newName.trim() === group.name
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Date Dialog */}
      {isSuperadmin && (
        <Dialog open={isDateOpen} onOpenChange={setIsDateOpen}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Update Event Date</DialogTitle>
              <DialogDescription>
                This will update the event date for all{" "}
                <strong>{group.battles.length}</strong> battle
                {group.battles.length !== 1 && "s"} in &quot;{group.name}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDate}
                disabled={isSubmitting || !newDate || newDate === group.date}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Date"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
