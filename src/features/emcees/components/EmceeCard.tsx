import Link from "next/link";
import { Emcee } from "../types";

interface EmceeCardProps {
  emcee: Emcee;
}

export function EmceeCard({ emcee }: EmceeCardProps) {
  return (
    <Link
      href={`/emcees/${emcee.id}`}
      className="group hover:border-primary/20 hover:shadow-primary/5 relative flex min-h-40 flex-col justify-between rounded-3xl border border-white/5 bg-[#141417] p-6 transition-all duration-500 hover:shadow-2xl active:scale-[0.98]"
    >
      <div className="bg-primary/5 absolute top-0 right-0 h-24 w-24 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />

      <div>
        <div className="mb-2 flex items-start justify-between">
          <h2 className="group-hover:text-primary text-xl font-bold tracking-tight text-white transition-colors">
            {emcee.name}
          </h2>
          <div className="border-primary/10 bg-primary/5 text-primary flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition-all duration-500">
            <span className="text-[10px]"> {emcee.battle_count}</span>
            <span className="text-[10px] tracking-tighter uppercase opacity-70">
              Battles
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
