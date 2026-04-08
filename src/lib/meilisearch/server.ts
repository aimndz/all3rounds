import { Meilisearch } from "meilisearch";
import { buildSearchQuery } from "@/lib/search-query";
import type { SearchAppliedFilters } from "@/lib/types";

export const DEFAULT_MEILISEARCH_INDEX_UID = "transcript_lines";
export const DEFAULT_MEILISEARCH_SUGGEST_INDEX_UID =
  "transcript_line_suggestions";

export interface MeilisearchLineDocument {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee_id: string | null;
  emcee_name: string | null;
  speaker_ids: string[] | null;
  battle_id: string;
  battle_title: string;
  battle_youtube_id: string;
  battle_event_name: string | null;
  battle_event_date: string | null;
  battle_status: string;
  battle_status_rank: number;
  battle_event_timestamp: number;
  battle_event_year: number | null;
  emcee_name_filter: string | null;
  speaker_names_filter: string[];
  emcee_aliases_filter: string[];
  speaker_aliases_filter: string[];
  battle_title_filter: string | null;
  battle_event_name_filter: string | null;
  speaker_names_search: string[];
  emcee_aliases_search: string[];
  speaker_aliases_search: string[];
}

export interface MeilisearchLineHit extends MeilisearchLineDocument {
  _rankingScore?: number;
}

export interface MeilisearchSuggestionDocument {
  id: string;
  phrase: string;
  normalized_phrase: string;
  line_count: number;
  token_count: number;
}

export interface MeilisearchSuggestion {
  phrase: string;
  query: string;
  lineCount: number;
  battleTitle?: string;
  eventName?: string;
}

interface MeilisearchRuntimeConfig {
  host: string;
  searchKey: string;
  indexUid: string;
  suggestIndexUid: string;
}

function normalizeFilterValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function quoteFilterValue(value: string): string {
  return JSON.stringify(normalizeFilterValue(value));
}

function buildMeilisearchFilter(
  appliedFilters: SearchAppliedFilters,
): string | undefined {
  const filters: string[] = [];

  if (appliedFilters.emcee) {
    const value = quoteFilterValue(appliedFilters.emcee);
    filters.push(
      `(emcee_name_filter = ${value} OR speaker_names_filter = ${value} OR emcee_aliases_filter = ${value} OR speaker_aliases_filter = ${value})`,
    );
  }

  if (appliedFilters.battle) {
    filters.push(
      `battle_title_filter = ${quoteFilterValue(appliedFilters.battle)}`,
    );
  }

  if (appliedFilters.event) {
    filters.push(
      `battle_event_name_filter = ${quoteFilterValue(appliedFilters.event)}`,
    );
  }

  return filters.length > 0 ? filters.join(" AND ") : undefined;
}

function getRuntimeConfig(): MeilisearchRuntimeConfig | null {
  const host = process.env.MEILISEARCH_HOST?.trim();
  const searchKey = process.env.MEILISEARCH_SEARCH_KEY?.trim();

  if (!host || !searchKey) {
    return null;
  }

  return {
    host,
    searchKey,
    indexUid:
      process.env.MEILISEARCH_INDEX_UID?.trim() ||
      DEFAULT_MEILISEARCH_INDEX_UID,
    suggestIndexUid:
      process.env.MEILISEARCH_SUGGEST_INDEX_UID?.trim() ||
      DEFAULT_MEILISEARCH_SUGGEST_INDEX_UID,
  };
}

function createClient(config: MeilisearchRuntimeConfig) {
  return new Meilisearch({
    host: config.host,
    apiKey: config.searchKey,
    timeout: 5000,
  });
}

export function isMeilisearchConfigured(): boolean {
  return getRuntimeConfig() !== null;
}

export async function searchMeilisearchLines(params: {
  text: string;
  appliedFilters: SearchAppliedFilters;
  page: number;
  limit: number;
}): Promise<{
  hits: MeilisearchLineHit[];
  total: number;
  totalPages: number;
}> {
  const config = getRuntimeConfig();

  if (!config) {
    throw new Error(
      "Meilisearch is not configured. Set MEILISEARCH_HOST and MEILISEARCH_SEARCH_KEY first.",
    );
  }

  const client = createClient(config);
  const index = client.index<MeilisearchLineDocument>(config.indexUid);
  const response = await index.search(params.text || "", {
    filter: buildMeilisearchFilter(params.appliedFilters),
    hitsPerPage: params.limit,
    page: params.page,
    showRankingScore: true,
    attributesToSearchOn: params.text
      ? [
          "content",
          "battle_title",
          "battle_event_name",
          "emcee_name",
          "speaker_names_search",
          "emcee_aliases_search",
          "speaker_aliases_search",
        ]
      : undefined,
    sort: params.text ? undefined : ["battle_event_date:desc", "id:desc"],
  });

  const total = typeof response.totalHits === "number" ? response.totalHits : 0;
  const totalPages =
    typeof response.totalPages === "number"
      ? response.totalPages
      : Math.ceil(total / params.limit);

  return {
    hits: response.hits as MeilisearchLineHit[],
    total,
    totalPages,
  };
}

