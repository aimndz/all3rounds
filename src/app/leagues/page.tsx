import type { Metadata } from "next";
import { PageShell } from "@/components/ui/page-shell";
import { getPublicLeagues } from "@/lib/leagues.server";
import { LeagueChooser } from "./LeagueChooser";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Leagues",
  description: "Browse Filipino battle rap transcripts and battles by League.",
  openGraph: {
    title: "Leagues | Filipino Battle Rap Archive",
    description:
      "Choose a Filipino battle rap League to browse its public Battles.",
  },
};

export default async function LeaguesPage() {
  const leagues = await getPublicLeagues();

  return (
    <PageShell spacing="roomy">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="page-heading">Leagues</h1>
          <p className="page-meta">Browse public Battles by League.</p>
        </div>
        <LeagueChooser leagues={leagues} />
      </div>
    </PageShell>
  );
}
