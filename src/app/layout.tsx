import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import TopChrome from "@/components/TopChrome";
import Footer from "@/components/Footer";
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
  title: {
    default: "All3Rounds — Filipino Battle Rap Archive",
    template: "%s | All3Rounds",
  },
  description:
    "The community-driven archive for Filipino Battle Rap. Search transcripts from FlipTop and underground leagues, find iconic lines, and explore battle history.",
  keywords: [
    "battle rap",
    "FlipTop",
    "transcripts",
    "lyrics",
    "rap battles",
    "Philippines",
    "hip hop",
  ],
  authors: [{ name: "All3Rounds Team" }],
  creator: "All3Rounds",
  publisher: "All3Rounds",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  openGraph: {
    title: "All3Rounds — Filipino Battle Rap Archive",
    description:
      "The community-driven archive for Filipino Battle Rap. Search transcripts from FlipTop and underground leagues, find iconic lines, and explore battle history.",
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
      "The community-driven archive for Filipino Battle Rap. Search transcripts from FlipTop and underground leagues, find iconic lines, and explore battle history.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@all3rounds",
    site: "@all3rounds",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <div className="sticky top-0 z-50">
              <TopChrome />
            </div>
            <div className="flex flex-1 flex-col">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
            <Footer />
          </div>
        </AuthProvider>
        <Toaster />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "All3Rounds",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "All3Rounds",
              url: siteUrl,
              logo: `${siteUrl}/logo/a3r-logo-full.svg`,
              sameAs: ["https://twitter.com/all3rounds"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: [
                {
                  "@type": "SiteNavigationElement",
                  position: 1,
                  name: "Search",
                  url: `${siteUrl}/search`,
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 2,
                  name: "Discover",
                  url: `${siteUrl}/random`,
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 3,
                  name: "Battles",
                  url: `${siteUrl}/battles`,
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 4,
                  name: "Emcees",
                  url: `${siteUrl}/emcees`,
                },
              ],
            }),
          }}
        />

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
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="e2a7a49d-8927-4176-8965-a8773f7b62e8"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
