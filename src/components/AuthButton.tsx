"use client";

import { useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
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
import { adminLinks } from "@/components/admin/admin-links";
import { ChevronDown, Zap } from "lucide-react";

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
  const [adminOpen, setAdminOpen] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleLogout = async () => {
    onSheetAction?.();
    await authClient.signOut();
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
    const profileName = user.username || user.displayName;
    const profileLabel =
      user.username && !user.username.startsWith("@")
        ? `@${user.username}`
        : profileName;
    const initials =
      profileName?.substring(0, 2).toUpperCase() ||
      user.email?.substring(0, 2).toUpperCase() ||
      "??";

    if (inSheet) {
      return (
        <div className="flex w-full flex-col">
          {(type === "all" || type === "actions") && (
            <div className="flex flex-col">
              <Link
                href="/profile"
                prefetch={false}
                onClick={onSheetAction}
                className={SHEET_MENU_ITEM_CLASS}
              >
                Profile
              </Link>

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
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setAdminOpen((open) => !open)}
                        className={`${SHEET_MENU_ITEM_CLASS} justify-between text-left`}
                        aria-expanded={adminOpen}
                      >
                        <span className="inline-flex items-center gap-2">
                          Admin
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            adminOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {adminOpen && (
                        <div className="border-border/40 ml-6 flex flex-col border-l pl-2">
                          {adminLinks.map(({ href, label }) => (
                            <Link
                              key={href}
                              href={href}
                              prefetch={false}
                              onClick={onSheetAction}
                              className={`${SHEET_MENU_ITEM_CLASS} text-muted-foreground py-2.5`}
                            >
                              {label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
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
            className="relative h-8 cursor-pointer gap-2 rounded-full px-0 transition-opacity hover:bg-transparent hover:opacity-80 focus-visible:ring-0"
            aria-label="User Profile Menu"
          >
            <span className="text-foreground hidden items-center gap-1 pl-2 text-xs font-semibold sm:inline-flex">
              <Zap className="text-primary size-3" aria-hidden="true" />
              {Math.max(-100, user.rep ?? 0)} REP
            </span>
            <Avatar className="border-border/50 h-8 w-8 border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end" forceMount>
          {/* User Info Header */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="truncate text-sm font-semibold">{profileLabel}</p>
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          <Link href="/profile" passHref prefetch={false}>
            <DropdownMenuItem className="cursor-pointer text-[10px] font-medium tracking-[0.18em] uppercase">
              Profile
            </DropdownMenuItem>
          </Link>

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

          {/* Role-based links: Superadmins only */}
          {user.role === "superadmin" && (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setAdminOpen((open) => !open);
                }}
                className="flex cursor-pointer items-center justify-between text-[10px] font-medium tracking-[0.18em] uppercase"
              >
                <span>Admin</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    adminOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </DropdownMenuItem>
              {adminOpen && (
                <div className="flex flex-col">
                  {adminLinks.map(({ href, label }) => (
                    <Link key={href} href={href} passHref prefetch={false}>
                      <DropdownMenuItem className="text-muted-foreground hover:text-foreground cursor-pointer pl-6 text-[10px] font-medium tracking-[0.16em] uppercase">
                        {label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </div>
              )}
            </>
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
