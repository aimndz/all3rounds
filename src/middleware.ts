import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  checkRateLimit,
  getRateLimitHeaders,
  getClientIp,
} from "@/lib/rate-limit";

// 1. These paths are safe to cache publicly because they don't contain user-specific data.
// We use regex to support sub-paths like /battles/slug or /emcees/slug.
// Bypassing Supabase session checks here
const PUBLIC_CACHE_CONFIGS = [
  {
    pattern: /^\/$/,
    cache: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=59",
  },
  {
    pattern: /^\/privacy-policy$/,
    cache:
      "public, max-age=14400, s-maxage=31536000, stale-while-revalidate=59",
  },
  {
    pattern: /^\/terms-of-service$/,
    cache:
      "public, max-age=14400, s-maxage=31536000, stale-while-revalidate=59",
  },
  {
    pattern: /^\/battles?(\/.*)?$/,
    cache: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=59",
  },
  {
    pattern: /^\/emcees?(\/.*)?$/,
    cache: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=59",
  },
];

function buildCsp(isDev: boolean) {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://www.youtube.com",
    "https://s.ytimg.com",
    "https://va.vercel-scripts.com",
    "https://cloud.umami.is",
    "https://static.cloudflareinsights.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `script-src ${scriptSrc}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://img.youtube.com https://i.ytimg.com data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.google.com https://*.google.com.ph https://*.doubleclick.net",
    "frame-src https://www.youtube.com https://*.doubleclick.net",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-analytics.com https://cloud.umami.is https://api-gateway.umami.dev https://cloudflareinsights.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net",
    "font-src 'self'",
    !isDev ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const IS_DEV = process.env.NODE_ENV !== "production";
const CSP_HEADER = buildCsp(IS_DEV);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Maintain Original Rate Limit Logic (API, Search, Auth, Admin)
  const isSearch = pathname === "/api/search";
  const isApiRequest = pathname.startsWith("/api/");
  const isAuthOrAdmin =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");
  const shouldLimit = isSearch || isApiRequest || isAuthOrAdmin;

  let rateLimitHeaders: Record<string, string> = {};

  if (shouldLimit && !IS_DEV) {
    const ip = getClientIp(request);
    const rateLimitType = isSearch ? "search" : "anonymous";
    const rateLimitKey = `ip:${ip}:${rateLimitType}`;
    const rateRes = await checkRateLimit(rateLimitKey, rateLimitType);
    rateLimitHeaders = getRateLimitHeaders(rateRes) as Record<string, string>;

    if (!rateRes.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders },
      );
    }
  }

  // 2. Optimized Cache & Session Logic
  const cacheConfig = PUBLIC_CACHE_CONFIGS.find((config) =>
    config.pattern.test(pathname),
  );

  let response: NextResponse;
  if (cacheConfig || isApiRequest) {
    // PUBLIC PAGES & APIs: Bypass Supabase to stay under 10ms CPU limit.
    // APIs handle their own auth natively, so middleware doesn't need to double-check.
    response = NextResponse.next();
    if (cacheConfig) {
      response.headers.set("Cache-Control", cacheConfig.cache);
    }
  } else {
    // PROTECTED PAGES: Fetch session for /admin or non-cached paths.
    response = await updateSession(request);
  }

  // 3. Global Headers
  response.headers.set("Content-Security-Policy", CSP_HEADER);
  Object.entries(rateLimitHeaders).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|map|ico)).*)",
  ],
};
