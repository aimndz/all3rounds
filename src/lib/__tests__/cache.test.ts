import { describe, it, expect, vi } from "vitest";

// We test the no-Redis path by ensuring env vars are empty
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

const { getCached, setCached, invalidateCache, invalidateCachePattern, redis } =
  await import("../cache");

describe("cache (no Redis)", () => {
  it("redis is null when env vars are missing", () => {
    expect(redis).toBeNull();
  });

  it("getCached returns null", async () => {
    expect(await getCached("any-key")).toBeNull();
  });

  it("setCached does not throw", async () => {
    await expect(setCached("key", { data: 1 }, 60)).resolves.toBeUndefined();
  });

  it("invalidateCache does not throw", async () => {
    await expect(invalidateCache("key")).resolves.toBeUndefined();
  });

  it("invalidateCachePattern does not throw", async () => {
    await expect(invalidateCachePattern("key:*")).resolves.toBeUndefined();
  });
});

describe("cache (function signatures)", () => {
  it("exports functions with correct types", () => {
    expect(typeof getCached).toBe("function");
    expect(typeof setCached).toBe("function");
    expect(typeof invalidateCache).toBe("function");
    expect(typeof invalidateCachePattern).toBe("function");
  });
});
