"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { CardSkeleton } from "@/components/admin/CardSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { StatusFilterTabs } from "@/components/admin/StatusFilterTabs";
import {
  SuggestionCard,
  SuggestionLog,
} from "@/components/admin/SuggestionCard";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { useToast } from "@/hooks/use-toast";

const FILTER_OPTIONS = [
  { value: "all", label: "All Items" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    data: reviews,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    updateItem,
  } = usePaginatedFetch<SuggestionLog>("/api/admin/reviews", {
    limit: 10,
    extraParams: { status: statusFilter },
  });

  const handleOverride = async (
    id: string,
    action: string,
    currentStatus?: string,
  ) => {
    // Determine the new action based on the current status
    const newAction = currentStatus === "approved" ? "reject" : "approve";
    const confirmMsg =
      newAction === "approve"
        ? "Override rejection and APPROVE this suggestion instead?"
        : "Override approval and REJECT this suggestion instead (reverting the text)?";

    if (!confirm(confirmMsg)) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAction }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process override.");
      }

      const data = await res.json();

      updateItem("id", id, { status: data.newStatus });
      toast({ description: `Successfully overridden to ${data.newStatus}.` });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Audit Log" itemCount={loading ? undefined : total}>
        <StatusFilterTabs
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        />
      </PageHeader>

      {loading ? (
        <CardSkeleton count={5} />
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/5 py-36 text-center">
          <p className="text-xs font-medium tracking-widest text-white/20 uppercase">
            No audit records found
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r) => (
            <SuggestionCard
              key={r.id}
              suggestion={r}
              variant="audit"
              processingId={processingId}
              onAction={handleOverride}
            />
          ))}
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <DataPagination
          page={page}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}
    </AdminPageShell>
  );
}
