import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type MockResponse = {
  data?: unknown;
  error?: Error | null;
  count?: number | null;
};

const tableQueues = new Map<string, MockResponse[]>();
const mockFrom = vi.fn((table: string) => makeChain(table));
const mockRequirePermission = vi.fn();
const mockGetUserWithRole = vi.fn();
const mockCheckRateLimit = vi.fn();

function queue(table: string, responses: MockResponse[]) {
  tableQueues.set(table, responses);
}

function nextResponse(table: string): MockResponse {
  const responses = tableQueues.get(table) ?? [];
  const response = responses.shift() ?? { data: null, error: null };
  tableQueues.set(table, responses);
  return response;
}

function makeChain(table: string) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: vi.fn(() => {
      const response = nextResponse(table);
      return Promise.resolve({
        data: response.data ?? null,
        error: response.error ?? null,
      });
    }),
    single: vi.fn(() => Promise.resolve(nextResponse(table))),
    then: vi.fn((resolve, reject) =>
      Promise.resolve(nextResponse(table)).then(resolve, reject),
    ),
  };
  return chain;
}

vi.mock("@/db/d1-client", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createPublicClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  getUserWithRole: (...args: unknown[]) => mockGetUserWithRole(...args),
  hasPermission: (role: string, action: string) =>
    action === "battles:manage"
      ? ["superadmin", "admin"].includes(role)
      : action === "annotations:moderate"
        ? ["superadmin", "admin", "moderator"].includes(role)
        : true,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/contributor-leaderboard", () => ({
  getContributorLeaderboard: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
}));

function authedUser(role = "viewer") {
  return {
    id: "550e8400-e29b-41d4-a716-446655440010",
    email: "user@example.com",
    role,
    displayName: "User",
    username: "user",
    rep: 0,
  };
}

function makeRequest(url: string, body?: unknown, method = "POST") {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("annotation API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    tableQueues.clear();
    const user = authedUser();
    mockRequirePermission.mockResolvedValue({
      user,
      role: "viewer",
      error: null,
    });
    mockGetUserWithRole.mockResolvedValue({ user, role: "viewer" });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 30,
      reset: Date.now() + 60_000,
    });
  });

  it("creates an annotation for a single selected line", async () => {
    const annotation = {
      id: "annotation-1",
      battle_id: "550e8400-e29b-41d4-a716-446655440000",
      author_id: "550e8400-e29b-41d4-a716-446655440010",
      body_json: JSON.stringify({ type: "doc" }),
      body_text: "This explains the reference clearly.",
      status: "published",
      score: 1,
      quality_state: "normal",
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    const line = {
      id: 101,
      content: "Test line with a phrase",
      start_time: 12,
      end_time: 14,
      content_version: 1,
      speaker_label: "SPEAKER_01",
      battle_id: "550e8400-e29b-41d4-a716-446655440000",
    };

    queue("battles", [{ data: { id: annotation.battle_id, public_visible: true } }]);
    queue("lines", [{ data: [line] }, { data: [line] }]);
    queue("annotations", [{ data: null }, { data: annotation }]);
    queue("annotation_line_ranges", [{ data: [] }]);
    queue("user_profiles", [
      {
        data: [
          {
            id: annotation.author_id,
            display_name: "User",
            username: "user",
            role: "viewer",
            trust_level: "new",
          },
        ],
      },
    ]);
    queue("user", [{ data: [{ id: annotation.author_id, image: null }] }]);
    queue("user_points", [{ data: [] }]);
    queue("annotation_line_references", [{ data: [] }]);
    queue("annotation_votes", [{ data: null }, { data: [{ annotation_id: annotation.id }] }]);

    const { POST } = await import("@/app/api/annotations/route");
    const res = await POST(
      makeRequest("http://localhost/api/annotations", {
        battle_id: annotation.battle_id,
        start_line_id: 101,
        end_line_id: 101,
        target_line_id: 101,
        start_text_offset: 5,
        end_text_offset: 9,
        selected_text: "line",
        body_json: { type: "doc" },
        body_text: annotation.body_text,
        references: [],
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.annotation.body_text).toBe(annotation.body_text);
    expect(body.annotation.score).toBe(1);
    expect(body.annotation.current_user_voted).toBe(true);
    const rangeChain = mockFrom.mock.results
      .map((result) => result.value)
      .find((chain) => chain.insert.mock.calls[0]?.[0]?.[0]?.annotation_id);
    expect(rangeChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          start_text_offset: 5,
          end_text_offset: 9,
          selected_text: "line",
        }),
      ]),
    );
  });

  it("treats duplicate upvotes from the same user as already applied", async () => {
    queue("annotations", [
      {
        data: {
          id: "annotation-1",
          author_id: "author-1",
          status: "published",
          score: 3,
        },
      },
    ]);
    queue("annotation_votes", [{ data: { id: "vote-1" } }]);

    const { POST } = await import("@/app/api/annotations/[id]/vote/route");
    const res = await POST(
      makeRequest("http://localhost/api/annotations/annotation-1/vote"),
      { params: Promise.resolve({ id: "annotation-1" }) },
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      score: 3,
    });
  });
});
