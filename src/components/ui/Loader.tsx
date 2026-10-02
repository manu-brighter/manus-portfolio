"use client";

import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isLoaderComplete, markLoaderComplete } from "@/lib/loaderSession";
import styles from "./Loader.module.css";

export { isLoaderComplete };

const LOADER_SESSION_KEY = "manuelheller:loader-shown";

/** A first-visit paper window. Content never waits for this decoration. */
export function Loader() {
  const maskId = useId();
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Clear the shared gate before storage, refs or animation can fail.
    // Subscribers mounted later receive the completion synchronously too.
    const completed = isLoaderComplete();
    markLoaderComplete();

    let alreadyShown = completed;
    try {
      alreadyShown ||= sessionStorage.getItem(LOADER_SESSION_KEY) === "1";
      sessionStorage.setItem(LOADER_SESSION_KEY, "1");
    } catch {
      // The in-memory completion flag still covers same-page remounts.
    }

    // Read the media query too: the hook's hydration snapshot is false.
    if (
      alreadyShown ||
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="loader-overlay"
      className={`pointer-events-none fixed inset-0 z-40 ${styles.window}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setVisible(false);
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
