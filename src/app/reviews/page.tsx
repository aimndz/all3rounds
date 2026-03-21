"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      order: sortBy 
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
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <PageHeader title="PENDING FIXES" itemCount={total} itemLabel="ITEMS">
          <div className="flex items-center gap-2">
            <Select 
              value={sortBy} 
              onValueChange={(v: "asc" | "desc") => setSortBy(v)}
            >
              <SelectTrigger className="border-border/50 bg-white/5 focus:ring-primary/5 h-9 w-32 rounded-xl text-xs sm:w-36">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="text-white/40 h-3 w-3" />
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
              size="icon"
              onClick={refetch}
              className="border-border/50 bg-white/5 hover:bg-white/10 h-9 w-9 rounded-xl text-white/40 transition-all active:scale-95 hover:text-white"
              disabled={loading}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </PageHeader>

        {error && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <CardSkeleton count={3} />
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 py-36 text-center">
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
      </main>
      <Footer />
    </div>
  );
}
