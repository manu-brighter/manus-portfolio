"use client";

import "./globals.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function NotFound() {
  const inkRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ink = inkRef.current;
    if (!ink) return;
    const tl = gsap.timeline();
    tl.from(ink.children, {
      scale: 0,
      opacity: 0,
      transformOrigin: "center",
      duration: 1.2,
      ease: "elastic.out(1, 0.5)",
      stagger: 0.08,
    });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <html lang="de">
      <body
        className="flex min-h-dvh flex-col items-center justify-center bg-paper text-ink"
        suppressHydrationWarning
      >
        <main className="container-page flex max-w-xl flex-col items-center gap-10 py-20 text-center">
          {/* Ink bloom — 4 spot-colour blobs animating in */}
          <svg viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">
            <g ref={inkRef} style={{ mixBlendMode: "multiply" }}>
              <ellipse cx="80" cy="80" rx="70" ry="60" fill="#FF6BA0" opacity="0.7" />
              <ellipse cx="120" cy="80" rx="60" ry="70" fill="#FFC474" opacity="0.7" />
              <ellipse cx="80" cy="120" rx="65" ry="60" fill="#7CE8C4" opacity="0.7" />
              <ellipse cx="120" cy="120" rx="70" ry="65" fill="#B89AFF" opacity="0.7" />
            </g>
            <text
              x="100"
              y="116"
              fontFamily="serif"
              fontStyle="italic"
              fontSize="56"
              fontWeight="400"
              textAnchor="middle"
              fill="#0A0608"
            >
              404
            </text>
          </svg>

          <div className="space-y-4">
            <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] text-ink italic leading-tight">
              Diese Seite ist im Scrollen verloren gegangen.
            </h1>
            <p className="text-ink-soft text-lg">
              Vielleicht ein Tippfehler? Vielleicht eine Seite, die nie da war? In jedem Fall — kein
              Drama. Zurück zum Anfang:
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
            <Link
              href="/de/"
              className="border-2 border-ink px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              Deutsch
            </Link>
            <Link
              href="/en/"
              className="border-2 border-ink px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              English
            </Link>
            <Link
              href="/fr/"
              className="border-2 border-ink px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              Français
            </Link>
            <Link
              href="/it/"
              className="border-2 border-ink px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              Italiano
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
