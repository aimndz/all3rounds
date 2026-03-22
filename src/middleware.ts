import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

// 1. Bots probing for these paths will be rejected instantly to save Supabase CPU
const BOT_BLOCKLIST = [
  /\.php$/,
  /\.env$/,
  /\.sh_history$/,
  /\.aws_json$/,
  /wp-content/,
  /wp-includes/,
  /wp-admin/,
  /cgi-bin/,
  /\.jsp$/,
  /\.git/,
  /\.sql$/,
  /\.bak$/,
  /SystemManager/,
  /pentaho/,
  /artemis/,
];

// 2. These paths are safe to cache publicly because they don't contain user-specific data.
// We use regex to support sub-paths like /battles/slug or /emcees/slug.
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
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-analytics.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net",
    "font-src 'self'",
    !isDev ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Immediately block malicious bot probes
  if (BOT_BLOCKLIST.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  // 1b. Targeted Protection for Expensive Paths
  // We limit APIs, Search, and Auth to protect databases and Supabase session budgets.
  const isSearch = pathname === "/api/search";
  const isApiRequest = pathname.startsWith("/api/");
  const isAuthOrAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/login");
  const shouldLimit = isSearch || isApiRequest || isAuthOrAdmin;

  // Bypass rate limiting for localhost to prevent developer lockout.
  const isLocalhost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1";

  if (shouldLimit && !isLocalhost) {
    const ip =
      (request as { ip?: string }).ip ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimitType = isSearch ? "search" : "anonymous";
    const rateLimitKey = `ip:${ip}:${rateLimitType}`;

    const rateRes = await checkRateLimit(rateLimitKey, rateLimitType);

    if (!rateRes.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          reset: rateRes.reset,
        },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateRes),
            "Retry-After": Math.ceil(
              (rateRes.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }
  }

  // 2. Determine if this is a static route eligible for CDN caching
  const cacheConfig = PUBLIC_CACHE_CONFIGS.find((config) =>
    config.pattern.test(pathname),
  );

  // 3. Skip session check for static routes to avoid setting cookies that prevent CDN caching
  let response: NextResponse;
  if (cacheConfig) {
    response = NextResponse.next();
    response.headers.set("Cache-Control", cacheConfig.cache);
  } else {
    response = await updateSession(request);
  }

  const isDev = process.env.NODE_ENV !== "production";
  const csp = buildCsp(isDev);

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
