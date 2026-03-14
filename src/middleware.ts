import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function buildCsp(nonce: string, isDev: boolean) {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    isDev ? "'unsafe-eval'" : "",
    "'strict-dynamic'",
    "https://www.youtube.com",
    "https://s.ytimg.com",
    "https://va.vercel-scripts.com",
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
    "img-src 'self' https://img.youtube.com https://i.ytimg.com data: blob:",
    "frame-src https://www.youtube.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-analytics.com",
    "font-src 'self'",
    !isDev ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const nonce = crypto.randomUUID();
  const isDev = process.env.NODE_ENV !== "production";
  const csp = buildCsp(nonce, isDev);

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
