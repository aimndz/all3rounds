"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { StatusFilterTabs } from "@/components/admin/StatusFilterTabs";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { Loader2 } from "lucide-react";
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

type UserProfile = {
  id: string;
  display_name: string;
  email?: string;
  role: string;
  created_at: string;
};

const ROLES = [
  "superadmin",
  "admin",
  "moderator",
  "verified_emcee",
  "viewer",
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Users" },
  ...ROLES.map((r) => ({ value: r, label: r.replace("_", " ") })),
];

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    data: users,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    updateItem,
    setError,
  } = usePaginatedFetch<UserProfile>("/api/admin/users", {
    limit: 15,
    extraParams: { role: roleFilter },
  });

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

      updateItem("id", userId, { role: newRole });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminPageShell error={error}>
      <PageHeader 
        title="User Directory" 
        itemCount={total} 
        itemLabel="USERS"
      >
        <StatusFilterTabs
          options={FILTER_OPTIONS}
          value={roleFilter}
          onChange={(val) => {
            setRoleFilter(val);
            setPage(1);
          }}
        />
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417]">
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">User</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">Role</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase">Joined</TableHead>
                    <TableHead className="px-6 py-4 text-right text-[10px] font-semibold tracking-widest text-white/40 uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5 text-sm">
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="transition-colors hover:bg-white/2 border-white/5"
                    >
                      <TableCell className="px-6 py-4 font-medium text-white whitespace-nowrap">
                        {user.display_name}
                        <span className="mt-0.5 block font-mono text-[10px] text-white/40">
                          {user.email || user.id}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`rounded px-2 py-0.5 border-transparent text-[10px] font-bold tracking-wider uppercase ${
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
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-white/60 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {processingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(val) => handleRoleChange(user.id, val)}
                            >
                              <SelectTrigger className="h-8 w-32 bg-[#09090b] text-xs font-bold uppercase tracking-wider text-white/80 border-white/10 hover:border-white/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#141417] border-white/10 text-white">
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r} className="text-xs uppercase tracking-wider focus:bg-white/10 focus:text-white">
                                    {r.replace("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm font-semibold text-white/40 uppercase tracking-widest border-transparent"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
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
    </AdminPageShell>
  );
}
