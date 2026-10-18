import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { useBattlesData, type Battle } from "../use-battles-data";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => window.location.pathname,
}));

const initialBattles: Battle[] = [
  {
    id: "fliptop-1",
    league: "fliptop",
    slug: "fliptop-1",
    title: "FlipTop Battle",
    youtube_id: "fliptop-video",
    event_name: "FlipTop Event",
    event_date: "2025-01-01",
    url: "https://youtube.com/watch?v=fliptop-video",
    status: "reviewed",
  },
];

function getFetchSearchParams(callIndex = 0): URLSearchParams {
  const [input] = (global.fetch as Mock).mock.calls[callIndex] as [string];
  return new URL(input, "http://localhost").searchParams;
}

describe("useBattlesData League scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/leagues/fliptop");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ battles: [], count: 0, totalEvents: 0 }),
    });
  });

  it("keeps filter and clear interactions scoped to the path League", async () => {
    const { result, rerender } = renderHook(() =>
      useBattlesData(initialBattles, 1, 1, [], { leagueScope: "fliptop" }),
    );

    act(() => {
      result.current.updateSearch({
        q: "final",
        status: "reviewed",
        year: "2024",
        sort: "oldest",
        page: "2",
      });
      rerender();
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const filteredParams = getFetchSearchParams();
    expect(filteredParams.get("league")).toBe("fliptop");
    expect(filteredParams.get("q")).toBe("final");
    expect(filteredParams.get("status")).toBe("reviewed");
    expect(filteredParams.get("year")).toBe("2024");
    expect(filteredParams.get("sort")).toBe("oldest");
    expect(filteredParams.get("page")).toBe("2");

    act(() => {
      result.current.clearFilters();
      rerender();
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const clearedParams = getFetchSearchParams(1);
    expect(clearedParams.get("league")).toBe("fliptop");
    expect(clearedParams.has("q")).toBe(false);
    expect(clearedParams.has("status")).toBe(false);
    expect(clearedParams.has("year")).toBe(false);
    expect(clearedParams.has("sort")).toBe(false);
    expect(clearedParams.get("page")).toBe("1");
  });
});
