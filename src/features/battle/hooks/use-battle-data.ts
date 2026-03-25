"use client";

import { useState, useCallback } from "react";

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

export function useBattleData(battleId: string) {
  const PAGE_SIZE = 200;
  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const fetchBattle = useCallback(() => {
    return fetch(`/api/battles/${battleId}?limit=${PAGE_SIZE}&offset=0`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || d.details || "Battle not found.");
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setHasMore(Boolean(d.lines_pagination?.has_more));
        return d as BattleData;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Battle not found.");
        return null;
      })
      .finally(() => setLoading(false));
  }, [battleId]);

  const fetchMoreLines = useCallback(() => {
    if (!data || loadingMore || !hasMore) {
      return Promise.resolve(null);
    }

    setLoadingMore(true);

    return fetch(
      `/api/battles/${battleId}?limit=${PAGE_SIZE}&offset=${data.lines.length}`,
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

          return {
            ...prev,
            lines: [...prev.lines, ...d.lines],
            lines_pagination: d.lines_pagination,
          };
        });

        setHasMore(Boolean(d.lines_pagination?.has_more));
        return d;
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load more lines.",
        );
        return null;
      })
      .finally(() => setLoadingMore(false));
  }, [battleId, data, hasMore, loadingMore]);

  return {
    data,
    setData,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchBattle,
    fetchMoreLines,
  };
}
