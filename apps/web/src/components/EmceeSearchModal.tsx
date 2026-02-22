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
      <DialogContent className="sm:max-w-md max-h-[60vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            Select Emcee
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 h-11 bg-muted/20 border-border/50 focus-visible:ring-primary ring-offset-background"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 bg-background emcee-list-container">
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
                "flex items-center justify-between w-full px-4 py-3 text-left rounded-lg transition-all hover:bg-muted group active:scale-[0.99]",
                selectedId === "none" && "bg-primary/5 text-primary font-bold",
              )}
            >
              <span className="text-sm">Unknown / No Emcee</span>
              {selectedId === "none" && (
                <Check className="h-4 w-4 text-primary stroke-3" />
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
                    "flex items-center justify-between w-full px-4 py-3 text-left rounded-lg transition-all hover:bg-muted group active:scale-[0.99]",
                    isSelected && "bg-primary/5 text-primary font-bold",
                  )}
                >
                  <span className="text-sm truncate">{e.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary stroke-3" />
                  )}
                </button>
              );
            })}

            {filteredEmcees.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-foreground">
                  No matches found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching for a different name.
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-4 text-xs font-bold text-primary uppercase tracking-widest hover:underline"
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
