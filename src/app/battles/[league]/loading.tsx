import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl flex-col overflow-hidden px-4 sm:px-6">
      <div className="flex h-full min-h-0 flex-col gap-4 pt-2 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
        {/* Left Column: Video Skeleton */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Skeleton className="mb-2 h-4 w-24 sm:mb-4" />
          <div className="overflow-hidden sm:rounded-xl">
            <Skeleton className="aspect-video w-full rounded-none" />
          </div>
          <div className="mt-6 space-y-4 px-2">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Right Column: Transcript Skeleton */}
        <div className="flex flex-1 flex-col overflow-hidden pb-4 lg:col-span-5 lg:h-full lg:pb-6 xl:col-span-4">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex-1 space-y-6 overflow-hidden pr-2">
            {[...Array(3)].map((_, ri) => (
              <div key={ri} className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <div className="border-muted/20 ml-4 space-y-2 border-l-2 pl-4">
                  {[...Array(4)].map((_, li) => (
                    <div key={li} className="flex gap-3">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
