"use client";

import { useState, useCallback, useRef } from "react";

export type BattleLine = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee: { id: string; name: string } | null;
  emcees?: { id: string; name: string }[];
};

export type BattleStatus = "raw" | "arranged" | "reviewing" | "reviewed";

export type BattleData = {
  battle: {
    id: string;
    title: string;
    youtube_id: string;
    event_name: string | null;
    event_date: string | null;
    url: string;
    status: BattleStatus;
  };
  participants: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[];
  lines: BattleLine[];
  lines_pagination?: {
    limit: number;
    offset: number;
    has_more: boolean;
    has_previous: boolean;
    loaded: number;
    total: number;
  };
};

export type Turn = {
  speaker: string;
  lines: BattleLine[];
};

export type RoundGroup = {
  round: number | null;
  turns: Turn[];
};

export function useBattleData(
  battleId: string,
  initialLineId: number | null = null,
) {
  const PAGE_SIZE = 200;
  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [error, setError] = useState("");
  const hasMore = Boolean(data?.lines_pagination?.has_more);
  const hasPrevious = Boolean(data?.lines_pagination?.has_previous);
  const loadingMorePromiseRef = useRef<Promise<BattleData | null> | null>(null);
  const loadingPreviousPromiseRef = useRef<Promise<BattleData | null> | null>(
    null,
  );

  const fetchBattle = useCallback((options?: { forceFresh?: boolean }) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: "0",
    });
    if (initialLineId) {
      params.set("lineId", String(initialLineId));
    }
    if (options?.forceFresh) {
      params.set("_", String(Date.now()));
    }

    return fetch(`/api/battles/${battleId}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || d.details || "Battle not found.");
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        return d as BattleData;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Battle not found.");
        return null;
      })
      .finally(() => setLoading(false));
  }, [battleId, initialLineId]);

  const fetchMoreLines = useCallback(() => {
    if (!data || loadingMore || !hasMore) {
      return Promise.resolve(null);
    }

    if (loadingMorePromiseRef.current) {
      return loadingMorePromiseRef.current;
    }

    setLoadingMore(true);

    const currentOffset = data.lines_pagination?.offset ?? 0;
    const currentPageLoaded = data.lines_pagination?.loaded ?? PAGE_SIZE;
    const nextOffset = currentOffset + currentPageLoaded;

    const request = fetch(
      `/api/battles/${battleId}?limit=${PAGE_SIZE}&offset=${nextOffset}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || d.details || "Failed to load more lines.");
        }
        return res.json();
      })
      .then((d: BattleData) => {
        setData((prev) => {
          if (!prev) {
            return d;
          }

          const mergedLines = [
            ...prev.lines,
            ...d.lines.filter(
              (line) => !prev.lines.some((existing) => existing.id === line.id),
            ),
          ];

          const baseOffset =
            prev.lines_pagination?.offset ?? d.lines_pagination?.offset ?? 0;
          const total =
            d.lines_pagination?.total ??
            prev.lines_pagination?.total ??
            mergedLines.length;
          const nextPagination = d.lines_pagination
            ? {
                ...d.lines_pagination,
                offset: baseOffset,
                loaded: mergedLines.length,
                total,
                has_previous: baseOffset > 0,
                has_more: baseOffset + mergedLines.length < total,
              }
            : prev.lines_pagination;

          return {
            ...prev,
            lines: mergedLines,
            lines_pagination: nextPagination,
          };
        });
        return d;
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load more lines.",
        );
        return null;
      })
      .finally(() => {
        setLoadingMore(false);
        loadingMorePromiseRef.current = null;
      });
    loadingMorePromiseRef.current = request;
    return request;
  }, [battleId, data, hasMore, loadingMore]);

  const fetchPreviousLines = useCallback(() => {
    if (!data || loadingPrevious || !hasPrevious) {
      return Promise.resolve(null);
    }

    if (loadingPreviousPromiseRef.current) {
      return loadingPreviousPromiseRef.current;
    }

    const currentOffset = data.lines_pagination?.offset ?? 0;
    if (currentOffset <= 0) {
      return Promise.resolve(null);
    }

    setLoadingPrevious(true);

    const previousOffset = Math.max(0, currentOffset - PAGE_SIZE);
    const previousLimit = currentOffset - previousOffset;

    const request = fetch(
      `/api/battles/${battleId}?limit=${previousLimit}&offset=${previousOffset}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(
            d.error || d.details || "Failed to load earlier lines.",
          );
        }
        return res.json();
      })
      .then((d: BattleData) => {
        setData((prev) => {
          if (!prev) {
            return d;
          }

          const mergedLines = [
            ...d.lines.filter(
              (line) => !prev.lines.some((existing) => existing.id === line.id),
            ),
            ...prev.lines,
          ];
          const nextOffset =
            d.lines_pagination?.offset ?? prev.lines_pagination?.offset ?? 0;
          const total =
            d.lines_pagination?.total ??
            prev.lines_pagination?.total ??
            mergedLines.length;
          const nextPagination = d.lines_pagination
            ? {
                ...d.lines_pagination,
                offset: nextOffset,
                loaded: mergedLines.length,
                total,
                has_previous: nextOffset > 0,
                has_more: nextOffset + mergedLines.length < total,
              }
            : prev.lines_pagination;

          return {
            ...prev,
            lines: mergedLines,
            lines_pagination: nextPagination,
          };
        });
        return d;
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load earlier lines.",
        );
        return null;
      })
      .finally(() => {
        setLoadingPrevious(false);
        loadingPreviousPromiseRef.current = null;
      });
    loadingPreviousPromiseRef.current = request;
    return request;
  }, [battleId, data, hasPrevious, loadingPrevious]);

  return {
    data,
    setData,
    loading,
    loadingMore,
    loadingPrevious,
    hasMore,
    hasPrevious,
    error,
    fetchBattle,
    fetchMoreLines,
    fetchPreviousLines,
  };
}
