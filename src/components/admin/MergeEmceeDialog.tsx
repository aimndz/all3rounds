import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  GitMerge,
  ChevronDown,
  Mic2,
  BarChart3 as BarChartIcon,
  History as HistoryIcon,
  Loader2,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface EmceeAdmin {
  id: string;
  name: string;
  battle_count: number;
  line_count: number;
}

interface MergeEmceeDialogProps {
  sourceEmcee: EmceeAdmin | null;
  emcees: EmceeAdmin[]; // Keeps as initial list, but we'll fetch others
  onClose: () => void;
  onMerge: (sourceId: string, targetId: string) => Promise<void>;
}

export function MergeEmceeDialog({ sourceEmcee, emcees, onClose, onMerge }: MergeEmceeDialogProps) {
  const [mergeTarget, setMergeTarget] = useState<EmceeAdmin | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [searchResults, setSearchResults] = useState<EmceeAdmin[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  const debouncedSearch = useDebouncedValue(mergeSearch, 300);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchTargets = async () => {
      setIsLoadingResults(true);
      try {
        const res = await fetch(`/api/admin/emcees?q=${encodeURIComponent(debouncedSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          // Filter out the source emcee
          setSearchResults((data.data || []).filter((e: EmceeAdmin) => e.id !== sourceEmcee?.id));
        }
      } catch (err) {
        console.error("Search targets error:", err);
      } finally {
        setIsLoadingResults(false);
      }
    };

    fetchTargets();
  }, [debouncedSearch, sourceEmcee?.id]);

  const mergeTargetOptions = useMemo(() => {
    if (!sourceEmcee) return [];
    
    // If we have search results, use them. Otherwise use the initial list filtered.
    if (mergeSearch.trim()) {
      return searchResults;
    }
    
    return emcees.filter((e) => e.id !== sourceEmcee.id);
  }, [emcees, sourceEmcee, mergeSearch, searchResults]);

  const handleMerge = async () => {
    if (!sourceEmcee || !mergeTarget) return;
    await onMerge(sourceEmcee.id, mergeTarget.id);
    onClose();
  };

  const handleClose = () => {
    setMergeTarget(null);
    setMergeSearch("");
    setSearchResults([]);
    onClose();
  };

  return (
    <Dialog
      open={!!sourceEmcee}
      onOpenChange={(v) => !v && handleClose()}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-white/10 bg-[#141417] p-0 sm:max-w-xl">
        <div className="border-b border-white/5 p-8 pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tighter text-white">
              <GitMerge className="h-6 w-6 text-purple-400" />
              Merge Emcee
            </DialogTitle>
            <DialogDescription className="font-medium text-white/40">
              Consolidate{" "}
              <strong className="text-white">{`"${sourceEmcee?.name}"`}</strong>{" "}
              into another identity.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-6 flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/5 opacity-50 blur-3xl" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-widest text-white/20">
                Source:
              </span>
              <span className="text-destructive decoration-destructive/50 text-base font-semibold line-through">
                {sourceEmcee?.name}
              </span>
            </div>
            <div className="-my-1 flex justify-center">
              <ChevronDown className="h-5 w-5 animate-pulse text-white/10" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-widest text-white/20">
                Target:
              </span>
              <span className="text-base font-semibold text-emerald-400 underline decoration-emerald-400/20 underline-offset-4">
                {mergeTarget
                  ? mergeTarget.name
                  : "Select target..."}
              </span>
            </div>
          </div>
        </div>

        {!mergeTarget ? (
          <div className="flex flex-1 flex-col overflow-auto p-8 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold tracking-[0.2em] text-white/20">
                Select Destination
              </h3>
            </div>
            <div className="group relative mb-6">
              {isLoadingResults ? (
                <Loader2 className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
              ) : (
                <Search className="group-focus-within:text-white absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors" />
              )}
              <Input
                placeholder="Search all emcees..."
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-white/5 px-12 text-sm focus-visible:ring-purple-500"
                autoFocus
              />
            </div>
            <div className="custom-scrollbar max-h-[35vh] flex-1 space-y-1.5 overflow-y-auto pr-2">
              {mergeTargetOptions.slice(0, 30).map((e) => (
                <Button
                  key={e.id}
                  variant="ghost"
                  onClick={() => setMergeTarget(e)}
                  className="group flex h-auto w-full items-center justify-between rounded-xl border border-transparent p-4 text-left transition-all hover:border-white/5 hover:bg-white/5"
                >
                  <div className="flex flex-col items-start h-full">
                    <span className="group-hover:text-primary font-semibold tracking-tight text-white transition-colors">
                      {e.name}
                    </span>
                    <span className="font-mono text-[9px] text-white/40">
                      ID: {e.id.split("-")[0]}
                    </span>
                  </div>
                  <div className="flex gap-2 h-full items-center">
                    <Badge variant="outline" className="border-transparent rounded bg-white/5 px-2 py-0.5 text-[8px] font-semibold tracking-tighter text-white/40">
                      {e.battle_count} B
                    </Badge>
                    <Badge variant="outline" className="border-transparent rounded bg-white/5 px-2 py-0.5 text-[8px] font-semibold tracking-tighter text-white/40">
                      {e.line_count} L
                    </Badge>
                  </div>
                </Button>
              ))}
              {mergeTargetOptions.length === 0 && !isLoadingResults && (
                <div className="py-12 text-center text-[10px] font-semibold tracking-widest text-white/20">
                  No matching emcees found.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-6">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
              <p className="mb-4 text-[10px] font-semibold tracking-[0.2em] text-emerald-500/60">
                Results of the merge:
              </p>
              <div className="space-y-3 relative z-10">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <BarChartIcon className="h-3 w-3 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-500/80">
                    <strong>{sourceEmcee?.battle_count}</strong> battle
                    appearances will be moved.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <Mic2 className="h-3 w-3 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-500/80">
                    <strong>{sourceEmcee?.line_count}</strong> lines will be
                    attributed to <strong>{mergeTarget.name}</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <HistoryIcon className="h-3 w-3 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-500/80">
                    The alias {`"${sourceEmcee?.name}"`} will be added to the
                    target&apos;s AKA list.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/5 bg-white/2 p-8 pt-6">
          {mergeTarget ? (
            <Button
              variant="ghost"
              onClick={() => setMergeTarget(null)}
              className="text-[10px] font-semibold tracking-widest text-white/40 hover:text-white"
            >
              Change Target
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="h-11 rounded-xl px-8 text-[10px] font-semibold tracking-widest text-white/40 hover:bg-white/5 hover:text-white transition-all"
            >
              Cancel
            </Button>
            {mergeTarget && (
              <Button
                onClick={handleMerge}
                className="h-11 rounded-xl bg-purple-600 px-8 text-[10px] font-semibold tracking-widest text-white shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:bg-purple-500 transition-all active:scale-95"
              >
                Execute Merge
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
