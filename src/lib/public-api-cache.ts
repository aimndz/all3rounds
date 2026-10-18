import { NextRequest, NextResponse } from "next/server";

export const PUBLIC_API_CACHE_STATUS_HEADER = "X-A3R-Cache";
const PUBLIC_API_CACHE_NAMESPACE_ORIGIN = "https://all3rounds.invalid";
const PUBLIC_API_CACHE_VERSION_PATH = "/__a3r-public-api-cache-version";

type CloudflareCacheStorage = CacheStorage & {
  default?: Cache;
};

export function hasPrivateCacheHeaders(request: NextRequest): boolean {
  return (
    request.headers.has("cookie") || request.headers.has("authorization")
  );
}

export function buildPublicApiCacheKey(
  request: NextRequest,
  pathname: string,
  params: URLSearchParams,
): string {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";

  Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

  return url.toString();
}

function getDefaultCache(): Cache | null {
  if (typeof caches === "undefined" || !("default" in caches)) {
    return null;
  }
  return (caches as CloudflareCacheStorage).default ?? null;
}

function canUsePublicApiCache(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (hasPrivateCacheHeaders(request)) return false;
  return getDefaultCache() !== null;
}

function getCacheVersionKey(cacheKey: string): string {
  const cacheUrl = new URL(cacheKey);
  const versionUrl = new URL(PUBLIC_API_CACHE_NAMESPACE_ORIGIN);
  versionUrl.pathname = PUBLIC_API_CACHE_VERSION_PATH;
  versionUrl.searchParams.set("path", cacheUrl.pathname);
  return versionUrl.toString();
}

async function getCacheVersion(cache: Cache, cacheKey: string): Promise<string> {
  if (typeof cache.match !== "function") return "0";

  const versionResponse = await cache.match(
    new Request(getCacheVersionKey(cacheKey)),
  );
  if (!versionResponse) return "0";

  const version = (await versionResponse.text()).trim();
  return version || "0";
}

async function getVersionedCacheKey(
  cache: Cache,
  cacheKey: string,
): Promise<string> {
  const version = await getCacheVersion(cache, cacheKey);
  const versionedUrl = new URL(cacheKey);
  versionedUrl.searchParams.set("__a3r_cache_version", version);
  return versionedUrl.toString();
}

/**
 * Invalidate all variants for a public API path by rotating its namespace.
 * Old entries remain unreachable and expire with their normal cache policy;
 * no process-local key registry is needed, so this works across isolates.
 */
export async function invalidatePublicApiCache(pathname: string): Promise<void> {
  const cache = getDefaultCache();
  if (!cache) return;

  const versionKey = getCacheVersionKey(
    new URL(`${PUBLIC_API_CACHE_NAMESPACE_ORIGIN}${pathname}`).toString(),
  );
  const version =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  try {
    await cache.put(
      new Request(versionKey),
      new Response(version, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
        },
      }),
    );
  } catch (error) {
    console.warn("[public-api-cache] Failed to invalidate cache", error);
  }
}

export async function matchPublicApiCache(
  request: NextRequest,
  cacheKey: string,
): Promise<NextResponse | null> {
  if (!canUsePublicApiCache(request)) return null;

  const cache = getDefaultCache();
  if (!cache) return null;

  const cached = await cache.match(
    new Request(await getVersionedCacheKey(cache, cacheKey)),
  );
  if (!cached) return null;

  const headers = new Headers(cached.headers);
  headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "HIT");
  return new NextResponse(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

export async function storePublicApiCache(
  request: NextRequest,
  cacheKey: string,
  response: NextResponse,
): Promise<NextResponse> {
  if (!canUsePublicApiCache(request) || response.status !== 200) {
    response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "BYPASS");
    return response;
  }

  try {
    const cache = getDefaultCache();
    if (!cache) {
      response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "BYPASS");
      return response;
    }
    const versionedCacheKey = await getVersionedCacheKey(cache, cacheKey);
    await cache.put(new Request(versionedCacheKey), response.clone());
    response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "MISS");
  } catch (error) {
    console.warn("[public-api-cache] Failed to store response", error);
    response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "BYPASS");
  }
  return response;
}
