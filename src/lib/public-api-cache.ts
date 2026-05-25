import { NextRequest, NextResponse } from "next/server";

export const PUBLIC_API_CACHE_STATUS_HEADER = "X-A3R-Cache";

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

export async function matchPublicApiCache(
  request: NextRequest,
  cacheKey: string,
): Promise<NextResponse | null> {
  if (!canUsePublicApiCache(request)) return null;

  const cached = await getDefaultCache()?.match(new Request(cacheKey));
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
    await getDefaultCache()?.put(new Request(cacheKey), response.clone());
    response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "MISS");
  } catch (error) {
    console.warn("[public-api-cache] Failed to store response", error);
    response.headers.set(PUBLIC_API_CACHE_STATUS_HEADER, "BYPASS");
  }
  return response;
}
