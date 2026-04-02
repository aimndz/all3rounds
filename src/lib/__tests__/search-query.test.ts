import { describe, expect, it } from "vitest";

import { buildSearchQuery, parseSearchQuery } from "@/lib/search-query";

describe("parseSearchQuery", () => {
  it("keeps plain queries as text only", () => {
    expect(parseSearchQuery("loonie")).toMatchObject({
      text: "loonie",
      appliedFilters: {},
      hasStructuredFilters: false,
      hasSearchIntent: true,
    });
  });

  it("parses emcee-only filters", () => {
    expect(parseSearchQuery("emcee:loonie")).toMatchObject({
      text: "",
      appliedFilters: { emcee: "loonie" },
      hasStructuredFilters: true,
      hasSearchIntent: true,
    });
  });

  it("parses filters even when there is a space after the colon", () => {
    expect(parseSearchQuery("emcee: loonie")).toMatchObject({
      text: "",
      appliedFilters: { emcee: "loonie" },
      hasStructuredFilters: true,
      hasSearchIntent: true,
    });
  });

  it("parses text before a structured filter", () => {
    expect(parseSearchQuery("FlipTop game emcee:loonie")).toMatchObject({
      text: "FlipTop game",
      appliedFilters: { emcee: "loonie" },
    });
  });

  it("parses multi-word battle filters", () => {
    expect(parseSearchQuery('battle:"loonie vs abra"')).toMatchObject({
      text: "",
      appliedFilters: { battle: "loonie vs abra" },
    });
  });

  it("parses quoted multi-word emcee values with trailing text", () => {
    expect(parseSearchQuery('emcee:"dave denver" fliptop game')).toMatchObject({
      text: "fliptop game",
      appliedFilters: { emcee: "dave denver" },
    });
  });

  it("keeps unknown operators in the text query", () => {
    expect(parseSearchQuery("foo:bar loonie")).toMatchObject({
      text: "foo:bar loonie",
      appliedFilters: {},
    });
  });

  it("uses the last value when a filter repeats", () => {
    expect(parseSearchQuery("emcee:abra emcee:loonie")).toMatchObject({
      text: "",
      appliedFilters: { emcee: "loonie" },
    });
  });
});

describe("buildSearchQuery", () => {
  it("rebuilds text and filters in a stable order", () => {
    expect(
      buildSearchQuery("FlipTop game", {
        event: "Ahon",
        emcee: "Loonie",
      }),
    ).toBe("FlipTop game emcee:Loonie event:Ahon");
  });

  it("quotes multi-word filter values when rebuilding", () => {
    expect(
      buildSearchQuery("fliptop game", {
        emcee: "Dave Denver",
      }),
    ).toBe('fliptop game emcee:"Dave Denver"');
  });
});
