import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

      <main className="mx-auto flex flex-1 max-w-4xl items-center justify-center px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Hero Content */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl uppercase">
              All3Rounds
            </h1>

            <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
              Explore the definitive archive of Filipino Battle Rap.{" "}
              <br className="hidden sm:block" />
              Search thousands of punchlines, rhymes, and verses.
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
