import "./globals.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/ui/Footer";
import { Nav } from "@/components/ui/Nav";

export const metadata: Metadata = {
  title: "Manuel Heller — Craft Portfolio",
  description: "Toon Fluid — an Awwwards-grade craft portfolio by Manuel Heller.",
  authors: [{ name: "Manuel Heller" }],
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="flex min-h-dvh flex-col">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
