import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { getSiteUrl, formatDateLong } from "@/lib/utils";
import { uuidSchema } from "@/lib/schemas";
import BattleClient from "./BattleClient";
import JsonLd from "@/components/shared/JsonLd";

export const revalidate = 86400; // 24 hours (1 day)

const siteUrl = getSiteUrl();

const getBattle = cache(async (id: string) => {
  if (!uuidSchema.safeParse(id).success) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("battles")
    .select("title, event_name, event_date, youtube_id")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getBattle] Supabase error:", error.message, "for ID:", id);
    return null;
  }
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const battle = await getBattle(id);

  if (!battle) {
    return { title: "Battle Not Found" };
  }

  const dateStr = battle.event_date ? formatDateLong(battle.event_date) : "";
  const description = `Read the full transcript and lyrics for ${battle.title}${battle.event_name ? ` at ${battle.event_name}` : ""}${dateStr ? ` (${dateStr})` : ""}. Watch and explore lines in All3Rounds.`;

  return {
    title: battle.title,
    description,
    openGraph: {
      title: `${battle.title} — Transcript & Lyrics`,
      description,
      url: `${siteUrl}/battles/${id}`,
      images: [
        {
          url: `https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`,
          width: 1280,
          height: 720,
          alt: battle.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${battle.title} — Transcript & Lyrics`,
      description,
      images: [
        `https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`,
      ],
    },
  };
}

export default async function BattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const battle = await getBattle(id);

  if (!battle) notFound();

  const battleJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: battle.title,
    description: `Full transcript and lyric analysis for ${battle.title}.`,
    thumbnailUrl: [
      `https://img.youtube.com/vi/${battle.youtube_id}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${battle.youtube_id}/sddefault.jpg`,
      `https://img.youtube.com/vi/${battle.youtube_id}/hqdefault.jpg`,
    ],
    uploadDate: battle.event_date || "2024-01-01T00:00:00Z",
    embedUrl: `https://www.youtube.com/embed/${battle.youtube_id}`,
    contentUrl: `https://www.youtube.com/watch?v=${battle.youtube_id}`,
    potentialAction: {
      "@type": "SeekToAction",
      target: `${siteUrl}/battles/${id}?t={seek_to_second_number}`,
      "startOffset-input": "required name=seek_to_second_number",
    },
  };

  const eventJsonLd = battle.event_name
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: battle.event_name,
        startDate: battle.event_date || undefined,
        location: { "@type": "Place", name: "Philippines" },
        description: `Philippine Battle Rap Event: ${battle.event_name}`,
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Archive", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Battles",
        item: `${siteUrl}/battles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: battle.title,
        item: `${siteUrl}/battles/${id}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[battleJsonLd, eventJsonLd, breadcrumbJsonLd]} />
      <BattleClient />
    </>
  );
}
