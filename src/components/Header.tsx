"use client";

import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function Header() {
  const { isUserLoggedIn, isLoading } = useAuthStore();

  const navLinks = [
    { href: "/random", label: "Discover" },
    { href: "/battles", label: "Battles" },
    { href: "/emcees", label: "Emcees" },
  ];

  return (
    <>
      <header className="bg-card/80 sticky top-0 z-50 px-4 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          {/* Left: Logo */}
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

          {/* Center: Navigation - Hidden on Mobile */}
          <nav className="hidden w-2/4 justify-center md:flex">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Right: Auth & Mobile Menu */}
          <div className="flex w-1/4 items-center justify-end gap-2 md:gap-4">
            {/* Desktop Auth */}
            <div className="hidden md:block">
              <AuthButton />
            </div>

            {/* Mobile Login - Only show if not logged in and not loading */}
            {!isUserLoggedIn && !isLoading && (
              <div className="md:hidden">
                <AuthButton />
              </div>
            )}

            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="bg-card border-l-border/40 w-72 p-5"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>

                  <div className="flex flex-col gap-3">
                    {/* Mobile Profile - Only show if logged in */}
                    {isUserLoggedIn && <AuthButton inSheet type="profile" />}

                    {/* Main Navigation */}
                    <div className="mt-3 flex flex-col gap-3">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground -mx-3 flex items-center rounded-md px-3 py-3 text-[10px] font-medium tracking-widest uppercase transition-colors hover:bg-white/5"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* Mobile Actions - Only show if logged in */}
                    {isUserLoggedIn && (
                      <>
                        <Separator className="bg-border/40" />
                        <AuthButton inSheet type="actions" />
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <Separator />
    </>
  );
}
