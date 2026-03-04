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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-primary/20">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-white/5 pb-12">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white flex items-center gap-4">
              EMCEES
            </h1>
            <p className="text-lg text-white/40 max-w-xl leading-relaxed font-medium">
              Explore the diverse catalog of Filipino battle rap artists, their
              aliases, and their battle history.
            </p>
          </div>

          <div className="relative group w-full md:w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name or AKA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 bg-white/5 border-white/10 rounded-2xl px-12 text-base focus-visible:ring-primary ring-offset-background"
            />
            {search && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-primary/40">
                {filteredEmcees.length} Found
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmcees.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <Mic2 className="h-12 w-12 text-white/5 mx-auto mb-4" />
              <p className="text-sm font-bold text-white/20 uppercase tracking-[0.2em]">
                No emcees found matching "{search}"
              </p>
            </div>
          ) : (
            filteredEmcees.map((e) => (
              <div
                key={e.id}
                className="group relative bg-[#141417] border border-white/5 rounded-3xl p-6 hover:border-primary/20 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 min-h-[160px] flex flex-col justify-between"
              >
                <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">
                      {e.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10">
                      {e.battle_count} BATTLES
                    </span>
                  </div>

                  {e.aka && e.aka.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {e.aka.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-white/30 font-bold uppercase tracking-wider"
                        >
                          {a}
                          {i < Math.min(e.aka.length, 3) - 1 ? " • " : ""}
                        </span>
                      ))}
                      {e.aka.length > 3 && (
                        <span className="text-[10px] text-white/20 font-bold">
                          +{e.aka.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href={`/search?q=${encodeURIComponent(e.name)}`}
                  className="mt-6 flex items-center justify-between w-full h-11 px-6 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:bg-primary hover:text-black hover:border-transparent transition-all active:scale-95 group/btn"
                >
                  View Verses
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </Link>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-20 border-t border-white/5 mt-20">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 text-center">
          Filipino Battle Rap Verse Directory &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
