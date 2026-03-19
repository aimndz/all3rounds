import { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 86400; // 24 hours (1 day)

import { getSiteUrl } from "@/lib/utils";
 
const siteUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/battles`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/emcees`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/random`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms-of-service`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = createPublicClient();

    const [battlesRes, emceesRes] = await Promise.all([
      supabase.from("battles").select("id").neq("status", "excluded"),
      supabase.from("emcees").select("id"),
    ]);

    const battleRoutes: MetadataRoute.Sitemap =
      battlesRes.data?.map((battle) => ({
        url: `${siteUrl}/battle/${battle.id}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      })) ?? [];

    const emceeRoutes: MetadataRoute.Sitemap =
      emceesRes.data?.map((emcee) => ({
        url: `${siteUrl}/emcees/${emcee.id}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      })) ?? [];

    return [...staticRoutes, ...battleRoutes, ...emceeRoutes];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return staticRoutes;
  }
}
