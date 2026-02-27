export default function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/95 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col gap-2 scale-90 md:scale-100 origin-left">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
              Disclaimer
            </h3>
            <p className="max-w-md text-[10px] leading-relaxed text-muted-foreground/60">
              This is a non-profit passion project created for educational
              purposes only. All3Rounds is{" "}
              <span className="text-foreground/40 font-bold underline decoration-primary/20">
                not affiliated
              </span>{" "}
              with FlipTop Battle League or any official organization. All
              trademarks and media content belong to their respective owners.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <p className="text-[10px] font-medium tracking-tight text-muted-foreground/30">
              © {new Date().getFullYear()} All3Rounds.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
