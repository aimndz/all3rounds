/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock Dependencies ──
vi.mock("@/lib/supabase/server", () => {
  const mockChain: any = {
    range: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    // Important: supabase-js methods return a promise-like object
    then: vi.fn((onFulfilled: (res: any) => any) => Promise.resolve({ data: [], error: null }).then(onFulfilled)),
  };
  
  const mockRpc = vi.fn().mockReturnValue(mockChain);
  const mockFrom = vi.fn().mockReturnValue(mockChain);
  
  const client = {
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };

  return {
    createClient: vi.fn().mockResolvedValue(client),
    createAdminClient: vi.fn().mockReturnValue(client),
    __mocks: { client, mockRpc, mockFrom, mockChain },
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    reset: Date.now() + 60000,
  }),
  getRateLimitHeaders: vi.fn().mockReturnValue({
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": "9",
    "X-RateLimit-Reset": "123456789",
  }),
}));

vi.mock("@/lib/cache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
}));

// Import the GET handler AFTER mocking
import { GET } from "@/app/api/search/route";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/search (Cloudflare Migration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for empty or very short queries", async () => {
    const res = await GET(makeRequest({ q: " " }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Search query must be between 2 and 200");
  });

  it("returns 400 when page exceeds maxPage (50)", async () => {
    const res = await GET(makeRequest({ q: "loonie", page: "51" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Page number too large");
  });

  it("returns success with formatted results from Supabase RPC", async () => {
    const { __mocks } = await import("@/lib/supabase/server") as unknown as { __mocks: any };
    
    // Mock the RPC result structure
    const mockRpcData = [
      {
        id: 1,
        content: "Mocked line content",
        battle_id: "b1",
        battle_title: "Mock Battle",
        battle_youtube_id: "y1",
        battle_status: "reviewed",
        rank: 0.99
      }
    ];

    __mocks.mockChain.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({
        data: mockRpcData,
        error: null,
        count: 1
      }).then(onFulfilled)
    );

    // Mock the secondary fetches (emcees, participants, context) to return empty
    // Subsequent calls to .then should return empty data
    __mocks.mockChain.then.mockImplementation((onFulfilled: any) => 
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    );

    const res = await GET(makeRequest({ q: "mock term" }));
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].content).toBe("Mocked line content");
    expect(body.total).toBe(1);
  });

  it("handles RPC errors gracefully (returns 500)", async () => {
    const { __mocks } = await import("@/lib/supabase/server") as unknown as { __mocks: any };
    
    __mocks.mockChain.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({
        data: null,
        error: { message: "Database Error", code: "P0001" },
        count: 0
      }).then(onFulfilled)
    );

    const res = await GET(makeRequest({ q: "trigger error" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Search failed. Please try again.");
  });
});
