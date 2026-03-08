import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { useEmceesData } from "../use-emcees-data";
import { Emcee } from "../../types";

const mockInitialEmcees: Emcee[] = [
  { id: "1", name: "Anygma", aka: [], battle_count: 5 },
];

describe("useEmceesData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Mock IntersectionObserver
    vi.stubGlobal("IntersectionObserver", vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })));
  });

  it("initializes with provided data", () => {
    const { result } = renderHook(() => useEmceesData(mockInitialEmcees, 1));
    
    expect(result.current.emcees).toEqual(mockInitialEmcees);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.hasMore).toBe(false);
  });

  it("updates search query and triggers fetch", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        emcees: [{ id: "2", name: "Loonie", aka: [], battle_count: 50 }],
        totalCount: 1,
        hasMore: false,
      }),
    });

    const { result } = renderHook(() => useEmceesData(mockInitialEmcees, 1));
    
    act(() => {
      result.current.setSearch("Loonie");
    });

    expect(result.current.search).toBe("Loonie");

    await waitFor(() => {
      expect(result.current.emcees[0].name).toBe("Loonie");
    }, { timeout: 1000 });
  });

  it("updates sorting and triggers fetch", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        emcees: [{ id: "3", name: "Abra", aka: [], battle_count: 30 }],
        totalCount: 1,
        hasMore: false,
      }),
    });

    const { result } = renderHook(() => useEmceesData(mockInitialEmcees, 1));
    
    act(() => {
      result.current.setSort("name_desc");
    });

    await waitFor(() => {
      expect(result.current.emcees[0].name).toBe("Abra");
    });
  });
});
