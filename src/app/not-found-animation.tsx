"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

/**
 * NotFoundAnimation — client-side GSAP ink-bloom SVG for the 404 page.
 *
 * Extracted from not-found.tsx so the parent can remain a server
 * component and export `metadata` (including `robots: noindex`).
 */
export function NotFoundAnimation() {
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
  );
}
