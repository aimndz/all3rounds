import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import BetaBanner from "@/components/BetaBanner";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "All3Rounds — Filipino Battle Rap Archive",
  description:
    "Search any FlipTop battle line. Find out who said it, which battle, and watch it instantly.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <BetaBanner />
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
