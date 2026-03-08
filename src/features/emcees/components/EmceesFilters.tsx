import { Search, ArrowUpDown, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-black tracking-tight uppercase sm:text-4xl">
            Emcees
          </h1>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase opacity-60 sm:text-sm">
            {resultsCount} emcees total
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:gap-3 lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 lg:w-[320px]">
            <Search className="text-muted-foreground/40 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border/50 bg-muted/10 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:bg-muted/20 focus:ring-primary/5 h-11 w-full rounded-2xl border pr-12 pl-11 text-sm transition-all outline-none focus:ring-4"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/40 absolute top-1/2 right-3.5 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <Select
            value={sort}
            onValueChange={(val: EmceeSortOption) => setSort(val)}
          >
            <SelectTrigger className="border-border/50 bg-muted/20 focus:ring-primary/5 h-10 w-[160px] rounded-xl sm:w-[180px]">
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

          {/* Count Select */}
          <Select value={countRange} onValueChange={setCountRange}>
            <SelectTrigger className="border-border/50 bg-muted/20 focus:ring-primary/5 h-10 w-[140px] rounded-xl sm:w-[160px]">
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground/60 h-3.5 w-3.5" />
                <SelectValue placeholder="Count" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counts</SelectItem>
              <SelectItem value="10+">10+ Battles</SelectItem>
              <SelectItem value="30+">30+ Battles</SelectItem>
              <SelectItem value="50+">50+ Battles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
