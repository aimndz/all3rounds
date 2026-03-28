"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

export default function AuthButton({
  inSheet = false,
  type = "all",
}: {
  inSheet?: boolean;
  type?: "profile" | "actions" | "all";
}) {
  const { user, isLoading, isUserLoggedIn } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "global" });
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = "/";
    }
  };

  if (!isMounted || isLoading) {
    return <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />;
  }

  if (isUserLoggedIn && user) {
// ... existing initials and returns ...
    const initials =
      user.displayName?.substring(0, 2).toUpperCase() ||
      user.email?.substring(0, 2).toUpperCase() ||
      "??";

    if (inSheet) {
      return (
        <div className="flex w-full flex-col gap-2">
          {/* User Info Section */}
          {(type === "all" || type === "profile") && (
            <div className="border-border/10 -mx-3 flex items-center gap-3 rounded-md px-3 py-3 transition-colors">
              <Avatar className="border-border/50 h-10 w-10 shrink-0 border">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-none">
                  {user.displayName}
                </p>
                <p className="text-muted-foreground mt-1.5 truncate text-xs leading-none">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Actions Section */}
          {(type === "all" || type === "actions") && (
            <div className="flex flex-col gap-2">
              {/* Role-based link: Moderators and Admins */}
              {["superadmin", "admin", "moderator"].includes(user.role) && (
                <Link
                  href="/reviews"
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5 -mx-3 flex items-center rounded-md px-3 py-3 text-[10px] font-medium tracking-widest uppercase transition-colors"
                >
                  Reviews
                </Link>
              )}

              {/* Role-based link: Superadmins only */}
              {user.role === "superadmin" && (
                <Link
                  href="/admin/users"
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5 -mx-3 flex items-center rounded-md px-3 py-3 text-[10px] font-medium tracking-widest uppercase transition-colors"
                >
                  Admin Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 -mx-3 flex items-center rounded-md px-3 py-3 text-[10px] font-medium tracking-widest uppercase transition-colors text-left"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      );
    }

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
              <p className="truncate text-sm font-semibold">
                {user.displayName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>

          {/* Role-based link: Moderators and Admins */}
          {["superadmin", "admin", "moderator"].includes(user.role) && (
            <>
              <DropdownMenuSeparator />
              <Link href="/reviews" passHref prefetch={false}>
                <DropdownMenuItem className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-medium tracking-widest uppercase transition-colors focus:bg-white/5">
                  Reviews
                </DropdownMenuItem>
              </Link>
            </>
          )}

          {/* Role-based link: Superadmins only */}
          {user.role === "superadmin" && (
            <Link href="/admin/users" passHref prefetch={false}>
              <DropdownMenuItem className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-medium tracking-widest uppercase transition-colors focus:bg-white/5">
                Admin Panel
              </DropdownMenuItem>
            </Link>
          )}

          {/* Logout Action */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-medium tracking-widest uppercase transition-colors focus:bg-white/5"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Render standard Login button if unauthenticated
  return (
    <Button size="sm" asChild>
      <Link href="/login" prefetch={false}>Login</Link>
    </Button>
  );
}
