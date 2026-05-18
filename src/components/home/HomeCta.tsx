"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { useAuthStore } from "@/stores/auth-store";

export default function HomeCta() {
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
      <section className="py-0">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="space-y-4">
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl md:text-4xl">
              Help Improve the Archive
            </h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed sm:text-base">
              Review random lines, suggest transcript corrections, or support
              the development and maintenance of All3Rounds.
            </p>
          </div>

          <div className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-9 w-full sm:h-11 sm:w-44"
              onClick={handleContributeClick}
            >
              <Link href="/random" prefetch={false}>
                <Users className="mr-2 h-4 w-4" />
                Contribute
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-input h-9 w-full sm:h-11 sm:w-44"
            >
              <a
                href="https://ko-fi.com/all3rounds"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Star className="mr-2 h-4 w-4" />
                Support Archive
              </a>
            </Button>
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
