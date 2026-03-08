"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mic2, Loader2 } from "lucide-react";
import { Emcee } from "@/features/emcees/types";
import { EmceeCard } from "@/features/emcees/components/EmceeCard";
import { EmceesFilters } from "@/features/emcees/components/EmceesFilters";
import { useEmceesData } from "@/features/emcees/hooks/use-emcees-data";

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
    hasMore,
    observerTarget,
  } = useEmceesData(initialEmcees, initialCount);

  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {emcees.length === 0 && !loading ? (
            <div className="col-span-full py-32 text-center">
              <Mic2 className="mx-auto mb-4 h-12 w-12 text-white/5" />
              <p className="text-sm font-bold tracking-[0.2em] text-white/20 uppercase">
                No emcees found matching {`"${search}"`}
              </p>
            </div>
          ) : (
            emcees.map((e) => <EmceeCard key={e.id} emcee={e} />)
          )}
        </div>

        {/* Loading / Pagination state */}
        <div
          ref={observerTarget}
          className="mt-12 flex h-24 items-center justify-center"
        >
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <span className="text-[10px] font-black tracking-widest text-white/20 uppercase">
                Loading more emcees...
              </span>
            </div>
          )}
          {!hasMore && emcees.length > 0 && (
            <span className="text-[10px] font-black tracking-widest text-white/10 uppercase">
              End of directory
            </span>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
