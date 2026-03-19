import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

// 2. These paths are safe to cache publicly because they don't contain user-specific data
const PUBLIC_CACHE_PATHS: Record<string, string> = {
  "/": "public, s-maxage=3600, stale-while-revalidate=59",
  "/privacy-policy": "public, s-maxage=31536000, stale-while-revalidate=59",
  "/terms-of-service": "public, s-maxage=31536000, stale-while-revalidate=59",
  "/battles": "public, s-maxage=86400, stale-while-revalidate=59",
  "/emcees": "public, s-maxage=86400, stale-while-revalidate=59",
};

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Immediately block malicious bot probes
  if (BOT_BLOCKLIST.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. Determine if this is a static route that should be cached
  const isStaticRoute = !!PUBLIC_CACHE_PATHS[pathname];

  // 3. Skip session check for static routes to avoid setting cookies that prevent CDN caching
  let response: NextResponse;
  if (isStaticRoute) {
    response = NextResponse.next();
    response.headers.set("Cache-Control", PUBLIC_CACHE_PATHS[pathname]);
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
