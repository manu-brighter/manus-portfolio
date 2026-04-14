import "./globals.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Manuel Heller — Craft Portfolio",
  description: "Toon Fluid — an Awwwards-grade craft portfolio by Manuel Heller.",
  authors: [{ name: "Manuel Heller" }],
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
