import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-border/40 bg-background/95 w-full border-t py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-foreground/70 text-xs font-normal tracking-widest uppercase">
              Disclaimer
            </h3>
            <p className="text-muted-foreground/60 max-w-md text-[10px] leading-relaxed">
              All3Rounds is an independent, non-profit educational project. It
              is not affiliated with any organization. All content rights belong
              to their respective owners.
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:gap-8">
            <nav className="flex gap-4">
              <Link
                href="/privacy"
                className="text-muted-foreground/40 hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground/40 hover:text-foreground text-[10px] font-medium tracking-widest uppercase transition-colors"
              >
                Terms
              </Link>
            </nav>
            <p className="text-muted-foreground/30 text-[10px] font-medium tracking-tight md:text-right">
              © {new Date().getFullYear()} All3Rounds.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
