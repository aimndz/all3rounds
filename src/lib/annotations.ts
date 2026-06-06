import { z } from "zod";
import { createAdminClient, createPublicClient } from "@/db/d1-client";
import { hasPermission, type UserRole } from "@/lib/auth";
import { getContributorLeaderboard } from "@/lib/contributor-leaderboard";

export const ANNOTATION_MAX_BODY_LENGTH = 8000;
export const ANNOTATION_MIN_BODY_LENGTH = 3;
export const ANNOTATION_REFERENCE_LIMIT = 20;

export const AnnotationReferenceSchema = z.object({
  line_id: z.number().int().positive(),
  label: z.string().trim().max(80).optional(),
});

export const AnnotationTextTargetSchema = z.object({
  line_id: z.number().int().positive("Invalid target line ID"),
  start_text_offset: z.number().int().nonnegative(),
  end_text_offset: z.number().int().positive(),
  selected_text: z.string().trim().max(1000),
});

export const AnnotationBodyJsonSchema = z
  .record(z.string(), z.unknown())
  .or(z.array(z.unknown()));

export const CreateAnnotationSchema = z.object({
  battle_id: z.string().uuid("Invalid battle ID"),
  start_line_id: z.number().int().positive("Invalid start line ID"),
  end_line_id: z.number().int().positive("Invalid end line ID"),
  target_line_id: z.number().int().positive("Invalid target line ID").optional(),
  start_text_offset: z.number().int().nonnegative().optional(),
  end_text_offset: z.number().int().positive().optional(),
  selected_text: z.string().trim().max(1000).optional(),
  annotation_targets: z.array(AnnotationTextTargetSchema).max(20).optional(),
  body_json: AnnotationBodyJsonSchema,
  body_text: z
    .string()
    .trim()
    .min(
      ANNOTATION_MIN_BODY_LENGTH,
      `Annotation must be at least ${ANNOTATION_MIN_BODY_LENGTH} characters.`,
    )
    .max(ANNOTATION_MAX_BODY_LENGTH, "Annotation is too long."),
  references: z
    .array(AnnotationReferenceSchema)
    .max(ANNOTATION_REFERENCE_LIMIT)
    .optional()
    .default([]),
});

export const UpdateAnnotationSchema = z.object({
  body_json: AnnotationBodyJsonSchema.optional(),
  body_text: z
    .string()
    .trim()
    .min(
      ANNOTATION_MIN_BODY_LENGTH,
      `Annotation must be at least ${ANNOTATION_MIN_BODY_LENGTH} characters.`,
    )
    .max(ANNOTATION_MAX_BODY_LENGTH, "Annotation is too long.")
    .optional(),
  references: z
    .array(AnnotationReferenceSchema)
    .max(ANNOTATION_REFERENCE_LIMIT)
    .optional(),
  status: z.enum(["published", "hidden", "deleted"]).optional(),
  quality_state: z
    .enum(["normal", "trusted", "verified", "flagged", "needs_review"])
    .optional(),
});

export const ReportAnnotationSchema = z.object({
  reason: z.enum(["spam", "abuse", "incorrect", "duplicate", "other"]),
  details: z.string().trim().max(1000).optional(),
});

export const AnnotationHelperSchema = z.object({
  action: z.enum([
    "explain",
    "improve",
    "clearer",
    "context",
    "references",
  ]),
  battle_id: z.string().uuid("Invalid battle ID"),
  selected_line_ids: z.array(z.number().int().positive()).min(1).max(20),
  draft_body_text: z.string().trim().max(ANNOTATION_MAX_BODY_LENGTH).optional(),
});

export type AnnotationLine = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  content_version?: number;
  speaker_label: string | null;
};

export type AnnotationRow = {
  id: string;
  battle_id: string;
  author_id: string;
  body_json: string;
  body_text: string;
  status: string;
  score: number;
  quality_state: string;
  created_at: string | number;
  updated_at: string | number;
  deleted_at?: string | number | null;
};

type AnnotationRangeRow = {
  id: string;
  annotation_id: string;
  battle_id: string;
  start_line_id: number | null;
  end_line_id: number | null;
  start_line_sort: number;
  end_line_sort: number;
  start_text_offset?: number | null;
  end_text_offset?: number | null;
  selected_text?: string | null;
  line_snapshot_json: string;
};

