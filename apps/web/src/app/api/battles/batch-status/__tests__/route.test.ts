import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/battles/batch-status", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/battles/batch-status", () => {
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
    const { PATCH } = await import("@/app/api/battles/batch-status/route");
    const req = new NextRequest("http://localhost/api/battles/batch-status", {
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
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { PATCH } = await import("@/app/api/battles/batch-status/route");
    const res = await PATCH(makeRequest({ battleIds: ["id1"], status: "raw" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty battleIds", async () => {
    const { PATCH } = await import("@/app/api/battles/batch-status/route");
    const res = await PATCH(makeRequest({ battleIds: [], status: "raw" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/battles/batch-status/route");
    const res = await PATCH(
      makeRequest({
        battleIds: ["550e8400-e29b-41d4-a716-446655440000"],
        status: "invalid",
      }),
    );
    expect(res.status).toBe(400);
  });
});
