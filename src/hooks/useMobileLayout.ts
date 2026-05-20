"use client";

import { useSyncExternalStore } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";

/**
 * Single source of truth for "is this a Mobile layout" detection.
 *
 * Mobile = coarse pointer AND viewport width below the Tailwind `md`
 * breakpoint (768px). Tablets (coarse pointer ≥ 768px) get the Desktop
 * branch — their viewport is wide enough for the asymmetric editorial
 * layout to read correctly.
 *
 * Pure derivation exported separately for unit testing.
 *
 * Used by Mobile-Rework to route between Desktop and Mobile component
 * variants (SceneProvider global-sim suppression, Photography Swiper,
 * Case-Study Scrolly, About compression).
 */

const MOBILE_MAX_WIDTH = 768;

export function isMobileLayout({ coarse, width }: { coarse: boolean; width: number }): boolean {
  return coarse && width < MOBILE_MAX_WIDTH;
}

function subscribeWidth(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getWidthSnapshot(): number {
  return typeof window !== "undefined" ? window.innerWidth : 0;
}

function getWidthServerSnapshot(): number {
  return 0;
}

export function useMobileLayout(): boolean {
  const coarse = useCoarsePointer();
  const width = useSyncExternalStore(subscribeWidth, getWidthSnapshot, getWidthServerSnapshot);
  return isMobileLayout({ coarse, width });
}
