"use client";

import { memo, Fragment } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Plus, MessageSquarePlus } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { BattleLine } from "@/features/battles/hooks/use-battle-data";

type LineItemProps = {
  line: BattleLine;
  editMode: boolean;
  isSelected: boolean;
  isActive: boolean;
  isLastClicked: boolean;
  inlineEditingId: number | null;
  inlineContent: string;
  onToggleSelect: (id: number, isShift?: boolean) => void;
  onStartInlineEdit: (line: BattleLine) => void;
  onInlineSave: (id: number, moveToNext?: boolean) => void;
  onSetInlineEditingId: (id: number | null) => void;
  onSetInlineContent: (val: string) => void;
  onSeek: (time: number) => void;
  onEditClick: (line: BattleLine) => void;
  onSuggestClick: (line: BattleLine) => void;
  onAddClick: (lineId: number, pos: "before" | "after") => void;
  onAnnotationSelect?: (id: number, isShift?: boolean) => void;
  onAnnotationRangeStart?: (id: number) => void;
  onAnnotationRangeEnter?: (id: number) => void;
  onAnnotationRangeEnd?: () => void;
  onAnnotationTextSelectionComplete?: () => void;
  onAnnotationHighlightClick?: (id: number) => void;
  canEdit: boolean;
  showBeforeInsert?: boolean;
  isAnnotated?: boolean;
  annotationCount?: number;
  isAnnotationSelected?: boolean;
  annotationTextRange?: { start: number; end: number } | null;
  annotationTextRanges?: {
    start: number | null;
    end: number | null;
    text?: string | null;
  }[];
};

function buildTextHighlightRanges({
  content,
  savedRanges = [],
  selectedRange,
}: {
  content: string;
  savedRanges?: {
    start: number | null;
    end: number | null;
    text?: string | null;
  }[];
  selectedRange?: { start: number; end: number } | null;
}) {
  const ranges = savedRanges.flatMap((range) => {
    const start = range.start ?? 0;
    const end = range.end ?? content.length;
    if (start < 0 || end <= start || start >= content.length) return [];
    return {
      start,
      end: Math.min(end, content.length),
      selected: false,
    };
  });

  if (selectedRange) {
    ranges.push({
      start: Math.max(0, selectedRange.start),
      end: Math.min(selectedRange.end, content.length),
      selected: true,
    });
  }

  return ranges
    .filter((range) => range.end > range.start)
    .sort((left, right) => {
      if (left.start !== right.start) return left.start - right.start;
      return Number(left.selected) - Number(right.selected);
    })
    .reduce<
      { start: number; end: number; selected: boolean }[]
    >((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start < previous.end) {
        if (range.selected && !previous.selected) {
          previous.end = range.start;
          merged.push(range);
        }
        return merged;
      }
      merged.push(range);
      return merged;
    }, [])
    .filter((range) => range.end > range.start);
}

function renderHighlightedText({
  content,
  ranges,
  lineId,
  isLineLastClicked,
  onSavedHighlightClick,
}: {
  content: string;
  ranges: { start: number; end: number; selected: boolean }[];
  lineId: number;
  isLineLastClicked: boolean;
  onSavedHighlightClick?: (id: number) => void;
}) {
  if (ranges.length === 0) return content;

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(content.slice(cursor, range.start));
    }
    const isSavedHighlight = !range.selected;
    parts.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className={cn(
          "box-decoration-clone bg-[#3e3e3e] p-1 text-foreground [-webkit-box-decoration-break:clone] selection:bg-[#3e3e3e] selection:text-foreground",
          range.selected && "bg-[#565656] selection:bg-[#565656]",
          isSavedHighlight &&
            isLineLastClicked &&
            "bg-[#e7e7e7] text-black selection:bg-[#e7e7e7] selection:text-black",
          isSavedHighlight &&
            onSavedHighlightClick &&
            "cursor-pointer active:bg-[#e7e7e7] active:text-black",
          isSavedHighlight &&
            !isLineLastClicked &&
            onSavedHighlightClick &&
            "hover:bg-[#4b4b4b] hover:text-foreground",
        )}
        onPointerDown={(event) => {
          if (!isSavedHighlight || !onSavedHighlightClick) return;
          event.stopPropagation();
        }}
        onClick={(event) => {
          if (!isSavedHighlight || !onSavedHighlightClick) return;
          event.stopPropagation();
          onSavedHighlightClick(lineId);
        }}
      >
        {content.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }
  return parts;
}

