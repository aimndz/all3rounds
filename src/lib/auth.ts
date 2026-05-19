import { createAdminClient } from "@/lib/supabase/server";
import { getBetterAuth } from "@/lib/better-auth";
import { cookies, headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

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
};

type UserWithRoleResult = {
  user: AuthUser | null;
  role: UserRole;
};

type UserProfile = {
  role: string;
  display_name: string | null;
} | null;

// ============================================================================
// Permissions Map
// ============================================================================

const PERMISSIONS: Record<string, UserRole[]> = {
  "lines:edit": ["superadmin", "admin", "moderator", "verified_emcee"],
  "lines:batch_edit": ["superadmin", "admin"],
  "lines:delete": ["superadmin"],
  "users:manage": ["superadmin"],
  "emcees:manage": ["superadmin"],
  "battles:manage": ["superadmin", "admin"],
  "battles:edit_status": ["superadmin", "admin"],
  "battles:edit_event_name": ["superadmin"],
  "battles:edit_event_date": ["superadmin"],
  "battles:delete": ["superadmin"],
  "suggestions:create": [
    "superadmin",
    "admin",
    "moderator",
    "verified_emcee",
    "viewer",
  ],
  "suggestions:review": ["superadmin", "admin", "moderator"],
};

const inFlightUserRoleLookups = new Map<string, Promise<UserWithRoleResult>>();

function isBetterAuthCookie(name: string) {
  return name.includes("better-auth");
}

async function getUserProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<UserProfile> {
  const { data: profile } = await adminClient
    .from("user_profiles")
    .select("role, display_name")
    .eq("id", userId)
    .single();

  return profile;
}

function buildAuthResult(
  user: { id: string; email: string; name?: string | null },
  profile: UserProfile,
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
    },
    role,
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the current user and their role from the database.
 * Returns null user if not logged in; defaults to 'viewer' if no profile found.
 */
export async function getUserWithRole(): Promise<{
  user: AuthUser | null;
  role: UserRole;
}> {
  // Fast exit for completely anonymous users.
  // In non-request contexts (e.g. some tests), cookies() can throw.
  let hasAuthCookie = false;
  let authCookieFingerprint = "";
  let authCookies: { name: string; value: string }[] = [];
  try {
    const cookieStore = await cookies();
    authCookies = cookieStore
      .getAll()
      .filter((cookie) => isBetterAuthCookie(cookie.name));

    hasAuthCookie = authCookies.length > 0;
    authCookieFingerprint = authCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .sort()
      .join(";");
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
      return buildAuthResult(session.user, profile);
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

/**
 * Check if a role has permission for a specific action.
 */
export function hasPermission(role: UserRole, action: string): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

/**
 * Require a specific permission. Returns the user if authorized,
 * or throws with an appropriate error response.
 */
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
