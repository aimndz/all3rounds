"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

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
      <div className="relative">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground ${
            isLarge ? "h-5 w-5" : "h-4 w-4"
          }`}
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hanapin ang linya, verse, o salita..."
          autoFocus={autoFocus}
          className={`rounded-xl shadow-sm ${
            isLarge ? "h-14 pl-12 pr-28 text-lg" : "h-12 pl-11 pr-24 text-base"
          }`}
        />
        <Button
          type="submit"
          size={isLarge ? "default" : "sm"}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg ${
            isLarge ? "px-6" : "px-4"
          }`}
        >
          Hanapin
        </Button>
      </div>
    </form>
  );
}
