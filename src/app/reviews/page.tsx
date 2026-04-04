"use client";

import { Button } from "@/components/ui/button";
import { RotateCw, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { CardSkeleton } from "@/components/admin/CardSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import {
  SuggestionCard,
  SuggestionLog,
} from "@/components/admin/SuggestionCard";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell, PageStack } from "@/components/ui/page-shell";

export default function ReviewsPage() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();

  const {
    data: suggestions,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    refetch,
    removeItem,
  } = usePaginatedFetch<SuggestionLog>("/api/suggestions", {
    limit: 10,
    extraParams: {
      status: "pending,flagged",
      order: sortBy,
    },
  });

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          review_note: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process.");
      }

      removeItem("id", id);
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
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <PageShell width="narrow" spacing="roomy" className="pb-32">
        <PageStack>
        <PageHeader
          title="PENDING FIXES"
          itemCount={loading ? undefined : total}
        >
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v: "asc" | "desc") => setSortBy(v)}
            >
              <SelectTrigger size="lg" className="w-32 text-xs sm:w-36">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3 w-3 text-white/40" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Latest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon-lg"
              onClick={refetch}
              className="text-white/40 hover:text-white"
              disabled={loading}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </PageHeader>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <CardSkeleton count={3} />
        ) : suggestions.length === 0 ? (
          <div className="empty-state py-28">
            <p className="text-xs font-medium tracking-widest text-[#fafafa]/20 uppercase">
              No pending reviews
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                variant="review"
                processingId={processingId}
                onAction={handleReview}
              />
            ))}
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="mt-12">
            <DataPagination
              page={page}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          </div>
        )}
        </PageStack>
      </PageShell>
    </div>
  );
}
