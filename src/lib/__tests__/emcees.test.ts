import { describe, expect, it } from "vitest";
import { getEmceePath, normalizeEmceeSlug } from "../emcees";

describe("normalizeEmceeSlug", () => {
  it("maps special characters and normalizes separators", () => {
    expect(normalizeEmceeSlug("Flict-G")).toBe("flict-g");
    expect(normalizeEmceeSlug("A$AP")).toBe("asap");
    expect(normalizeEmceeSlug("M@ster")).toBe("master");
    expect(normalizeEmceeSlug("Mr. Foo Bar")).toBe("mr-foo-bar");
  });

  it("removes punctuation and unsafe characters", () => {
    expect(normalizeEmceeSlug("!Loonie?")).toBe("loonie");
    expect(normalizeEmceeSlug("Bad/Name\\Here")).toBe("bad-namehere");
    expect(normalizeEmceeSlug("___A   B---C...")).toBe("a-b-c");
  });
});

describe("getEmceePath", () => {
  it("builds the emcee profile path", () => {
    expect(getEmceePath("flict-g")).toBe("/emcees/flict-g");
  });
});
