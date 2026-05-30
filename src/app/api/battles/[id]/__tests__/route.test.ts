import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db/d1-client", () => {
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
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
  getUserWithRole: vi.fn().mockResolvedValue({ user: null, role: "viewer" }),
  hasPermission: vi.fn(
    (role: string, action: string) =>
      action === "battles:manage" && ["superadmin", "admin"].includes(role),
  ),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getUserWithRole, requirePermission } from "@/lib/auth";

const mockGetUserWithRole = vi.mocked(getUserWithRole);
const mockRequirePermission = vi.mocked(requirePermission);

describe("GET /api/battles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWithRole.mockResolvedValue({ user: null, role: "viewer" });
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
    const { __mocks } = (await import("@/db/d1-client")) as unknown as {
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
    expect(__mocks.mockChain.eq).toHaveBeenCalledWith("public_visible", true);
  });

  it("allows admins to fetch hidden battles", async () => {
    mockGetUserWithRole.mockResolvedValueOnce({
      user: {
        id: "u1",
        email: "admin@test.com",
        role: "admin",
        displayName: "Admin",
        username: "admin",
        rep: 0,
      },
      role: "admin",
    });
    const { __mocks } = (await import("@/db/d1-client")) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __mocks: { mockChain: any };
    };
    __mocks.mockChain.single
      .mockResolvedValueOnce({
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Hidden Test",
          youtube_id: "yt1",
          event_name: "Event",
          event_date: "2025-01-01",
          url: "https://example.com",
          status: "raw",
          public_visible: false,
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
    expect(__mocks.mockChain.eq).not.toHaveBeenCalledWith(
      "public_visible",
      true,
    );
  });

  it("marks deep-linked transcript pages as having previous lines", async () => {
    const { __mocks } = (await import("@/db/d1-client")) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __mocks: { mockChain: any };
    };

    __mocks.mockChain.maybeSingle.mockResolvedValueOnce({
      data: { id: 401, start_time: 401 },
      error: null,
    });
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
      count: 450,
    });
    __mocks.mockChain.lt.mockResolvedValueOnce({
      count: 250,
      error: null,
    });

    const { GET } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest(
      "http://localhost/api/battles/550e8400-e29b-41d4-a716-446655440000?lineId=401",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.lines_pagination).toMatchObject({
      offset: 200,
      has_previous: true,
      total: 450,
    });
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
        username: "admin",
        rep: 0,
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
        username: "admin",
        rep: 0,
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

  it("rejects delete when title confirmation does not match", async () => {
    const { __mocks } = (await import("@/db/d1-client")) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __mocks: { mockChain: any };
    };
    __mocks.mockChain.single.mockReset();
    __mocks.mockChain.single.mockResolvedValueOnce({
      data: {
        id: "b1",
        league: "fliptop",
        slug: "test-battle",
        title: "Correct Battle Title",
        youtube_id: "yt1",
      },
      error: null,
    });

    const { DELETE } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ title: "Wrong Battle Title" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) });

    expect(res.status).toBe(400);
    expect(__mocks.mockChain.delete).not.toHaveBeenCalled();
  });

  it("deletes only the requested battle after exact title confirmation", async () => {
    const { __mocks } = (await import("@/db/d1-client")) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __mocks: { mockChain: any };
    };
    __mocks.mockChain.single.mockReset();
    __mocks.mockChain.single.mockResolvedValueOnce({
      data: {
        id: "b1",
        league: "fliptop",
        slug: "test-battle",
        title: "Correct Battle Title",
        youtube_id: "yt1",
      },
      error: null,
    });

    const { DELETE } = await import("@/app/api/battles/[id]/route");
    const req = new NextRequest("http://localhost/api/battles/b1", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        host: "localhost",
      },
      body: JSON.stringify({ title: "Correct Battle Title" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) });

    expect(res.status).toBe(200);
    expect(__mocks.mockChain.eq).toHaveBeenCalledWith("id", "b1");
    expect(__mocks.mockChain.eq).toHaveBeenCalledWith("battle_id", "b1");
    expect(__mocks.mockChain.eq).toHaveBeenCalledWith("youtube_id", "yt1");
  });
});