type AnnotationReferenceRow = {
  id: string;
  annotation_id: string;
  battle_id: string;
  line_id: number | null;
  line_sort: number;
  label: string;
};

type ProfileRow = {
  id: string;
  role?: string | null;
  trust_level?: string | null;
  display_name?: string | null;
  username?: string | null;
};

type AuthUserRow = {
  id: string;
  image?: string | null;
};

type UserPointRow = {
  user_id: string;
  annotation_points?: number | null;
  transcript_points?: number | null;
  total_points?: number | null;
};

type VoteRow = {
  annotation_id: string;
};

export function parseStoredJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { type: "doc", content: [] };
  }
}

export function canModerateAnnotations(role: UserRole) {
  return hasPermission(role, "annotations:moderate");
}

export function sortSelectedLines(lines: AnnotationLine[]) {
  return [...lines].sort(
    (left, right) => left.start_time - right.start_time || left.id - right.id,
  );
}

export function buildLineSnapshot(lines: AnnotationLine[]) {
  return JSON.stringify(
    sortSelectedLines(lines).map((line) => ({
      id: line.id,
      content: line.content,
      start_time: line.start_time,
      end_time: line.end_time,
      content_version: line.content_version ?? 1,
      speaker_label: line.speaker_label,
    })),
  );
}

