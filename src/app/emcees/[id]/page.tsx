import { Metadata } from "next";
import { Suspense, cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas";
import EmceeProfile from "./EmceeProfile";
import { Battle } from "@/features/battles/hooks/use-battles-data";
import { getEmceePath, normalizeEmceeSlug } from "@/lib/emcees";
import { getSiteUrl } from "@/lib/utils";
import JsonLd from "@/components/shared/JsonLd";

export const revalidate = 86400; // 24 hours (1 day)

const siteUrl = getSiteUrl();

const getEmcee = cache(async (identifier: string) => {
  const supabase = createPublicClient();

  if (uuidSchema.safeParse(identifier).success) {
    const { data } = await supabase
      .from("emcees")
      .select("id, slug, name, aka")
      .eq("id", identifier)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await supabase
    .from("emcees")
    .select("id, slug, name, aka")
    .eq("slug", normalizeEmceeSlug(identifier))
    .maybeSingle();

  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: identifier } = await params;
  const emcee = await getEmcee(identifier);

  if (!emcee) {
    return { title: "Emcee Not Found" };
  }

  const description = `Explore the profile of ${emcee.name}. View battle history, search transcripts, and find iconic lines for this Filipino emcee on All3Rounds.`;

  return {
    title: emcee.name,
    description,
    openGraph: {
      title: `${emcee.name} — Profile & Battle History`,
      description,
      url: `${siteUrl}${getEmceePath(emcee.slug)}`,
    },
    twitter: {
      card: "summary",
      title: `${emcee.name} — Profile & Battle History`,
      description,
    },
  };
}

export default async function EmceeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: identifier } = await params;
  const emcee = await getEmcee(identifier);

  if (!emcee) notFound();
  if (identifier !== emcee.slug) {
    permanentRedirect(getEmceePath(emcee.slug));
  }

  const supabase = createPublicClient();

  // 2. Fetch battles where emcee is a participant
  const { data: rawBattlesResponse, error: battlesError } = await supabase
    .from("battle_participants")
    .select(
      `
      battles (
        id,
        title,
        youtube_id,
        event_name,
        event_date,
        url,
        status
      )
    `,
    )
    .eq("emcee_id", emcee.id)
    .order("event_date", { foreignTable: "battles", ascending: false });

  if (battlesError) {
    console.error("Error fetching emcee battles:", battlesError);
  }

  const rawBattles =
    (rawBattlesResponse as unknown as { battles: Battle | null }[]) || [];
  const battles = rawBattles
    .map((pb) => pb.battles)
    .filter(
      (b): b is Battle => b !== null && (b.status as string) !== "excluded",
    );

  const profileData = {
    id: emcee.id,
    slug: emcee.slug,
    name: emcee.name,
    aka: emcee.aka || [],
    battles,
  };

  const emceeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: emcee.name,
    description: `Profile of Filipino battle rapper ${emcee.name}.`,
    url: `${siteUrl}${getEmceePath(emcee.slug)}`,
    knowsAbout: ["Battle Rap", "Hip Hop", "Freestyle Rap"],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Archive", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Emcees",
        item: `${siteUrl}/emcees`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: emcee.name,
        item: `${siteUrl}${getEmceePath(emcee.slug)}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[emceeJsonLd, breadcrumbJsonLd]} />
      <Suspense fallback={<EmceeProfileSkeleton />}>
        <EmceeProfile data={profileData} />
      </Suspense>
    </>
  );
}

function EmceeProfileSkeleton() {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border/40 bg-background/95 h-16 animate-pulse border-b" />
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-8 flex items-center gap-2">
          <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
        </div>
        <div className="mb-12">
          <div className="bg-muted mb-4 h-12 w-2/3 animate-pulse rounded-lg md:h-16 lg:w-1/2" />
        </div>
        <div className="bg-border/40 mb-12 h-px w-full" />
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-muted h-8 w-40 animate-pulse rounded-lg" />
          <div className="bg-muted h-10 w-full rounded-xl sm:w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-4">
              <div className="bg-muted aspect-video w-full animate-pulse rounded-2xl" />
              <div className="space-y-2">
                <div className="bg-muted h-5 w-full animate-pulse rounded-md" />
                <div className="bg-muted h-4 w-2/3 animate-pulse rounded-md opacity-50" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
