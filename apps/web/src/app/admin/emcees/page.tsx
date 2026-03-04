"use client";

import { useEffect, useState, useMemo } from "react";
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
  const fetchEmcees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/emcees");
      if (!res.ok) throw new Error("Failed to fetch emcees");
      const data = await res.json();
      setEmcees(data);
    } catch (err: any) {
      setError(err.message || "Could not load emcees");
      toast({
        title: "Error",
        description: err.message || "Could not load emcees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmcees();
  }, []);

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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-primary/20">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />

        {/* Header Section */}
        <div className="mb-10 flex items-end justify-between border-b border-border/40 pb-6">
          <div className="space-y-1 flex flex-col md:flex-row md:items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Mic2 className="h-8 w-8 text-primary" />
              EMCEE DIRECTORY
            </h1>
            <div className="h-9 w-fit flex items-center bg-white/5 rounded-xl px-4 font-bold text-xs tracking-tighter border border-white/5 text-white/60">
              {emcees.length} TOTAL
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search emcees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[240px] h-9 bg-white/5 border-white/10 rounded-xl text-xs focus-visible:ring-primary ring-offset-background"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchEmcees}
              className="h-9 w-9 border-white/10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:scale-95 text-white bg-transparent"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search emcees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full h-10 bg-white/5 border-white/10 rounded-xl text-sm"
            />
          </div>
        </div>

        {loading && emcees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6 tracking-widest text-white/20 uppercase font-black text-[10px]">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl border-2 border-primary/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 h-12 w-12 animate-ping -z-10 bg-primary/5 rounded-2xl" />
            </div>
            Loading
          </div>
        ) : (
          <div className="bg-[#141417] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/40 bg-white/2">
                    <th className="px-6 py-4 font-bold">Emcee</th>
                    <th className="px-6 py-4 font-bold">AKA</th>
                    <th className="px-6 py-4 font-bold text-center">Stats</th>
                    <th className="px-6 py-4 font-bold text-center">History</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredEmcees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-white/40 text-sm font-bold"
                      >
                        No emcees found matching "{search}"
                      </td>
                    </tr>
                  ) : (
                    filteredEmcees.map((e) => (
                      <tr
                        key={e.id}
                        className="group hover:bg-white/2 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-base text-white">
                            {e.name}
                          </div>
                          <div className="text-[10px] text-white/20 font-mono mt-0.5 tracking-tighter">
                            {e.id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {e.aka && e.aka.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {e.aka.map((a, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase font-black tracking-widest text-white/60"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-white/20 italic text-[10px]">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-[9px] uppercase tracking-tighter">
                              {e.battle_count} Battles
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 font-black text-[9px] uppercase tracking-tighter">
                              {e.line_count} Lines
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] text-white/40 font-black uppercase tracking-wider">
                          {new Date(e.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditEmcee(e);
                                setEditName(e.name);
                              }}
                              className="h-8 w-8 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors"
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
                              className="h-8 w-8 rounded-xl hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
                            >
                              <GitMerge className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteEmcee(e)}
                              className="h-8 w-8 rounded-xl hover:bg-destructive/20 hover:text-destructive transition-colors"
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
        <DialogContent className="sm:max-w-md bg-[#141417] border-white/10 rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              Rename Emcee
            </DialogTitle>
            <DialogDescription className="text-white/40 font-medium">
              This will update the emcee's name everywhere they are referenced
              in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="New Name"
              className="text-xl font-black h-14 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-primary px-6"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditEmcee(null)}
              className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editName.trim() === editEmcee?.name}
              className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl bg-primary text-black hover:bg-primary/90"
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
        <DialogContent className="sm:max-w-lg bg-[#141417] border-destructive/20 rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Delete Emcee
            </DialogTitle>
            <DialogDescription className="text-base text-white/60 mt-2 font-medium">
              Are you sure you want to delete{" "}
              <strong className="text-white font-black">
                "{deleteEmcee?.name}"
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive mb-4">
              Warning:
            </p>
            <ul className="text-sm font-bold text-destructive/80 space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-destructive" />
                Removes attribution from{" "}
                <strong>{deleteEmcee?.battle_count}</strong> battles.
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-destructive" />
                <strong>{deleteEmcee?.line_count}</strong> lines will lose their
                emcee link.
              </li>
              <li className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest pt-2">
                <AlertCircle className="h-3 w-3" /> This action is permanent.
              </li>
            </ul>
          </div>

          <DialogFooter className="mt-8 gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteEmcee(null)}
              className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 bg-[#141417] border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 pb-6 border-b border-white/5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <GitMerge className="h-6 w-6 text-purple-400" />
                Merge Emcee
              </DialogTitle>
              <DialogDescription className="text-white/40 font-medium">
                Consolidate{" "}
                <strong className="text-white">"{mergeSource?.name}"</strong>{" "}
                into another identity.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl opacity-50" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/20 font-black uppercase tracking-widest">
                  Source:
                </span>
                <span className="font-black text-destructive line-through decoration-destructive/50 text-base">
                  {mergeSource?.name}
                </span>
              </div>
              <div className="flex justify-center -my-1">
                <ChevronDown className="h-5 w-5 text-white/10 animate-pulse" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/20 font-black uppercase tracking-widest">
                  Target:
                </span>
                <span className="font-black text-emerald-400 text-base underline decoration-emerald-400/20 underline-offset-4">
                  {mergeTarget
                    ? mergeTarget.name.toUpperCase()
                    : "SELECT TARGET..."}
                </span>
              </div>
            </div>
          </div>

          {!mergeTarget ? (
            <div className="flex-1 overflow-auto p-8 pt-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  Select Destination
                </h3>
              </div>
              <div className="relative group mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Filter potential targets..."
                  value={mergeSearch}
                  onChange={(e) => setMergeSearch(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-xl px-12 text-sm focus-visible:ring-purple-500"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 max-h-[35vh] custom-scrollbar">
                {mergeTargetOptions.slice(0, 30).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setMergeTarget(e)}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left group"
                  >
                    <div className="flex flex-col">
                      <span className="font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">
                        {e.name}
                      </span>
                      <span className="text-[9px] font-mono text-white/20">
                        ID: {e.id.split("-")[0]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/40 font-black text-[8px] uppercase tracking-tighter">
                        {e.battle_count} B
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/40 font-black text-[8px] uppercase tracking-tighter">
                        {e.line_count} L
                      </span>
                    </div>
                  </button>
                ))}
                {mergeTargetOptions.length === 0 && (
                  <div className="py-12 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">
                    No matching emcees found.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-4">
                  Results of the merge:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <BarChartIcon className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm text-emerald-500/80 font-medium">
                      <strong>{mergeSource?.battle_count}</strong> battle
                      appearances will be moved.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Mic2 className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm text-emerald-500/80 font-medium">
                      <strong>{mergeSource?.line_count}</strong> lines will be
                      attributed to <strong>{mergeTarget.name}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <HistoryIcon className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm text-emerald-500/80 font-medium">
                      The alias "<strong>{mergeSource?.name}</strong>" will be
                      added to the target's AKA list.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-8 pt-6 border-t border-white/5 bg-white/2 flex justify-between items-center mt-auto">
            {mergeTarget ? (
              <Button
                variant="ghost"
                onClick={() => setMergeTarget(null)}
                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
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
                className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
              >
                Cancel
              </Button>
              {mergeTarget && (
                <Button
                  onClick={handleMerge}
                  className="font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.2)]"
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
