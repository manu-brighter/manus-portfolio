"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isLoaderComplete, markLoaderComplete } from "@/lib/loaderSession";
import styles from "./Loader.module.css";

export { isLoaderComplete };

/** One paper window per document load. Internal navigation never replays it. */
export function Loader() {
  const maskId = useId();
  const [visible, setVisible] = useState(true);
  const show = useRef<boolean | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Clear the shared gate before storage, refs or animation can fail.
    // Subscribers mounted later receive the completion synchronously too.
    const root = document.documentElement;
    // Keep the decision across StrictMode's effect replay. The shared bus is
    // already complete on that second pass, but this same intro is still active.
    if (show.current === null) {
      show.current = !isLoaderComplete() && root.dataset.intro === "waiting";
    }
    markLoaderComplete();

    // Read the media query too: the hook's hydration snapshot is false.
    if (
      !show.current ||
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      show.current = false;
      root.dataset.intro = "done";
      setVisible(false);
      return;
    }

    setVisible(true);
    root.dataset.intro = "running";
    timer.current = window.setTimeout(() => {
      root.dataset.intro = "done";
      setVisible(false);
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [reducedMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="loader-overlay"
      className={`pointer-events-none fixed inset-0 z-40 ${styles.window}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          window.clearTimeout(timer.current);
          document.documentElement.dataset.intro = "done";
          setVisible(false);
        }
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={styles.sheet}
      >
        <defs>
          <mask
            id={maskId}
            x="0"
            y="0"
            width="100"
            height="100"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <rect width="100" height="100" fill="white" />
            <path
              d="M 51 8 C 65 2 78 16 81 27 C 98 30 98 48 88 59 C 94 74 74 87 62 85 C 48 100 31 87 27 77 C 9 79 1 59 13 47 C 4 31 20 17 32 20 C 35 9 43 6 51 8 Z"
              fill="black"
              className={styles.aperture}
            />
          </mask>
        </defs>
        <rect width="100" height="100" fill="var(--color-paper)" mask={`url(#${maskId})`} />
      </svg>
    </div>
  );
}
