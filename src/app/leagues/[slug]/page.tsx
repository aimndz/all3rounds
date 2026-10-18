import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSiteUrl } from "@/lib/utils";
import { getBattleDirectoryData } from "@/lib/battles-directory.server";
import { getLeagueDefinition, type PublicLeague } from "@/lib/leagues";
import { getPublicLeagues } from "@/lib/leagues.server";
import BattlesDirectory from "@/app/battles/BattlesDirectory";

export const revalidate = 86400; // 24 hours (1 day)

const siteUrl = getSiteUrl();

const getPublicLeague = cache(
  async (slug: string): Promise<PublicLeague | null> => {
    const definition = getLeagueDefinition(slug);
    if (!definition) return null;

    const leagues = await getPublicLeagues();
    return leagues.find((league) => league.slug === definition.slug) ?? null;
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = await getPublicLeague(slug);

  if (!league) {
    return { title: "League Not Found" };
  }

  const description = `Browse public ${league.name} battle transcripts, events, and battle history on All3Rounds.`;
  const canonicalPath = `/leagues/${league.slug}`;

  return {
    title: `${league.name} Battles`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${league.name} Battles | Filipino Battle Rap Archive`,
      description,
      url: `${siteUrl}${canonicalPath}`,
    },
  };
}

export default async function LeagueDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const league = await getPublicLeague(slug);

  if (!league) notFound();
  if (slug !== league.slug) permanentRedirect(`/leagues/${league.slug}`);

  const query = await searchParams;
  const sort = query.sort === "oldest" ? "oldest" : "latest";
  const directory = await getBattleDirectoryData({
    league: league.slug,
    sort,
    initialCount: league.battleCount,
  });

  return <BattlesDirectory {...directory} league={league} />;
}
