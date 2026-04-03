import HomeStats from "@/components/HomeStats";
import SearchBar from "@/components/SearchBar";
import Image from "next/image";
import { PageShell } from "@/components/ui/page-shell";

export const dynamic = "force-static";

export default function Home() {
  return (
    <PageShell
      width="narrow"
      spacing="centered"
      className="h-[calc(100svh-100px)]"
    >
      <div className="flex w-full flex-col items-center space-y-12 text-center">
        {/* Hero Content */}
        <div className="max-w-2xl space-y-4">
          <h1 className="flex items-center justify-center text-4xl font-bold tracking-tight uppercase sm:text-6xl md:text-7xl">
            All
            <Image
              src="/logo/a3r-logo-icon.svg"
              alt="3"
              width={80}
              height={80}
              className="ml-1.5 h-[0.9em] w-auto"
              priority
              unoptimized
            />
            Rounds
          </h1>

          <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
            Filipino Battle Rap Archive
          </p>
        </div>

        {/* Search Section */}
        <div className="w-full max-w-xl space-y-8">
          <SearchBar size="lg" />

          {/* Phrase / Stats Wrapper */}
          <div className="space-y-6 pt-4">
            <p className="text-muted-foreground/60 text-xs font-medium tracking-widest uppercase">
              Explore the archive
            </p>

            {/* Stats Section */}
            <HomeStats />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
