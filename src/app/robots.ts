import { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/utils";

export const dynamic = "force-static";
export const revalidate = 86400;

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/reviews"],
        crawlDelay: 10,
      },
    ],
    host: siteUrl,
    sitemap: [`${siteUrl}/sitemap.xml`],
  };
}
