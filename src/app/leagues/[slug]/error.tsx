"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LeagueDirectoryError({ reset }: { reset: () => void }) {
  return (
    <main className="app-shell flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-xl font-semibold">
          Unable to load this League
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          The Battle directory is temporarily unavailable. Try again or choose
          another League.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/leagues">Back to Leagues</Link>
        </Button>
      </div>
    </main>
  );
}
