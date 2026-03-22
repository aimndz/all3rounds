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
import { Search, Users, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";

import { BulkAssignDialog } from "@/components/admin/BulkAssignDialog";

type Emcee = {
  id: string;
  name: string;
  aka: string[];
};

type Participant = {
  id: string;
  emcee_id: string;
  label: string | null;
  emcees: Emcee;
};

type BattleAdmin = {
  id: string;
  title: string;
  youtube_id: string;
  event_name: string;
  event_date: string;
  status: string;
  created_at: string;
  battle_participants: Participant[];
};

export default function BattleAdminPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { toast } = useToast();

  const [selectedBattleIds, setSelectedBattleIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  const {
    data: battles,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    refetch,
  } = usePaginatedFetch<BattleAdmin>("/api/admin/battles", {
    limit: 15,
    extraParams: { q: debouncedSearch, sort },
  });

  const toggleBattle = (id: string) => {
    const next = new Set(selectedBattleIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBattleIds(next);
  };

  const toggleAll = () => {
    if (selectedBattleIds.size === battles.length) {
      setSelectedBattleIds(new Set());
    } else {
      setSelectedBattleIds(new Set(battles.map((b) => b.id)));
    }
  };

  const handleBulkAssign = async (emceeIds: string[]) => {
    try {
      const res = await fetch(`/api/admin/battles/bulk-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleIds: Array.from(selectedBattleIds),
          emceeIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign emcees");

      toast({
        description: `Successfully assigned ${emceeIds.length} emcee(s) to ${selectedBattleIds.size} battle(s).`,
      });
      setSelectedBattleIds(new Set());
      refetch();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (!confirm("Are you sure you want to remove this emcee from the battle?"))
      return;

    try {
      const res = await fetch(`/api/admin/battles/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: [{ action: "remove", participantId }],
        }),
      });

      if (!res.ok) throw new Error("Failed to remove participant");
      toast({ description: "Emcee removed from battle." });
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
      <PageHeader title="Battles" itemCount={loading ? undefined : total}>
        <div className="flex w-full items-center gap-4 md:w-auto md:flex-row">
          {selectedBattleIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-primary text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase">
                {selectedBattleIds.size} Selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkAssignOpen(true)}
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 h-10 text-[10px] font-semibold tracking-widest uppercase transition-all"
              >
                <Users className="mr-2 h-4 w-4" />
                Assign Emcees
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Select
              value={sort}
              onValueChange={(val) => {
                setSort(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-[140px] border-white/10 bg-white/5 text-[10px] font-semibold tracking-widest text-white/60 uppercase">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3 w-3" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1c1c21] text-white">
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            <div className="group relative w-full md:w-[320px]">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
              <Input
                placeholder="Search battles..."
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
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#141417] shadow-xl md:block">
            <Table className="w-full text-left">
              <TableHeader>
                <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                  <TableHead className="w-10 px-6 py-3">
                    <Checkbox
                      checked={
                        battles.length > 0 &&
                        selectedBattleIds.size === battles.length
                      }
                      onCheckedChange={toggleAll}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/20"
                    />
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    Battle
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    Emcees
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    Event
                  </TableHead>
                  <TableHead className="px-6 py-3 text-center text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/5 text-sm">
                {battles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="border-transparent px-6 py-12 text-center text-[10px] font-semibold tracking-widest text-white/40 uppercase"
                    >
                      No battles found
                    </TableCell>
                  </TableRow>
                ) : (
                  battles.map((b) => (
                    <TableRow
                      key={b.id}
                      className={`group border-white/5 transition-colors hover:bg-white/2 ${selectedBattleIds.has(b.id) ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="px-6 py-3">
                        <Checkbox
                          checked={selectedBattleIds.has(b.id)}
                          onCheckedChange={() => toggleBattle(b.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/20"
                        />
                      </TableCell>
                      <TableCell className="max-w-[300px] px-6 py-4">
                        <Link
                          href={`/battle/${b.id}`}
                          prefetch={false}
                          className="group/link flex flex-col hover:cursor-pointer"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div className="group-hover/link:text-primary truncate text-sm font-semibold text-white transition-colors">
                            {b.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-white/20">
                            YT: {b.youtube_id}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {b.battle_participants?.length > 0 ? (
                            b.battle_participants.map((p) => (
                              <Badge
                                key={p.id}
                                variant="outline"
                                className="hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex cursor-pointer items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] font-semibold tracking-widest text-white/60 uppercase transition-colors"
                                onClick={() => removeParticipant(p.id)}
                              >
                                {p.emcees?.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[9px] text-white/20 italic">
                              Empty
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-[11px] font-bold text-white/70">
                          {b.event_name || "—"}
                        </div>
                        <div className="mt-0.5 text-[9px] tracking-tighter text-white/30 uppercase">
                          {b.event_date
                            ? new Date(b.event_date).toLocaleDateString()
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Badge
                          variant="outline"
                          className={`rounded-md border-transparent px-2 py-0.5 text-[8px] font-semibold tracking-widest uppercase ${
                            b.status === "raw"
                              ? "bg-white/5 text-white/30"
                              : b.status === "arranged"
                                ? "bg-blue-500/10 text-blue-400"
                                : b.status === "reviewing"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedBattleIds(new Set([b.id]));
                            setIsBulkAssignOpen(true);
                          }}
                          className="text-primary hover:text-primary-foreground hover:bg-primary h-7 px-2.5 text-[9px] font-semibold tracking-widest uppercase transition-colors"
                        >
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {battles.map((b) => (
              <div
                key={b.id}
                className={`rounded-2xl border border-white/5 bg-[#141417] p-4 shadow-lg transition-all ${selectedBattleIds.has(b.id) ? "ring-primary/40 bg-primary/5 ring-1" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedBattleIds.has(b.id)}
                      onCheckedChange={() => toggleBattle(b.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1 border-white/20"
                    />
                    <div>
                      <Link
                        href={`/battle/${b.id}`}
                        target="_blank"
                        className="hover:text-primary text-sm leading-tight font-semibold text-white transition-colors"
                      >
                        {b.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-white/20">
                        YT: {b.youtube_id}
                        <Badge
                          variant="outline"
                          className={`rounded-sm border-transparent px-1 py-0 text-[7px] font-semibold tracking-widest uppercase ${
                            b.status === "raw"
                              ? "bg-white/5 text-white/30"
                              : b.status === "arranged"
                                ? "bg-blue-500/10 text-blue-400"
                                : b.status === "reviewing"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {b.battle_participants?.map((p) => (
                    <Badge
                      key={p.id}
                      variant="outline"
                      className="flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] font-semibold tracking-widest text-white/60 uppercase"
                      onClick={() => removeParticipant(p.id)}
                    >
                      {p.emcees?.name}
                      <X className="h-2 w-2 opacity-40" />
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedBattleIds(new Set([b.id]));
                      setIsBulkAssignOpen(true);
                    }}
                    className="h-5 rounded-md border border-dashed border-white/10 bg-transparent px-2 text-[8px] font-semibold text-white/30 uppercase hover:bg-white/5 hover:text-white"
                  >
                    + Assign
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    {b.event_name || "Unknown Event"}
                  </div>
                  <div className="text-[9px] font-medium text-white/20">
                    {b.event_date
                      ? new Date(b.event_date).toLocaleDateString()
                      : ""}
                  </div>
                </div>
              </div>
            ))}
            {battles.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                No battles found
              </div>
            )}
          </div>

          <div className="mt-6">
            <DataPagination
              page={page}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Dialogs */}
      <BulkAssignDialog
        isOpen={isBulkAssignOpen}
        battleIds={Array.from(selectedBattleIds)}
        onClose={() => setIsBulkAssignOpen(false)}
        onAssign={handleBulkAssign}
      />
    </AdminPageShell>
  );
}