export const LineItem = memo(
  ({
    line,
    editMode,
    isSelected,
    isActive,
    isLastClicked,
    inlineEditingId,
    inlineContent,
    onToggleSelect,
    onStartInlineEdit,
    onInlineSave,
    onSetInlineEditingId,
    onSetInlineContent,
    onSeek,
    onEditClick,
    onSuggestClick,
    onAddClick,
    onAnnotationSelect,
    onAnnotationRangeStart,
    onAnnotationRangeEnter,
    onAnnotationRangeEnd,
    onAnnotationTextSelectionComplete,
    onAnnotationHighlightClick,
    canEdit,
    showBeforeInsert,
    isAnnotationSelected,
    annotationTextRange,
    annotationTextRanges,
  }: LineItemProps) => {
    const selectedTextRange = isAnnotationSelected ? annotationTextRange : null;
    const renderedLineContent = renderHighlightedText({
      content: line.content,
      lineId: line.id,
      isLineLastClicked: isLastClicked,
      onSavedHighlightClick: onAnnotationHighlightClick,
      ranges: buildTextHighlightRanges({
        content: line.content,
        savedRanges: annotationTextRanges,
        selectedRange: selectedTextRange,
      }),
    });

    return (
      <Fragment>
        {showBeforeInsert && editMode && (
          <div className="group/insert relative z-20 -mt-2 mb-2 flex h-4 w-full items-center justify-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border-primary/20 lg:border-primary/0 lg:group-hover/insert:border-primary/30 w-full border-t border-dashed transition-colors" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddClick(line.id, "before")}
              className="border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-primary/20 z-30 h-5 w-5 scale-100 cursor-pointer rounded-full border opacity-100 shadow-md transition-all lg:scale-75 lg:opacity-0 lg:group-hover/insert:scale-100 lg:group-hover/insert:opacity-100"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {editMode ? (
          <div
            data-line-id={line.id}
            className={cn(
              "group/line flex items-start gap-2 rounded-md px-2 py-0.5 transition-all duration-200",
              (isSelected || isActive) && "bg-primary/10",
              (isLastClicked || isActive) &&
                "border-primary rounded-l-none border-l-2",
            )}
          >
            {isActive && (
              <div className="bg-primary absolute top-2.5 -left-1.5 hidden h-1.5 w-1.5 animate-pulse rounded-full lg:block" />
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(line.id, e.shiftKey);
              }}
              className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer"
            />

            <button
              onClick={() => onSeek(line.start_time)}
              className="group/seek mt-1 flex min-w-[28px] shrink-0 items-center justify-center outline-none"
              title={`Seek to ${formatTime(line.start_time)}`}
            >
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums transition-colors",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground/40 group-hover/seek:text-primary",
                )}
              >
                {formatTime(line.start_time)}
              </span>
            </button>

            {inlineEditingId === line.id ? (
              <Textarea
                autoFocus
                value={inlineContent}
                onChange={(e) => onSetInlineContent(e.target.value)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                onBlur={() => onInlineSave(line.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onInlineSave(line.id, true);
                  } else if (e.key === "Escape") {
                    onSetInlineEditingId(null);
                  }
                }}
                className="min-h-0 flex-1 resize-none border-none bg-transparent p-0 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[13px]"
              />
            ) : (
              <span
                className="text-foreground hover:text-primary/80 flex-1 cursor-text text-[13px] leading-relaxed transition-colors"
                onClick={() => onStartInlineEdit(line)}
              >
                {line.content}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditClick(line)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-5 w-5 shrink-0 opacity-100 focus:opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover/line:opacity-100"
              title="Edit this line"
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
          </div>
        ) : (
          <div
            data-line-id={line.id}
            onPointerDown={(event) => {
              if (!onAnnotationRangeStart) return;
              if (event.pointerType === "mouse" && event.button !== 0) return;
              onAnnotationRangeStart(line.id);
            }}
            onPointerEnter={() => {
              onAnnotationRangeEnter?.(line.id);
            }}
            onPointerUp={() => {
              onAnnotationRangeEnd?.();
            }}
            onClick={(event) => {
              if (onAnnotationSelect) {
                onAnnotationSelect(line.id, event.shiftKey);
                return;
              }
              onSeek(line.start_time);
            }}
            className={cn(
              "group/line flex w-full cursor-pointer items-baseline gap-3 rounded-md px-1.5 py-0.5 text-[13px] transition-all duration-300 ease-in-out",
              onAnnotationRangeStart && "touch-pan-y",
              isActive
                ? "border-primary bg-primary/10 rounded-l-none border-l-2"
                : "text-foreground/80 border-l-2 border-transparent",
            )}
          >
            <div className="flex min-w-[32px] shrink-0 select-none items-center gap-1">
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSeek(line.start_time);
                }}
                className={cn(
                  "rounded-sm px-1 font-mono text-[9px] tabular-nums transition-colors",
                  isActive
                    ? "text-primary bg-primary/10 font-bold"
                    : "text-muted-foreground/45 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
                )}
                title={`Seek to ${formatTime(line.start_time)}`}
              >
                {formatTime(line.start_time)}
              </button>
            </div>
            <span
              data-line-text-id={line.id}
              className="flex-1 cursor-text select-text p-1 selection:bg-[#3e3e3e] selection:text-foreground"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                window.setTimeout(() => {
                  onAnnotationTextSelectionComplete?.();
                }, 0);
              }}
              onClick={(event) => {
                event.stopPropagation();
                const selection = window.getSelection();
                if (selection?.toString().trim()) return;
                onAnnotationSelect?.(line.id, event.shiftKey);
              }}
            >
              {renderedLineContent}
            </span>
            {!canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuggestClick(line);
                }}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground ml-auto h-5 w-5 shrink-0 transition-opacity",
                  isActive
                    ? "opacity-100"
                    : "opacity-0 focus:opacity-100 lg:group-hover/line:opacity-100",
                )}
                title="Suggest a correction"
              >
                <MessageSquarePlus className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}

        {editMode && (
          <div className="group/insert relative z-10 -my-0.5 flex h-4 w-full items-center justify-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border-primary/20 lg:border-primary/0 lg:group-hover/insert:border-primary/30 w-full border-t border-dashed transition-colors" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddClick(line.id, "after")}
              className="border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-primary/20 z-30 h-5 w-5 scale-100 cursor-pointer rounded-full border opacity-100 shadow-md transition-all lg:scale-75 lg:opacity-0 lg:group-hover/insert:scale-100 lg:group-hover/insert:opacity-100"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </Fragment>
    );
  },
);
LineItem.displayName = "LineItem";
