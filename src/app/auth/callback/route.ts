import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, request.url));
}
