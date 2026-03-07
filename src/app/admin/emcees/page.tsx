"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  ChevronDown,
  Mic2,
  AlertCircle,
  Loader2,
  BarChart3 as BarChartIcon,
  History as HistoryIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type EmceeAdmin = {
  id: string;
  name: string;
  aka: string[];
  created_at: string;
  battle_count: number;
  line_count: number;
};

/**
 * Emcee Admin Page
 * Provides tools for superadmins to manage the emcee database,
 * including renaming, deleting, and merging duplicate records.
 */
export default function EmceeAdminPage() {
  const [emcees, setEmcees] = useState<EmceeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editEmcee, setEditEmcee] = useState<EmceeAdmin | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteEmcee, setDeleteEmcee] = useState<EmceeAdmin | null>(null);

  const [mergeSource, setMergeSource] = useState<EmceeAdmin | null>(null);
  const [mergeTarget, setMergeTarget] = useState<EmceeAdmin | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");

  const { toast } = useToast();

  // Fetch logic
  const fetchEmcees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/emcees");
      if (!res.ok) throw new Error("Failed to fetch emcees");
      const data = await res.json();
      setEmcees(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not load emcees";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmcees();
  }, [fetchEmcees]);

  // Filter emcees locally based on search
  const filteredEmcees = useMemo(() => {
    if (!search.trim()) return emcees;
    const q = search.toLowerCase();
    return emcees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.aka.some((a) => a.toLowerCase().includes(q)),
    );
  }, [search, emcees]);

  // Handlers
  const handleSaveEdit = async () => {
    if (!editEmcee || !editName.trim()) return;
    if (editName.trim() === editEmcee.name) {
      setEditEmcee(null);
      return; // No change
    }

    try {
      const res = await fetch(`/api/admin/emcees/${editEmcee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit emcee");

      toast({ description: "Emcee renamed successfully" });
      setEditEmcee(null);
      fetchEmcees(); // refresh list
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteEmcee) return;
    try {
      const res = await fetch(`/api/admin/emcees/${deleteEmcee.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete emcee");

      toast({ description: "Emcee deleted" });
      setDeleteEmcee(null);
      fetchEmcees();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    try {
      const res = await fetch(`/api/admin/emcees/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: mergeSource.id,
          targetId: mergeTarget.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to merge emcees");

      toast({ description: "Emcees merged successfully" });
      setMergeSource(null);
      setMergeTarget(null);
      fetchEmcees();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const mergeTargetOptions = useMemo(() => {
    if (!mergeSource) return [];
    let opts = emcees.filter((e) => e.id !== mergeSource.id);
    if (mergeSearch.trim()) {
      const sq = mergeSearch.toLowerCase();
      opts = opts.filter((e) => e.name.toLowerCase().includes(sq));
    }
    return opts;
  }, [emcees, mergeSource, mergeSearch]);

  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />

        {/* Header Section */}
        <div className="border-border/40 mb-10 flex items-end justify-between border-b pb-6">
          <div className="flex flex-col gap-3 space-y-1 md:flex-row md:items-center">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
              <Mic2 className="text-primary h-8 w-8" />
              EMCEE DIRECTORY
            </h1>
            <div className="flex h-9 w-fit items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold tracking-tighter text-white/60">
              {emcees.length} TOTAL
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="group relative hidden md:block">
              <Search className="group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors" />
              <Input
                placeholder="Search emcees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="focus-visible:ring-primary ring-offset-background h-9 w-60 rounded-xl border-white/10 bg-white/5 pl-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchEmcees}
              className="hover:bg-primary/5 hover:text-primary h-9 w-9 rounded-xl border-white/10 bg-transparent text-white transition-all active:scale-95"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Mobile Search */}
        <div className="mb-6 md:hidden">
          <div className="group relative">
            <Search className="group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors" />
            <Input
              placeholder="Search emcees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border-white/10 bg-white/5 pl-9 text-sm"
            />
          </div>
        </div>

        {loading && emcees.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24 text-[10px] font-black tracking-widest text-white/20 uppercase">
            <div className="relative">
              <div className="border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border-2">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
              <div className="bg-primary/5 absolute inset-0 -z-10 h-12 w-12 animate-ping rounded-2xl" />
            </div>
            Loading
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 text-[10px] font-black tracking-widest text-white/40 uppercase">
                    <th className="px-6 py-4 font-bold">Emcee</th>
                    <th className="px-6 py-4 font-bold">AKA</th>
                    <th className="px-6 py-4 text-center font-bold">Stats</th>
                    <th className="px-6 py-4 text-center font-bold">History</th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredEmcees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm font-bold text-white/40"
                      >
                        No emcees found matching {`"${search}"`}
                      </td>
                    </tr>
                  ) : (
                    filteredEmcees.map((e) => (
                      <tr
                        key={e.id}
                        className="group transition-colors hover:bg-white/2"
                      >
                        <td className="px-6 py-4">
                          <div className="text-base font-bold text-white">
                            {e.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] tracking-tighter text-white/20">
                            {e.id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {e.aka && e.aka.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {e.aka.map((a, i) => (
                                <span
                                  key={i}
                                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/60 uppercase"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/20 italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-[9px] font-black tracking-tighter uppercase">
                              {e.battle_count} Battles
                            </span>
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-black tracking-tighter text-white/40 uppercase">
                              {e.line_count} Lines
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-black tracking-wider text-white/40 uppercase">
                          {new Date(e.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 transition-opacity group-hover:opacity-100 md:opacity-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditEmcee(e);
                                setEditName(e.name);
                              }}
                              className="hover:bg-primary/20 hover:text-primary h-8 w-8 rounded-xl transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setMergeSource(e);
                                setMergeSearch("");
                                setMergeTarget(null);
                              }}
                              className="h-8 w-8 rounded-xl transition-colors hover:bg-purple-500/20 hover:text-purple-400"
                            >
                              <GitMerge className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteEmcee(e)}
                              className="hover:bg-destructive/20 hover:text-destructive h-8 w-8 rounded-xl transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <Dialog open={!!editEmcee} onOpenChange={(v) => !v && setEditEmcee(null)}>
        <DialogContent className="rounded-[2rem] border-white/10 bg-[#141417] p-8 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase">
              Rename Emcee
            </DialogTitle>
            <DialogDescription className="font-medium text-white/40">
              This will update the emcee&apos;s name everywhere they are
              referenced in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="New Name"
              className="focus-visible:ring-primary h-14 rounded-2xl border-white/10 bg-white/5 px-6 text-xl font-black"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditEmcee(null)}
              className="h-11 rounded-xl px-8 text-[10px] font-black tracking-widest uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editName.trim() === editEmcee?.name}
              className="bg-primary hover:bg-primary/90 h-11 rounded-xl px-8 text-[10px] font-black tracking-widest text-black uppercase"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        open={!!deleteEmcee}
        onOpenChange={(v) => !v && setDeleteEmcee(null)}
      >
        <DialogContent className="border-destructive/20 rounded-[2.5rem] bg-[#141417] p-8 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-2xl font-black tracking-tighter uppercase">
              <AlertTriangle className="h-6 w-6" />
              Delete Emcee
            </DialogTitle>
            <DialogDescription className="mt-2 text-base font-medium text-white/60">
              Are you sure you want to delete{" "}
              <strong className="font-black text-white">
                {`"${deleteEmcee?.name}"`}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border-destructive/20 mt-4 rounded-2xl border p-6">
            <p className="text-destructive mb-4 text-[10px] font-black tracking-[0.2em] uppercase">
              Warning:
            </p>
            <ul className="text-destructive/80 space-y-2 text-sm font-bold">
              <li className="flex items-center gap-2">
                <div className="bg-destructive h-1 w-1 rounded-full" />
                Removes attribution from{" "}
                <strong>{deleteEmcee?.battle_count}</strong> battles.
              </li>
              <li className="flex items-center gap-2">
                <div className="bg-destructive h-1 w-1 rounded-full" />
                <strong>{deleteEmcee?.line_count}</strong> lines will lose their
                emcee link.
              </li>
              <li className="flex items-center gap-2 pt-2 text-[10px] font-black tracking-widest uppercase">
                <AlertCircle className="h-3 w-3" /> This action is permanent.
              </li>
            </ul>
          </div>

          <DialogFooter className="mt-8 gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteEmcee(null)}
              className="h-11 rounded-xl px-8 text-[10px] font-black tracking-widest uppercase"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="h-11 rounded-xl px-8 text-[10px] font-black tracking-widest uppercase"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Modal */}
      <Dialog
        open={!!mergeSource}
        onOpenChange={(v) => !v && setMergeSource(null)}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-[2.5rem] border-white/10 bg-[#141417] p-0 sm:max-w-xl">
          <div className="border-b border-white/5 p-8 pb-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter uppercase">
                <GitMerge className="h-6 w-6 text-purple-400" />
                Merge Emcee
              </DialogTitle>
              <DialogDescription className="font-medium text-white/40">
                Consolidate{" "}
                <strong className="text-white">{`"${mergeSource?.name}"`}</strong>{" "}
                into another identity.
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-6 flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/5 opacity-50 blur-3xl" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-black tracking-widest text-white/20 uppercase">
                  Source:
                </span>
                <span className="text-destructive decoration-destructive/50 text-base font-black line-through">
                  {mergeSource?.name}
                </span>
              </div>
              <div className="-my-1 flex justify-center">
                <ChevronDown className="h-5 w-5 animate-pulse text-white/10" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-black tracking-widest text-white/20 uppercase">
                  Target:
                </span>
                <span className="text-base font-black text-emerald-400 underline decoration-emerald-400/20 underline-offset-4">
                  {mergeTarget
                    ? mergeTarget.name.toUpperCase()
                    : "SELECT TARGET..."}
                </span>
              </div>
            </div>
          </div>

          {!mergeTarget ? (
            <div className="flex flex-1 flex-col overflow-auto p-8 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase">
                  Select Destination
                </h3>
              </div>
              <div className="group relative mb-6">
                <Search className="group-focus-within:text-primary absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors" />
                <Input
                  placeholder="Filter potential targets..."
                  value={mergeSearch}
                  onChange={(e) => setMergeSearch(e.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 px-12 text-sm focus-visible:ring-purple-500"
                  autoFocus
                />
              </div>
              <div className="custom-scrollbar max-h-[35vh] flex-1 space-y-1.5 overflow-y-auto pr-2">
                {mergeTargetOptions.slice(0, 30).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setMergeTarget(e)}
                    className="group flex w-full items-center justify-between rounded-xl border border-transparent p-4 text-left transition-all hover:border-white/5 hover:bg-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="group-hover:text-primary font-black tracking-tight text-white uppercase transition-colors">
                        {e.name}
                      </span>
                      <span className="font-mono text-[9px] text-white/20">
                        ID: {e.id.split("-")[0]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[8px] font-black tracking-tighter text-white/40 uppercase">
                        {e.battle_count} B
                      </span>
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[8px] font-black tracking-tighter text-white/40 uppercase">
                        {e.line_count} L
                      </span>
                    </div>
                  </button>
                ))}
                {mergeTargetOptions.length === 0 && (
                  <div className="py-12 text-center text-[10px] font-black tracking-widest text-white/20 uppercase">
                    No matching emcees found.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-6">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
                <p className="mb-4 text-[10px] font-black tracking-[0.2em] text-emerald-500/60 uppercase">
                  Results of the merge:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <BarChartIcon className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-500/80">
                      <strong>{mergeSource?.battle_count}</strong> battle
                      appearances will be moved.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <Mic2 className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-500/80">
                      <strong>{mergeSource?.line_count}</strong> lines will be
                      attributed to <strong>{mergeTarget.name}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <HistoryIcon className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-500/80">
                      The alias {`"${mergeSource?.name}"`} will be added to the
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
                className="text-[10px] font-black tracking-widest text-white/40 uppercase hover:text-white"
              >
                Change Target
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setMergeSource(null)}
                className="h-11 rounded-xl px-8 text-[10px] font-black tracking-widest uppercase"
              >
                Cancel
              </Button>
              {mergeTarget && (
                <Button
                  onClick={handleMerge}
                  className="h-11 rounded-xl bg-purple-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:bg-purple-500"
                >
                  Execute Merge
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
