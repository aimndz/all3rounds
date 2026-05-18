import Link from "next/link";
import { ArrowRight, Search, Shuffle, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/search",
    title: "Search lines",
    description: "Find phrases, punchlines, names, or battle moments.",
    icon: Search,
    cta: "Find a line",
  },
  {
    href: "/battles",
    title: "Browse battles",
    description: "Explore events, matchups, and synced transcripts.",
    icon: Trophy,
    cta: "Explore matchups",
  },
  {
    href: "/emcees",
    title: "Explore emcees",
    description: "View profiles, appearances, and battle history.",
    icon: User,
    cta: "View profiles",
  },
  {
    href: "/random",
    title: "Discover lines",
    description: "Jump into a random transcript and help review it.",
    icon: Shuffle,
    cta: "Start review",
  },
] as const;

export default function HomeActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      {ACTIONS.map(({ href, title, description, icon: Icon, cta }, index) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className={cn(
            "group flex flex-col justify-between items-center md:items-start p-6 transition-all duration-300 hover:bg-yellow-500/2 sm:p-12",
            // Separators logic
            index !== 0 && "border-t",
            index % 2 === 0 && "md:border-r",
            index < 2 && "md:border-b",
            index < 2 && "md:border-t-0",
          )}
        >
          <div className="space-y-6 w-full">
            <div className="flex flex-col items-center md:items-start space-y-6">
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Central Box */}
                <div className="absolute inset-4 border border-yellow-500 transition-colors duration-300 group-hover:border-yellow-500" />

                {/* Corner Markers */}
                <Corner className="absolute top-2 left-2 rotate-180 transition-colors duration-300 group-hover:text-yellow-500" />
                <Corner className="absolute top-2 right-2 -rotate-90 transition-colors duration-300 group-hover:text-yellow-500" />
                <Corner className="absolute right-2 bottom-2 transition-colors duration-300 group-hover:text-yellow-500" />
                <Corner className="absolute bottom-2 left-2 rotate-90 transition-colors duration-300 group-hover:text-yellow-500" />

                <Icon className="relative z-10 size-10 text-yellow-500 transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold tracking-tight transition-colors duration-300 group-hover:text-yellow-500">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-7">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[10px] font-bold tracking-widest text-yellow-500/80 uppercase transition-colors duration-300 group-hover:text-yellow-500">
            {cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-yellow-500", className)}
    >
      <path
        d="M8 0.5H0.5V8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
