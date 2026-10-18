import { beforeEach, describe, expect, it, vi } from "vitest";
import BattleRedirectPage from "../page";

const mocks = vi.hoisted(() => ({
  createPublicClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUserWithRole: vi.fn(),
  hasPermission: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error("PERMANENT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createPublicClient: mocks.createPublicClient,
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/auth", () => ({
  getUserWithRole: mocks.getUserWithRole,
  hasPermission: mocks.hasPermission,
}));

function configureBattleQuery(data: object | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data, error: null });
  mocks.createPublicClient.mockReturnValue({
    from: vi.fn(() => query),
  });
}

describe("legacy Battle URL redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserWithRole.mockResolvedValue({ role: null });
    mocks.hasPermission.mockReturnValue(false);
  });

  it("redirects a legacy UUID to the canonical League Battle URL", async () => {
    configureBattleQuery({
      id: "550e8400-e29b-41d4-a716-446655440000",
      league: "fliptop",
      slug: "loonie-vs-abra",
    });

    await expect(
      BattleRedirectPage({
        params: Promise.resolve({
          league: "550e8400-e29b-41d4-a716-446655440000",
        }),
        searchParams: Promise.resolve({ t: "120" }),
      }),
    ).rejects.toThrow("PERMANENT_REDIRECT");

    expect(mocks.permanentRedirect).toHaveBeenCalledWith(
      "/battles/fliptop/loonie-vs-abra?t=120",
    );
  });

  it("keeps invalid legacy segments unavailable", async () => {
    await expect(
      BattleRedirectPage({
        params: Promise.resolve({ league: "not-a-uuid" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.createPublicClient).not.toHaveBeenCalled();
  });
});
