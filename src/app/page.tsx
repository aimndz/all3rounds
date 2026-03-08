import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-background flex h-dvh flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 sm:px-6">
        <div className="flex w-full flex-col items-center space-y-12 text-center">
          {/* Hero Content */}
          <div className="max-w-2xl space-y-4">
            <h1 className="flex items-center justify-center text-5xl font-bold tracking-tight uppercase sm:text-7xl">
              All
              <Image
                src="/logo/a3r-logo-icon.svg"
                alt="3"
                width={80}
                height={80}
                className="ml-1.5 h-[0.9em] w-auto"
                priority
                unoptimized
              />
              Rounds
            </h1>

            <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
              Filipino Battle Rap Archive
            </p>
          </div>

          {/* Search Section */}
          <div className="w-full max-w-xl">
            <SearchBar autoFocus size="lg" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
