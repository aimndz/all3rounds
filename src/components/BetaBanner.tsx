"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import Link from "next/link";

export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const isHidden = localStorage.getItem("beta-banner-hidden") === "true";
    queueMicrotask(() => setIsVisible(!isHidden));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("beta-banner-hidden", "true");
  };

  if (isVisible === false || isVisible === null) return null;

  return (
    <div className="bg-primary/5 border-primary/10 animate-in fade-in slide-in-from-top-1 relative z-50 w-full border-b px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0,02)] duration-500">
      <div className="relative mx-auto flex max-w-5xl items-center justify-center gap-3">
        <Badge className="bg-primary text-primary-foreground hover:bg-primary pointer-events-none rounded-sm px-1.5 py-0.5 text-[9px] font-black tracking-tighter uppercase">
          Beta
        </Badge>
        <p className="text-muted-foreground/90 max-w-[80vw] text-center text-[10px] leading-tight font-semibold tracking-tight sm:max-w-none sm:text-[11px]">
          Some transcripts may contain inaccuracies.{" "}
          <Link
            href="/random"
            className="text-primary inline-flex items-center gap-0.5 underline-offset-2 transition-colors hover:underline"
          >
            Help improve them.
          </Link>
        </p>

        <button
          onClick={handleClose}
          className="text-muted-foreground/40 hover:text-foreground absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer p-1 transition-colors"
          aria-label="Close banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
