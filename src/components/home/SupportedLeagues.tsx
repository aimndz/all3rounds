import Image from "next/image";
import { cn } from "@/lib/utils";

const LEAGUES = [
  {
    name: "FlipTop",
    status: "Primary Source",
    logo: "/leagues/fliptop.png",
    url: "https://www.youtube.com/@fliptopbattles",
    active: true,
  },
];

export default function SupportedLeagues() {
  return (
    <div className="flex justify-center">
      {LEAGUES.map((league) => (
        <a
          key={league.name}
          href={league.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
        >
          <div className="group-hover:shadow-primary/20 relative h-24 w-64 overflow-hidden transition-all duration-300 group-hover:scale-105">
            <Image
              src={league.logo}
              alt={league.name}
              fill
              className={cn(
                "object-contain p-2 transition-all duration-500",
                league.active
                  ? "opacity-100 grayscale-0"
                  : "opacity-40 grayscale",
              )}
              unoptimized
            />
          </div>
        </a>
      ))}
    </div>
  );
}
