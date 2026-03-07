import { create } from "zustand";
import type { UserRole, AuthUser } from "@/lib/auth";

type AuthState = {
  user: AuthUser | null;
  userRole: UserRole;
  isUserLoggedIn: boolean;
  isLoading: boolean;
  canEdit: boolean;
  canBatchEdit: boolean;
  canDelete: boolean;
  isSuperAdmin: boolean;
  fetchUser: () => Promise<void>;
};

const EDIT_ROLES: UserRole[] = [
  "superadmin",
  "admin",
  "moderator",
  "verified_emcee",
];
const BATCH_EDIT_ROLES: UserRole[] = ["superadmin", "admin"];

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: "viewer",
  isUserLoggedIn: false,
  isLoading: true,
  canEdit: false,
  canBatchEdit: false,
  canDelete: false,
  isSuperAdmin: false,
  fetchUser: async () => {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      const role: UserRole = data.role || "viewer";
      set({
        user: data.user || null,
        userRole: role,
        isUserLoggedIn: !!data.user,
        isLoading: false,
        canEdit: EDIT_ROLES.includes(role),
        canBatchEdit: BATCH_EDIT_ROLES.includes(role),
        canDelete: role === "superadmin",
        isSuperAdmin: role === "superadmin",
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
