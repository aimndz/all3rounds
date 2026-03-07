import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Validate 'next' to prevent open redirect vulnerabilities
      // Ensure it's a relative path starting with / but NOT // (protocol-relative)
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/";

      return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
    }
  }

  // If anything fails, redirect to the home page with an error
  return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`);
}
