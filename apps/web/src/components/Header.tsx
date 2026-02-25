import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

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
              dataverse
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/random"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1.5"
            >
              Random Play
            </Link>
            <Link
              href="/battles"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>
      <Separator />
    </>
  );
}
