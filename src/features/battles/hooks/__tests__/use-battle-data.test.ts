import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { useBattleData, type BattleData } from "../use-battle-data";

function makeBattleData(
  ids: number[],
  pagination: BattleData["lines_pagination"],
): BattleData {
  return {
    battle: {
      id: "battle-1",
      league: "fliptop",
      slug: "test-battle",
      title: "Test Battle",
      youtube_id: "yt1",
      event_name: "Event",
      event_date: "2025-01-01",
      url: "https://example.com/battles/1",
      status: "reviewed",
    },
    participants: [],
    lines: ids.map((id) => ({
      id,
      content: `Line ${id}`,
      start_time: id,
      end_time: id + 0.5,
      round_number: 1,
      speaker_label: "MC",
      emcee: null,
      emcees: [],
    })),
    lines_pagination: pagination,
  };
}

describe("useBattleData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("includes the deep-linked line id in the initial fetch", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () =>
        makeBattleData([201, 202], {
          limit: 200,
          offset: 200,
          has_more: true,
          has_previous: true,
          loaded: 2,
          total: 500,
        }),
    });

    const { result } = renderHook(() => useBattleData("battle-1", 202));

    await act(async () => {
      await result.current.fetchBattle();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/battles/battle-1?limit=200&offset=0&lineId=202",
    );
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasMore).toBe(true);
  });

  it("prepends earlier lines and keeps later pagination aligned", async () => {
    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeBattleData([3, 4], {
            limit: 200,
            offset: 2,
            has_more: true,
            has_previous: true,
            loaded: 2,
            total: 6,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeBattleData([1, 2], {
            limit: 2,
            offset: 0,
            has_more: true,
            has_previous: false,
            loaded: 2,
            total: 6,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeBattleData([5, 6], {
            limit: 200,
            offset: 4,
            has_more: false,
            has_previous: true,
            loaded: 2,
            total: 6,
          }),
      });

    const { result } = renderHook(() => useBattleData("battle-1", 4));

    await act(async () => {
      await result.current.fetchBattle();
    });

    await act(async () => {
      await result.current.fetchPreviousLines();
    });

    await waitFor(() => {
      expect(result.current.data?.lines.map((line) => line.id)).toEqual([
        1, 2, 3, 4,
      ]);
    });

    expect(result.current.data?.lines_pagination).toMatchObject({
      offset: 0,
      loaded: 4,
      has_previous: false,
      has_more: true,
      total: 6,
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
      expect(result.current.hasPrevious).toBe(false);
    });

    await act(async () => {
      await result.current.fetchMoreLines();
    });

    await waitFor(() => {
      expect(result.current.data?.lines.map((line) => line.id)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "/api/battles/battle-1?limit=200&offset=4",
    );
    expect(result.current.data?.lines_pagination).toMatchObject({
      offset: 0,
      loaded: 6,
      has_previous: false,
      has_more: false,
      total: 6,
    });
  });

  it("dedupes overlapping previous-page fetches", async () => {
    let resolvePrevious:
      | ((value: {
          ok: boolean;
          json: () => Promise<BattleData>;
        }) => void)
      | null = null;

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeBattleData([3, 4], {
            limit: 200,
            offset: 2,
            has_more: true,
            has_previous: true,
            loaded: 2,
            total: 6,
          }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePrevious = resolve;
          }),
      );

    const { result } = renderHook(() => useBattleData("battle-1", 4));

    await act(async () => {
      await result.current.fetchBattle();
    });

    let firstPromise: Promise<BattleData | null> | null = null;
    let secondPromise: Promise<BattleData | null> | null = null;

    act(() => {
      firstPromise = result.current.fetchPreviousLines();
      secondPromise = result.current.fetchPreviousLines();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(firstPromise).toBe(secondPromise);

    await act(async () => {
      resolvePrevious?.({
        ok: true,
        json: async () =>
          makeBattleData([1, 2], {
            limit: 2,
            offset: 0,
            has_more: true,
            has_previous: false,
            loaded: 2,
            total: 6,
          }),
      });

      await firstPromise;
    });

    expect(result.current.data?.lines.map((line) => line.id)).toEqual([
      1, 2, 3, 4,
    ]);
  });
});
