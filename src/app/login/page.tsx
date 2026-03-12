"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <Card className="bg-card/60 animate-in fade-in zoom-in-95 relative w-full max-w-sm overflow-hidden backdrop-blur-xl duration-500">
        <CardHeader className="flex flex-col items-center gap-2 pt-10 pb-3 text-center">
          <div className="mb-4 flex h-12 w-auto items-center justify-center transition-transform duration-300">
            <Image
              src="/logo/a3r-logo-full.svg"
              alt="All3Rounds Logo"
              width={240}
              height={80}
              className="h-full w-auto"
              priority
            />
          </div>
          <CardTitle className="text-foreground/90 text-2xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Login to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
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

            {/* Subtle shine effect */}
            <div className="absolute inset-0 z-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
          </Button>

          <div className="mt-2 text-center">
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary group/link inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-arrow-left transition-transform group-hover/link:-translate-x-1"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to search
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer hint */}
      <p className="text-muted-foreground mt-8 text-center text-xs font-medium tracking-tight opacity-50">
        &copy; {new Date().getFullYear()} ALL3ROUNDS
      </p>
    </div>
  );
}
