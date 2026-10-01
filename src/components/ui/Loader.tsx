"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isLoaderComplete, markLoaderComplete } from "@/lib/loaderSession";
import styles from "./Loader.module.css";

export { isLoaderComplete };

const LOADER_SESSION_KEY = "manuelheller:loader-shown";

/** A first-visit ink signature. Content never waits for this decoration. */
export function Loader() {
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
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="loader-overlay"
      className={`pointer-events-none fixed bottom-8 left-8 z-10 size-8 ${styles.signature}`}
    />
  );
}
