import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <>
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xl font-black tracking-tighter uppercase text-foreground transition-transform hover:scale-105"
            >
              A3R
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/random"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Discover
            </Link>
            <Link
              href="/battles"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Battles
            </Link>
            <AuthButton />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <AuthButton />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex flex-col w-[280px] sm:w-[350px] p-0 border-l border-border/40"
              >
                <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl">
                  {/* Navigation Links */}
                  <nav className="flex-1 px-4 py-12 flex flex-col gap-2">
                    <Link
                      href="/"
                      className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-primary/10 transition-all duration-200"
                    >
                      <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        Home
                      </span>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <Link
                      href="/random"
                      className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-primary/10 transition-all duration-200"
                    >
                      <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        Discover
                      </span>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <Link
                      href="/battles"
                      className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-primary/10 transition-all duration-200"
                    >
                      <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        Battles
                      </span>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </nav>

                  {/* Menu Footer */}
                  <div className="p-6 mt-auto border-t border-border/10">
                    <p className="text-[10px] font-medium text-muted-foreground/40 leading-relaxed uppercase tracking-widest">
                      Filipino Battle Rap <br /> Verse Directory
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <Separator />
    </>
  );
}
