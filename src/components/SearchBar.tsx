"use client";

import { memo, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "lg" | "sm";
};

function SearchBar({
  initialQuery = "",
  autoFocus = false,
  size = "lg",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasQuery, setHasQuery] = useState(initialQuery.trim().length > 0);
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const currentValue = inputRef.current?.value ?? "";
      const trimmed = currentValue.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [router],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextHasQuery = e.target.value.trim().length > 0;
      setHasQuery((prev) => (prev === nextHasQuery ? prev : nextHasQuery));
    },
    [],
  );

  const clearQuery = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    setHasQuery(false);
  }, []);

  const isLarge = size === "lg";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="group relative">
        <Search
          className={cn(
            "text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 transition-colors",
            isLarge ? "h-5 w-5" : "h-4 w-4",
          )}
        />
        <Input
          ref={inputRef}
          type="text"
          defaultValue={initialQuery}
          onChange={handleInputChange}
          placeholder="Search lines, verses, or words..."
          autoFocus={autoFocus}
          className={cn(
            "focus-visible:border-primary rounded-xl border-2 shadow-none transition-all focus-visible:ring-0",
            isLarge
              ? "h-14 pr-24 pl-12 text-base sm:pr-32"
              : "h-12 pr-12 pl-11 text-base sm:pr-24",
          )}
        />

        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
          {hasQuery && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear query"
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
              isLarge ? "px-6" : "px-4",
            )}
          >
            Search
          </Button>
          <Button
            type="submit"
            size="icon"
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 flex rounded-lg transition-all sm:hidden",
              isLarge ? "h-10 w-10" : "h-8 w-8",
            )}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

const MemoizedSearchBar = memo(SearchBar);
MemoizedSearchBar.displayName = "SearchBar";

export default MemoizedSearchBar;
