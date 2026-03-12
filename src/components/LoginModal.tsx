"use client";

import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();

    // Use a cookie to store the current path to redirect back after auth
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      document.cookie = `auth-redirect=${encodeURIComponent(currentPath)}; path=/; max-age=300; SameSite=Lax`;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card overflow-hidden rounded-2xl p-0 backdrop-blur-xl sm:max-w-[400px]">
        <div className="flex flex-col items-center gap-2 px-6 pt-12 pb-6 text-center">
          <div className="mb-4 flex h-12 w-auto items-center justify-center transition-transform duration-300">
            <Image
              src="/logo/a3r-logo-full.svg"
              alt="All3Rounds Logo"
              width={180}
              height={60}
              className="h-full w-auto"
              priority
            />
          </div>
          <DialogTitle className="text-foreground/90 text-xl font-bold tracking-tight">
            Welcome Back
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Login to your account to continue
          </DialogDescription>
        </div>

        <div className="px-6 pt-4 pb-12">
          <Button
            variant="default"
            size="lg"
            className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 relative h-12 w-full gap-3 overflow-hidden shadow-md transition-all duration-300 active:scale-[0.98]"
            onClick={handleLogin}
          >
            <div className="relative z-10 flex items-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              <span className="font-bold tracking-wide">
                Continue with Google
              </span>
            </div>

            {/* Subtle shine effect - Note: Ensure @keyframes shine exists in globals.css */}
            <div className="absolute inset-0 z-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
          </Button>

          <p className="text-muted-foreground mt-8 text-center text-[10px] font-medium tracking-tight opacity-50">
            &copy; {new Date().getFullYear()} ALL3ROUNDS
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
