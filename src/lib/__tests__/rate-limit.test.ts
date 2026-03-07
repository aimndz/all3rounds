import { describe, it, expect, vi } from "vitest";

// Ensure no Redis env vars so we test the local fallback path
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

// Must import after stubbing env
const { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } =
  await import("../rate-limit");

describe("checkRateLimit (local fallback)", () => {
  it("allows the first request", async () => {
    const result = await checkRateLimit("test-user-1", "anonymous");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.anonymous.maxRequests - 1);
    expect(result.limit).toBe(RATE_LIMITS.anonymous.maxRequests);
  });

  it("decrements remaining on subsequent requests", async () => {
    const key = "test-user-decrement";
    const r1 = await checkRateLimit(key, "anonymous");
    const r2 = await checkRateLimit(key, "anonymous");
    expect(r2.remaining).toBe(r1.remaining - 1);
  });

  it("blocks requests when limit is exceeded", async () => {
    const key = "test-user-blocked";
    // Exhaust the limit
    for (let i = 0; i < RATE_LIMITS.anonymous.maxRequests; i++) {
      await checkRateLimit(key, "anonymous");
    }
    const result = await checkRateLimit(key, "anonymous");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("uses hourly window for edit type", async () => {
    const result = await checkRateLimit("test-editor", "edit");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(RATE_LIMITS.edit.maxRequests);
  });
});

describe("getRateLimitHeaders", () => {
  it("returns correct header format", () => {
    const headers = getRateLimitHeaders({
      remaining: 15,
      limit: 20,
      reset: 1700000000000,
    });
    expect(headers["X-RateLimit-Limit"]).toBe("20");
    expect(headers["X-RateLimit-Remaining"]).toBe("15");
    expect(headers["X-RateLimit-Reset"]).toBe("1700000000");
  });
});
