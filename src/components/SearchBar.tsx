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
          type="search"
          defaultValue={initialQuery}
          onChange={handleInputChange}
          placeholder="Search lines..."
          autoFocus={autoFocus}
          size={isLarge ? "xl" : "lg"}
          className={cn(
            "focus-visible:border-primary border shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden",
            isLarge ? "pr-28 pl-12 sm:pr-36" : "pr-14 pl-11 sm:pr-28",
          )}
        />

        <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1.5">
          {hasQuery && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear query"
              className="text-muted-foreground/50 hover:bg-muted/70 hover:text-foreground active:bg-muted/70 mr-1 flex h-7 w-7 items-center justify-center rounded-full transition-[background-color,color,opacity] active:opacity-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            type="submit"
            size={isLarge ? "lg" : "sm"}
            className={cn(
              "hidden font-bold sm:flex",
              isLarge ? "px-6" : "px-4",
            )}
          >
            Search
          </Button>
          <Button
            type="submit"
            size={isLarge ? "icon-lg" : "icon-sm"}
            className={cn("flex sm:hidden")}
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
