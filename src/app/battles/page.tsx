import { Metadata } from "next";
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

export default function BattlesPage() {
  return (
    <BattlesDirectory
      initialBattles={[]}
      initialCount={0}
      initialTotalEvents={0}
      initialYears={[]}
      initialEventNames={[]}
      initialAvailableLeagues={[]}
    />
  );
}
