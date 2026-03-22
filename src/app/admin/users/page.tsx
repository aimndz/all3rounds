"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Loader2, Search, X } from "lucide-react";
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

type UserProfile = {
  id: string;
  display_name: string;
  email?: string;
  role: string;
  created_at: string;
};

const ROLES = ["superadmin", "admin", "moderator", "verified_emcee", "viewer"];

const FILTER_OPTIONS = [
  { value: "all", label: "All Users" },
  ...ROLES.map((r) => ({ value: r, label: r.replace("_", " ") })),
];

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
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
    extraParams: { role: roleFilter, q: debouncedSearch },
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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "admin":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "moderator":
        return "bg-primary/10 text-primary border-primary/20";
      case "verified_emcee":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-white/5 text-white/40 border-white/10";
    }
  };

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Users" itemCount={loading ? undefined : total}>
        <div className="flex w-full items-center gap-2 md:w-auto">
          {/* Role Dropdown */}
          <div className="w-[120px] md:w-[140px]">
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full border-white/10 bg-white/5 text-[10px] font-semibold tracking-widest text-white/60 uppercase">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1c1c21] text-white">
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-[10px] font-semibold tracking-widest uppercase focus:bg-white/10 focus:text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Bar */}
          <div className="group relative flex-1 md:w-[320px] md:flex-initial">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="focus:border-primary/40 focus:ring-primary/5 h-10 rounded-xl border-white/10 bg-white/5 pr-8 pl-9 text-xs transition-all focus:bg-white/10"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#141417] md:block">
            <Table className="w-full text-left">
              <TableHeader>
                <TableRow className="border-b border-white/5 bg-white/2 hover:bg-white/2">
                  <TableHead className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                    User
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                    Role
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                    Joined
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/5 text-sm">
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-white/5 transition-colors hover:bg-white/2"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="font-bold text-white">
                        {user.display_name}
                      </div>
                      <div className="mt-0.5 max-w-[200px] truncate font-mono text-[10px] text-white/30">
                        {user.email || user.id}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[9px] font-semibold tracking-widest uppercase ${getRoleBadgeClass(user.role)}`}
                      >
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs font-medium text-white/50">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {processingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(val) =>
                              handleRoleChange(user.id, val)
                            }
                          >
                            <SelectTrigger className="h-8 w-32 border-white/10 bg-[#09090b] text-[10px] font-semibold tracking-widest text-white/80 uppercase hover:border-white/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-[#1c1c21] text-white">
                              {ROLES.map((r) => (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  className="text-[10px] font-bold tracking-widest uppercase focus:bg-white/10 focus:text-white"
                                >
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
                      className="border-transparent px-6 py-12 text-center text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-white/5 bg-[#141417] p-4 shadow-lg transition-transform active:scale-[0.98]"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-white">
                      {user.display_name}
                    </div>
                    <div className="max-w-[200px] truncate font-mono text-[9px] text-white/20">
                      {user.email || user.id}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-md px-2 py-0.5 text-[9px] font-semibold tracking-widest uppercase ${getRoleBadgeClass(user.role)}`}
                  >
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-semibold tracking-widest text-white/20 uppercase">
                      Joined
                    </span>
                    <span className="text-[10px] font-bold text-white/40">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {processingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val)}
                      >
                        <SelectTrigger className="h-8 w-28 border-white/10 bg-[#09090b] text-[10px] font-semibold tracking-widest text-white/80 uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#1c1c21] text-white">
                          {ROLES.map((r) => (
                            <SelectItem
                              key={r}
                              value={r}
                              className="text-[10px] font-semibold tracking-widest uppercase focus:bg-white/10 focus:text-white"
                            >
                              {r.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[10px] font-semibold tracking-[0.3em] text-white/40 uppercase">
                No users found
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
    </AdminPageShell>
  );
}
