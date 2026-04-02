import type {
  SearchAppliedFilters,
  SearchFilterKey,
  SearchQueryMeta,
} from "@/lib/types";

const SEARCH_FILTER_KEYS = ["emcee", "battle", "event"] as const;

export const SEARCH_FILTER_LABELS: Record<SearchFilterKey, string> = {
  emcee: "Emcee",
  battle: "Battle",
  event: "Event",
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isSearchFilterKey(value: string): value is SearchFilterKey {
  return (SEARCH_FILTER_KEYS as readonly string[]).includes(value);
}

function quoteFilterValue(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!/\s/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '\\"')}"`;
}

export function parseSearchQuery(rawInput: string): SearchQueryMeta & {
  raw: string;
  hasStructuredFilters: boolean;
  hasSearchIntent: boolean;
} {
  const raw = normalizeWhitespace(rawInput);
  const filters: SearchAppliedFilters = {};
  const filterPattern =
    /\b(emcee|battle|event):\s*(?:"((?:[^"\\]|\\.)*)"|([^\s"]+))/gi;
  const textFragments: string[] = [];
  let lastIndex = 0;

  for (const match of raw.matchAll(filterPattern)) {
    const matchIndex = match.index ?? 0;
    const [fullMatch, rawKey, quotedValue, bareValue] = match;
    const key = rawKey.toLowerCase();

    if (!isSearchFilterKey(key)) continue;

    const leadingText = raw.slice(lastIndex, matchIndex);
    if (leadingText.trim()) {
      textFragments.push(leadingText);
    }

    const resolvedValue = quotedValue
      ? quotedValue.replace(/\\"/g, '"')
      : bareValue || "";
    const normalizedValue = normalizeWhitespace(resolvedValue);
    if (normalizedValue) {
      filters[key] = normalizedValue;
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  const trailingText = raw.slice(lastIndex);
  if (trailingText.trim()) {
    textFragments.push(trailingText);
  }

  const text = normalizeWhitespace(textFragments.join(" "));
  const hasStructuredFilters = Object.keys(filters).length > 0;
  const hasSearchIntent = Boolean(text || hasStructuredFilters);

  return {
    raw,
    text,
    appliedFilters: filters,
    hasStructuredFilters,
    hasSearchIntent,
  };
}

export function buildSearchQuery(
  text: string,
  appliedFilters: SearchAppliedFilters,
): string {
  const parts: string[] = [];
  const normalizedText = normalizeWhitespace(text);

  if (normalizedText) {
    parts.push(normalizedText);
  }

  for (const key of SEARCH_FILTER_KEYS) {
    const value = appliedFilters[key];
    if (!value) continue;
    parts.push(`${key}:${quoteFilterValue(value)}`);
  }

  return parts.join(" ").trim();
}

export function getAppliedSearchFilters(
  appliedFilters: SearchAppliedFilters,
): Array<{ key: SearchFilterKey; label: string; value: string }> {
  return SEARCH_FILTER_KEYS.flatMap((key) => {
    const value = appliedFilters[key];
    if (!value) return [];

    return [{ key, label: SEARCH_FILTER_LABELS[key], value }];
  });
}
