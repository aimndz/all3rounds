"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

/**
 * AuthButton Component
 *
 * Handles user authentication state, login/logout actions, and displays
 * a profile dropdown menu with role-based navigation options.
 */
export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  /**
   * Fetches the current user profile and role from the Next.js API.
   * Uses cache-busting to ensure fresh data, especially after auth state changes.
   */
  const fetchUser = async () => {
    try {
      // Append timestamp to bypass aggressive browser/Next.js edge caching
      const res = await fetch(`/api/me?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setUser(data.user || null);
    } catch (error) {
      // Silently handle fetch errors (e.g., when offline or unauthenticated)
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user data on initial component mount
  useEffect(() => {
    fetchUser();
  }, []);

  /**
   * Initiates the Google OAuth flow via Supabase.
   */
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  /**
   * Completely signs out the user and clears all local session data.
   * Performs a hard redirect to ensure the application state is fully reset.
   */
  const handleLogout = async () => {
    // Invalidate session globally via Supabase
    await supabase.auth.signOut({ scope: "global" });

    // Manually clear client-side storage to prevent credential lingering
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
      // Hard redirect to root forces Next.js to reconstruct the page without auth
      window.location.href = "/";
    }
  };

  // Show a loading skeleton while checking auth state
  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  // Render the User Profile Dropdown if authenticated
  if (user) {
    // Generate 2-letter fallback initials for the Avatar
    const initials =
      user.displayName?.substring(0, 2).toUpperCase() ||
      user.email?.substring(0, 2).toUpperCase() ||
      "??";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full focus-visible:ring-0 hover:bg-transparent hover:opacity-80 transition-opacity p-0 cursor-pointer"
            aria-label="User Profile Menu"
          >
            <Avatar className="h-8 w-8 border border-border/50">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {/* User Info Header */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">
                {user.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>

          {/* Role-based link: Moderators and Admins */}
          {["superadmin", "admin", "moderator"].includes(user.role) && (
            <>
              <DropdownMenuSeparator />
              <Link href="/reviews" passHref>
                <DropdownMenuItem className="cursor-pointer font-medium focus:bg-white/5">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Reviews</span>
                </DropdownMenuItem>
              </Link>
            </>
          )}

          {/* Role-based link: Superadmins only */}
          {user.role === "superadmin" && (
            <Link href="/admin/users" passHref>
              <DropdownMenuItem className="cursor-pointer font-medium text-white focus:bg-white/5 dark:text-amber-500 dark:focus:text-amber-400">
                <ShieldAlert className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
            </Link>
          )}

          {/* Logout Action */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Render standard Login button if unauthenticated
  return (
    <Button size="sm" onClick={handleLogin}>
      Login
    </Button>
  );
}
