import { PageShell } from "@/components/ui/page-shell";

export default function LeaguesLoading() {
  return (
    <PageShell spacing="roomy">
      <div className="space-y-8" aria-label="Loading leagues">
        <div className="bg-muted h-10 w-32 animate-pulse rounded" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="surface-card surface-card--muted space-y-4 p-4"
            >
              <div className="bg-muted aspect-[2.4/1] animate-pulse rounded-(--radius-control)" />
              <div className="bg-muted h-5 w-32 animate-pulse rounded" />
              <div className="bg-muted h-4 w-44 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
