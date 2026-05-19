import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  battleParticipants,
  battles,
  emceeAliases,
  emcees,
  lines,
  lineSpeakers,
  videoProcessingStatus,
} from "@/db/schema";
import { normalizeBattleLeague, normalizeBattleSlug } from "@/lib/battles";
import { normalizeEmceeSlug } from "@/lib/emcees";
import { requireIngestToken } from "../_auth";
import { z } from "zod";

const SegmentSchema = z.object({
  speaker: z.string().min(1).max(80),
  text: z.string().min(1),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
});

const TranscriptSchema = z.object({
  youtube_id: z.string().min(1).max(64),
  title: z.string().min(1).max(300),
  event_name: z.string().max(200).nullable().optional(),
  event_date: z.string().max(30).nullable().optional(),
  participants: z.array(z.string().min(1).max(120)).max(20).default([]),
  segments: z.array(SegmentSchema).min(1),
});

function uniqueSlug(base: string, taken: Set<string>) {
  let slug = base;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(slug);
  return slug;
}

export async function POST(request: NextRequest) {
  const unauthorized = requireIngestToken(request);
  if (unauthorized) return unauthorized;

  const parsed = TranscriptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const payload = parsed.data;
  const db = getDb();
  const existing = await db
    .select({ id: battles.id })
    .from(battles)
    .where(eq(battles.youtubeId, payload.youtube_id))
    .limit(1);

  if (existing[0]) {
    return NextResponse.json({
      battle_id: existing[0].id,
      line_count: 0,
      skipped: true,
    });
  }

  const battleId = crypto.randomUUID();
  const league = normalizeBattleLeague("fliptop");
  const slugBase = normalizeBattleSlug(payload.title);
  const existingSlugs = await db
    .select({ slug: battles.slug })
    .from(battles)
    .where(eq(battles.league, league));
  const slug = uniqueSlug(slugBase, new Set(existingSlugs.map((row) => row.slug)));
  const now = new Date();

  const speakerToEmcee = new Map<string, string>();
  const participantRows = payload.participants.map((name) => {
    const id = crypto.randomUUID();
    return {
      id,
      slug: normalizeEmceeSlug(name),
      name,
      akaJson: "[]",
      battleCount: 0,
      createdAt: now,
    };
  });

  await db.transaction(async (tx) => {
    for (const participant of participantRows) {
      await tx
        .insert(emcees)
        .values(participant)
        .onConflictDoNothing();

      const existingEmcee = await tx
        .select({ id: emcees.id })
        .from(emcees)
        .where(eq(emcees.slug, participant.slug))
        .limit(1);
      const emceeId = existingEmcee[0]?.id ?? participant.id;
      speakerToEmcee.set(participant.name.toLowerCase(), emceeId);

      await tx
        .insert(emceeAliases)
        .values({
          emceeId,
          alias: participant.name,
          aliasNormalized: normalizeEmceeSlug(participant.name),
        })
        .onConflictDoNothing();
    }

    await tx.insert(battles).values({
      id: battleId,
      league,
      slug,
      title: payload.title,
      youtubeId: payload.youtube_id,
      eventName: payload.event_name ?? null,
      eventDate: payload.event_date ?? null,
      status: "raw",
      createdAt: now,
    });

    for (const [index, participant] of participantRows.entries()) {
      const emceeId = speakerToEmcee.get(participant.name.toLowerCase());
      if (!emceeId) continue;
      await tx.insert(battleParticipants).values({
        id: crypto.randomUUID(),
        battleId,
        emceeId,
        label: `MC${index + 1}`,
      });
    }

    for (const segment of payload.segments) {
      const emceeId = speakerToEmcee.get(segment.speaker.toLowerCase()) ?? null;
      const inserted = await tx.insert(lines).values({
        battleId,
        emceeId,
        roundNumber: null,
        speakerLabel: segment.speaker,
        content: segment.text,
        startTime: segment.start,
        endTime: segment.end,
        createdAt: now,
      }).returning({ id: lines.id });

      if (emceeId && inserted[0]) {
        await tx.insert(lineSpeakers).values({
          lineId: inserted[0].id,
          emceeId,
        }).onConflictDoNothing();
      }
    }

    await tx
      .insert(videoProcessingStatus)
      .values({
        youtubeId: payload.youtube_id,
        status: "completed",
        workerId: null,
        startedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: videoProcessingStatus.youtubeId,
        set: {
          status: "completed",
          updatedAt: now,
        },
      });
  });

  return NextResponse.json({
    battle_id: battleId,
    line_count: payload.segments.length,
  });
}
