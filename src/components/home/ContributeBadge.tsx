"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { LoginModal } from "@/components/LoginModal";
import { cn } from "@/lib/utils";

export default function ContributeBadge() {
  const { isUserLoggedIn } = useAuthStore();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleContributeClick = (e: React.MouseEvent) => {
    if (!isUserLoggedIn) {
      e.preventDefault();
      setIsLoginModalOpen(true);
    }
  };

  return (
    <>
      <Link
        href="/random"
        prefetch={false}
        onClick={handleContributeClick}
        style={{
          WebkitMaskImage: "-webkit-radial-gradient(white, black)",
          maskImage: "radial-gradient(white, black)",
        }}
        className={cn(
          "group border-input bg-input/35 text-muted-foreground isolation-isolate relative inline-flex transform-[translateZ(0)] items-center gap-2 overflow-hidden rounded-full border px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase transition-all duration-300",
          "hover:border-input hover:bg-input/50 hover:text-foreground",
        )}
      >
        {/* Repeating diagonal glare shimmer */}
        <span className="glare-effect pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/20 to-transparent" />

        <Users className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-[0.5px]" />
        <span className="relative z-10">Contribute Now</span>
        <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />

        <style>{`
          @keyframes diagonal-glare {
            0% {
              transform: translateX(-150%) skewX(-25deg);
              opacity: 0;
            }
            5% {
              opacity: 1;
            }
            40% {
              opacity: 1;
            }
            45% {
              transform: translateX(250%) skewX(-25deg);
              opacity: 0;
            }
            100% {
              transform: translateX(250%) skewX(-25deg);
              opacity: 0;
            }
          }
          .glare-effect {
            animation: diagonal-glare 2.8s ease-in-out infinite;
          }
        `}</style>
      </Link>

      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
