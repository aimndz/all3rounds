"use client";

import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function Header() {
  return (
    <>
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-50 px-4">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xl font-black tracking-tighter uppercase text-foreground transition-transform hover:scale-105"
            >
              A3R
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/random"
              className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Discover
            </Link>
            <Link
              href="/battles"
              className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Battles
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>
      <Separator />
    </>
  );
}
