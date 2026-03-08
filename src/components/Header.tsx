"use client";

import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function Header() {
  return (
    <>
      <header className="bg-card/80 sticky top-0 z-50 px-4 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-foreground text-xl font-black tracking-tighter uppercase transition-transform hover:scale-105"
            >
              <Image
                src="/logo/a3r-logo-full.svg"
                alt="A3R"
                width={100}
                height={100}
                unoptimized
              />
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/random"
              className="text-muted-foreground hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/battles"
              className="text-muted-foreground hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
            >
              Battles
            </Link>
            <Link
              href="/emcees"
              className="text-muted-foreground hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
            >
              Emcees
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>
      <Separator />
    </>
  );
}
