"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchBar({
  initialQuery = "",
  autoFocus = false,
  size = "lg",
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "lg" | "sm";
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const isLarge = size === "lg";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="group relative">
        <Search
          className={cn(
            "text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 transition-colors",
            isLarge ? "h-5 w-5" : "h-4 w-4"
          )}
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lines, verses, or words..."
          autoFocus={autoFocus}
          className={cn(
            "focus-visible:border-primary rounded-xl border-2 shadow-none transition-all focus-visible:ring-0",
            isLarge
              ? "h-14 pr-24 pl-12 text-base sm:pr-32"
              : "h-12 pr-12 pl-11 text-base sm:pr-24"
          )}
        />
        
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground/40 hover:text-foreground mr-1 flex h-6 w-6 items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            type="submit"
            size={isLarge ? "default" : "sm"}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 hidden rounded-lg font-bold transition-all sm:flex",
              isLarge ? "px-6" : "px-4"
            )}
          >
            Search
          </Button>
          <Button
            type="submit"
            size="icon"
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 flex rounded-lg transition-all sm:hidden",
              isLarge ? "h-10 w-10" : "h-8 w-8"
            )}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
