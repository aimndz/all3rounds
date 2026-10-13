import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
const mockFetch = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
  })),
}));

vi.mock("@/lib/auth", () => ({
  getUserWithRole: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/rate-limit")>(
      "@/lib/rate-limit",
    );
  return {
    ...actual,
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      reset: Date.now() + 60_000,
    }),
  };
});

import { getUserWithRole } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockGetUserWithRole = vi.mocked(getUserWithRole);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
      "user-agent": "vitest",
    },
    body: JSON.stringify({
      turnstile_token: "test-token",
      ...body,
    }),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    mockGetUserWithRole.mockResolvedValue({
      user: null,
      role: "viewer",
    });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      reset: Date.now() + 60_000,
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(mockValues).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("stores anonymous feedback with a null user_id", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "bug",
        message: "The search page button is not responding.",
        contact_email: "",
        page_url: "http://localhost/search",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        category: "bug",
        message: "The search page button is not responding.",
        contactEmail: null,
        pageUrl: "http://localhost/search",
        userAgent: "vitest",
        status: "new",
      }),
    );
  });

  it("stores authenticated feedback with the user id", async () => {
    mockGetUserWithRole.mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "viewer",
        displayName: "User",
        username: "user",
        rep: 0,
      },
      role: "viewer",
    });

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "feature",
        message: "Please add saved searches.",
        contact_email: "user@example.com",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "feedback:user-1",
      "feedback",
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        category: "feature",
        contactEmail: "user@example.com",
      }),
    );
  });

  it("returns 400 for invalid feedback", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "not-real",
        message: "Bad",
      }),
    );

    expect(res.status).toBe(400);
    expect(mockValues).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects non-http page URLs", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "bug",
        message: "This link should not become clickable.",
        page_url: "javascript:alert(1)",
      }),
    );

    expect(res.status).toBe(400);
    expect(mockValues).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when Turnstile verification fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "other",
        message: "This should fail verification.",
      }),
    );

    expect(res.status).toBe(400);
    expect(mockValues).not.toHaveBeenCalled();
  });

  it("returns 429 when feedback submissions are rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      reset: Date.now() + 60_000,
    });

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      makePostRequest({
        category: "other",
        message: "This should be rate limited.",
      }),
    );

    expect(res.status).toBe(429);
    expect(mockValues).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
