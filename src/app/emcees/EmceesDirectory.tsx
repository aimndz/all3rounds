"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Emcee } from "@/features/emcees/types";
import { EmceeCard } from "@/features/emcees/components/EmceeCard";
import { EmceesFilters } from "@/features/emcees/components/EmceesFilters";
import { useEmceesData } from "@/features/emcees/hooks/use-emcees-data";
import { DataPagination } from "@/components/admin/DataPagination";
import { StickyPageHeader } from "@/components/StickyPageHeader";
import { PageShell } from "@/components/ui/page-shell";

interface EmceesDirectoryProps {
  initialEmcees: Emcee[];
  initialCount: number;
}

export default function EmceesDirectory({
  initialEmcees,
  initialCount,
}: EmceesDirectoryProps) {
  const {
    emcees,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    countRange,
    setCountRange,
    totalCount,
    page,
    handlePageChange,
  } = useEmceesData(initialEmcees, initialCount);

  const showLoadingSkeleton = loading && emcees.length === 0;
  const showEmptyState = !loading && emcees.length === 0;
  const emceeCards = useMemo(
    () => emcees.map((e) => <EmceeCard key={e.id} emcee={e} />),
    [emcees],
  );

  return (
    <PageShell>
      <StickyPageHeader>
        <div className="sticky-surface">
          <EmceesFilters
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            countRange={countRange}
            setCountRange={setCountRange}
            resultsCount={totalCount}
          />
        </div>
      </StickyPageHeader>

      {showLoadingSkeleton ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="surface-card relative flex min-h-28 flex-col p-4 sm:min-h-32 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-3/4 rounded-md sm:h-6" />
                <Skeleton className="h-5 w-14 shrink-0 rounded-full sm:w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 ${
              loading ? "opacity-75" : "opacity-100"
            }`}
          >
            {showEmptyState ? (
              <div className="empty-state col-span-full flex flex-col items-center justify-center py-24">
                <h3 className="text-foreground mb-1 text-lg font-semibold">
                  No emcees found
                </h3>
              </div>
            ) : (
              emceeCards
            )}
          </div>

          <DataPagination
            page={page}
            totalItems={totalCount}
            itemsPerPage={48}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </PageShell>
  );
}
