import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "All3Rounds — Filipino Battle Rap Archive",
    short_name: "All3Rounds",
    description:
      "Search any FlipTop battle line. Find out who said it, which battle, and watch it instantly.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#facc15",
    icons: [
      {
        src: "/favicon/favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        src: "/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
