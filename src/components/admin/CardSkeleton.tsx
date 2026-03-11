import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-0 overflow-hidden rounded-3xl border border-white/5 bg-[#141417] md:flex-row"
        >
          <div className="relative aspect-video w-full shrink-0 bg-black/20 md:w-85 lg:w-[320px]">
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          </div>
          <div className="flex flex-1 flex-col space-y-6 p-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
