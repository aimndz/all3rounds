"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import AuthButton from "@/components/AuthButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const MOBILE_NAV_ITEM_CLASS =
  "focus:bg-muted/70 focus:text-foreground active:bg-muted/70 active:opacity-90 text-foreground relative flex w-full items-center gap-2 rounded-[var(--radius-control-sm)] px-2.5 py-3 text-[10px] font-medium tracking-[0.18em] uppercase transition-[background-color,color,opacity] duration-200 outline-hidden";

type MobileDrawerProps = {
  open: boolean;
  mounted: boolean;
  onClose: () => void;
  isUserLoggedIn: boolean;
  user: ReturnType<typeof useAuthStore.getState>["user"];
  navLinks: { href: string; label: string }[];
};

function MobileNavDrawer({
  open,
  mounted,
  onClose,
  isUserLoggedIn,
  user,
  navLinks,
}: MobileDrawerProps) {
  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-180 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className={`bg-card border-l-border/40 absolute inset-y-0 right-0 flex h-full w-[86vw] max-w-sm transform-gpu flex-col border-l shadow-2xl transition-transform duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] [backface-visibility:hidden] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-4 pt-14 pb-5">
          {isUserLoggedIn && user ? (
            <div className="border-border/60 px-2.5 pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="border-border/50 h-10 w-10 border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(
                      user.displayName?.substring(0, 2) ||
                      user.email?.substring(0, 2) ||
                      "??"
                    ).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2
                    id="mobile-nav-title"
                    className="truncate text-sm font-semibold leading-none"
                  >
                    {user.displayName}
                  </h2>
                  <p className="text-muted-foreground mt-1 truncate text-xs leading-none">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <h2 id="mobile-nav-title" className="sr-only">
              Navigation
            </h2>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-[var(--radius-control-sm)] p-2 opacity-70 transition-[background-color,color,opacity] hover:bg-muted/70 hover:text-foreground focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                onClick={onClose}
                className={MOBILE_NAV_ITEM_CLASS}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Separator className="bg-border -mx-1 my-1" />
          <AuthButton
            inSheet
            type={isUserLoggedIn ? "actions" : "all"}
            onSheetAction={onClose}
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export default function Header() {
  const { isUserLoggedIn, user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const navLinks = [
    { href: "/search", label: "Search" },
    { href: "/random", label: "Discover" },
    { href: "/battles", label: "Battles" },
    { href: "/emcees", label: "Emcees" },
  ];

  useEffect(() => {
    if (isDrawerOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      const previousHtmlOverflow = document.documentElement.style.overflow;
      const previousBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsDrawerOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousBodyOverflow;
      };
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsDrawerMounted(false);
      closeTimerRef.current = null;
    }, 180);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDrawer = () => {
    setIsDrawerMounted(true);
    requestAnimationFrame(() => {
      setIsDrawerOpen(true);
    });
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="bg-card/80 relative border-b border-border/60 backdrop-blur-md">
      <header className="px-4">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <div className="flex w-1/4 items-center gap-2">
            <Link
              href="/"
              className="text-foreground text-xl font-black tracking-tighter uppercase transition-transform hover:scale-105"
            >
              <Image
                src="/logo/a3r-logo-full.svg"
                alt="A3R"
                width={100}
                height={35}
                unoptimized
              />
            </Link>
          </div>

          <nav className="hidden w-2/4 justify-center md:flex">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex w-1/4 items-center justify-end gap-2 md:gap-4">
            <div className="hidden md:block">
              <AuthButton />
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={openDrawer}
                aria-expanded={isDrawerOpen}
                aria-controls="mobile-nav-title"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <MobileNavDrawer
        open={isDrawerOpen}
        mounted={isDrawerMounted}
        onClose={closeDrawer}
        isUserLoggedIn={isUserLoggedIn}
        user={user}
        navLinks={navLinks}
      />
    </div>
  );
}
