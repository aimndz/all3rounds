import { describe, expect, it } from "vitest";
import {
  getPublicNavigationStructuredData,
  PUBLIC_NAVIGATION_LINKS,
} from "../public-navigation";

describe("public navigation", () => {
  it("uses Leagues as the public battle discovery destination", () => {
    expect(PUBLIC_NAVIGATION_LINKS).toContainEqual({
      href: "/leagues",
      label: "Leagues",
    });
    expect(PUBLIC_NAVIGATION_LINKS).not.toContainEqual({
      href: "/battles",
      label: "Battles",
    });
  });

  it("uses the same links for structured navigation metadata", () => {
    expect(getPublicNavigationStructuredData("https://all3rounds.test")).toEqual(
      [
        {
          "@type": "SiteNavigationElement",
          position: 1,
          name: "Search",
          url: "https://all3rounds.test/search",
        },
        {
          "@type": "SiteNavigationElement",
          position: 2,
          name: "Discover",
          url: "https://all3rounds.test/random",
        },
        {
          "@type": "SiteNavigationElement",
          position: 3,
          name: "Leagues",
          url: "https://all3rounds.test/leagues",
        },
        {
          "@type": "SiteNavigationElement",
          position: 4,
          name: "Emcees",
          url: "https://all3rounds.test/emcees",
        },
      ],
    );
  });
});
