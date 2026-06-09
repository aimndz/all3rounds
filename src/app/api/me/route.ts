import { NextResponse } from "next/server";
import { getUserWithRole } from "@/lib/auth";
import { PRIVATE_CACHE_HEADERS } from "@/lib/api-utils";
import { createAdminClient } from "@/db/d1-client";
import { findContributorLeaderboardIdentity } from "@/lib/contributor-leaderboard";
import { revalidateContributorLeaderboard } from "@/lib/leaderboard-cache";
import {
  defaultUsernameForUserId,
  isValidUsername,
  normalizeUsername,
} from "@/lib/user-profile";
import { buildAnnotationResponse, type AnnotationRow } from "@/lib/annotations";

type AnnotationResponse = Awaited<
  ReturnType<typeof buildAnnotationResponse>
>[number];
type AnnotationRangeInput = NonNullable<
  Parameters<typeof buildAnnotationResponse>[0]["ranges"]
>[number];
type ProfileAnnotation = AnnotationResponse & { battle_title: string };

export async function GET() {
  const { user, role } = await getUserWithRole();

  if (!user) {
    return NextResponse.json(
      { user: null, role: "viewer" },
      { headers: PRIVATE_CACHE_HEADERS },
    );
  }

  const adminClient = createAdminClient();

  let resolvedBio = user.bio ?? null;
  if (!resolvedBio) {
    const contributor = await findContributorLeaderboardIdentity({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });
    const targetId =
      contributor && contributor.user_id !== user.id
        ? contributor.user_id
        : user.id;
    const { data: profileRow } = await adminClient
      .from("user_profiles")
      .select("bio")
      .eq("id", targetId)
      .maybeSingle();
    resolvedBio = (profileRow as { bio?: string | null } | null)?.bio ?? null;
  }

  const { data: annotations } = await adminClient
    .from("annotations")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  let responseAnnotations: ProfileAnnotation[] = [];
  if (annotations && annotations.length > 0) {
    const annotationRows = annotations as AnnotationRow[];
    const annotationIds = annotationRows.map((annotation) => annotation.id);
    const battleIds = Array.from(
      new Set(annotationRows.map((annotation) => annotation.battle_id)),
    );

    const [rangesResult, battlesResult] = await Promise.all([
      adminClient
        .from("annotation_line_ranges")
        .select("*")
        .in("annotation_id", annotationIds),
      adminClient.from("battles").select("id, title").in("id", battleIds),
    ]);

    const rangeRows = (rangesResult.data ?? []) as AnnotationRangeInput[];
    const battleRows = (battlesResult.data ?? []) as {
      id: string;
      title: string;
    }[];
    const battlesMap = new Map(battleRows.map((b) => [b.id, b.title]));

    const baseAnnotations = await buildAnnotationResponse({
      annotations: annotationRows,
      ranges: rangeRows,
      currentUserId: user.id,
    });

    responseAnnotations = baseAnnotations.map((annotation) => ({
      ...annotation,
      battle_title: battlesMap.get(annotation.battle_id) ?? "Unknown Battle",
    }));
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        rep: user.rep,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
        bio: resolvedBio,
        annotationCount: user.annotationCount ?? 0,
        annotations: responseAnnotations,
      },
      role,
    },
    { headers: PRIVATE_CACHE_HEADERS },
  );
}

export async function PATCH(request: Request) {
  const { user } = await getUserWithRole();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  const username =
    typeof payload === "object" && payload !== null && "username" in payload
      ? normalizeUsername(String(payload.username ?? ""))
      : "";

  const displayName =
    typeof payload === "object" && payload !== null && "displayName" in payload
      ? String(payload.displayName ?? "").trim()
      : "";

  const bio =
    typeof payload === "object" && payload !== null && "bio" in payload
      ? String(payload.bio ?? "").trim()
      : null;

  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3-24 characters and use lowercase letters, numbers, or underscores.",
      },
      { status: 400, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  if (!displayName) {
    return NextResponse.json(
      { error: "Display name cannot be empty." },
      { status: 400, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  if (displayName.length > 50) {
    return NextResponse.json(
      { error: "Display name must be 50 characters or less." },
      { status: 400, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  if (bio && bio.length > 160) {
    return NextResponse.json(
      { error: "Bio must be 160 characters or less." },
      { status: 400, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  const adminClient = createAdminClient();
  const contributor = await findContributorLeaderboardIdentity({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  });
  const allowedProfileIds = new Set(
    [user.id, contributor?.user_id].filter(Boolean),
  );
  const { data: existing, error: existingError } = await adminClient
    .from("user_profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingError) {
    console.error("Username availability check error:", existingError);
    return NextResponse.json(
      { error: "Failed to check username availability." },
      { status: 500, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  if (existing && !allowedProfileIds.has(existing.id)) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  const now = new Date().toISOString();
  const linkedContributorId =
    contributor && contributor.user_id !== user.id ? contributor.user_id : null;

  if (linkedContributorId) {
    const { error: resetError } = await adminClient
      .from("user_profiles")
      .upsert(
        {
          id: user.id,
          username: defaultUsernameForUserId(user.id),
          updated_at: now,
        },
        { onConflict: "id" },
      );

    if (resetError) {
      console.error("Profile reset error:", resetError);
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: 500, headers: PRIVATE_CACHE_HEADERS },
      );
    }
  }

  const targetProfileId = linkedContributorId ?? user.id;
  const { error } = await adminClient.from("user_profiles").upsert(
    {
      id: targetProfileId,
      username,
      display_name: displayName,
      bio: bio || null,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500, headers: PRIVATE_CACHE_HEADERS },
    );
  }

  await revalidateContributorLeaderboard(request);

  return NextResponse.json(
    {
      user: {
        ...user,
        username,
        displayName,
        bio: bio || null,
      },
    },
    { headers: PRIVATE_CACHE_HEADERS },
  );
}
