import { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import BattlesDirectory from "./BattlesDirectory";

const INITIAL_EVENTS_PER_PAGE = 5;
const OTHER_BATTLES_KEY = "Other Battles";

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
  const sort = params.sort === "oldest" ? "oldest" : "latest";
  const supabase = createPublicClient();

  const [{ count: initialCount }, eventsMetaResponse] = await Promise.all([
    supabase
      .from("battles")
      .select("id", { count: "exact", head: true })
      .neq("status", "excluded"),
    supabase
      .from("battles")
      .select("event_name, event_date")
      .neq("status", "excluded")
      .order("event_date", { ascending: sort === "oldest" })
      .limit(5000),
  ]);

  if (eventsMetaResponse.error) {
    console.error(
      "Error fetching battles event metadata on server:",
      eventsMetaResponse.error,
    );
  }

  const allEventRows = eventsMetaResponse.data || [];
  const eventMeta = new Map<string, { min: number; max: number }>();

  for (const row of allEventRows) {
    const key = row.event_name || OTHER_BATTLES_KEY;
    const date = row.event_date ? new Date(row.event_date).getTime() : 0;
    const current = eventMeta.get(key) || {
      min: Infinity,
      max: -Infinity,
    };

    if (date < current.min) current.min = date;
    if (date > current.max) current.max = date;
    eventMeta.set(key, current);
  }

  const orderedEventNames = Array.from(eventMeta.entries())
    .sort((a, b) => {
      const dateA = sort === "oldest" ? a[1].min : a[1].max;
      const dateB = sort === "oldest" ? b[1].min : b[1].max;

      if (dateA !== dateB) {
        return sort === "oldest" ? dateA - dateB : dateB - dateA;
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([name]) => name);

  const initialTotalEvents = orderedEventNames.length;
  const firstPageEventNames = orderedEventNames.slice(
    0,
    INITIAL_EVENTS_PER_PAGE,
  );
  const includeOtherBattles = firstPageEventNames.includes(OTHER_BATTLES_KEY);
  const namedEvents = firstPageEventNames.filter(
    (name) => name !== OTHER_BATTLES_KEY,
  );

  const [namedEventsResponse, otherBattlesResponse] = await Promise.all([
    namedEvents.length > 0
      ? supabase
          .from("battles")
          .select("id, title, youtube_id, event_name, event_date, status, url")
          .neq("status", "excluded")
          .in("event_name", namedEvents)
          .order("event_date", {
            ascending: sort === "oldest",
            nullsFirst: false,
          })
      : Promise.resolve({ data: [], error: null }),
    includeOtherBattles
      ? supabase
          .from("battles")
          .select("id, title, youtube_id, event_name, event_date, status, url")
          .neq("status", "excluded")
          .is("event_name", null)
          .order("event_date", {
            ascending: sort === "oldest",
            nullsFirst: false,
          })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (namedEventsResponse.error) {
    console.error(
      "Error fetching initial battles page for named events:",
      namedEventsResponse.error,
    );
  }
  if (otherBattlesResponse.error) {
    console.error(
      "Error fetching initial battles page for unnamed events:",
      otherBattlesResponse.error,
    );
  }

  const eventOrder = new Map(
    firstPageEventNames.map((name, idx) => [name, idx]),
  );
  const initialBattles = [
    ...(namedEventsResponse.data || []),
    ...(otherBattlesResponse.data || []),
  ].sort((a, b) => {
    const keyA = a.event_name || OTHER_BATTLES_KEY;
    const keyB = b.event_name || OTHER_BATTLES_KEY;
    const groupA = eventOrder.get(keyA) ?? Number.MAX_SAFE_INTEGER;
    const groupB = eventOrder.get(keyB) ?? Number.MAX_SAFE_INTEGER;

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    return sort === "oldest" ? dateA - dateB : dateB - dateA;
  });

  const initialYears: string[] = [];

  const initialEventNames = Array.from(
    new Set(initialBattles.map((d) => d.event_name).filter(Boolean)),
  )
    .sort((a, b) => a!.localeCompare(b!))
    .filter((n): n is string => n !== null);

  return (
    <BattlesDirectory
      initialBattles={initialBattles}
      initialCount={initialCount || 0}
      initialTotalEvents={initialTotalEvents}
      initialYears={initialYears}
      initialEventNames={initialEventNames}
    />
  );
}
