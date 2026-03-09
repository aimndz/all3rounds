import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const mockRange = vi
  .fn()
  .mockResolvedValue({ data: [], error: null, count: 0 });
const mockRpc = vi.fn().mockReturnValue({ range: mockRange });
const mockIn = vi.fn().mockResolvedValue({ data: [] });

vi.mock("@/lib/supabase/server", () => {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  };
  return {
    createClient: vi.fn().mockResolvedValue(client),
    createAdminClient: vi.fn().mockReturnValue(client),
  };
});

// Make mockFrom return chainable select -> eq/in
mockFrom.mockImplementation(() => ({
  select: mockSelect,
}));
mockSelect.mockImplementation(() => ({
  eq: mockEq,
  in: mockIn,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 29,
    limit: 30,
    reset: Date.now() + 60000,
  }),
  getRateLimitHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/cache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/search/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCached } from "@/lib/cache";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock behavior
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
    mockRpc.mockReturnValue({ range: mockRange });
    mockFrom.mockImplementation(() => ({
      select: mockSelect,
    }));
    mockSelect.mockImplementation(() => ({
      eq: mockEq,
      in: mockIn,
    }));
  });

  it("returns 400 if query is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/between 2 and 200/);
  });

  it("returns 400 if query is too short", async () => {
    const res = await GET(makeRequest({ q: "a" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 if query is too long", async () => {
    const res = await GET(makeRequest({ q: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 if page exceeds max (50)", async () => {
    const res = await GET(makeRequest({ q: "test query", page: "51" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Page number too large/);
  });

  it("returns cached data if available", async () => {
    const cached = { results: [], total: 0, page: 1, totalPages: 0 };
    vi.mocked(getCached).mockResolvedValueOnce(cached);

    const res = await GET(makeRequest({ q: "test query" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(cached);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 30,
      reset: Date.now() + 60000,
    });

    const res = await GET(makeRequest({ q: "test query" }));
    expect(res.status).toBe(429);
  });

  it("returns search results with correct structure", async () => {
    // The mocked supabase returns empty data, so we get an empty result set
    const res = await GET(makeRequest({ q: "test query" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("results");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("totalPages");
  });

  it("defaults page to 1 for invalid page param", async () => {
    const res = await GET(makeRequest({ q: "test query", page: "abc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  describe("retry on timeout", () => {
    it("retries once on statement timeout (57014) and returns results on success", async () => {
      // First call: timeout error, second call: success
      mockRange
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "57014",
            message: "canceling statement due to statement timeout",
          },
          count: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
          count: 0,
        });

      const res = await GET(makeRequest({ q: "pebrero" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("results");
      // RPC should have been called twice (original + 1 retry)
      expect(mockRange).toHaveBeenCalledTimes(2);
    });

    it("returns 500 after exhausting retries on persistent timeout", async () => {
      const timeoutError = {
        code: "57014",
        message: "canceling statement due to statement timeout",
      };

      // Both calls timeout
      mockRange
        .mockResolvedValueOnce({ data: null, error: timeoutError, count: null })
        .mockResolvedValueOnce({
          data: null,
          error: timeoutError,
          count: null,
        });

      const res = await GET(makeRequest({ q: "pebrero" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Search failed. Please try again.");
      // Should have attempted exactly 2 times (original + 1 retry)
      expect(mockRange).toHaveBeenCalledTimes(2);
    });

    it("returns 500 immediately on non-timeout RPC errors without retrying", async () => {
      // Non-timeout error (e.g. permission denied)
      mockRange.mockResolvedValueOnce({
        data: null,
        error: { code: "42501", message: "permission denied" },
        count: null,
      });

      const res = await GET(makeRequest({ q: "test query" }));
      expect(res.status).toBe(500);
      // Should have been called only once — no retry on non-timeout errors
      expect(mockRange).toHaveBeenCalledTimes(1);
    });
  });
});
