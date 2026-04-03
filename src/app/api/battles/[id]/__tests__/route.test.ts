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
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    limit: 100,
    reset: Date.now() + 60000,
  }),
  getRateLimitHeaders: vi.fn().mockReturnValue({}),
}));

import { requirePermission } from "@/lib/auth";

const mockRequirePermission = vi.mocked(requirePermission);

describe("GET /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when battle is not found", async () => {
    const { GET } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest(
      "http://localhost/api/battles/550e8400-e29b-41d4-a716-446655440099",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440099" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns battle data with public cache headers", async () => {
    const { __mocks } = await import("@/lib/supabase/server") as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __mocks: { mockChain: any };
    };
    __mocks.mockChain.single
      .mockResolvedValueOnce({
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Test",
          youtube_id: "yt1",
          event_name: "Event",
          event_date: "2025-01-01",
          url: "https://example.com",
          status: "reviewed",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    __mocks.mockChain.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });

    const { GET } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest(
      "http://localhost/api/battles/550e8400-e29b-41d4-a716-446655440000",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });
});

describe("PATCH /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "admin@test.com",
        role: "admin",
        displayName: "Admin",
      },
      role: "admin",
      error: null,
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const { PATCH } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "arranged" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "You must be logged in.", status: 401 },
    });
    const { PATCH } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ status: "arranged" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status value", async () => {
    const { PATCH } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ status: "invalid_status" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "admin@test.com",
        role: "superadmin",
        displayName: "Admin",
      },
      role: "superadmin",
      error: null,
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const { DELETE } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authorized", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { DELETE } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(403);
  });
});
