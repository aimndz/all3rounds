import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicApiCacheKey,
  matchPublicApiCache,
  PUBLIC_API_CACHE_STATUS_HEADER,
  storePublicApiCache,
} from "../public-api-cache";

function makeRequest(url = "https://example.com/api/battles") {
  return new NextRequest(url);
}

describe("public API cache helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds stable cache keys with sorted normalized params", () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("sort", "latest");
    params.set("eventLimit", "5");

    expect(
      buildPublicApiCacheKey(
        makeRequest("https://example.com/api/battles?unused=1"),
        "/api/battles",
        params,
      ),
    ).toBe("https://example.com/api/battles?eventLimit=5&page=1&sort=latest");
  });

  it("returns null when no Cloudflare Cache API is available", async () => {
    vi.stubGlobal("caches", undefined);

    await expect(
      matchPublicApiCache(makeRequest(), "https://example.com/api/battles"),
    ).resolves.toBeNull();
  });

  it("bypasses private requests", async () => {
    const match = vi.fn();
    vi.stubGlobal("caches", { default: { match } });

    const request = new NextRequest("https://example.com/api/battles", {
      headers: { cookie: "session=abc" },
    });

    await expect(
      matchPublicApiCache(request, "https://example.com/api/battles"),
    ).resolves.toBeNull();
    expect(match).not.toHaveBeenCalled();
  });

  it("marks cached responses as hits", async () => {
    vi.stubGlobal("caches", {
      default: {
        match: vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), {
            headers: { "Cache-Control": "public, s-maxage=60" },
          }),
        ),
      },
    });

    const response = await matchPublicApiCache(
      makeRequest(),
      "https://example.com/api/battles",
    );

    expect(response?.headers.get(PUBLIC_API_CACHE_STATUS_HEADER)).toBe("HIT");
    await expect(response?.json()).resolves.toEqual({ ok: true });
  });

  it("stores successful public responses and marks them as misses", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("caches", { default: { put } });

    const response = await storePublicApiCache(
      makeRequest(),
      "https://example.com/api/battles",
      NextResponse.json({ ok: true }),
    );

    expect(put).toHaveBeenCalledOnce();
    expect(response.headers.get(PUBLIC_API_CACHE_STATUS_HEADER)).toBe("MISS");
  });
});
