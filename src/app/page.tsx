import HomeStats from "@/components/home/HomeStats";
import SearchBar from "@/components/SearchBar";
import Image from "next/image";
import { PageShell, PageStack } from "@/components/ui/page-shell";
import HomeSection from "@/components/home/HomeSection";
import HomeActions from "@/components/home/HomeActions";
import SupportedLeagues from "@/components/home/SupportedLeagues";
import HomeFaq from "@/components/home/HomeFaq";
import HomeCta from "@/components/home/HomeCta";
import { Separator } from "@/components/ui/separator";
import ContributeBadge from "@/components/home/ContributeBadge";

export const dynamic = "force-static";

export default function Home() {
  return (
    <PageShell width="narrow" spacing="roomy" className="px-0 pb-16 sm:pb-20">
      <PageStack className="gap-20 sm:gap-24">
        <section className="flex min-h-[calc(100dvh-400px)] flex-col items-center justify-center px-4 text-center">
          <div className="flex w-full flex-col items-center space-y-8">
            <div className="max-w-5xl space-y-4">
              <ContributeBadge />
              <h1 className="flex items-center justify-center text-4xl font-bold tracking-tight uppercase sm:text-6xl md:text-7xl">
                All
                <Image
                  src="/logo/a3r-logo-icon.svg"
                  alt="3"
                  width={80}
                  height={80}
                  className="ml-1.5 h-[0.9em] w-auto"
                  priority
                  unoptimized
                />
                Rounds
              </h1>

              <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed sm:text-lg">
                The Filipino battle rap archive — a community-driven platform
                for discovering lines, exploring battles, and tracking emcee
                stats.
              </p>
            </div>

            <div className="flex w-full flex-col items-center space-y-12">
              <div className="w-full max-w-xl space-y-8">
                <SearchBar size="lg" />
                <HomeStats />
              </div>
            </div>
          </div>
        </section>

        <HomeSection
          title="Explore The Archive"
          description="Discover what you can do with All3Rounds."
          className="mx-auto flex w-full flex-col items-center px-4 text-center"
        >
          <HomeActions />
        </HomeSection>

        <div className="px-4">
          <Separator />
        </div>

        <HomeSection
          title="Supported Leagues"
          className="mx-auto w-full px-4 text-center"
        >
          <SupportedLeagues />
        </HomeSection>

        <div className="px-4">
          <Separator />
        </div>

        <HomeSection title="Frequently Asked Questions" className="px-4">
          <HomeFaq />
        </HomeSection>

        <div className="px-4">
          <HomeCta />
        </div>
      </PageStack>
    </PageShell>
  );
}
