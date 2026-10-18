import { beforeEach, describe, expect, it, vi } from "vitest";
import BattlePage, { generateMetadata } from "../page";

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

vi.mock("../BattleClient", () => ({
  default: () => null,
}));

vi.mock("@/components/shared/JsonLd", () => ({
  default: () => null,
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

describe("canonical Battle detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserWithRole.mockResolvedValue({ role: null });
    mocks.hasPermission.mockReturnValue(false);
  });

  it("renders a canonical League Battle URL without redirecting", async () => {
    configureBattleQuery({
      id: "battle-1",
      league: "fliptop",
      slug: "loonie-vs-abra",
      title: "Loonie vs Abra",
      event_name: "Ahon 5",
      event_date: "2024-01-01",
      youtube_id: "video-1",
      public_visible: true,
    });

    const page = await BattlePage({
      params: Promise.resolve({
        league: "fliptop",
        slug: "loonie-vs-abra",
      }),
      searchParams: Promise.resolve({}),
    });

    expect(page).toBeTruthy();
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();

    const metadata = await generateMetadata({
      params: Promise.resolve({
        league: "fliptop",
        slug: "loonie-vs-abra",
      }),
    });

    expect(metadata.openGraph).toMatchObject({
      url: expect.stringContaining("/battles/fliptop/loonie-vs-abra"),
    });
  });
});
