"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterSearchInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "size"
> & {
  containerClassName?: string;
  inputSize?: "sm" | "default" | "lg" | "xl";
  loading?: boolean;
  onClear?: () => void;
  resultsLabel?: React.ReactNode;
};

function FilterSearchInput({
  className,
  containerClassName,
  inputSize = "lg",
  loading = false,
  onClear,
  resultsLabel,
  value,
  ...props
}: FilterSearchInputProps) {
  const hasValue = typeof value === "string" ? value.trim().length > 0 : !!value;
  const hasTrailingControls = (loading && hasValue) || (hasValue && !!onClear);
  const inputPaddingClass = resultsLabel
    ? "pr-28 sm:pr-44"
    : hasTrailingControls
      ? "pr-20"
      : "pr-12";

  return (
    <div className={cn("group relative w-full", containerClassName)}>
      <Search className="text-muted-foreground/45 group-focus-within:text-primary/70 pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 transition-colors" />
      <Input
        {...props}
        value={value}
        size={inputSize}
        className={cn("pl-11", inputPaddingClass, className)}
      />
      <div className="absolute top-1/2 right-3 flex max-w-[calc(100%-3.75rem)] -translate-y-1/2 items-center gap-1.5">
        {resultsLabel ? (
          <span className="text-muted-foreground/70 hidden truncate text-[11px] font-medium sm:inline">
            {resultsLabel}
          </span>
        ) : null}
        {loading && hasValue ? (
          <Loader2 className="text-muted-foreground/70 size-4 animate-spin" />
        ) : null}
        {hasValue && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            className="text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-muted/70"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export { FilterSearchInput };
