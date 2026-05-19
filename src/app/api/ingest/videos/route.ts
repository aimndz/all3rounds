import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { battles, videoProcessingStatus } from "@/db/schema";
import { requireIngestToken } from "../_auth";
import { z } from "zod";

const ClaimVideoSchema = z.object({
  youtube_id: z.string().min(1).max(64),
  worker_id: z.string().min(1).max(200),
});

const MarkVideoSchema = z.object({
  youtube_id: z.string().min(1).max(64),
  status: z.enum(["completed", "failed"]),
});

export async function GET(request: NextRequest) {
  const unauthorized = requireIngestToken(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const [battleRows, statusRows] = await Promise.all([
    db.select({ youtubeId: battles.youtubeId }).from(battles),
    db
      .select({ youtubeId: videoProcessingStatus.youtubeId })
      .from(videoProcessingStatus)
      .where(inArray(videoProcessingStatus.status, ["processing", "completed"])),
  ]);

  const youtubeIds = Array.from(
    new Set([
      ...battleRows.map((row) => row.youtubeId),
      ...statusRows.map((row) => row.youtubeId),
    ]),
  );

  return NextResponse.json({ youtube_ids: youtubeIds });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireIngestToken(request);
  if (unauthorized) return unauthorized;

  const parsed = ClaimVideoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { youtube_id: youtubeId, worker_id: workerId } = parsed.data;
  const db = getDb();
  const existingBattle = await db
    .select({ id: battles.id })
    .from(battles)
    .where(eq(battles.youtubeId, youtubeId))
    .limit(1);

  if (existingBattle.length > 0) {
    return NextResponse.json({ claimed: false, reason: "completed" });
  }

  const now = Date.now();
  await db
    .insert(videoProcessingStatus)
    .values({
      youtubeId,
      status: "processing",
      workerId,
      startedAt: new Date(now),
      updatedAt: new Date(now),
    })
    .onConflictDoNothing();

  const lock = await db
    .select({
      status: videoProcessingStatus.status,
      workerId: videoProcessingStatus.workerId,
    })
    .from(videoProcessingStatus)
    .where(eq(videoProcessingStatus.youtubeId, youtubeId))
    .limit(1);

  return NextResponse.json({
    claimed: lock[0]?.status === "processing" && lock[0]?.workerId === workerId,
  });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireIngestToken(request);
  if (unauthorized) return unauthorized;

  const parsed = MarkVideoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { youtube_id: youtubeId, status } = parsed.data;
  const now = Date.now();

  await getDb()
    .insert(videoProcessingStatus)
    .values({
      youtubeId,
      status,
      workerId: null,
      startedAt: new Date(now),
      updatedAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: videoProcessingStatus.youtubeId,
      set: {
        status,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return NextResponse.json({ ok: true });
}
