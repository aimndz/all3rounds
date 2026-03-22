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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Activity" />

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-[120px] animate-pulse rounded-3xl bg-white/5" />
            <div className="h-[120px] animate-pulse rounded-3xl bg-white/5" />
            <div className="h-[120px] animate-pulse rounded-3xl bg-white/5" />
          </div>
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#141417] p-6 transition-all hover:bg-white/8">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Total Reviews
              </p>
              <p className="text-4xl font-semibold tracking-tighter sm:text-5xl">
                {stats.overview.total_reviews}
              </p>
            </div>

            <div className="border-primary/20 group bg-primary/5 hover:bg-primary/10 relative overflow-hidden rounded-3xl border p-6 transition-all">
              <p className="text-primary/60 mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
                Approved
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-primary text-4xl font-semibold tracking-tighter sm:text-5xl">
                  {stats.overview.total_approved}
                </p>
                {stats.overview.total_reviews > 0 && (
                  <p className="text-primary/60 mb-1 text-sm font-semibold">
                    {Math.round(
                      (stats.overview.total_approved /
                        stats.overview.total_reviews) *
                        100,
                    )}
                    %
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
                  <p className="text-destructive/60 mb-1 text-sm font-semibold">
                    {Math.round(
                      (stats.overview.total_rejected /
                        stats.overview.total_reviews) *
                        100,
                    )}
                    %
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Moderator Breakdown */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#141417] md:block">
            <div className="border-b border-white/5 px-6 py-4">
              <h2 className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Per-Moderator Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                    <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Moderator
                    </TableHead>
                    <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Reviews
                    </TableHead>
                    <TableHead className="px-6 py-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Approval Rate
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-[10px] font-semibold tracking-widest whitespace-nowrap text-white/40 uppercase">
                      Last Active
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5 text-sm">
                  {stats.moderators.map((mod) => (
                    <TableRow
                      key={mod.id}
                      className="border-white/5 transition-colors hover:bg-white/2"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="text-sm font-semibold whitespace-nowrap text-white">
                          {mod.display_name}
                        </div>
                        <div className="mt-0.5 text-[9px] font-semibold tracking-widest text-white/20 uppercase">
                          {mod.role}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-semibold whitespace-nowrap">
                        <span className="text-white">{mod.total}</span>
                        <span className="ml-2 text-[10px] font-semibold text-white/20">
                          (<span className="text-primary">{mod.approved}</span>{" "}
                          /{" "}
                          <span className="text-destructive">
                            {mod.rejected}
                          </span>
                          )
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[200px] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{
                                width: `${(mod.approved / mod.total) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-destructive h-full transition-all"
                              style={{
                                width: `${(mod.rejected / mod.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-white/40">
                            {Math.round(
                              (mod.approved / (mod.total || 1)) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right text-xs font-medium whitespace-nowrap text-white/40">
                        {mod.last_review
                          ? new Date(mod.last_review).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Breakdown View */}
          <div className="grid gap-3 md:hidden">
            <h2 className="px-1 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
              Moderator Breakdown
            </h2>
            {stats.moderators.map((mod) => (
              <div
                key={mod.id}
                className="rounded-2xl border border-white/5 bg-[#141417] p-4 shadow-lg"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {mod.display_name}
                    </div>
                    <div className="mt-0.5 text-[9px] font-semibold tracking-widest text-white/20 uppercase">
                      {mod.role}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg leading-none font-semibold text-white">
                      {mod.total}
                    </div>
                    <div className="mt-1 text-[9px] font-semibold tracking-widest text-white/20 uppercase">
                      Reviews
                    </div>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold tracking-widest uppercase">
                    <span className="text-white/40">Approval Rate</span>
                    <span className="text-white">
                      {Math.round((mod.approved / (mod.total || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{
                        width: `${(mod.approved / (mod.total || 1)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-destructive h-full transition-all"
                      style={{
                        width: `${(mod.rejected / (mod.total || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-semibold tracking-widest uppercase">
                    <span className="text-primary">
                      {mod.approved} Approved
                    </span>
                    <span className="text-destructive">
                      {mod.rejected} Rejected
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[9px] font-semibold tracking-widest text-white/20 uppercase">
                    Last Activity
                  </span>
                  <span className="text-[10px] font-bold text-white/40">
                    {mod.last_review
                      ? new Date(mod.last_review).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
