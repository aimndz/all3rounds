import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Loader2, Users, CheckSquare } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface EmceeAdmin {
  id: string;
  name: string;
}

interface BulkAssignDialogProps {
  isOpen: boolean;
  battleIds: string[];
  onClose: () => void;
  onAssign: (emceeIds: string[]) => Promise<void>;
}

export function BulkAssignDialog({ isOpen, battleIds, onClose, onAssign }: BulkAssignDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [searchResults, setSearchResults] = useState<EmceeAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedEmcees, setSelectedEmcees] = useState<Map<string, EmceeAdmin>>(new Map());

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSearchResults([]);
      setSelectedEmcees(new Map());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchTargets = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/emcees?q=${encodeURIComponent(debouncedSearch)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data || []);
        }
      } catch (err) {
        console.error("Search targets error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, [debouncedSearch]);

  const toggleEmcee = (emcee: EmceeAdmin) => {
    const next = new Map(selectedEmcees);
    if (next.has(emcee.id)) {
      next.delete(emcee.id);
    } else {
      next.set(emcee.id, emcee);
    }
    setSelectedEmcees(next);
  };

  const removeEmcee = (id: string) => {
    const next = new Map(selectedEmcees);
    next.delete(id);
    setSelectedEmcees(next);
  };

  const handleAssign = async () => {
    if (selectedEmcees.size === 0) return;
    await onAssign(Array.from(selectedEmcees.keys()));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-white/10 bg-[#141417] p-0 sm:max-w-xl">
        <div className="border-b border-white/5 p-8 pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tighter text-white">
              <Users className="h-6 w-6 text-primary" />
              Assign Emcees
            </DialogTitle>
            <DialogDescription className="font-medium text-white/40">
              Assign emcees to {battleIds.length} selected battle{battleIds.length !== 1 ? "s" : ""}. This is ideal for 5v5 battles or side-vs-side matchups.
            </DialogDescription>
          </DialogHeader>

          {selectedEmcees.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(selectedEmcees.values()).map((e) => (
                <Badge
                  key={e.id}
                  variant="outline"
                  className="rounded-lg border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary flex items-center gap-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                  onClick={() => removeEmcee(e.id)}
                >
                  {e.name}
                  <span className="text-[10px]">&times;</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-8 pt-4">
          <div className="group relative mb-6">
            {isLoading ? (
              <Loader2 className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            ) : (
              <Search className="group-focus-within:text-white absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors" />
            )}
            <Input
              placeholder="Search emcees to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-xl border-white/10 bg-white/5 px-12 text-sm focus-visible:ring-primary"
              autoFocus
            />
          </div>
          
          <div className="custom-scrollbar max-h-[35vh] flex-1 space-y-1.5 overflow-y-auto pr-2">
            {searchResults.map((e) => {
              const isSelected = selectedEmcees.has(e.id);
              return (
                <Button
                  key={e.id}
                  variant="ghost"
                  onClick={() => toggleEmcee(e)}
                  className={`group flex h-auto w-full items-center justify-between rounded-xl border text-left transition-all ${
                    isSelected 
                      ? "border-primary/50 bg-primary/10" 
                      : "border-transparent hover:border-white/5 hover:bg-white/5"
                  }`}
                >
                  <div className="flex flex-col items-start h-full">
                    <span className={`font-semibold tracking-tight transition-colors ${isSelected ? "text-primary" : "text-white group-hover:text-primary"}`}>
                      {e.name}
                    </span>
                  </div>
                  {isSelected && <CheckSquare className="h-4 w-4 text-primary" />}
                </Button>
              );
            })}
            {searchResults.length === 0 && search.trim() && !isLoading && (
              <div className="py-12 text-center text-[10px] font-semibold tracking-widest text-white/20">
                No matching emcees found.
              </div>
            )}
            {!search.trim() && (
               <div className="py-12 text-center text-[10px] font-semibold tracking-widest text-white/20 uppercase">
                Type to search emcees...
             </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 border-t border-white/5 bg-white/2 p-8 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-11 rounded-xl px-8 text-[10px] font-semibold tracking-widest text-white/40 hover:bg-white/5 hover:text-white uppercase transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedEmcees.size === 0}
            className="h-11 rounded-xl bg-primary px-8 text-[10px] font-semibold tracking-widest text-primary-foreground uppercase shadow-[0_0_30px_hsl(var(--primary)/0.2)] hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            Assign {selectedEmcees.size > 0 ? selectedEmcees.size : ""} Emcee{selectedEmcees.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
