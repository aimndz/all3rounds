import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => {
  const mockSelectChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn(),
  };

  const client = {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue(mockSelectChain),
  };

  return {
    createPublicClient: vi.fn().mockReturnValue(client),
    __mocks: { client, mockSelectChain },
  };
});

import { GET } from "@/app/api/lines/random/route";

describe("GET /api/lines/random", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when no eligible random lines are available", async () => {
    const { __mocks } = (await import("@/lib/supabase/server")) as unknown as {
      __mocks: {
        client: { rpc: ReturnType<typeof vi.fn> };
      };
    };

    __mocks.client.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const res = await GET(new NextRequest("http://localhost/api/lines/random"));

    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({
      error: "No eligible random lines available",
    });
  });

  it("returns batched random lines in the order provided by the RPC", async () => {
    const { __mocks } = (await import("@/lib/supabase/server")) as unknown as {
      __mocks: {
        client: {
          rpc: ReturnType<typeof vi.fn>;
          from: ReturnType<typeof vi.fn>;
        };
        mockSelectChain: {
          select: ReturnType<typeof vi.fn>;
          in: ReturnType<typeof vi.fn>;
        };
      };
    };

    __mocks.client.rpc.mockResolvedValueOnce({
      data: [{ id: 5 }, { id: 9 }],
      error: null,
    });
    __mocks.mockSelectChain.in.mockResolvedValueOnce({
      data: [
        {
          id: 9,
          content: "Second line",
          start_time: 9,
          end_time: 10,
          round_number: 2,
          speaker_label: "SPEAKER_02",
          emcee: { id: "e2", name: "Emcee 2" },
          battle: {
            id: "b2",
            title: "Battle 2",
            youtube_id: "yt2",
            event_name: "Event 2",
            event_date: "2025-01-02",
            url: "https://www.youtube.com/watch?v=yt2",
            status: "reviewing",
            battle_participants: [],
          },
        },
        {
          id: 5,
          content: "First line",
          start_time: 1,
          end_time: 2,
          round_number: 1,
          speaker_label: "SPEAKER_01",
          emcee: { id: "e1", name: "Emcee 1" },
          battle: {
            id: "b1",
            title: "Battle 1",
            youtube_id: "yt1",
            event_name: "Event 1",
            event_date: "2025-01-01",
            url: "https://www.youtube.com/watch?v=yt1",
            status: "reviewing",
            battle_participants: [],
          },
        },
      ],
      error: null,
    });

    const res = await GET(
      new NextRequest("http://localhost/api/lines/random?limit=2"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=5");

    const body = await res.json();
    expect(body.line.id).toBe(5);
    expect(body.lines.map((line: { id: number }) => line.id)).toEqual([5, 9]);
    expect(__mocks.client.rpc).toHaveBeenCalledWith("get_random_valid_line_ids", {
      sample_size: 2,
      allowed_statuses: ["reviewing"],
    });
  });
});
