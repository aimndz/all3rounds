export const PUBLIC_NAVIGATION_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/random", label: "Discover" },
  { href: "/leagues", label: "Leagues" },
  { href: "/emcees", label: "Emcees" },
] as const;

export function getPublicNavigationStructuredData(siteUrl: string) {
  return PUBLIC_NAVIGATION_LINKS.map((link, index) => ({
    "@type": "SiteNavigationElement",
    position: index + 1,
    name: link.label,
    url: `${siteUrl}${link.href}`,
  }));
}
