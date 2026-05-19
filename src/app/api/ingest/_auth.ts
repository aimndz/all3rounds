import { NextRequest, NextResponse } from "next/server";

export function requireIngestToken(request: NextRequest) {
  const expected = process.env.INGEST_API_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || received !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