function extractSuggestionPhrase(content: string, queryText: string): string {
  const compactContent = content.trim().replace(/\s+/g, " ");
  if (!compactContent) {
    return "";
  }

  const normalizedQuery = normalizeFilterValue(queryText).toLowerCase();
  const matchIndex = compactContent.toLowerCase().indexOf(normalizedQuery);
  const startIndex = matchIndex >= 0 ? matchIndex : 0;
  const slice = compactContent.slice(startIndex).trim();
  const phrase = slice
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .split(/\s+/)
    .slice(0, 6)
    .join(" ")
    .replace(/[.,!?;:]+$/g, "");

  return phrase || compactContent.split(/\s+/).slice(0, 6).join(" ");
}

function collectSuggestionsFromHits(params: {
  hits: MeilisearchLineHit[];
  queryText: string;
  appliedFilters: SearchAppliedFilters;
  limit: number;
}): MeilisearchSuggestion[] {
  const seen = new Set<string>();
  const suggestions: MeilisearchSuggestion[] = [];
  const normalizedText = normalizeFilterValue(params.queryText).toLowerCase();

  for (const hit of params.hits) {
    const phrase = extractSuggestionPhrase(hit.content, params.queryText);
    if (!phrase) {
      continue;
    }

    if (!phrase.toLowerCase().startsWith(normalizedText)) {
      continue;
    }

    const normalizedPhrase = phrase.toLowerCase();
    if (seen.has(normalizedPhrase)) {
      continue;
    }

    seen.add(normalizedPhrase);
    suggestions.push({
      phrase,
      query: buildSearchQuery(phrase, params.appliedFilters),
      lineCount: 0,
      battleTitle: hit.battle_title,
      eventName: hit.battle_event_name || undefined,
    });

    if (suggestions.length >= params.limit) {
      break;
    }
  }

  return suggestions;
}

export function rankSuggestionsByFrequency<
  T extends { phrase: string; lineCount: number },
>(
  suggestions: T[],
): T[] {
  return [...suggestions].sort((left, right) => {
    if (right.lineCount !== left.lineCount) {
      return right.lineCount - left.lineCount;
    }

    const leftTokenCount = left.phrase.split(/\s+/).length;
    const rightTokenCount = right.phrase.split(/\s+/).length;
    if (leftTokenCount !== rightTokenCount) {
      return leftTokenCount - rightTokenCount;
    }

    return left.phrase.localeCompare(right.phrase);
  });
}

export async function searchMeilisearchSuggestions(params: {
  text: string;
  appliedFilters: SearchAppliedFilters;
  limit: number;
}): Promise<MeilisearchSuggestion[]> {
  const config = getRuntimeConfig();

  if (!config) {
    throw new Error(
      "Meilisearch is not configured. Set MEILISEARCH_HOST and MEILISEARCH_SEARCH_KEY first.",
    );
  }

  const normalizedText = normalizeFilterValue(params.text);
  if (normalizedText.length < 1) {
    return [];
  }

  const client = createClient(config);

  try {
    const poolSize =
      normalizedText.length <= 2
        ? Math.max(params.limit * 50, 500)
        : Math.max(params.limit * 25, 200);
    const suggestionIndex = client.index<MeilisearchSuggestionDocument>(
      config.suggestIndexUid,
    );
    const response = await suggestionIndex.search(normalizedText, {
      limit: poolSize,
      attributesToSearchOn: ["phrase"],
      typoTolerance: false,
    });

    const suggestions = rankSuggestionsByFrequency(
      response.hits
        .filter((hit) =>
          hit.normalized_phrase.startsWith(normalizedText.toLowerCase()),
        )
        .map((hit) => ({
          phrase: hit.phrase,
          query: buildSearchQuery(hit.phrase, params.appliedFilters),
          lineCount: hit.line_count,
        })),
    ).slice(0, params.limit);

    if (suggestions.length > 0) {
      return suggestions;
    }
  } catch {
    // Fall back to the main transcript index if the dedicated suggestion
    // index has not been built yet.
  }

  const index = client.index<MeilisearchLineDocument>(config.indexUid);
  const response = await index.search(normalizedText, {
    filter: buildMeilisearchFilter(params.appliedFilters),
    limit: Math.max(params.limit * 3, 12),
    attributesToSearchOn: [
      "content",
      "battle_title",
      "battle_event_name",
      "emcee_name",
      "speaker_names_search",
      "emcee_aliases_search",
      "speaker_aliases_search",
    ],
  });

  return rankSuggestionsByFrequency(
    collectSuggestionsFromHits({
      hits: response.hits as MeilisearchLineHit[],
      queryText: normalizedText,
      appliedFilters: params.appliedFilters,
      limit: params.limit,
    }).map((suggestion) => ({
      ...suggestion,
      lineCount: suggestion.lineCount,
    })),
  ).slice(0, params.limit);
}


