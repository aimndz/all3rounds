import SearchBar from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="w-full max-w-2xl space-y-8 text-center">
        {/* Logo / Title */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            talasalita
          </h1>
          <p className="text-lg text-muted-foreground">
            FlipTop Verse Directory — Hanapin kung sinong emcee ang nagsabi
            niyan.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar autoFocus size="lg" />

        {/* Hints */}
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <Badge variant="secondary">&quot;mula sa semento&quot;</Badge>
          <Badge variant="secondary">&quot;suntukan sa southside&quot;</Badge>
          <Badge variant="secondary">&quot;rapido&quot;</Badge>
        </div>

        <p className="text-xs text-muted-foreground/70">
          No login required to search. Login to help improve transcriptions.
        </p>
      </main>
    </div>
  );
}
