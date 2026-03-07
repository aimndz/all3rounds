import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockFrom = vi.fn().mockReturnValue(mockChain);
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: mockFrom,
  };
  return {
    createClient: vi.fn().mockResolvedValue(client),
    createAdminClient: vi.fn().mockReturnValue(client),
    __mocks: { client, mockFrom, mockChain },
  };
});

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    limit: 100,
    reset: Date.now() + 3600000,
  }),
  getRateLimitHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(),
}));

import { POST, PATCH } from "@/app/api/lines/route";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

const mockRequirePermission = vi.mocked(requirePermission);

function makeRequest(
  body: Record<string, unknown>,
  method = "POST",
): NextRequest {
  return new NextRequest("http://localhost/api/lines", {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "test@test.com",
        role: "admin",
        displayName: "Admin",
      },
      role: "admin",
      error: null,
    });
  });

  it("returns 403 when CSRF check fails (no origin)", async () => {
    const req = new NextRequest("http://localhost/api/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "You must be logged in.", status: 401 },
    });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({ content: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing battle_id", async () => {
    const res = await POST(
      makeRequest({
        content: "Test line",
        start_time: 0,
        end_time: 5,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates line with valid data", async () => {
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockChain = (adminClient as unknown as { from: () => any }).from();
    mockChain.single.mockResolvedValueOnce({
      data: { id: 1, content: "Test line" },
      error: null,
    });

    const res = await POST(
      makeRequest({
        battle_id: "550e8400-e29b-41d4-a716-446655440000",
        content: "Test line",
        start_time: 0,
        end_time: 5,
      }),
    );

    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("PATCH /api/lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "test@test.com",
        role: "admin",
        displayName: "Admin",
      },
      role: "admin",
      error: null,
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const req = new NextRequest("http://localhost/api/lines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid field name", async () => {
    const res = await PATCH(
      makeRequest(
        { lineId: 1, field: "invalid_field", value: "test" },
        "PATCH",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty content", async () => {
    const res = await PATCH(
      makeRequest({ lineId: 1, field: "content", value: "" }, "PATCH"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for content over 5000 chars", async () => {
    const res = await PATCH(
      makeRequest(
        { lineId: 1, field: "content", value: "x".repeat(5001) },
        "PATCH",
      ),
    );
    expect(res.status).toBe(400);
  });
});
