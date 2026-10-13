import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getContributorLeaderboard } from "@/lib/contributor-leaderboard";
import { RepHelp } from "@/app/contributors/RepHelp";
import { PageShell, PageStack } from "@/components/ui/page-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const revalidate = 900;

const getCachedContributors = unstable_cache(
  () => getContributorLeaderboard(50),
  ["contributors-page"],
  { revalidate: 900, tags: ["contributors"] },
);

export const metadata: Metadata = {
  title: "Contributors",
  description:
    "Recognizing contributors who make the platform more useful and searchable for everyone.",
  openGraph: {
    title: "Contributors | All3Rounds",
    description:
      "Recognizing contributors who make the platform more useful and searchable for everyone.",
  },
};

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function rankLabel(rank: number) {
  return rank.toString().padStart(2, "0");
}

function usernameLabel(username: string) {
  return username.startsWith("@") ? username : `@${username}`;
}

export default async function ContributorsPage() {
  const { data: contributors, error } = await getCachedContributors();

  if (error) {
    console.error("Error fetching contributor leaderboard:", error);
  }

  return (
    <PageShell width="narrow" spacing="roomy" className="pb-16 sm:pb-20">
      <PageStack className="gap-10">
        <section className="space-y-5">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="page-heading">Top Contributors</h1>
              <RepHelp />
            </div>
            <p className="text-muted-foreground max-w-3xl text-sm leading-7 sm:text-base">
              Recognizing contributors who make the platform more useful and
              searchable for everyone.
            </p>
          </div>
        </section>

        {contributors.length === 0 ? (
          <div className="empty-state">
            <h2 className="text-foreground text-lg font-semibold">
              No approved contributions yet
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
              Approved suggestions will appear here once moderators accept
              community corrections.
            </p>
          </div>
        ) : (
          <div>
            <section className="table-shell hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/20 border-b">
                      <TableHead className="text-muted-foreground w-24 px-6 py-3 text-[10px] font-semibold tracking-widest uppercase">
                        Rank
                      </TableHead>
                      <TableHead className="text-muted-foreground px-6 py-3 text-[10px] font-semibold tracking-widest uppercase">
                        Contributor
                      </TableHead>
                      <TableHead className="text-muted-foreground px-6 py-3 text-right text-[10px] font-semibold tracking-widest uppercase">
                        REP Points
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-border/50 divide-y">
                    {contributors.map((contributor) => (
                      <TableRow
                        key={contributor.user_id}
                        className="border-border/50 hover:bg-muted/20"
                      >
                        <TableCell className="text-muted-foreground px-6 py-4 font-mono text-xs font-semibold">
                          {rankLabel(contributor.rank)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="border-border/50 h-8 w-8 border">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {getInitials(contributor.username) || "A3"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="max-w-full min-w-0">
                              <p className="text-foreground truncate text-sm font-semibold">
                                {usernameLabel(contributor.username)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground px-6 py-4 text-right text-sm font-semibold">
                          {contributor.rep} REP
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="grid gap-3 md:hidden">
              {contributors.map((contributor) => (
                <div
                  key={contributor.user_id}
                  className="surface-card overflow-hidden p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="border-border/50 h-8 w-8 border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {getInitials(contributor.username) || "A3"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-semibold">
                          {usernameLabel(contributor.username)}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {rankLabel(contributor.rank)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-foreground text-xl font-semibold">
                        {contributor.rep}
                      </p>
                      <p className="text-muted-foreground text-[9px] font-semibold tracking-widest uppercase">
                        REP
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </PageStack>
    </PageShell>
  );
}
