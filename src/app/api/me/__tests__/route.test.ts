import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getUserWithRole: vi.fn(),
}));

const mockFrom = vi.fn(() => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
  };
  return chain;
});

vi.mock("@/db/d1-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { getUserWithRole } from "@/lib/auth";
import { GET } from "@/app/api/me/route";

const mockGetUserWithRole = vi.mocked(getUserWithRole);

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null user when not authenticated", async () => {
    mockGetUserWithRole.mockResolvedValueOnce({
      user: null,
      role: "viewer",
    });
    const res = await GET();
    const body = await res.json();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Vary")).toContain("Cookie");
    expect(body.user).toBeNull();
    expect(body.role).toBe("viewer");
  });

  it("returns user data when authenticated", async () => {
    mockGetUserWithRole.mockResolvedValueOnce({
      user: {
        id: "u1",
        email: "admin@test.com",
        role: "admin",
        displayName: "Admin User",
        username: "admin",
        rep: 125,
      },
      role: "admin",
    });
    const res = await GET();
    const body = await res.json();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Vary")).toContain("Authorization");
    expect(body.user.id).toBe("u1");
    expect(body.user.email).toBe("admin@test.com");
    expect(body.user.displayName).toBe("Admin User");
    expect(body.user.username).toBe("admin");
    expect(body.user.rep).toBe(125);
    expect(body.role).toBe("admin");
  });
});
