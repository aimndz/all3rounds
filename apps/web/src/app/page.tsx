import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

      <main className="mx-auto flex flex-1 w-full max-w-5xl items-center justify-center px-4 sm:px-6">
        <div className="flex flex-col w-full items-center text-center space-y-12">
          {/* Hero Content */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              All3Rounds
            </h1>

            <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
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
