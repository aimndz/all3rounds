import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { enforceIngestBodyLimit, requireIngestToken } from "@/app/api/ingest/_auth";

describe("ingest auth helpers", () => {
  it("rejects invalid bearer tokens", async () => {
    vi.stubEnv("INGEST_API_TOKEN", "expected-token");
    const req = new NextRequest("http://localhost/api/ingest/videos", {
      headers: { authorization: "Bearer wrong-token" },
    });

    const res = requireIngestToken(req);

    expect(res?.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("rejects oversized ingest bodies", async () => {
    const req = new NextRequest("http://localhost/api/ingest/transcripts", {
      method: "POST",
      headers: { "content-length": `${2 * 1024 * 1024 + 1}` },
    });

    const res = enforceIngestBodyLimit(req);

    expect(res?.status).toBe(413);
  });
});
