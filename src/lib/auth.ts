import { createClient, createAdminClient } from "@/lib/supabase/server";

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
  "battles:edit_status": ["superadmin", "admin", "moderator"],
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: "viewer" };
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("user_profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "viewer") as UserRole;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      role,
      displayName:
        profile?.display_name ??
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "User",
    },
    role,
  };
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
