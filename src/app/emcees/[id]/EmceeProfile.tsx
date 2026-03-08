"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BattleCard } from "@/features/battles/components/BattleCard";
import { Battle } from "@/features/battles/hooks/use-battles-data";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmceeProfileProps {
  data: {
    id: string;
    name: string;
    aka: string[];
    stats: {
      total_battles: number;
      total_lines: number;
      unique_events: number;
    };
    battles: Battle[];
    events: string[];
  };
}

export default function EmceeProfile({ data }: EmceeProfileProps) {
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  const sortedBattles = useMemo(() => {
    return [...data.battles].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });
  }, [data.battles, sortOrder]);

  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        {/* Back Link */}
        <Link
          href="/emcees"
          className="group mb-8 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Emcees
        </Link>

        <div className="mb-12">
          <h1 className="mb-4 text-5xl font-bold tracking-tighter text-white md:text-7xl">
            {data.name}
          </h1>
        </div>

        <Separator className="mb-12 bg-white/5" />

        {/* Battles Section */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Battle History
            </h2>

            <Select
              value={sortOrder}
              onValueChange={(val: "latest" | "oldest") => setSortOrder(val)}
            >
              <SelectTrigger className="border-border/50 bg-muted/20 focus:ring-primary/5 h-10 w-[140px] rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="text-muted-foreground/60 h-3.5 w-3.5" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>

          {sortedBattles.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/5 py-24 text-center">
              <p className="text-sm font-bold tracking-[0.2em] text-white/20 uppercase">
                No battles found for this emcee.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
