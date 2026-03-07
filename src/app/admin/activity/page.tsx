"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) throw new Error(data.error);
          return data as StatsData;
        }),
      )
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-purple-500/20">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />
        <div className="border-border/40 mb-10 flex items-end justify-between border-b pb-6">
          <div className="flex gap-3 space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              ACTIVITY DASHBOARD
            </h1>
          </div>
        </div>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-purple-500/20">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
              <div className="absolute inset-0 -z-10 h-12 w-12 animate-ping rounded-2xl bg-purple-500/5" />
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#141417] p-6">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/5 blur-3xl transition-colors group-hover:bg-purple-500/10" />
                <p className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">
                  <TrendingUp className="h-3 w-3" /> Total Reviews
                </p>
                <p className="text-4xl font-black tracking-tighter">
                  {stats.overview.total_reviews}
                </p>
              </div>
              <div className="border-primary/10 group relative overflow-hidden rounded-3xl border bg-[#141417] p-6">
                <div className="bg-primary/5 group-hover:bg-primary/10 absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl transition-colors" />
                <p className="text-primary/60 mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </p>
                <div className="flex items-end gap-3">
                  <p className="text-primary text-4xl font-black tracking-tighter">
                    {stats.overview.total_approved}
                  </p>
                  {stats.overview.total_reviews > 0 && (
                    <p className="text-primary/40 mb-1 text-sm font-bold">
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
              <div className="border-destructive/10 group relative overflow-hidden rounded-3xl border bg-[#141417] p-6">
                <div className="bg-destructive/5 group-hover:bg-destructive/10 absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl transition-colors" />
                <p className="text-destructive/60 mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase">
                  <XCircle className="h-3 w-3" /> Rejected
                </p>
                <div className="flex items-end gap-3">
                  <p className="text-destructive text-4xl font-black tracking-tighter">
                    {stats.overview.total_rejected}
                  </p>
                  {stats.overview.total_reviews > 0 && (
                    <p className="text-destructive/40 mb-1 text-sm font-bold">
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
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417]">
              <div className="border-b border-white/5 p-6">
                <h2 className="text-sm font-black tracking-widest uppercase">
                  Per-Moderator Breakdown
                </h2>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 text-[10px] font-black tracking-widest text-white/40 uppercase">
                    <th className="px-6 py-4">Moderator</th>
                    <th className="px-6 py-4">Reviews</th>
                    <th className="px-6 py-4">Approval Rate</th>
                    <th className="px-6 py-4">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {stats.moderators.map((mod) => (
                    <tr
                      key={mod.id}
                      className="transition-colors hover:bg-white/2"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {mod.display_name}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-white/40 uppercase">
                          {mod.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black">
                        {mod.total}
                        <span className="ml-2 text-xs font-medium text-white/40">
                          (<span className="text-primary">{mod.approved}</span>{" "}
                          /{" "}
                          <span className="text-destructive">
                            {mod.rejected}
                          </span>
                          )
                        </span>
                      </td>
                      <td className="flex items-center gap-3 px-6 py-4">
                        <div className="flex h-2 w-24 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="bg-primary h-full"
                            style={{
                              width: `${(mod.approved / mod.total) * 100}%`,
                            }}
                          />
                          <div
                            className="bg-destructive h-full"
                            style={{
                              width: `${(mod.rejected / mod.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/60">
                          {Math.round((mod.approved / mod.total) * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60">
                        {mod.last_review
                          ? new Date(mod.last_review).toLocaleDateString()
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                  {stats.moderators.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm font-bold text-white/40"
                      >
                        No activity data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
