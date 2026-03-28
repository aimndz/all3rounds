import Link from "next/link";
import Image from "next/image";
import { Github, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-border/40 bg-background/95 w-full border-t px-4 py-12 backdrop-blur-sm md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Column 1: Main */}
          <div className="flex flex-col gap-6 md:col-span-6">
            <Link
              href="/"
              className="inline-block transition-opacity"
              prefetch={false}
            >
              <Image
                src="/logo/a3r-logo-full.svg"
                alt="All3Rounds"
                width={120}
                height={42}
                unoptimized
              />
            </Link>
            <p className="text-muted-foreground/50 max-w-md text-[13px] leading-relaxed">
              <span className="text-muted-foreground mr-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase">
                Disclaimer:
              </span>
              All3Rounds is an independent educational archive. It is not
              affiliated with any organization. All content rights belong to
              their respective owners.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href="mailto:team@all3rounds.com"
                className="text-muted-foreground/50 hover:text-foreground flex items-center gap-2 text-[13px] transition-colors"
              >
                <Mail className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                team@all3rounds.com
              </a>
              <a
                href="https://github.com/aimndz/all3rounds"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/50 hover:text-foreground flex items-center gap-2 text-[13px] transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                GitHub
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="flex flex-col gap-5 md:col-span-3">
            <h3 className="text-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
              Explore
            </h3>
            <nav className="flex flex-col gap-3">
              {[
                { href: "/search", label: "Search" },
                { href: "/random", label: "Discover" },
                { href: "/battles", label: "Battles" },
                { href: "/emcees", label: "Emcees" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground/50 hover:text-foreground text-[13px] transition-colors"
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Legal */}
          <div className="flex flex-col gap-5 md:col-span-3">
            <h3 className="text-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
              Legal
            </h3>
            <nav className="flex flex-col gap-3">
              {[
                { href: "/privacy-policy", label: "Privacy Policy" },
                { href: "/terms-of-service", label: "Terms of Service" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground/50 hover:text-foreground text-[13px] transition-colors"
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-12">
          <p className="text-muted-foreground/50 text-[10px] whitespace-nowrap">
            © {new Date().getFullYear()} All3Rounds
          </p>
        </div>
      </div>
    </footer>
  );
}
