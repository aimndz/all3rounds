import { createAdminClient } from "@/db/d1-client";
import { getBetterAuth } from "@/lib/better-auth";
import {
  findContributorLeaderboardIdentity,
  getContributorRepForUser,
} from "@/lib/contributor-leaderboard";
import { cookies, headers } from "next/headers";

export type UserRole =
  | "superadmin"
  | "admin"
  | "moderator"
  | "verified_emcee"
  | "viewer";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  username: string | null;
  rep: number;
};

type UserWithRoleResult = {
  user: AuthUser | null;
  role: UserRole;
};

type UserProfile = {
  role: string;
  display_name: string | null;
  username: string | null;
} | null;

const PERMISSIONS: Record<string, UserRole[]> = {
  "lines:edit": ["superadmin", "admin", "moderator", "verified_emcee"],
  "lines:batch_edit": ["superadmin", "admin"],
  "lines:delete": ["superadmin"],
  "users:manage": ["superadmin"],
  "emcees:manage": ["superadmin"],
  "battles:manage": ["superadmin", "admin"],
  "battles:edit_status": ["superadmin", "admin"],
  "battles:edit_visibility": ["superadmin", "admin"],
  "battles:edit_event_name": ["superadmin"],
  "battles:edit_event_date": ["superadmin"],
  "battles:delete": ["superadmin", "admin"],
  "suggestions:create": [
    "superadmin",
    "admin",
    "moderator",
    "verified_emcee",
    "viewer",
  ],
  "suggestions:review": ["superadmin", "admin", "moderator"],
  "annotations:create": [
    "superadmin",
    "admin",
    "moderator",
    "verified_emcee",
    "viewer",
  ],
  "annotations:moderate": ["superadmin", "admin", "moderator"],
};

const inFlightUserRoleLookups = new Map<string, Promise<UserWithRoleResult>>();

function isBetterAuthCookie(name: string) {
  return name === "better-auth.session_token" || name.endsWith(".session_token");
}

async function hashAuthCookies(cookiesToHash: { name: string; value: string }[]) {
  const payload = cookiesToHash
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .sort()
    .join(";");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getUserProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<UserProfile> {
  const { data: profile } = await adminClient
    .from("user_profiles")
    .select("role, display_name, username")
    .eq("id", userId)
    .single();

  return profile;
}

function buildAuthResult(
  user: { id: string; email: string; name?: string | null },
  profile: UserProfile,
  rep = 0,
  username?: string | null,
): UserWithRoleResult {
  const role = (profile?.role ?? "viewer") as UserRole;

  return {
    user: {
      id: user.id,
      email: user.email,
      role,
      displayName:
        profile?.display_name ??
        user.name ??
        user.email.split("@")[0] ??
        "User",
      username: username ?? profile?.username ?? null,
      rep,
    },
    role,
  };
}

export async function getUserWithRole(): Promise<{
  user: AuthUser | null;
  role: UserRole;
}> {
  let hasAuthCookie = false;
  let authCookieFingerprint = "";
  let authCookies: { name: string; value: string }[] = [];
  try {
    const cookieStore = await cookies();
    authCookies = cookieStore
      .getAll()
      .filter((cookie) => isBetterAuthCookie(cookie.name));

    hasAuthCookie = authCookies.length > 0;
    authCookieFingerprint = hasAuthCookie
      ? await hashAuthCookies(authCookies)
      : "";
  } catch {
    return { user: null, role: "viewer" };
  }

  if (!hasAuthCookie) {
    return { user: null, role: "viewer" };
  }

  const lookupKey = authCookieFingerprint || "auth-cookie-present";
  const existingLookup = inFlightUserRoleLookups.get(lookupKey);
  if (existingLookup) {
    return existingLookup;
  }

  const lookupPromise = (async (): Promise<UserWithRoleResult> => {
    const session = await getBetterAuth().api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      const adminClient = createAdminClient();
      const profile = await getUserProfile(adminClient, session.user.id);
      const displayName =
        profile?.display_name ??
        session.user.name ??
        session.user.email.split("@")[0];
      const [directRep, contributor] = await Promise.all([
        getContributorRepForUser(session.user.id),
        findContributorLeaderboardIdentity({
          userId: session.user.id,
          username: profile?.username,
          displayName,
        }),
      ]);
      const rep = contributor?.rep ?? directRep;
      return buildAuthResult(session.user, profile, rep, contributor?.username);
    }

    return { user: null, role: "viewer" };
  })();

  inFlightUserRoleLookups.set(lookupKey, lookupPromise);
  try {
    return await lookupPromise;
  } finally {
    inFlightUserRoleLookups.delete(lookupKey);
  }
}

export function hasPermission(role: UserRole, action: string): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

export async function requirePermission(action: string): Promise<
  | {
      user: AuthUser;
      role: UserRole;
      error: null;
    }
  | {
      user: null;
      role: UserRole;
      error: { message: string; status: number };
    }
> {
  const { user, role } = await getUserWithRole();

  if (!user) {
    return {
      user: null,
      role: "viewer",
      error: { message: "You must be logged in.", status: 401 },
    };
  }

  if (!hasPermission(role, action)) {
    return {
      user: null,
      role,
      error: {
        message: `Insufficient permissions. Requires: ${PERMISSIONS[action]?.join(", ") ?? action}`,
        status: 403,
      },
    };
  }

  return { user, role, error: null };
}
