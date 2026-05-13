"use client";

/**
 * MotionContext — shared React context for Lenis instance access.
 *
 * Lives in `lib/motion/` (alongside `tokens.ts`) instead of next to
 * `MotionProvider.tsx` so the dependency arrows stay clean:
 * `hooks/useLenis.ts` reads from `lib/motion/context`, not from
 * `components/motion/`. Provider component stays in `components/`,
 * consumes this context.
 */

import type Lenis from "lenis";
import { createContext } from "react";

export type MotionState = {
  lenis: Lenis | null;
};

export const MotionContext = createContext<MotionState>({ lenis: null });
