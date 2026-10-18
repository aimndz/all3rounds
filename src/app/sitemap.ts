import { MetadataRoute } from "next";
import { getBattlePath, PUBLIC_BATTLE_STATUSES } from "@/lib/battles";
import { getEmceePath } from "@/lib/emcees";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicLeagues } from "@/lib/leagues.server";

export const dynamic = "force-static";
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
      url: `${siteUrl}/leagues`,
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

    const [battlesRes, emceesRes, leagues] = await Promise.all([
      supabase
        .from("battles")
        .select("league, slug")
        .in("status", PUBLIC_BATTLE_STATUSES)
        .eq("public_visible", true),
      supabase.from("emcees").select("slug"),
      getPublicLeagues(),
    ]);

    const leagueRoutes: MetadataRoute.Sitemap = leagues.map((league) => ({
      url: `${siteUrl}/leagues/${encodeURIComponent(league.slug)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const battleRoutes: MetadataRoute.Sitemap =
      battlesRes.data?.map((battle: { league: string; slug: string }) => ({
        url: `${siteUrl}${getBattlePath(battle.league, battle.slug)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      })) ?? [];

    const emceeRoutes: MetadataRoute.Sitemap =
      emceesRes.data?.map((emcee: { slug: string }) => ({
        url: `${siteUrl}${getEmceePath(emcee.slug)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      })) ?? [];

    return [...staticRoutes, ...leagueRoutes, ...battleRoutes, ...emceeRoutes];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return staticRoutes;
  }
}
