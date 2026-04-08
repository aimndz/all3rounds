"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseSearchQuery } from "@/lib/search-query";
import type { SearchFilterKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarDays, Mic2, Search, Swords, X } from "lucide-react";

type SearchBarProps = {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "lg" | "sm";
  placeholder?: string;
};

type SearchSuggestion = {
  phrase: string;
  query: string;
  lineCount: number;
  battleTitle?: string;
  eventName?: string;
};

const FILTER_OPTIONS: Array<{
  key: SearchFilterKey;
  title: string;
  subtitle: string;
  icon: typeof Mic2;
}> = [
  {
    key: "emcee",
    title: "From a specific emcee",
    subtitle: "emcee:",
    icon: Mic2,
  },
  {
    key: "battle",
    title: "From a specific battle",
    subtitle: "battle:",
    icon: Swords,
  },
  {
    key: "event",
    title: "From a specific event",
    subtitle: "event:",
    icon: CalendarDays,
  },
];

type TextSegment = {
  type: "text";
  value: string;
  isEditing: boolean;
};

type FilterSegment = {
  type: "filter";
  key: SearchFilterKey;
  value: string;
  isEditing: boolean;
};

type ComposerSegment = TextSegment | FilterSegment;

function parseComposerSegments(rawInput: string): ComposerSegment[] {
  const raw = rawInput.trim().replace(/\s+/g, " ");
  if (!raw) {
    return [];
  }

  const segments: ComposerSegment[] = [];
  const filterPattern =
    /\b(emcee|battle|event):\s*(?:"((?:[^"\\]|\\.)*)"|([^\s"]+))/gi;
  let lastIndex = 0;

  for (const match of raw.matchAll(filterPattern)) {
    const matchIndex = match.index ?? 0;
    const [fullMatch, rawKey, quotedValue, bareValue] = match;
    const leadingText = raw.slice(lastIndex, matchIndex).trim();
    if (leadingText) {
      segments.push({ type: "text", value: leadingText, isEditing: false });
    }

    segments.push({
      type: "filter",
      key: rawKey.toLowerCase() as SearchFilterKey,
      value: (quotedValue
        ? quotedValue.replace(/\\"/g, '"')
        : bareValue || ""
      ).trim(),
      isEditing: false,
    });

    lastIndex = matchIndex + fullMatch.length;
  }

  const trailingText = raw.slice(lastIndex).trim();
  if (trailingText) {
    segments.push({ type: "text", value: trailingText, isEditing: false });
  }

  return segments;
}

function createInitialSegments(rawInput: string): ComposerSegment[] {
  const parsed = parseComposerSegments(rawInput);
  return parsed.length > 0
    ? [...parsed, { type: "text", value: "", isEditing: true }]
    : [{ type: "text", value: "", isEditing: true }];
}

function serializeOrderedSegments(segments: ComposerSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.type === "text") {
        return segment.value;
      }

      const serializedValue = /\s/.test(segment.value)
        ? `"${segment.value.replace(/"/g, '\\"')}"`
        : segment.value;
      return `${segment.key}:${serializedValue}`;
    })
    .join(" ")
    .trim();
}

