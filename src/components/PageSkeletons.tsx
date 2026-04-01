import { Skeleton } from "@/components/ui/skeleton";
import { StickyPageHeader } from "@/components/StickyPageHeader";

export function BattlesSkeleton() {
  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <StickyPageHeader className="border-border/10 bg-background/95 -mx-4 mb-8 border-b px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>

            <div className="flex w-full items-center gap-2 sm:gap-3 lg:w-auto">
              <div className="relative flex-1 lg:w-[320px]">
                <Skeleton className="h-11 w-full rounded-2xl" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-11 w-11 rounded-2xl lg:hidden" />
                <div className="hidden items-center gap-4 lg:flex">
                  <Skeleton className="h-10 w-32 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </StickyPageHeader>

        <div className="space-y-10">
          {[...Array(3)].map((_, gi) => (
            <div key={gi} className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="border-border bg-card/50 overflow-hidden rounded-xl border"
                  >
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[40%]" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1 rounded-lg sm:h-9" />
                        <Skeleton className="h-8 flex-1 rounded-lg sm:h-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

export function EmceesSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <StickyPageHeader className="border-border/10 bg-background/95 -mx-4 mb-8 border-b px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </StickyPageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="relative flex min-h-40 flex-col justify-between rounded-3xl border border-white/5 bg-[#141417] p-6"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
