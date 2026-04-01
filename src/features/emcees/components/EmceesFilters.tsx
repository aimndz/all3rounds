import { ArrowUpDown, Filter, ListFilter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FilterSearchInput } from "@/components/ui/filter-search-input";
import { cn } from "@/lib/utils";
import { EmceeSortOption } from "../types";

interface EmceesFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  sort: EmceeSortOption;
  setSort: (val: EmceeSortOption) => void;
  countRange: string;
  setCountRange: (val: string) => void;
  resultsCount: number;
}

export function EmceesFilters({
  search,
  setSearch,
  sort,
  setSort,
  countRange,
  setCountRange,
  resultsCount,
}: EmceesFiltersProps) {
  const renderFilterContent = (mobile = false) => (
    <div
      className={cn(
        "filter-grid",
        !mobile && "lg:flex-row lg:flex-wrap lg:justify-end",
      )}
    >
      {/* Sort Select */}
      <div className="flex-1 space-y-2">
        {mobile && (
          <label className="filter-label">
            Sort By
          </label>
        )}
        <Select
          value={sort}
          onValueChange={(val: EmceeSortOption) => setSort(val)}
        >
          <SelectTrigger size="lg" className="sm:w-[180px]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-muted-foreground/60 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            <SelectItem value="battles_desc">Most Battles</SelectItem>
            <SelectItem value="battles_asc">Fewest Battles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count Select */}
      <div className="flex-1 space-y-2">
        {mobile && (
          <label className="filter-label">
            Battle Count
          </label>
        )}
        <Select value={countRange} onValueChange={setCountRange}>
          <SelectTrigger size="lg" className="sm:w-[160px]">
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground/60 h-3.5 w-3.5" />
              <SelectValue placeholder="Count" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counts</SelectItem>
            <SelectItem value="10+">10+ Battles</SelectItem>
            <SelectItem value="20+">20+ Battles</SelectItem>
            <SelectItem value="30+">30+ Battles</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="page-toolbar">
        <div className="space-y-0.5">
          <h1 className="page-heading">
            Emcees
          </h1>
          <p className="page-meta">
            {resultsCount} emcees total
          </p>
        </div>

        <div className="page-toolbar__controls">
          {/* Search Input */}
          <FilterSearchInput
            containerClassName="min-w-0 flex-1 lg:w-[320px]"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            inputSize="lg"
          />

          {/* Mobile Filter Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-lg"
                className="shrink-0 lg:hidden"
              >
                <ListFilter className="text-muted-foreground/60 h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-background/95 h-auto max-h-[70vh] p-6 pb-10 backdrop-blur-3xl"
            >
              <SheetTitle className="sr-only">Filters</SheetTitle>
              <div className="mt-2">{renderFilterContent(true)}</div>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters */}
          <div className="hidden min-w-0 lg:block">{renderFilterContent()}</div>
        </div>
      </div>
    </div>
  );
}
