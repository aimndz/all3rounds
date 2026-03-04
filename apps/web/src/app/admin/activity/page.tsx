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
        <div className="mb-10 flex items-end justify-between border-b border-border/40 pb-6">
          <div className="space-y-1 flex gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              ACTIVITY DASHBOARD
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl border-2 border-purple-500/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
              <div className="absolute inset-0 h-12 w-12 animate-ping -z-10 bg-purple-500/5 rounded-2xl" />
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#141417] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" /> Total Reviews
                </p>
                <p className="text-4xl font-black tracking-tighter">
                  {stats.overview.total_reviews}
                </p>
              </div>
              <div className="bg-[#141417] p-6 rounded-3xl border border-primary/10 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black tracking-tighter text-primary">
                    {stats.overview.total_approved}
                  </p>
                  {stats.overview.total_reviews > 0 && (
                    <p className="text-sm font-bold text-primary/40 mb-1">
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
              <div className="bg-[#141417] p-6 rounded-3xl border border-destructive/10 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl group-hover:bg-destructive/10 transition-colors" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/60 mb-2 flex items-center gap-2">
                  <XCircle className="h-3 w-3" /> Rejected
                </p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black tracking-tighter text-destructive">
                    {stats.overview.total_rejected}
                  </p>
                  {stats.overview.total_reviews > 0 && (
                    <p className="text-sm font-bold text-destructive/40 mb-1">
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
            <div className="bg-[#141417] rounded-3xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-sm font-black tracking-widest uppercase">
                  Per-Moderator Breakdown
                </h2>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/40 bg-white/2">
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
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {mod.display_name}
                        </div>
                        <div className="text-[10px] text-white/40 font-bold uppercase mt-0.5">
                          {mod.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black">
                        {mod.total}
                        <span className="text-xs font-medium text-white/40 ml-2">
                          (<span className="text-primary">{mod.approved}</span>{" "}
                          /{" "}
                          <span className="text-destructive">
                            {mod.rejected}
                          </span>
                          )
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(mod.approved / mod.total) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-destructive"
                            style={{
                              width: `${(mod.rejected / mod.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/60">
                          {Math.round((mod.approved / mod.total) * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/60 text-xs">
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
                        className="px-6 py-12 text-center text-white/40 text-sm font-bold"
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
