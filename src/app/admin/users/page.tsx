"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import { Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserProfile = {
  id: string;
  display_name: string;
  role: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users.");
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this role to ${newRole}?`))
      return;

    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role.");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers =
    roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  const roles = [
    "superadmin",
    "admin",
    "moderator",
    "verified_emcee",
    "viewer",
  ];

  return (
    <div className="selection:bg-destructive/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />
        {/* Header Section */}
        <div className="border-border/40 mb-10 flex items-end justify-between border-b pb-6">
          <div className="flex gap-3 space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
              <ShieldAlert className="text-destructive h-8 w-8" />
              USER DIRECTORY
            </h1>
            <div className="flex h-9 items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold tracking-tighter text-white/60">
              {users.length} TOTAL
            </div>
          </div>
        </div>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {["all", ...roles].map((role) => (
            <Button
              key={role}
              variant={roleFilter === role ? "default" : "outline"}
              onClick={() => setRoleFilter(role)}
              className={`h-8 rounded-xl px-4 text-[10px] font-black tracking-wider uppercase ${
                roleFilter === role
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent transition-all"
                  : "border-white/10 bg-transparent text-white/60 hover:text-white"
              }`}
            >
              {role}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative">
              <div className="border-destructive/20 flex h-12 w-12 items-center justify-center rounded-2xl border-2">
                <Loader2 className="text-destructive h-6 w-6 animate-spin" />
              </div>
              <div className="bg-destructive/5 absolute inset-0 -z-10 h-12 w-12 animate-ping rounded-2xl" />
            </div>
            <p className="text-center text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">
              Loading
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black tracking-widest text-white/40 uppercase">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-white/2"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {user.display_name}
                      <span className="mt-0.5 block font-mono text-[10px] text-white/40">
                        {user.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          user.role === "superadmin"
                            ? "bg-destructive/20 text-destructive"
                            : user.role === "admin"
                              ? "bg-orange-500/20 text-orange-500"
                              : user.role === "moderator"
                                ? "bg-primary/20 text-primary"
                                : user.role === "verified_emcee"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : "bg-white/10 text-white/60"
                        } `}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/60">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {processingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                        ) : (
                          <select
                            className="focus:ring-destructive rounded-md border border-white/10 bg-[#09090b] px-2 py-1 text-xs text-white/80 focus:ring-1"
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-white/40"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
