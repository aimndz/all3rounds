import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { verifyCsrf } from "../csrf";

function makeRequest(origin?: string, host?: string): NextRequest {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (host) headers.set("host", host);
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("verifyCsrf", () => {
  it("returns true when origin host matches request host", () => {
    expect(
      verifyCsrf(makeRequest("http://localhost:3000", "localhost:3000")),
    ).toBe(true);
  });

  it("returns true for production domain match", () => {
    expect(
      verifyCsrf(makeRequest("https://all3rounds.com", "all3rounds.com")),
    ).toBe(true);
  });

  it("returns false when origin host does not match", () => {
    expect(verifyCsrf(makeRequest("https://evil.com", "all3rounds.com"))).toBe(
      false,
    );
  });

  it("returns false when origin is missing", () => {
    expect(verifyCsrf(makeRequest(undefined, "localhost:3000"))).toBe(false);
  });

  it("returns false when host is missing", () => {
    expect(verifyCsrf(makeRequest("http://localhost:3000", undefined))).toBe(
      false,
    );
  });

  it("returns false when both are missing", () => {
    expect(verifyCsrf(makeRequest())).toBe(false);
  });

  it("returns false for invalid origin URL", () => {
    expect(verifyCsrf(makeRequest("not-a-url", "localhost"))).toBe(false);
  });
});
