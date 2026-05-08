"use client";

import { useEffect } from "react";

/**
 * Mount-only side-effect: adds `.scrollbar-hidden` to `<html>` while the
 * component is mounted, removes it on unmount. Pair with the matching
 * CSS in globals.css (`html.scrollbar-hidden { scrollbar-width: none }`).
 *
 * Used by routes where the scrollbar adds no information: playground
 * experiments (fixed-frame canvas), legal pages (short prose). Survives
 * the reduced-motion restore via higher selector specificity.
 */
export function HideScrollbar() {
  useEffect(() => {
    document.documentElement.classList.add("scrollbar-hidden");
    return () => document.documentElement.classList.remove("scrollbar-hidden");
  }, []);
  return null;
}
