"use client";

import { createClient } from "@/lib/supabase/client";
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
import { useAuthStore } from "@/stores/auth-store";

export default function AuthButton() {
  const { user, isLoading, isUserLoggedIn } = useAuthStore();
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "global" });
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />;
  }

  if (isUserLoggedIn && user) {
    const initials =
      user.displayName?.substring(0, 2).toUpperCase() ||
      user.email?.substring(0, 2).toUpperCase() ||
      "??";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 cursor-pointer rounded-full p-0 transition-opacity hover:bg-transparent hover:opacity-80 focus-visible:ring-0"
            aria-label="User Profile Menu"
          >
            <Avatar className="border-border/50 h-8 w-8 border">
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
              <p className="truncate text-sm leading-none font-medium">
                {user.displayName}
              </p>
              <p className="text-muted-foreground truncate text-xs leading-none">
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
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
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
