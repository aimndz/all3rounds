import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getUserWithRole: vi.fn(),
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
      },
      role: "admin",
    });
    const res = await GET();
    const body = await res.json();
    expect(body.user.id).toBe("u1");
    expect(body.user.email).toBe("admin@test.com");
    expect(body.user.displayName).toBe("Admin User");
    expect(body.role).toBe("admin");
  });
});
