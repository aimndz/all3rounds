"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import { Search, Mic2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type EmceeData = {
  id: string;
  name: string;
  aka: string[];
  battle_count: number;
};

interface EmceesDirectoryProps {
  initialEmcees: EmceeData[];
}

export default function EmceesDirectory({
  initialEmcees,
}: EmceesDirectoryProps) {
  const [search, setSearch] = useState("");

  const filteredEmcees = useMemo(() => {
    if (!search.trim()) return initialEmcees;
    const q = search.toLowerCase();
    return initialEmcees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.aka.some((a) => a.toLowerCase().includes(q)),
    );
  }, [search, initialEmcees]);

  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="mb-16 flex flex-col justify-between gap-8 border-b border-white/5 pb-12 md:flex-row md:items-end">
          <div className="space-y-4">
            <h1 className="flex items-center gap-4 text-5xl font-black tracking-tighter text-white md:text-7xl">
              EMCEES
            </h1>
            <p className="max-w-xl text-lg leading-relaxed font-medium text-white/40">
              Explore the diverse catalog of Filipino battle rap artists, their
              aliases, and their battle history.
            </p>
          </div>

          <div className="group relative w-full md:w-[320px]">
            <Search className="group-focus-within:text-primary absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/20 transition-colors" />
            <Input
              placeholder="Search by name or AKA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus-visible:ring-primary ring-offset-background h-14 rounded-2xl border-white/10 bg-white/5 px-12 text-base"
            />
            {search && (
              <div className="text-primary/40 absolute top-1/2 right-4 -translate-y-1/2 text-[10px] font-black tracking-widest uppercase">
                {filteredEmcees.length} Found
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmcees.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <Mic2 className="mx-auto mb-4 h-12 w-12 text-white/5" />
              <p className="text-sm font-bold tracking-[0.2em] text-white/20 uppercase">
                No emcees found matching {`"${search}"`}
              </p>
            </div>
          ) : (
            filteredEmcees.map((e) => (
              <div
                key={e.id}
                className="group hover:border-primary/20 hover:shadow-primary/5 relative flex min-h-40 flex-col justify-between rounded-3xl border border-white/5 bg-[#141417] p-6 transition-all duration-500 hover:shadow-2xl"
              >
                <div className="bg-primary/5 absolute top-0 right-0 h-24 w-24 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />

                <div>
                  <div className="mb-2 flex items-start justify-between">
                    <h2 className="group-hover:text-primary text-xl font-black tracking-tight text-white uppercase transition-colors">
                      {e.name}
                    </h2>
                    <span className="bg-primary/10 text-primary border-primary/10 rounded-lg border px-2 py-0.5 text-[9px] font-black tracking-widest uppercase">
                      {e.battle_count} BATTLES
                    </span>
                  </div>

                  {e.aka && e.aka.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {e.aka.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold tracking-wider text-white/30 uppercase"
                        >
                          {a}
                          {i < Math.min(e.aka.length, 3) - 1 ? " • " : ""}
                        </span>
                      ))}
                      {e.aka.length > 3 && (
                        <span className="text-[10px] font-bold text-white/20">
                          +{e.aka.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href={`/search?q=${encodeURIComponent(e.name)}`}
                  className="hover:bg-primary group/btn mt-6 flex h-11 w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-6 text-[10px] font-black tracking-[0.2em] text-white/40 uppercase transition-all hover:border-transparent hover:text-black active:scale-95"
                >
                  View Verses
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                </Link>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="mx-auto mt-20 max-w-5xl border-t border-white/5 px-4 py-20">
        <p className="text-center text-[10px] font-black tracking-[0.4em] text-white/10 uppercase">
          Filipino Battle Rap Verse Directory &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
