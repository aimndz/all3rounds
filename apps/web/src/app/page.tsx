"use client";

import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Type, Sun, Moon, Accessibility, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Effect to handle theme switching
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const fontClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={`flex min-h-screen flex-col bg-background transition-all duration-300 ${fontClasses[fontSize]}`}
    >
      <Header />

      <main className="mx-auto flex flex-1 max-w-4xl items-center justify-center px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Hero Content */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl uppercase">
              Talasalita
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

      {/* Accessibility Controls */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-border bg-card/80 p-1.5 backdrop-blur-md shadow-lg z-50">
        <div className="flex items-center gap-1 border-r border-border pr-1">
          <Button
            variant={fontSize === "sm" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setFontSize("sm")}
            title="Small text"
          >
            <Type className="h-3 w-3" />
          </Button>
          <Button
            variant={fontSize === "base" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setFontSize("base")}
            title="Medium text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={fontSize === "lg" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setFontSize("lg")}
            title="Large text"
          >
            <Type className="h-5 w-5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        <div className="pl-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            title="Accessibility info"
          >
            <Accessibility className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
