import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
