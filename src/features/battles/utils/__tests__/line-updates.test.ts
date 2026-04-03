import { describe, expect, it } from "vitest";
import {
  applyLineUpdatesToBattleData,
  removeLinesFromBattleData,
} from "../line-updates";
import type { BattleData } from "@/features/battles/hooks/use-battle-data";

function createBattleData(): BattleData {
  return {
    battle: {
      id: "battle-1",
      title: "A vs B",
      youtube_id: "abc123",
      event_name: null,
      event_date: null,
      url: "https://youtube.com/watch?v=abc123",
      status: "reviewing",
    },
    participants: [
      { label: "SPEAKER_00", emcee: { id: "e1", name: "Loonie" } },
      { label: "SPEAKER_01", emcee: { id: "e2", name: "Abra" } },
      { label: "SPEAKER_00", emcee: { id: "e3", name: "Plazma" } },
    ],
    lines: [
      {
        id: 1,
        content: "Original",
        start_time: 1,
        end_time: 2,
        round_number: 1,
        speaker_label: "SPEAKER_00",
        emcee: { id: "e1", name: "Loonie" },
        emcees: [{ id: "e1", name: "Loonie" }],
      },
      {
        id: 2,
        content: "Second",
        start_time: 3,
        end_time: 4,
        round_number: 1,
        speaker_label: "SPEAKER_01",
        emcee: { id: "e2", name: "Abra" },
        emcees: [{ id: "e2", name: "Abra" }],
      },
    ],
    lines_pagination: {
      limit: 200,
      offset: 0,
      has_more: true,
      loaded: 2,
      total: 250,
    },
  };
}

describe("applyLineUpdatesToBattleData", () => {
  it("updates content and round for loaded lines only", () => {
    const battleData = createBattleData();

    const next = applyLineUpdatesToBattleData(battleData, [2], {
      content: "Updated",
      round_number: 3,
    });

    expect(next?.lines[0]).toEqual(battleData.lines[0]);
    expect(next?.lines[1].content).toBe("Updated");
    expect(next?.lines[1].round_number).toBe(3);
  });

  it("maps multi-speaker updates from loaded participants", () => {
    const battleData = createBattleData();

    const next = applyLineUpdatesToBattleData(battleData, [1], {
      speaker_ids: ["e1", "e3"],
      emcee_id: "e1",
    });

    expect(next?.lines[0].emcee).toEqual({ id: "e1", name: "Loonie" });
    expect(next?.lines[0].emcees).toEqual([
      { id: "e1", name: "Loonie" },
      { id: "e3", name: "Plazma" },
    ]);
  });

  it("clears speaker assignments when requested", () => {
    const battleData = createBattleData();

    const next = applyLineUpdatesToBattleData(battleData, [1], {
      speaker_ids: [],
      emcee_id: null,
    });

    expect(next?.lines[0].emcee).toBeNull();
    expect(next?.lines[0].emcees).toEqual([]);
  });

  it("returns the original object when no targeted line is loaded", () => {
    const battleData = createBattleData();

    const next = applyLineUpdatesToBattleData(battleData, [999], {
      round_number: 2,
    });

    expect(next).toBe(battleData);
  });
});

describe("removeLinesFromBattleData", () => {
  it("removes loaded lines and updates pagination counts", () => {
    const battleData = createBattleData();

    const next = removeLinesFromBattleData(battleData, [2]);

    expect(next?.lines.map((line) => line.id)).toEqual([1]);
    expect(next?.lines_pagination).toEqual({
      limit: 200,
      offset: 0,
      has_more: true,
      loaded: 1,
      total: 249,
    });
  });

  it("returns the original object when nothing is removed", () => {
    const battleData = createBattleData();

    const next = removeLinesFromBattleData(battleData, [999]);

    expect(next).toBe(battleData);
  });
});
