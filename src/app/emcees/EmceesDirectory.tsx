"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Emcee } from "@/features/emcees/types";
import { EmceeCard } from "@/features/emcees/components/EmceeCard";
import { EmceesFilters } from "@/features/emcees/components/EmceesFilters";
import { useEmceesData } from "@/features/emcees/hooks/use-emcees-data";
import { DataPagination } from "@/components/admin/DataPagination";

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
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-border/10 bg-background/95 sticky top-14 z-30 -mx-4 mb-8 border-b px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="relative flex min-h-40 flex-col rounded-3xl border border-white/5 bg-[#141417] p-6"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {emcees.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                <h3 className="text-foreground mb-1 text-lg font-semibold">
                  No emcees found
                </h3>
              </div>
            ) : (
              emcees.map((e) => <EmceeCard key={e.id} emcee={e} />)
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
    </main>
  );
}
