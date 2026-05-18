"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ isOpen, onOpenChange }: LoginModalProps) {
  const handleLogin = async () => {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";

    await authClient.signIn.social({
      provider: "google",
      callbackURL: currentPath,
      errorCallbackURL: "/auth/error",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 border-border overflow-hidden rounded-2xl backdrop-blur-sm w-[calc(100%-2.5rem)] max-w-[340px] sm:max-w-[360px]">
        <div className="flex flex-col items-center py-8 text-center">
          {/* Header Section */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative">
              <Image
                src="/logo/a3r-logo-full.svg"
                alt="A3R Logo"
                width={200}
                height={70}
                className="h-auto w-24"
                priority
                unoptimized
              />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                Welcome Back
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs font-normal tracking-wide">
                Log in to help improve the archive.
              </DialogDescription>
            </div>
          </div>

          <div className="w-full space-y-4 sm:space-y-5">
            <Button
              variant="default"
              size="lg"
              className="group bg-primary hover:bg-primary/90 text-primary-foreground relative w-full gap-3 overflow-hidden rounded-xl px-4 py-3 transition-all duration-300 active:scale-[0.98] sm:py-3.5"
              onClick={handleLogin}
            >
              <div className="relative z-10 flex w-full items-center justify-center gap-3">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <svg
                    className="h-5 w-5 sm:h-5.5 sm:w-5.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-sm font-bold tracking-tight sm:text-sm">
                    Continue with Google
                  </span>
                </div>
              </div>
            </Button>

            <p className="text-muted-foreground/60 text-[10px] leading-relaxed font-normal">
              By continuing, you agree to our{" "}
              <span className="whitespace-nowrap">
                <a
                  href="/terms-of-service"
                  className="text-foreground hover:text-primary underline underline-offset-4"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy"
                  className="text-foreground hover:text-primary underline underline-offset-4"
                >
                  Privacy
                </a>
              </span>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
