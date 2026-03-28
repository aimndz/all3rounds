import SearchBar from "@/components/SearchBar";
import Image from "next/image";

export const dynamic = "force-static";

export default function Home() {
  return (
      <main className="mx-auto flex h-[calc(100svh-200px)] w-full max-w-5xl items-center justify-center px-4 sm:px-6">
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
            <SearchBar autoFocus size="lg" />

            {/* Phrase / Stats Wrapper */}
            <div className="space-y-6 pt-4">
              <p className="text-muted-foreground/60 animate-in fade-in slide-in-from-bottom-2 text-xs font-medium tracking-widest uppercase delay-150 duration-1000">
                Explore the archive
              </p>

              {/* Stats Section */}
              <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 delay-300 duration-1000 sm:gap-x-12">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                    400+
                  </span>
                  <span className="text-muted-foreground/60 text-[10px] font-bold tracking-[0.2em] uppercase">
                    Emcees
                  </span>
                </div>
                <div className="bg-border hidden h-8 w-px sm:block" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                    1,300+
                  </span>
                  <span className="text-muted-foreground/60 text-[10px] font-bold tracking-[0.2em] uppercase">
                    Battles
                  </span>
                </div>
                <div className="bg-border hidden h-8 w-px sm:block" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                    500k+
                  </span>
                  <span className="text-muted-foreground/60 text-[10px] font-bold tracking-[0.2em] uppercase">
                    Lines
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}
