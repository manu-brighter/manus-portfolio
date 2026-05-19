import "./globals.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
// Subset to wght-only (drop italic axis + multi-script @font-face entries).
// The 4 locales (de/en/fr/it) only need Latin + Latin-ext; the default
// `@fontsource-variable/inter` entry pulls in cyrillic, greek, vietnamese
// etc. via 9 @font-face declarations. `/wght.css` ships a single
// variable-weight Latin/Latin-ext stylesheet — saves measurable CSS
// payload + parser time on first paint.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Root layout is a pass-through — the real `<html>`/`<body>` shell lives
 * in `src/app/[locale]/layout.tsx` so that the `lang` attribute matches
 * the rendered locale in the initial HTML (no client-hop correction).
 * Pairs with a bare-root redirect page at `/` that owns its own `<html>`
 * document; `pnpm build` has been verified to emit a valid `out/index.html`
 * under this configuration, and Playwright smoke asserts the redirect.
 *
 * This is the documented next-intl v4 pattern for static-export sites
 * that cannot run middleware — if that assumption ever breaks (e.g.
 * Next's rules tighten), move `<html>` back here and fall back to a
 * server-detected default locale.
 *
 * CSS + font imports stay here so they apply to the redirect page too.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://manuelheller.dev"),
  title: "Manuel Heller — Craft Portfolio",
  description: "Toon Fluid — an Awwwards-grade craft portfolio by Manuel Heller.",
  // Per-locale metadata in [locale]/layout.tsx overrides this for locale routes.
  // The root index.html (locale redirect) inherits this minimal shape.
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
