"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { EditEmceeDialog } from "@/components/admin/EditEmceeDialog";
import { DeleteEmceeDialog } from "@/components/admin/DeleteEmceeDialog";
import { MergeEmceeDialog } from "@/components/admin/MergeEmceeDialog";
import { UnmergeEmceeDialog } from "@/components/admin/UnmergeEmceeDialog";

type EmceeAdmin = {
  id: string;
  name: string;
  aka: string[];
  created_at: string;
  battle_count: number;
  line_count: number;
};

export default function EmceeAdminPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { toast } = useToast();

  const [editEmcee, setEditEmcee] = useState<EmceeAdmin | null>(null);
  const [deleteEmcee, setDeleteEmcee] = useState<EmceeAdmin | null>(null);
  const [mergeSource, setMergeSource] = useState<EmceeAdmin | null>(null);
  const [unmergeState, setUnmergeState] = useState<{
    emcee: EmceeAdmin;
    akaName: string;
  } | null>(null);

  const {
    data: emcees,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    refetch,
    removeItem,
  } = usePaginatedFetch<EmceeAdmin>("/api/admin/emcees", {
    limit: 15,
    extraParams: { q: debouncedSearch },
  });

  const handleSaveEdit = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/admin/emcees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit emcee");

      toast({ description: "Emcee renamed successfully" });
      refetch();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/emcees/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete emcee");

      toast({ description: "Emcee deleted" });
      removeItem("id", id);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    try {
      const res = await fetch(`/api/admin/emcees/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to merge emcees");

      toast({ description: "Emcees merged successfully" });
      refetch();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUnmerge = async (sourceId: string, akaName: string) => {
    try {
      const res = await fetch(`/api/admin/emcees/unmerge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, akaName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unmerge emcee");

      toast({
        description: `Successfully extracted ${akaName} into a new emcee`,
      });
      refetch();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Emcee Directory" itemCount={total} itemLabel="TOTAL">
        <div className="group relative w-full md:w-[320px]">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
          <Input
            placeholder="Search emcees..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="focus:border-primary/40 focus:ring-primary/5 h-11 rounded-2xl border-white/10 bg-white/5 pr-10 pl-11 transition-all focus:bg-white/10 focus:ring-4"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute top-1/2 right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417] shadow-xl">
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Emcee
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      AKA
                    </TableHead>
                    <TableHead className="px-6 py-4 text-center text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Stats
                    </TableHead>

                    <TableHead className="px-6 py-4 text-right text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5 text-sm">
                  {emcees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="border-transparent px-6 py-12 text-center text-sm font-bold text-white/40"
                      >
                        No emcees found matching {`"${search}"`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    emcees.map((e) => (
                      <TableRow
                        key={e.id}
                        className="group border-white/5 transition-colors hover:bg-white/2"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/emcees/${e.id}`}
                            className="group/link flex flex-col hover:cursor-pointer"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="group-hover/link:text-primary text-base font-bold text-white underline-offset-4 transition-colors hover:underline">
                              {e.name}
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-white/20">
                              {e.id}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {e.aka && e.aka.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {e.aka.map((a, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  onClick={() =>
                                    setUnmergeState({ emcee: e, akaName: a })
                                  }
                                  className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-widest text-white/60 uppercase transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                                >
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/20 italic">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary rounded-md border-transparent px-2 py-0.5 text-[9px] font-semibold tracking-wider whitespace-nowrap uppercase"
                            >
                              {e.battle_count} Battles
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-md border-transparent bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-wider whitespace-nowrap text-white/40 uppercase"
                            >
                              {e.line_count} Lines
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 transition-opacity">
                            <Button
                              variant="ghost"
                              onClick={() => setEditEmcee(e)}
                              className="h-8 px-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-colors hover:text-white"
                            >
                              Rename
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setMergeSource(e)}
                              className="h-8 px-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-colors hover:bg-purple-500/10 hover:text-purple-400"
                            >
                              Merge
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setDeleteEmcee(e)}
                              className="hover:text-destructive hover:bg-destructive/10 h-8 px-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-colors"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DataPagination
            page={page}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Dialogs */}
      <EditEmceeDialog
        emcee={editEmcee}
        onClose={() => setEditEmcee(null)}
        onSave={handleSaveEdit}
      />
      <DeleteEmceeDialog
        emcee={deleteEmcee}
        onClose={() => setDeleteEmcee(null)}
        onDelete={handleDelete}
      />
      <MergeEmceeDialog
        sourceEmcee={mergeSource}
        emcees={emcees} // Normally we'd fetch all emcees or do remote search, but using current page + remote search on merge dialog later if needed
        onClose={() => setMergeSource(null)}
        onMerge={handleMerge}
      />
      <UnmergeEmceeDialog
        emcee={unmergeState?.emcee || null}
        akaName={unmergeState?.akaName || null}
        onClose={() => setUnmergeState(null)}
        onUnmerge={handleUnmerge}
      />
    </AdminPageShell>
  );
}
