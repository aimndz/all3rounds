"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { useAuthStore } from "@/stores/auth-store";

export default function HeroActions() {
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
      <div className="flex flex-row flex-wrap items-center justify-center gap-4">
        <Button
          asChild
          size="lg"
          className="h-9 w-40 sm:h-11 sm:w-44"
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
          className="h-9 w-40 sm:h-11 sm:w-44"
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

      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