function SearchBar({
  initialQuery = "",
  autoFocus = false,
  size = "lg",
  placeholder = "Search lines",
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<ComposerSegment[]>(() =>
    createInitialSegments(initialQuery),
  );
  const [isFocused, setIsFocused] = useState(false);
  const [transcriptSuggestions, setTranscriptSuggestions] = useState<
    SearchSuggestion[]
  >([]);

  useEffect(() => {
    setSegments(createInitialSegments(initialQuery));
  }, [initialQuery]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeIndex = useMemo(
    () => segments.findIndex((segment) => segment.isEditing),
    [segments],
  );
  const activeSegment = activeIndex >= 0 ? segments[activeIndex] : null;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, [segments]);

  const hasQuery = segments.some((segment) => segment.value.trim().length > 0);
  const isLarge = size === "lg";
  const inputPlaceholder = hasQuery ? "" : placeholder;
  const composerTextClass = isLarge
    ? "text-sm leading-6 font-normal"
    : "text-xs leading-5 font-normal";
  const activeTextValue =
    activeSegment?.type === "text" ? activeSegment.value.trim() : "";
  const hasTypedText = activeTextValue.length >= 1;
  const currentQuery = useMemo(
    () => serializeOrderedSegments(segments.filter((segment) => segment.value.trim())),
    [segments],
  );

  const showSuggestions =
    isFocused &&
    activeSegment?.type === "text";

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    if (isFocused && activeSegment) {
      inputRef.current?.focus();
    }
  }, [activeSegment, isFocused]);

  useEffect(() => {
    if (!showSuggestions || !hasTypedText) {
      setTranscriptSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(currentQuery)}&limit=5`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setTranscriptSuggestions([]);
          return;
        }

        const payload = (await response.json()) as {
          suggestions?: SearchSuggestion[];
        };
        setTranscriptSuggestions(payload.suggestions || []);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.message.includes("aborted"))
        ) {
          return;
        }
        setTranscriptSuggestions([]);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [currentQuery, hasTypedText, showSuggestions]);

  const syncQueryToRoute = useCallback(
    (nextSegments: ComposerSegment[]) => {
      const nextQuery = serializeOrderedSegments(nextSegments);
      if (!nextQuery) {
        return;
      }
      router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
      setIsFocused(false);
    },
    [router],
  );

  const handleEditSegment = useCallback(
    (index: number) => {
      setSegments((prev) =>
        prev.map((segment, segmentIndex) => ({
          ...segment,
          isEditing: segmentIndex === index,
        })),
      );
      setIsFocused(true);
      focusInput();
    },
    [focusInput],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const finalSegments = segments.filter((segment) => segment.value.trim());
      const normalized = parseSearchQuery(
        serializeOrderedSegments(finalSegments),
      );
      if (!normalized.hasSearchIntent) {
        return;
      }
      syncQueryToRoute(finalSegments);
    },
    [segments, syncQueryToRoute],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeSegment || activeIndex === -1) {
        return;
      }

      const nextValue = e.target.value;

      setSegments((prev) => {
        const next = [...prev];
        const current = next[activeIndex];
        if (!current) {
          return prev;
        }

        if (current.type === "text") {
          const triggerMatch = nextValue.match(
            /^(.*?)(?:^|\s)(emcee|battle|event):\s*$/i,
          );

          if (triggerMatch) {
            const [, leadingText = "", rawKey] = triggerMatch;
            const key = rawKey.toLowerCase() as SearchFilterKey;
            const replacement: ComposerSegment[] = [];
            const trimmedLeadingText = leadingText.trim();

            if (trimmedLeadingText) {
              replacement.push({
                type: "text",
                value: trimmedLeadingText,
                isEditing: false,
              });
            }

            replacement.push({
              type: "filter",
              key,
              value: "",
              isEditing: true,
            });

            next.splice(activeIndex, 1, ...replacement);
            return next;
          }
        }

        next[activeIndex] = {
          ...current,
          value: nextValue,
        };
        return next;
      });
    },
    [activeIndex, activeSegment],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!activeSegment || activeIndex === -1) {
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        const trimmedValue = activeSegment.value.trim();

        if (activeSegment.type === "filter") {
          e.preventDefault();

          if (!trimmedValue) {
            setSegments((prev) => {
              const next = [...prev];
              next[activeIndex] = { type: "text", value: "", isEditing: true };
              return next;
            });
            return;
          }

          setSegments((prev) => {
            const next = [...prev];
            next[activeIndex] = {
              ...next[activeIndex],
              value: trimmedValue,
              isEditing: false,
            } as FilterSegment;

            if (next[activeIndex + 1]?.type === "text") {
              next[activeIndex + 1] = {
                ...next[activeIndex + 1],
                isEditing: true,
              };
            } else {
              next.splice(activeIndex + 1, 0, {
                type: "text",
                value: "",
                isEditing: true,
              });
            }

            for (let index = 0; index < next.length; index += 1) {
              if (index !== activeIndex + 1) {
                next[index] = { ...next[index], isEditing: false };
              }
            }

            return next;
          });
          return;
        }
      }

      if (e.key === "Backspace" && activeSegment.value === "") {
        if (activeIndex > 0) {
          e.preventDefault();
          setSegments((prev) => {
            const next = [...prev];
            next.splice(activeIndex, 1);
            next[activeIndex - 1] = {
              ...next[activeIndex - 1],
              isEditing: true,
            };
            return next;
          });
          return;
        }

        if (activeSegment.type === "filter") {
          e.preventDefault();
          setSegments((prev) => {
            const next = [...prev];
            next[activeIndex] = { type: "text", value: "", isEditing: true };
            return next;
          });
        }
      }

      if (e.key === "Escape") {
        setIsFocused(false);
      }
    },
    [activeIndex, activeSegment],
  );

  const handlePickFilter = useCallback(
    (key: SearchFilterKey) => {
      if (activeIndex === -1) {
        return;
      }

      setSegments((prev) => {
        const next = [...prev];
        const current = next[activeIndex];
        if (!current || current.type !== "text") {
          return prev;
        }

        if (current.value.trim()) {
          next[activeIndex] = {
            ...current,
            value: current.value.trim(),
            isEditing: false,
          };
          next.splice(activeIndex + 1, 0, {
            type: "filter",
            key,
            value: "",
            isEditing: true,
          });
        } else {
          next.splice(activeIndex, 1, {
            type: "filter",
            key,
            value: "",
            isEditing: true,
          });
        }

        return next;
      });
      setIsFocused(true);
      focusInput();
    },
    [activeIndex, focusInput],
  );

  const handleSuggestionClick = useCallback(
    (query: string) => {
      if (!query) {
        return;
      }

      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsFocused(false);
    },
    [router],
  );

  const clearQuery = useCallback(() => {
    setSegments([{ type: "text", value: "", isEditing: true }]);
    setTranscriptSuggestions([]);
    setIsFocused(true);
    focusInput();
  }, [focusInput]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div ref={rootRef} className="group relative">
        <div
          className={cn(
            "border-input bg-input/35 hover:bg-input/50 focus-within:border-primary focus-within:bg-input/55 flex min-h-10 w-full items-center gap-2 rounded-(--radius-control) border shadow-xs transition-[background-color,border-color,color,box-shadow]",
            "pl-3 pr-1.5",
            isLarge ? "min-h-12 py-1.5" : "py-1",
          )}
          onClick={() => {
            setIsFocused(true);
            focusInput();
          }}
        >
          <div className="relative h-8 min-w-0 flex-1 sm:h-9">
            <div
              ref={scrollContainerRef}
              className="absolute inset-0 overflow-hidden"
            >
              <div className="flex h-full min-w-full items-center gap-1.5 whitespace-nowrap px-0.5">
                {segments.map((segment, index) => {
                  const isEditing = index === activeIndex;
                  const segmentKey = `${segment.type}-${index}`;

                  if (segment.type === "filter") {
                    return isEditing ? (
                      <span
                        key={segmentKey}
                        className={cn(
                          "border-border/80 bg-muted text-foreground flex flex-none shrink-0 items-center gap-1 rounded-(--radius-control) border px-2 py-1",
                          composerTextClass,
                        )}
                      >
                        <span className="lowercase">{segment.key}:</span>
                        <div className="inline-grid min-w-[1ch] items-center">
                          <span
                            className={cn(
                              "invisible col-start-1 row-start-1 whitespace-pre px-0.5 font-sans",
                              composerTextClass,
                            )}
                          >
                            {segment.value}
                          </span>
                          <input
                            ref={inputRef}
                            key={segmentKey}
                            type="text"
                            size={1}
                            value={segment.value}
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            onFocus={() => setIsFocused(true)}
                            placeholder=""
                            aria-label="Search"
                            className={cn(
                              "col-start-1 row-start-1 w-full bg-transparent outline-none",
                              composerTextClass,
                            )}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                          />
                        </div>
                      </span>
                    ) : (
                      <button
                        key={segmentKey}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSegment(index);
                        }}
                        aria-label={`Edit ${segment.key} filter`}
                        className={cn(
                          "border-border/80 bg-muted text-foreground flex flex-none shrink-0 items-center gap-1 rounded-(--radius-control) border px-2 py-1 text-left",
                          composerTextClass,
                        )}
                      >
                        <span className="lowercase">{segment.key}:</span>
                        <span>{segment.value}</span>
                      </button>
                    );
                  }

                  const isLast = index === segments.length - 1;
                  return isEditing ? (
                    <div
                      key={segmentKey}
                      className="inline-grid min-w-0 flex-none items-center"
                    >
                      <span
                        className={cn(
                          "invisible col-start-1 row-start-1 whitespace-pre px-0.5 font-sans",
                          composerTextClass,
                        )}
                      >
                        {segment.value || (isLast ? inputPlaceholder : "")}
                      </span>
                      <input
                        ref={inputRef}
                        key={segmentKey}
                        type="text"
                        size={1}
                        value={segment.value}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        onFocus={() => setIsFocused(true)}
                        placeholder={inputPlaceholder}
                        aria-label="Search"
                        className={cn(
                          "placeholder:text-muted-foreground col-start-1 row-start-1 w-full bg-transparent outline-none",
                          composerTextClass,
                        )}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <button
                      key={segmentKey}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSegment(index);
                      }}
                      className={cn(
                        "text-foreground/90 text-left outline-none",
                        isLast ? "flex-1" : "w-fit flex-none",
                        composerTextClass,
                      )}
                    >
                      {segment.value}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {hasQuery && (
              <button
                type="button"
                onClick={clearQuery}
                aria-label="Clear query"
                className="text-muted-foreground/50 hover:bg-muted/70 hover:text-foreground ml-1 flex h-7 w-7 items-center justify-center rounded-full transition-[background-color,color,opacity] active:opacity-90"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              aria-label="Run search"
              size={isLarge ? "icon-lg" : "icon-sm"}
              className="flex font-bold"
            >
              <Search className={isLarge ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        {showSuggestions && (
          <div className="bg-popover text-popover-foreground border-border/60 absolute left-0 top-[calc(100%+0.5rem)] z-40 w-full overflow-hidden rounded-xl border p-2 shadow-2xl">
            {transcriptSuggestions.length > 0 && (
              <div className="space-y-1">
                {transcriptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.query}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionClick(suggestion.query)}
                    className="hover:bg-muted/70 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                  >
                    <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate text-sm font-medium">
                      {suggestion.phrase}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div
              className={cn(
                transcriptSuggestions.length > 0 &&
                  "border-border/60 mt-2 border-t pt-2",
              )}
            >
              <div className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                Filters
              </div>
              <div className="space-y-1">
                {FILTER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickFilter(option.key)}
                      className="hover:bg-muted/70 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                    >
                      <span className="text-muted-foreground mt-0.5">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {option.title}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {option.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

const MemoizedSearchBar = memo(SearchBar);
MemoizedSearchBar.displayName = "SearchBar";

export default MemoizedSearchBar;
