"use client";

import { memo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Play, Plus, MessageSquarePlus } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { BattleLine } from "@/features/battle/hooks/use-battle-data";

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
  isLoggedIn: boolean;
  canEdit: boolean;
  showBeforeInsert?: boolean;
};

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
    isLoggedIn,
    canEdit,
    showBeforeInsert,
  }: LineItemProps) => {
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
              isSelected || isActive ? "bg-primary/10" : "hover:bg-muted/40",
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
              className="mt-1 h-3.5 w-3.5 shrink-0"
            />

            <button
              onClick={() => onSeek(line.start_time)}
              className="group/seek mt-1 flex min-w-[28px] shrink-0 items-center justify-center outline-none"
              title={`Seek to ${formatTime(line.start_time)}`}
            >
              {isActive ? (
                <Play className="fill-primary text-primary h-2.5 w-2.5 animate-pulse" />
              ) : (
                <span className="text-muted-foreground/40 group-hover/seek:text-primary font-mono text-[9px] tabular-nums transition-colors">
                  {formatTime(line.start_time)}
                </span>
              )}
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
            onClick={() => onSeek(line.start_time)}
            className={cn(
              "group/line flex w-full cursor-pointer items-baseline gap-3 rounded-md px-1.5 py-0.5 text-[13px] transition-all duration-300 ease-in-out",
              isActive
                ? "border-primary bg-primary/10 rounded-l-none border-l-2 font-semibold"
                : "text-foreground/80 hover:bg-muted/30 border-l-2 border-transparent",
            )}
          >
            <div className="flex min-w-[32px] shrink-0 items-center gap-1">
              {isActive ? (
                <Play className="fill-primary text-primary h-2 w-2 animate-pulse" />
              ) : (
                <span className="text-muted-foreground/30 group-hover/line:text-muted-foreground font-mono text-[9px] tabular-nums transition-colors">
                  {formatTime(line.start_time)}
                </span>
              )}
            </div>
            <span className="flex-1">{line.content}</span>
            {isLoggedIn && !canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuggestClick(line);
                }}
                className="text-muted-foreground hover:bg-muted hover:text-foreground ml-auto h-5 w-5 shrink-0 opacity-100 focus:opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover/line:opacity-100"
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
