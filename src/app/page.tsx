import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="bg-background flex h-dvh flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 sm:px-6">
        <div className="flex w-full flex-col items-center space-y-12 text-center">
          {/* Hero Content */}
          <div className="max-w-2xl space-y-4">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              All3Rounds
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
