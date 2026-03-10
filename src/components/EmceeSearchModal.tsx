"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, X } from "lucide-react";
import type { Emcee } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EmceeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  emcees: Emcee[];
  selectedId: string;
  onSelect: (emceeId: string) => void;
}

export default function EmceeSearchModal({
  isOpen,
  onClose,
  emcees,
  selectedId,
  onSelect,
}: EmceeSearchModalProps) {
  const [search, setSearch] = useState("");

  const filteredEmcees = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return emcees;
    return emcees.filter((e) => e.name.toLowerCase().includes(query));
  }, [emcees, search]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border/50 bg-background flex max-h-[60vh] flex-col overflow-hidden p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black tracking-tight uppercase">
            Select Emcee
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors" />
            <Input
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/20 border-border/50 focus-visible:ring-primary ring-offset-background h-11 pr-9 pl-9"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-background emcee-list-container flex-1 overflow-y-auto px-3 py-4">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .emcee-list-container::-webkit-scrollbar {
              width: 6px;
            }
            .emcee-list-container::-webkit-scrollbar-track {
              background: transparent !important;
            }
            .emcee-list-container::-webkit-scrollbar-thumb {
              background: #27272a !important;
              border-radius: 10px;
            }
            .emcee-list-container::-webkit-scrollbar-thumb:hover {
              background: #3f3f46 !important;
            }
            .emcee-list-container::-webkit-scrollbar-button {
              display: none !important;
            }
            .emcee-list-container {
              scrollbar-width: thin;
              scrollbar-color: #27272a transparent;
              color-scheme: dark;
            }
          `,
            }}
          />
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                onSelect("none");
                onClose();
              }}
              className={cn(
                "hover:bg-muted group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all active:scale-[0.99]",
                selectedId === "none" && "bg-primary/5 text-primary font-bold",
              )}
            >
              <span className="text-sm">Unknown / No Emcee</span>
              {selectedId === "none" && (
                <Check className="text-primary h-4 w-4 stroke-3" />
              )}
            </button>

            {filteredEmcees.map((e) => {
              const isSelected = selectedId === e.id;

              return (
                <button
                  key={e.id}
                  onClick={() => {
                    onSelect(e.id);
                    onClose();
                  }}
                  className={cn(
                    "hover:bg-muted group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all active:scale-[0.99]",
                    isSelected && "bg-primary/5 text-primary font-bold",
                  )}
                >
                  <span className="min-w-0 truncate text-sm">{e.name}</span>
                  {isSelected && (
                    <Check className="text-primary h-4 w-4 stroke-3" />
                  )}
                </button>
              );
            })}

            {filteredEmcees.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-foreground text-sm font-bold">
                  No matches found
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try searching for a different name.
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-primary mt-4 text-xs font-bold tracking-widest uppercase hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
