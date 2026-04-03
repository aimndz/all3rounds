"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();

    // Safety check: Only redirect back to our own site
    let nextPath = "/";
    try {
      if (typeof document !== "undefined" && document.referrer) {
        const referrerUrl = new URL(document.referrer);
        if (referrerUrl.origin === window.location.origin) {
          nextPath = referrerUrl.pathname + referrerUrl.search;
        }
      }
    } catch (e) {
      console.error("Referrer parsing error:", e);
    }

    // Use a cookie to store the next path to avoid "invalid redirect URL" errors in Supabase
    // that occur when query parameters are added to the redirectTo URL
    if (typeof document !== "undefined") {
      document.cookie = `auth-redirect=${encodeURIComponent(nextPath)}; path=/; max-age=300; SameSite=Lax`;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            {/* Header Section */}
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="relative">
                <Link href="/">
                  <Image
                    src="/logo/a3r-logo-full.svg"
                    alt="A3R Logo"
                    width={240}
                    height={84}
                    className="h-auto w-28 md:w-48"
                    priority
                    unoptimized
                  />
                </Link>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  Welcome Back
                </h1>
                <p className="text-muted-foreground text-xs font-normal tracking-wide sm:text-sm">
                  Log in to help improve the archive.
                </p>
              </div>
            </div>

            {/* Action Section */}
            <div className="w-full space-y-6 sm:space-y-8">
              <Button
                variant="default"
                size="lg"
                className="group bg-primary hover:bg-primary/90 text-primary-foreground relative w-full gap-4 overflow-hidden rounded p-4 sm:p-6"
                onClick={handleLogin}
              >
                <div className="relative z-10 flex w-full items-center justify-center gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24">
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
                    <span className="text-sm font-bold tracking-tight sm:text-base">
                      Continue with Google
                    </span>
                  </div>
                </div>
              </Button>
            </div>

            <p className="text-muted-foreground/60 mt-5 text-[11px] font-normal">
              By continuing, you agree to our{" "}
              <span className="whitespace-nowrap">
                <Link
                  href="/terms-of-service"
                  className="text-foreground hover:text-primary underline underline-offset-4"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className="text-foreground hover:text-primary underline underline-offset-4"
                >
                  Privacy
                </Link>
              </span>
              .
            </p>
          </div>
        </div>
    </main>
  );
}
