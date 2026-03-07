import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockFrom = vi.fn().mockReturnValue(mockChain);
  const client = { from: mockFrom };
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
  invalidateCache: vi.fn(),
  invalidateCachePattern: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";

const mockRequirePermission = vi.mocked(requirePermission);

function authedAdmin() {
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
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when not authorized", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { GET } = await import("@/app/api/admin/users/route");
    const req = new NextRequest("http://localhost/api/admin/users");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when CSRF check fails", async () => {
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/users/u1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "moderator" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/users/u1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ role: "nonexistent_role" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/emcees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when not authorized", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { GET } = await import("@/app/api/admin/emcees/route");
    const req = new NextRequest("http://localhost/api/admin/emcees");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/emcees/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when CSRF check fails", async () => {
    const { PATCH } = await import("@/app/api/admin/emcees/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/emcees/e1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/admin/emcees/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/emcees/e1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/emcees/merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when CSRF check fails", async () => {
    const { POST } = await import("@/app/api/admin/emcees/merge/route");
    const req = new NextRequest("http://localhost/api/admin/emcees/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        targetId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when sourceId equals targetId", async () => {
    const { POST } = await import("@/app/api/admin/emcees/merge/route");
    const sameId = "550e8400-e29b-41d4-a716-446655440000";
    const req = new NextRequest("http://localhost/api/admin/emcees/merge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ sourceId: sameId, targetId: sameId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAdmin();
  });

  it("returns 403 when not authorized", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { GET } = await import("@/app/api/admin/stats/route");
    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