export async function fetchVisibleBattle(
  battleId: string,
  role: UserRole,
) {
  const canViewHidden = hasPermission(role, "battles:manage");
  const dbClient = canViewHidden ? createAdminClient() : createPublicClient();
  let query = dbClient
    .from("battles")
    .select("id, public_visible")
    .eq("id", battleId);

  if (!canViewHidden) {
    query = query.eq("public_visible", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as { id: string; public_visible?: boolean | number };
}

export async function fetchLineRange(options: {
  battleId: string;
  startLineId: number;
  endLineId: number;
}) {
  const adminClient = createAdminClient();
  const selectedIds = Array.from(
    new Set([options.startLineId, options.endLineId]),
  );
  const { data: endpoints, error } = await adminClient
    .from("lines")
    .select(
      "id, content, start_time, end_time, content_version, speaker_label, battle_id",
    )
    .eq("battle_id", options.battleId)
    .in("id", selectedIds);

  const endpointRows = (endpoints ?? []) as (AnnotationLine & {
    battle_id: string;
  })[];
  if (error || endpointRows.length !== selectedIds.length) {
    return { lines: [], error: "Selected line range was not found." };
  }

  const sortedEndpoints = sortSelectedLines(endpointRows);
  const startSort = sortedEndpoints[0].start_time;
  const endSort = sortedEndpoints[sortedEndpoints.length - 1].start_time;

  const { data: rangeLines, error: rangeError } = await adminClient
    .from("lines")
    .select("id, content, start_time, end_time, content_version, speaker_label")
    .eq("battle_id", options.battleId)
    .gte("start_time", startSort)
    .lte("start_time", endSort)
    .order("start_time", { ascending: true });

  if (rangeError || !rangeLines) {
    return { lines: [], error: "Failed to read selected lines." };
  }

  return {
    lines: sortSelectedLines(rangeLines as AnnotationLine[]),
    error: null,
  };
}

export async function fetchReferences(
  battleId: string,
  references: { line_id: number; label?: string }[],
) {
  if (references.length === 0) return { references: [], error: null };

  const ids = Array.from(new Set(references.map((item) => item.line_id)));
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("lines")
    .select("id, content, start_time, battle_id")
    .eq("battle_id", battleId)
    .in("id", ids);

  if (error || !data || (data as { id: number }[]).length !== ids.length) {
    return { references: [], error: "One or more referenced lines were not found." };
  }

  const byId = new Map(
    (data as { id: number; content: string; start_time: number }[]).map(
      (line) => [line.id, line],
    ),
  );

  return {
    references: references.flatMap((reference) => {
      const line = byId.get(reference.line_id);
      if (!line) return [];
      return {
        line_id: line.id,
        line_sort: line.start_time,
        label: reference.label?.trim() || `Line ${line.id}`,
      };
    }),
    error: null,
  };
}

export async function buildAnnotationResponse(options: {
  annotations: AnnotationRow[];
  ranges?: AnnotationRangeRow[];
  currentUserId?: string | null;
}) {
  const annotationIds = options.annotations.map((annotation) => annotation.id);
  if (annotationIds.length === 0) return [];

  const adminClient = createAdminClient();
  const authorIds = Array.from(
    new Set(options.annotations.map((annotation) => annotation.author_id)),
  );

  const [
    { data: profiles },
    { data: authUsers },
    { data: points },
    { data: references },
    voteResult,
    contributorsResult,
  ] = await Promise.all([
      adminClient
        .from("user_profiles")
        .select("id, role, trust_level, display_name, username")
        .in("id", authorIds),
      adminClient.from("user").select("id, image").in("id", authorIds),
      adminClient
        .from("user_points")
        .select("user_id, annotation_points, transcript_points, total_points")
        .in("user_id", authorIds),
      adminClient
        .from("annotation_line_references")
        .select("id, annotation_id, battle_id, line_id, line_sort, label")
        .in("annotation_id", annotationIds),
      options.currentUserId
        ? adminClient
            .from("annotation_votes")
            .select("annotation_id")
            .eq("user_id", options.currentUserId)
            .in("annotation_id", annotationIds)
        : Promise.resolve({ data: [] }),
      getContributorLeaderboard(100).catch(() => ({ data: [], error: null })),
    ]);

  const profilesById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const authUsersById = new Map(
    ((authUsers ?? []) as AuthUserRow[]).map((user) => [user.id, user]),
  );
  const pointsById = new Map(
    ((points ?? []) as UserPointRow[]).map((point) => [point.user_id, point]),
  );
  const refsByAnnotation = new Map<string, AnnotationReferenceRow[]>();
  ((references ?? []) as AnnotationReferenceRow[]).forEach((reference) => {
    const current = refsByAnnotation.get(reference.annotation_id) ?? [];
    current.push(reference);
    refsByAnnotation.set(reference.annotation_id, current);
  });
  const votedIds = new Set(
    ((voteResult.data ?? []) as VoteRow[]).map((vote) => vote.annotation_id),
  );
  const rangeByAnnotation = new Map(
    (options.ranges ?? []).map((range) => [range.annotation_id, range]),
  );

  return options.annotations.map((annotation) => {
    const profile = profilesById.get(annotation.author_id);
    const authUser = authUsersById.get(annotation.author_id);
    const point = pointsById.get(annotation.author_id);
    const range = rangeByAnnotation.get(annotation.id);
    const contributor = contributorsResult.data.find(
      (row) =>
        row.user_id === annotation.author_id ||
        (profile?.username && row.username === profile.username) ||
        (profile?.display_name && row.display_name === profile.display_name),
    );
    const profilePoints = point?.total_points ?? point?.annotation_points ?? 0;
    return {
      id: annotation.id,
      battle_id: annotation.battle_id,
      author_id: annotation.author_id,
      body_json: parseStoredJson(annotation.body_json),
      body_text: annotation.body_text,
      status: annotation.status,
      score: annotation.score,
      quality_state: annotation.quality_state,
      created_at: annotation.created_at,
      updated_at: annotation.updated_at,
      deleted_at: annotation.deleted_at ?? null,
      current_user_voted: votedIds.has(annotation.id),
      can_edit: options.currentUserId === annotation.author_id,
      author: {
        id: annotation.author_id,
        display_name:
          profile?.display_name ??
          contributor?.display_name ??
          contributor?.username ??
          profile?.username ??
          "All3Rounds user",
        username: contributor?.username ?? profile?.username ?? null,
        image_url: authUser?.image ?? null,
        role: profile?.role ?? "viewer",
        trust_level: profile?.trust_level ?? "new",
        points: contributor?.rep ?? profilePoints,
      },
      range: range
        ? {
            start_line_id: range.start_line_id,
            end_line_id: range.end_line_id,
            start_line_sort: range.start_line_sort,
            end_line_sort: range.end_line_sort,
            start_text_offset: range.start_text_offset ?? null,
            end_text_offset: range.end_text_offset ?? null,
            selected_text: range.selected_text ?? null,
            line_snapshot: parseStoredJson(range.line_snapshot_json),
          }
        : null,
      references: (refsByAnnotation.get(annotation.id) ?? []).map((ref) => ({
        id: ref.id,
        line_id: ref.line_id,
        line_sort: ref.line_sort,
        label: ref.label,
      })),
    };
  });
}
