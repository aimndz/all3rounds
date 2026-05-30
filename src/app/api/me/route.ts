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

export async function GET() {
  const { user, role } = await getUserWithRole();

  if (!user) {
    return NextResponse.json(
      { user: null, role: "viewer" },
      { headers: PRIVATE_CACHE_HEADERS },
    );
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

  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3-24 characters and use lowercase letters, numbers, or underscores.",
      },
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
  const { error } = await adminClient
    .from("user_profiles")
    .upsert(
      { id: targetProfileId, username, updated_at: now },
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
      },
    },
    { headers: PRIVATE_CACHE_HEADERS },
  );
}
