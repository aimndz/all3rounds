import { NextRequest, NextResponse } from "next/server";

export const MAX_INGEST_BODY_BYTES = 2 * 1024 * 1024;

export function requireIngestToken(request: NextRequest) {
  const expected = process.env.INGEST_API_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || received !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function enforceIngestBodyLimit(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const bytes = Number.parseInt(contentLength, 10);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return NextResponse.json({ error: "Invalid Content-Length" }, { status: 400 });
  }

  if (bytes > MAX_INGEST_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  return null;
}
