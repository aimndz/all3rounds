"use client";

import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ModStat = {
  id: string;
  display_name: string;
  role: string;
  approved: number;
  rejected: number;
  total: number;
  last_review: string | null;
};

type StatsData = {
  overview: {
    total_reviews: number;
    total_approved: number;
    total_rejected: number;
  };
  moderators: ModStat[];
};

export default function AdminActivityPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/stats")
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) throw new Error(data.error);
          return data as StatsData;
        }),
      )
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, []);

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Activity Dashboard" />
      
      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
             <div className="h-[120px] rounded-3xl bg-white/5 animate-pulse" />
             <div className="h-[120px] rounded-3xl bg-white/5 animate-pulse" />
             <div className="h-[120px] rounded-3xl bg-white/5 animate-pulse" />
          </div>
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#141417] p-6">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Total Reviews
              </p>
              <p className="text-4xl font-semibold tracking-tighter">
                {stats.overview.total_reviews}
              </p>
            </div>
            
            <div className="border-primary/20 group relative overflow-hidden rounded-3xl border bg-[#141417] p-6">
              <p className="text-primary/60 mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
                Approved
              </p>
              <div className="flex items-end gap-3">
                <p className="text-primary text-4xl font-semibold tracking-tighter">
                  {stats.overview.total_approved}
                </p>
                {stats.overview.total_reviews > 0 && (
                  <p className="text-primary/60 mb-1 text-sm font-bold">
                    {Math.round((stats.overview.total_approved / stats.overview.total_reviews) * 100)}%
                  </p>
                )}
              </div>
            </div>
            
            <div className="border-destructive/20 group relative overflow-hidden rounded-3xl border bg-[#141417] p-6">
              <p className="text-destructive/60 mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
                Rejected
              </p>
              <div className="flex items-end gap-3">
                <p className="text-destructive text-4xl font-semibold tracking-tighter">
                  {stats.overview.total_rejected}
                </p>
                {stats.overview.total_reviews > 0 && (
                  <p className="text-destructive/60 mb-1 text-sm font-bold">
                    {Math.round((stats.overview.total_rejected / stats.overview.total_reviews) * 100)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Moderator Breakdown */}
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417]">
            <div className="border-b border-white/5 p-6">
              <h2 className="text-sm font-semibold tracking-widest uppercase">
                Per-Moderator Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">Moderator</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">Reviews</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">Approval Rate</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-semibold tracking-widest text-white/40 uppercase">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5 text-sm">
                  {stats.moderators.map((mod) => (
                    <TableRow
                      key={mod.id}
                      className="transition-colors hover:bg-white/2 border-white/5"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="font-medium text-white whitespace-nowrap">
                          {mod.display_name}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-white/40 uppercase">
                          {mod.role}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-semibold whitespace-nowrap">
                        {mod.total}
                        <span className="ml-2 text-xs font-medium text-white/40">
                          (<span className="text-primary">{mod.approved}</span>{" "}
                          /{" "}
                          <span className="text-destructive">
                            {mod.rejected}
                          </span>
                          )
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{ width: `${(mod.approved / mod.total) * 100}%` }}
                            />
                            <div
                              className="bg-destructive h-full transition-all"
                              style={{ width: `${(mod.rejected / mod.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white/60 w-12 shrink-0 text-right">
                            {Math.round((mod.approved / mod.total) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-white/60 whitespace-nowrap">
                        {mod.last_review
                          ? new Date(mod.last_review).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.moderators.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm font-bold text-white/40 border-transparent"
                      >
                        No activity data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
