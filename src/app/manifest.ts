import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Web app manifest — PWA-light. Enables Add-to-Homescreen on Android +
 * Chrome desktop. iOS uses src/app/apple-icon.png (file-based metadata)
 * via the App Router instead.
 *
 * The maskable icons let Android render the icon inside its theme's
 * mask shape (circle, squircle, etc.) without clipping the artwork.
 */
// `output: 'export'` requires a static dynamic mode — Turbopack can't
// pre-render the manifest route without an explicit force-static.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F0E8D7", // --color-paper
    theme_color: "#0A0608", // --color-ink
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
