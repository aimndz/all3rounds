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

vi.mock("@/lib/cache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn(),
  invalidateCache: vi.fn(),
  invalidateCachePattern: vi.fn(),
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
import { getCached } from "@/lib/cache";

const mockRequirePermission = vi.mocked(requirePermission);

describe("GET /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when battle is not found", async () => {
    const { GET } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/some-id");
    const res = await GET(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns cached battle data if available", async () => {
    const cached = {
      battle: { id: "b1", title: "Test" },
      lines: [],
      participants: [],
    };
    vi.mocked(getCached).mockResolvedValueOnce(cached);

    const { GET } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1");
    const res = await GET(req, { params: Promise.resolve({ id: "b1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(cached);
  });
});

describe("PATCH /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "mod@test.com",
        role: "moderator",
        displayName: "Mod",
      },
      role: "moderator",
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
