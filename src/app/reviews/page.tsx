"use client";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { CardSkeleton } from "@/components/admin/CardSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { SuggestionCard, SuggestionLog } from "@/components/admin/SuggestionCard";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ReviewsPage() {
  const [processingId, setProcessingId] = useState<string | null>(null);
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
    extraParams: { status: "pending,flagged" },
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
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <PageHeader 
          title="PENDING FIXES" 
          itemCount={total} 
          itemLabel="ITEMS"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            className="hover:bg-primary/5 hover:text-primary h-9 w-9 rounded-xl border-white/10 bg-transparent text-white transition-all active:scale-95"
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </PageHeader>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <CardSkeleton count={3} />
        ) : suggestions.length === 0 ? (
          <div className="rounded-[2.5rem] border border-dashed border-white/10 bg-white/5 py-40 text-center">
            <Check className="mx-auto mb-4 h-12 w-12 text-white/10" />
            <p className="text-sm font-bold text-white/20 uppercase tracking-widest">
              {`"Zero pending items. The database is clean."`}
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
      </main>
    </div>
  );
}
