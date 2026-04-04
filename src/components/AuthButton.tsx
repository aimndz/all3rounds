"use client";

import { useSyncExternalStore } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";

const SHEET_MENU_ITEM_CLASS =
  "focus:bg-muted/70 focus:text-foreground active:bg-muted/70 active:opacity-90 text-foreground relative flex w-auto items-center gap-2 rounded-(--radius-control-sm) mx-2 px-4 py-3 text-[10px] font-medium tracking-[0.18em] uppercase transition-[background-color,color,opacity] duration-200 outline-hidden";

export default function AuthButton({
  inSheet = false,
  type = "all",
  onSheetAction,
}: {
  inSheet?: boolean;
  type?: "profile" | "actions" | "all";
  onSheetAction?: () => void;
}) {
  const { user, isLoading, isUserLoggedIn } = useAuthStore();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const supabase = createClient();

  const handleLogout = async () => {
    onSheetAction?.();
    await supabase.auth.signOut({ scope: "global" });
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = "/";
    }
  };

  if (!isMounted || isLoading) {
    if (inSheet) {
      return (
        <div className="flex w-full flex-col gap-2">
          <div className="bg-muted/70 h-15 w-full animate-pulse rounded-(--radius-control)" />
          <div className="bg-muted/50 h-11 w-full animate-pulse rounded-(--radius-control-sm)" />
        </div>
      );
    }

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
        <div className="flex w-full flex-col">
          {(type === "all" || type === "actions") && (
            <div className="flex flex-col">
              {["superadmin", "admin", "moderator"].includes(user.role) && (
                <>
                  <Link
                    href="/reviews"
                    prefetch={false}
                    onClick={onSheetAction}
                    className={SHEET_MENU_ITEM_CLASS}
                  >
                    Reviews
                  </Link>

                  {user.role === "superadmin" && (
                    <Link
                      href="/admin/users"
                      prefetch={false}
                      onClick={onSheetAction}
                      className={SHEET_MENU_ITEM_CLASS}
                    >
                      Admin Panel
                    </Link>
                  )}

                  <Separator className="my-1" />
                </>
              )}

              <button
                onClick={handleLogout}
                className={`${SHEET_MENU_ITEM_CLASS} text-left`}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <DropdownMenu modal={false}>
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
                <DropdownMenuItem className="text-[10px] font-medium tracking-[0.18em] uppercase">
                  Reviews
                </DropdownMenuItem>
              </Link>
            </>
          )}

          {/* Role-based link: Superadmins only */}
          {user.role === "superadmin" && (
            <Link href="/admin/users" passHref prefetch={false}>
              <DropdownMenuItem className="text-[10px] font-medium tracking-[0.18em] uppercase">
                Admin Panel
              </DropdownMenuItem>
            </Link>
          )}

          {/* Logout Action */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-[10px] font-medium tracking-[0.18em] uppercase"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (inSheet) {
    return (
      <div className="mx-2 mt-4 px-4">
        <Button size="sm" asChild className="w-full">
          <Link href="/login" prefetch={false} onClick={onSheetAction}>
            Login
          </Link>
        </Button>
      </div>
    );
  }

  // Render standard Login button if unauthenticated
  return (
    <Button size="sm" asChild>
      <Link href="/login" prefetch={false}>
        Login
      </Link>
    </Button>
  );
}
