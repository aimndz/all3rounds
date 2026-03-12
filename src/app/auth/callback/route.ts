import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Try to get 'next' from query param or the fallback cookie
  const nextFromCookie = request.cookies.get("auth-redirect")?.value;
  const next = nextFromCookie
    ? decodeURIComponent(nextFromCookie)
    : (requestUrl.searchParams.get("next") ?? "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Validate 'next' to prevent open redirect vulnerabilities
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/";

      const response = NextResponse.redirect(`${requestUrl.origin}${safeNext}`);

      // Clear the temporary redirect cookie if it exists
      if (nextFromCookie) {
        response.cookies.set("auth-redirect", "", { maxAge: 0, path: "/" });
      }

      return response;
    }
  }

  // If anything fails, redirect to the home page with an error
  const fallbackResponse = NextResponse.redirect(
    `${requestUrl.origin}/?error=auth_failed`,
  );
  if (nextFromCookie) {
    fallbackResponse.cookies.set("auth-redirect", "", { maxAge: 0, path: "/" });
  }
  return fallbackResponse;
}
