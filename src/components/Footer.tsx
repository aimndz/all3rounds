import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-border/40 bg-background/95 w-full border-t py-6 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Disclaimer */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            <h3 className="text-foreground/50 text-[10px] font-bold tracking-widest uppercase">
              Disclaimer
            </h3>
            <p className="text-muted-foreground/50 max-w-sm text-[11px] leading-relaxed">
              All3Rounds is an independent, non-profit educational project. It
              is not affiliated with any organization. All content rights belong
              to their respective owners.
            </p>
          </div>

          {/* Wrapper for Legal & Connect to save space on mobile */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2 lg:col-span-2">
            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h3 className="text-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                Legal
              </h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="text-muted-foreground/40 hover:text-foreground text-[11px] transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-muted-foreground/40 hover:text-foreground text-[11px] transition-colors"
                >
                  Terms of Service
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-3">
              <h3 className="text-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                Connect
              </h3>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:team@all3rounds.com"
                  className="text-muted-foreground/40 hover:text-foreground text-[11px] transition-colors"
                >
                  team@all3rounds.com
                </a>
                <a
                  href="https://github.com/aimndz/battlerap-db"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-foreground text-[11px] transition-colors"
                >
                  GitHub
                </a>
                <p className="text-muted-foreground/30 text-[10px] font-medium">
                  © {new Date().getFullYear()} All3Rounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
