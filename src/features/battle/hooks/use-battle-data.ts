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
  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBattle = useCallback(() => {
    return fetch(`/api/battles/${battleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((d) => {
        setData(d);
        return d as BattleData;
      })
      .catch(() => {
        setError("Battle not found.");
        return null;
      })
      .finally(() => setLoading(false));
  }, [battleId]);

  return { data, setData, loading, error, fetchBattle };
}
