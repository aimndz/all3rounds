"use client";

import { useCallback } from "react";
import Image from "next/image";
import {
  ArrowUpDown,
  X,
  ListFilter,
  Loader2,
  MousePointerClick,
  Ban,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { BattlesListSkeleton } from "@/components/PageSkeletons";
import { DataPagination } from "@/components/admin/DataPagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/components/StatusBadge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { FilterSearchInput } from "@/components/ui/filter-search-input";
import { PageShell } from "@/components/ui/page-shell";
import { useAuthStore } from "@/stores/auth-store";
import { EventSection } from "@/features/battles/components/EventSection";
import { useBattlesData } from "@/features/battles/hooks/use-battles-data";
import type { Battle } from "@/features/battles/hooks/use-battles-data";
import { useSuperadminActions } from "@/features/battles/hooks/use-superadmin-actions";
import { StickyPageHeader } from "@/components/StickyPageHeader";

export default function BattlesDirectory({
  initialBattles,
  initialCount,
  initialTotalEvents,
  initialYears,
  initialEventNames = [],
}: {
  initialBattles: Battle[];
  initialCount: number;
  initialTotalEvents: number;
  initialYears: string[];
  initialEventNames?: string[];
}) {
  const { isSuperAdmin } = useAuthStore();

  const {
    battles,
    setBattles,
    loading,
    error,
    totalCount,
    totalEvents,
    page,
    paginatedEventGroups,
    handlePageChange,
    filter,
    statusFilter,
    yearFilter,
    sortBy,
    searchInput,
    setSearchInput,
    expandedGroups,
    debounceTimerRef,
    handleSearchChange,
    updateSearch,
    handleToggleGroup,
    availableYears,
    clearFilters,
    hasActiveFilters,
  } = useBattlesData(
    initialBattles,
    initialCount,
    initialTotalEvents,
    initialYears,
  );

  const sa = useSuperadminActions(battles, setBattles, initialEventNames);

  const handleRenameGroup = useCallback(
    (oldName: string, newName: string) => {
      setBattles((prev) =>
        prev.map((b) =>
          b.event_name === oldName ||
          (!b.event_name && oldName === "Other Battles")
            ? { ...b, event_name: newName }
            : b,
        ),
      );
    },
    [setBattles],
  );

  const showLoadingSkeleton = loading && battles.length === 0;
  const showEmptyState = !loading && battles.length === 0;

  const renderFilterContent = (mobile = false) => (
    <div className={cn("filter-grid", !mobile && "lg:flex-row lg:flex-wrap lg:justify-end")}>
      {/* Status Filter */}
      <div className="flex-1 space-y-2">
        {mobile && <label className="filter-label">Status</label>}
        <Select
          value={statusFilter}
          onValueChange={(v) => updateSearch({ status: v })}
        >
          <SelectTrigger size="lg" className="sm:w-37.5">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([id, config]) => (
              <SelectItem key={id} value={id}>
                <span>{config.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Filter */}
      <div className="flex-1 space-y-2 text-white">
        {mobile && <label className="filter-label">Year</label>}
        <Select
          value={yearFilter}
          onValueChange={(v) => updateSearch({ year: v })}
        >
          <SelectTrigger size="lg" className="sm:w-37.5">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent
            className="w-70 p-0"
            viewportClassName="grid h-auto min-w-70 grid-cols-4 gap-1.5 p-2"
          >
            <SelectItem
              value="all"
              indicator={false}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:focus:bg-primary/90 data-[state=checked]:focus:text-primary-foreground col-span-4 justify-center font-medium"
            >
              All Years
            </SelectItem>
            {availableYears.map((y) => (
              <SelectItem
                key={y}
                value={y}
                indicator={false}
                className="text-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:focus:bg-primary/90 data-[state=checked]:focus:text-primary-foreground justify-center data-[state=checked]:font-bold"
              >
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        {mobile && <label className="filter-label">Sort By</label>}
        <Select value={sortBy} onValueChange={(v) => updateSearch({ sort: v })}>
          <SelectTrigger size="lg" className="sm:w-35">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-muted-foreground/60 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="lg"
          onClick={clearFilters}
          className="px-4"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageShell>
        <StickyPageHeader>
          <div className="sticky-surface page-toolbar">
            <div className="space-y-0.5">
              <h1 className="page-heading">Battles</h1>
              <p className="page-meta">
                {totalCount !== null ? totalCount : battles.length} battles •{" "}
                {new Set(battles.map((b) => b.event_name).filter(Boolean)).size}{" "}
                events
              </p>
            </div>

            <div className="page-toolbar__controls">
              <form
                className="min-w-0 flex-1 lg:w-[320px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateSearch({ q: searchInput });
                }}
              >
                <FilterSearchInput
                  placeholder="Search battles or events..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  onBlur={() => {
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                      debounceTimerRef.current = null;
                    }
                    updateSearch({ q: searchInput });
                  }}
                  onClear={() => {
                    setSearchInput("");
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                      debounceTimerRef.current = null;
                    }
                    updateSearch({ q: "" });
                  }}
                  loading={loading}
                  resultsLabel={
                    searchInput && !loading && totalCount !== null
                      ? `${totalCount} results`
                      : undefined
                  }
                  inputSize="lg"
                />
              </form>

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

              <div className="hidden min-w-0 lg:block">
                {renderFilterContent()}
              </div>
            </div>
          </div>
        </StickyPageHeader>

        {error && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mb-8 rounded-2xl border p-4 text-center text-sm">
            {error}
          </div>
        )}

        {showLoadingSkeleton ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="surface-card surface-card--muted flex items-center justify-between p-5"
              >
                <div className="flex w-1/2 items-center gap-4 pb-12">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-6 w-full max-w-75" />
                </div>
              </div>
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="empty-state flex flex-col items-center justify-center py-24">
            <h3 className="text-foreground mb-1 text-lg font-semibold">
              {filter ? "No results found" : "No battles found"}
            </h3>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-6" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "space-y-10 transition-opacity",
              loading && "opacity-75",
            )}
          >
            {paginatedEventGroups.map((group) => (
              <EventSection
                key={group.name}
                group={group}
                defaultOpen={filter ? true : expandedGroups.has(group.name)}
                onToggle={handleToggleGroup}
                isSuperadmin={isSuperAdmin}
                allEventNames={initialEventNames}
                selectionMode={sa.selectionMode}
                selectedIds={sa.selectedBattleIds}
                onToggleSelect={sa.toggleBattleSelection}
                onRenameGroup={handleRenameGroup}
              />
            ))}

            <DataPagination
              page={page}
              totalItems={totalEvents}
              itemsPerPage={5}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </PageShell>

      {/* ── Superadmin: Floating Selection Bar ── */}
      {isSuperAdmin && (
        <>
          {!sa.selectionMode && (
            <button
              onClick={() => sa.setSelectionMode(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-all"
            >
              <MousePointerClick className="h-4 w-4" />
              Select Battles
            </button>
          )}

          {sa.selectionMode && (
            <div className="border-border/50 bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t shadow-2xl backdrop-blur-xl">
              {/* Preview Panel */}
              {sa.previewOpen && sa.selectedBattlesInfo.length > 0 && (
                <div className="border-border/30 bg-muted/20 border-b">
                  <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                        Selected Battles
                      </span>
                      <button
                        onClick={() => sa.setPreviewOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                      {sa.selectedBattlesInfo.map((battle) => (
                        <div
                          key={battle.id}
                          className="group/preview border-border/50 bg-background flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5"
                        >
                          <Image
                            src={`https://img.youtube.com/vi/${battle.youtube_id}/default.jpg`}
                            alt={battle.title}
                            width={40}
                            height={30}
                            className="rounded object-cover"
                            unoptimized
                          />
                          <span className="max-w-35 truncate text-xs font-medium">
                            {battle.title}
                          </span>
                          <button
                            onClick={() => sa.toggleBattleSelection(battle.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {sa.selectedBattleIds.size} battle
                    {sa.selectedBattleIds.size !== 1 && "s"} selected
                  </span>
                  {sa.selectedBattleIds.size > 0 && (
                    <>
                      <button
                        onClick={() => sa.setPreviewOpen(!sa.previewOpen)}
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs transition-colors"
                      >
                        <ChevronUp
                          className={cn(
                            "h-3 w-3 transition-transform",
                            sa.previewOpen && "rotate-180",
                          )}
                        />
                        {sa.previewOpen ? "Hide" : "Preview"}
                      </button>
                      <button
                        onClick={() => sa.setSelectedBattles({})}
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sa.exitSelectionMode}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={sa.selectedBattleIds.size === 0}
                    onClick={() => sa.setIsExcludeDialogOpen(true)}
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    Exclude
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sa.selectedBattleIds.size === 0}
                    onClick={() => {
                      sa.setNewDateValue("");
                      sa.setIsDateDialogOpen(true);
                    }}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Change Date
                  </Button>
                  <Button
                    size="sm"
                    disabled={sa.selectedBattleIds.size === 0}
                    onClick={() => {
                      sa.setMoveTargetName("");
                      sa.setIsMoveDialogOpen(true);
                    }}
                  >
                    Change Event
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Move Dialog */}
          <Dialog
            open={sa.isMoveDialogOpen}
            onOpenChange={sa.setIsMoveDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Event Name</DialogTitle>
                <DialogDescription>
                  Assign {sa.selectedBattleIds.size} selected battle
                  {sa.selectedBattleIds.size !== 1 && "s"} to a new event.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  list="move-event-suggestions"
                  value={sa.moveTargetName}
                  onChange={(e) => sa.setMoveTargetName(e.target.value)}
                  placeholder='e.g. "Ahon 16"'
                  disabled={sa.isMoving}
                  autoFocus
                />
                <datalist id="move-event-suggestions">
                  {initialEventNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => sa.setIsMoveDialogOpen(false)}
                  disabled={sa.isMoving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sa.handleMoveSelected}
                  disabled={sa.isMoving || !sa.moveTargetName.trim()}
                >
                  {sa.isMoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    `Move ${sa.selectedBattleIds.size} Battle${sa.selectedBattleIds.size !== 1 ? "s" : ""}`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Date Update Dialog */}
          <Dialog
            open={sa.isDateDialogOpen}
            onOpenChange={sa.setIsDateDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Event Date</DialogTitle>
                <DialogDescription>
                  Update event date for {sa.selectedBattleIds.size} selected
                  battle
                  {sa.selectedBattleIds.size !== 1 && "s"}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="date"
                  value={sa.newDateValue}
                  onChange={(e) => sa.setNewDateValue(e.target.value)}
                  disabled={sa.isUpdatingDate}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => sa.setIsDateDialogOpen(false)}
                  disabled={sa.isUpdatingDate}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sa.handleUpdateDateSelected}
                  disabled={sa.isUpdatingDate || !sa.newDateValue}
                >
                  {sa.isUpdatingDate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    `Update ${sa.selectedBattleIds.size} Date${sa.selectedBattleIds.size !== 1 ? "s" : ""}`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Exclude Confirmation Dialog */}
          <Dialog
            open={sa.isExcludeDialogOpen}
            onOpenChange={sa.setIsExcludeDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exclude Battles</DialogTitle>
                <DialogDescription>
                  Are you sure you want to exclude{" "}
                  <strong>{sa.selectedBattleIds.size}</strong> battle
                  {sa.selectedBattleIds.size !== 1 && "s"}? They will be hidden
                  from the directory and skipped by the pipeline.
                </DialogDescription>
              </DialogHeader>
              <div className="divide-border/30 border-border/50 max-h-48 divide-y overflow-y-auto rounded-lg border">
                {sa.selectedBattlesInfo.map((battle) => (
                  <div
                    key={battle.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Image
                      src={`https://img.youtube.com/vi/${battle.youtube_id}/default.jpg`}
                      alt={battle.title}
                      width={48}
                      height={36}
                      className="shrink-0 rounded object-cover"
                      unoptimized
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {battle.title}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {battle.event_name || "Other Battles"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => sa.setIsExcludeDialogOpen(false)}
                  disabled={sa.isExcluding}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={sa.handleExcludeSelected}
                  disabled={sa.isExcluding}
                >
                  {sa.isExcluding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluding...
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Exclude {sa.selectedBattleIds.size} Battle
                      {sa.selectedBattleIds.size !== 1 && "s"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
