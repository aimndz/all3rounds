import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getBattleDirectoryData } from "@/lib/battles-directory.server";
import {
  getLeagueDefinition,
  getLeagueDirectoryPath,
} from "@/lib/leagues";
import BattlesDirectory from "./BattlesDirectory";

export const revalidate = 86400; // 24 hours (1 day)

export const metadata: Metadata = {
  title: "Battles",
  description:
    "Browse the community directory of Filipino battle rap events. Find transcripts, event dates, and battle history from FlipTop and underground leagues.",
  openGraph: {
    title: "Battles | Filipino Battle Rap Archive",
    description:
      "Explore the community archive for Filipino battle rap transcripts and battle history.",
  },
};

export default async function BattlesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawLeague = typeof params.league === "string" ? params.league : undefined;
  const selectedLeague =
    rawLeague && rawLeague.toLowerCase() !== "all"
      ? getLeagueDefinition(rawLeague)
      : undefined;

  if (selectedLeague) {
    permanentRedirect(getLeagueDirectoryPath(selectedLeague.slug, params));
  }

  const league =
    rawLeague && rawLeague.toLowerCase() !== "all" ? rawLeague : undefined;
  const sort = params.sort === "oldest" ? "oldest" : "latest";
  const directory = await getBattleDirectoryData({ league, sort });

  return <BattlesDirectory {...directory} />;
}
