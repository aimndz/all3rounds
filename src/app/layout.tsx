import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import BetaBanner from "@/components/BetaBanner";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

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

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "All3Rounds — Filipino Battle Rap Archive",
  description:
    "Search any FlipTop battle line. Find out who said it, which battle, and watch it instantly.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "All3Rounds — Filipino Battle Rap Archive",
    description:
      "Search any FlipTop battle line. Find out who said it, which battle, and watch it instantly.",
    url: siteUrl,
    siteName: "All3Rounds",
    type: "website",
    locale: "en_PH",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "All3Rounds — Filipino Battle Rap Archive",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "All3Rounds — Filipino Battle Rap Archive",
    description:
      "Search any FlipTop battle line. Find out who said it, which battle, and watch it instantly.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@all3rounds",
    site: "@all3rounds",
  },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsSrc =
    process.env.NODE_ENV === "production"
      ? "/_vercel/insights/script.js"
      : "https://va.vercel-scripts.com/v1/script.debug.js";

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
        <Script src={analyticsSrc} strategy="afterInteractive" />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
