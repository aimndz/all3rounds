import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
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
  getUserWithRole: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(),
  invalidateCachePattern: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";

const mockRequirePermission = vi.mocked(requirePermission);

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/suggestions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      user: {
        id: "u1",
        email: "user@test.com",
        role: "viewer",
        displayName: "User",
      },
      role: "viewer",
      error: null,
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    const req = new NextRequest("http://localhost/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "You must be logged in.", status: 401 },
    });
    const res = await POST(
      makePostRequest({ line_id: 1, suggested_content: "fix" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid suggestion body", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    const res = await POST(makePostRequest({ line_id: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty suggested_content", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    const res = await POST(
      makePostRequest({ line_id: 1, suggested_content: "" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for suggested_content over 5000 chars", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    const res = await POST(
      makePostRequest({ line_id: 1, suggested_content: "x".repeat(5001) }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401/403 when not authorized to review", async () => {
    mockRequirePermission.mockResolvedValueOnce({
      user: null,
      role: "viewer",
      error: { message: "Insufficient permissions.", status: 403 },
    });
    const { GET } = await import("@/app/api/suggestions/route");
    const req = new NextRequest("http://localhost/api/suggestions");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
