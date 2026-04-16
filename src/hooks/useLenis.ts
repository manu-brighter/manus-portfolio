"use client";

/**
 * Access the active Lenis instance, or `null` when reduced-motion is on.
 *
 * The null return is load-bearing: callers are expected to branch on it
 * so scroll-linked effects explicitly opt out under reduced-motion, per
 * plan §7. Do not wrap into a no-op façade — the null is the signal.
 */

import type Lenis from "lenis";
import { useContext } from "react";

import { MotionContext } from "@/components/motion/MotionProvider";

export function useLenis(): Lenis | null {
  return useContext(MotionContext).lenis;
}
