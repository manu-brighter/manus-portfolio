"use client";

import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isLoaderComplete, markLoaderComplete } from "@/lib/loaderSession";
import { SPOT_HEX } from "@/lib/palette";

// Re-exported so existing consumers that imported `isLoaderComplete`
// from this file keep working. The canonical implementation lives in
// `@/lib/loaderSession` together with the typed pub/sub.
export { isLoaderComplete };

/** sessionStorage key — survives locale switches that re-mount the
 *  whole locale layout subtree (Next swaps `<html lang>` between /de
 *  and /en, which forces React to re-mount everything underneath). */
const LOADER_SESSION_KEY = "manuelheller:loader-shown";

/**
 * Ink Drop Bloom loader — full-screen overlay that covers the page
 * until fonts + minimum display time (1.5s) are met.
 *
 * Visual: paper-colored screen with a soft ink drop in the center
 * that pulses through the 4 Riso spot colors, shows the brand mark,
 * then expands to fill the viewport before fading away.
 *
 * On exit, calls `markLoaderComplete()` (`@/lib/loaderSession`) so
 * FluidSim, SceneProvider, OverprintReveal and FadeIn can trigger
 * their ambient/reveal cadences immediately.
 */
export function Loader() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(true);
  // Grain SVG-filter is expensive on mobile GPUs (feTurbulence runs per
  // pixel every paint). Drop it on coarse-pointer devices to keep the
  // first-paint window from stuttering. Initial state must match SSR
  // (`true` — grain ships in the static HTML), so the effect below
  // flips it after hydration on coarse-pointer. One-frame grain flash
  // on mobile fresh-load; the loader is on screen for ~2.4s anyway.
  const [grainOn, setGrainOn] = useState(true);
  const reducedMotion = useReducedMotion();
  const t = useTranslations("loader");

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      setGrainOn(false);
    }
  }, []);

  useEffect(() => {
    // Locale switches re-mount this component (Next reconciles a new
    // `<html lang>`). On those switches we want to skip the loader — the
    // user is already mid-session. But on a manual reload (F5 / Cmd-R)
    // we want the loader to play again because that IS the user asking
    // for a fresh start. Use the Performance Navigation API to tell the
    // two apart: `type === "reload"` means F5; everything else (the
    // initial load, client-side route navigations, locale-switch
    // re-mounts) is treated as same-session.
    const navEntries = (
      typeof performance !== "undefined" ? performance.getEntriesByType("navigation") : []
    ) as PerformanceNavigationTiming[];
    const isReload = navEntries[0]?.type === "reload";

    let alreadyShown = false;
    if (!isReload) {
      try {
        alreadyShown = sessionStorage.getItem(LOADER_SESSION_KEY) === "1";
      } catch {
        // sessionStorage can throw in private-browsing modes; treat as fresh.
      }
    }
    if (alreadyShown) {
      setVisible(false);
      // Mark immediately so OverprintReveal's loader gate clears and
      // the Hero animation runs on this navigation too.
      markLoaderComplete();
      return;
    }

    const overlay = overlayRef.current;
    const drop = dropRef.current;
    const text = textRef.current;
    if (!overlay || !drop || !text) return;

    const onComplete = () => {
      try {
        sessionStorage.setItem(LOADER_SESSION_KEY, "1");
      } catch {
        // ignore — flag is a perf optimisation, not load-bearing.
      }
      setVisible(false);
      markLoaderComplete();
    };

    // Reduced motion: brief hold, then simple fade
    if (reducedMotion) {
      const timer = setTimeout(() => {
        gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete });
      }, 600);
      return () => clearTimeout(timer);
    }

    // Spot color hex values from `@/lib/palette` — GSAP animates
    // backgroundColor directly and CSS custom properties can't be
    // interpolated without a plugin, so we feed the raw hex.
    const { rose, amber, mint, violet } = SPOT_HEX;

    const tl = gsap.timeline({ onComplete });

    tl
      // Phase 1: Ink drop blooms from nothing (0 – 0.5s)
      .set(drop, { scale: 0.2, opacity: 0, backgroundColor: rose })
      .to(drop, { scale: 1, opacity: 0.85, duration: 0.5, ease: "expo.out" })

      // Phase 2: Color pulse through Riso inks (0.3 – 1.3s)
      .to(drop, { backgroundColor: amber, duration: 0.28, ease: "none" }, 0.35)
      .to(drop, { backgroundColor: mint, duration: 0.28, ease: "none" }, 0.63)
      .to(drop, { backgroundColor: violet, duration: 0.28, ease: "none" }, 0.91)

      // Subtle breathing during color phase
      .to(
        drop,
        {
          scale: 1.12,
          duration: 0.55,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 1,
        },
        0.3,
      )

      // Phase 3: Brand text shimmers in (0.45 – 0.85s)
      .fromTo(
        text,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" },
        0.45,
      )

      // Phase 4: Hold — the "design statement" pause (1.3 – 1.6s)
      // (no tweens, viewer absorbs the composition)

      // Phase 5: Exit — drop expands to flood the screen (1.6s+)
      .to(text, { opacity: 0, duration: 0.15 }, 1.6)
      .to(drop, { scale: 55, duration: 0.65, ease: "expo.in" }, 1.6)
      .to(overlay, { opacity: 0, duration: 0.35, ease: "power2.out" }, 2.05);

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      aria-label={t("srStatus")}
      // data-testid consumed by E2E tests (legal-nav, case-study-lightbox)
      // to await loader completion deterministically instead of waitForTimeout.
      data-testid="loader-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-paper"
    >
      {/* SVG grain filter — mimics the sim's paper texture. Skipped on
          coarse-pointer because feTurbulence is paint-bound and creates
          mobile-GPU jank during the loader+hero-reveal window. */}
      {grainOn ? (
        <>
          <svg className="absolute size-0" aria-hidden="true">
            <filter id="loader-grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </svg>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{ filter: "url(#loader-grain)" }}
          />
        </>
      ) : null}

      {/* Ink drop — organic shape with soft blurred edges */}
      <div
        ref={dropRef}
        className="absolute will-change-transform"
        style={{
          width: "130px",
          height: "130px",
          borderRadius: "44% 56% 42% 58% / 54% 44% 56% 46%",
          filter: "blur(4px)",
          opacity: 0,
          mixBlendMode: "multiply",
        }}
      />

      {/* Brand mark — appears through the ink. aria-hidden: visual only,
          the loader's role="status" + aria-label handles SR announcement. */}
      <span
        ref={textRef}
        aria-hidden="true"
        className="type-label relative text-ink"
        style={{ opacity: 0, letterSpacing: "0.35em", fontSize: "0.8125rem" }}
      >
        {t("brand")}
      </span>
    </div>
  );
}
