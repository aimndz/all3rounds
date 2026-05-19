import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "../auth";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

// Mock the supabase server module
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

const mockBetterAuth = {
  api: {
    getSession: vi.fn(),
  },
};

vi.mock("@/lib/better-auth", () => ({
  getBetterAuth: vi.fn(() => mockBetterAuth),
}));

import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getBetterAuth } from "@/lib/better-auth";
import { hasPermission, getUserWithRole, requirePermission } from "../auth";

const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockCookies = vi.mocked(cookies);
const mockHeaders = vi.mocked(headers);
const mockGetSession = vi.mocked(getBetterAuth().api.getSession);

function setupMocks(
  user: {
    id: string;
    email: string;
    name?: string | null;
  } | null,
  profile: { role: string; display_name: string } | null,
  options?: { authDelayMs?: number },
) {
  const authDelayMs = options?.authDelayMs ?? 0;

  mockCookies.mockResolvedValue({
    getAll: vi
      .fn()
      .mockReturnValue(
        user ? [{ name: "better-auth.session_token", value: "token" }] : [],
      ),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  mockHeaders.mockResolvedValue(new Headers());

  const mockSessionGet = vi.fn().mockImplementation(
    () =>
      new Promise<{ user: typeof user } | null>((resolve) => {
        setTimeout(() => {
          resolve(user ? { user } : null);
        }, authDelayMs);
      }),
  );

  mockGetSession.mockImplementation(mockSessionGet);

  const singleFn = vi.fn().mockResolvedValue({ data: profile, error: null });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  mockCreateAdminClient.mockReturnValue({
    from: vi.fn().mockReturnValue({ select: selectFn }),
  } as unknown as ReturnType<typeof createAdminClient>);

  return { mockSessionGet };
}

describe("hasPermission", () => {
  const cases: [UserRole, string, boolean][] = [
    // superadmin has everything
    ["superadmin", "lines:edit", true],
    ["superadmin", "lines:delete", true],
    ["superadmin", "users:manage", true],
    ["superadmin", "suggestions:create", true],
    ["superadmin", "suggestions:review", true],

    // admin
    ["admin", "lines:edit", true],
    ["admin", "lines:batch_edit", true],
    ["admin", "lines:delete", false],
    ["admin", "users:manage", false],
    ["admin", "battles:manage", true],
    ["admin", "suggestions:review", true],

    // moderator
    ["moderator", "lines:edit", true],
    ["moderator", "lines:batch_edit", false],
    ["moderator", "lines:delete", false],
    ["moderator", "battles:edit_status", false],
    ["moderator", "suggestions:review", true],
    ["moderator", "users:manage", false],

    // verified_emcee
    ["verified_emcee", "lines:edit", true],
    ["verified_emcee", "lines:batch_edit", false],
    ["verified_emcee", "suggestions:create", true],
    ["verified_emcee", "suggestions:review", false],

    // viewer
    ["viewer", "lines:edit", false],
    ["viewer", "suggestions:create", true],
    ["viewer", "suggestions:review", false],
    ["viewer", "users:manage", false],
  ];

  it.each(cases)("%s + %s → %s", (role, action, expected) => {
    expect(hasPermission(role, action)).toBe(expected);
  });

  it("returns false for unknown permission", () => {
    expect(hasPermission("superadmin", "nonexistent:action")).toBe(false);
  });
});

describe("getUserWithRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null user and viewer role when not logged in", async () => {
    setupMocks(null, null);
    const result = await getUserWithRole();
    expect(result.user).toBeNull();
    expect(result.role).toBe("viewer");
  });

  it("returns user with profile role", async () => {
    setupMocks(
      { id: "u1", email: "test@test.com" },
      { role: "admin", display_name: "Test User" },
    );
    const result = await getUserWithRole();
    expect(result.user).not.toBeNull();
    expect(result.user!.id).toBe("u1");
    expect(result.user!.role).toBe("admin");
    expect(result.user!.displayName).toBe("Test User");
    expect(result.role).toBe("admin");
  });

  it("defaults to viewer when no profile found", async () => {
    setupMocks({ id: "u2", email: "new@test.com" }, null);
    const result = await getUserWithRole();
    expect(result.user).not.toBeNull();
    expect(result.role).toBe("viewer");
  });

  it("uses Better Auth user name as fallback display name", async () => {
    setupMocks({ id: "u3", email: "meta@test.com", name: "Meta User" }, null);
    const result = await getUserWithRole();
    expect(result.user!.displayName).toBe("Meta User");
  });

  it("deduplicates concurrent user-role lookups", async () => {
    const { mockSessionGet } = setupMocks(
      { id: "u4", email: "dedup@test.com" },
      { role: "admin", display_name: "Dedup User" },
      { authDelayMs: 20 },
    );

    const [a, b] = await Promise.all([getUserWithRole(), getUserWithRole()]);

    expect(a.role).toBe("admin");
    expect(b.role).toBe("admin");
    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
    expect(mockSessionGet).toHaveBeenCalledTimes(1);
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 error when not logged in", async () => {
    setupMocks(null, null);
    const result = await requirePermission("lines:edit");
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);
    expect(result.user).toBeNull();
  });

  it("returns 403 error when role lacks permission", async () => {
    setupMocks(
      { id: "u1", email: "viewer@test.com" },
      { role: "viewer", display_name: "Viewer" },
    );
    const result = await requirePermission("lines:edit");
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(403);
  });

  it("returns user when authorized", async () => {
    setupMocks(
      { id: "u1", email: "admin@test.com" },
      { role: "superadmin", display_name: "Admin" },
    );
    const result = await requirePermission("lines:edit");
    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    expect(result.user!.id).toBe("u1");
  });
});
