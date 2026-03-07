export default function Footer() {
  return (
    <footer className="border-border/40 bg-background/95 w-full border-t py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex scale-90 flex-col gap-2 md:scale-100">
            <h3 className="text-foreground/70 text-xs font-bold tracking-widest uppercase">
              Disclaimer
            </h3>
            <p className="text-muted-foreground/60 max-w-md text-[10px] leading-relaxed">
              All3Rounds is a non-profit educational project. This site is
              currently in **Beta**; transcripts are AI-generated and may
              contain inaccuracies. All rights belong to their respective
              owners.
            </p>
          </div>

          <div>
            <p className="text-muted-foreground/30 text-[10px] font-medium tracking-tight">
              © {new Date().getFullYear()} All3Rounds.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
