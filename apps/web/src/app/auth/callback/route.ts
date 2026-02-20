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
      // Use the origin from the request to ensure we stay on the same domain
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }
  }

  // If anything fails, redirect to the home page with an error
  return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`);
}
