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

import { PATCH } from "@/app/api/lines/batch/route";
import { requirePermission, hasPermission } from "@/lib/auth";

const mockRequirePermission = vi.mocked(requirePermission);
const mockHasPermission = vi.mocked(hasPermission);

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/lines/batch", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/lines/batch", () => {
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
    mockHasPermission.mockReturnValue(true);
  });

  it("returns 403 when CSRF check fails", async () => {
    const req = new NextRequest("http://localhost/api/lines/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 401/403 when not authorized", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "You must be logged in.", status: 401 },
    });
    const res = await PATCH(
      makeRequest({ lineIds: [1], action: "set_round", value: 1 }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty lineIds", async () => {
    const res = await PATCH(makeRequest({ lineIds: [], action: "set_round" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for too many lineIds (>200)", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const res = await PATCH(makeRequest({ lineIds: ids, action: "set_round" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const res = await PATCH(makeRequest({ lineIds: [1], action: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when non-superadmin tries to delete", async () => {
    mockHasPermission.mockReturnValueOnce(false);
    const res = await PATCH(makeRequest({ lineIds: [1], action: "delete" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/superadmin/i);
  });
});
