"use client";

import { useState } from "react";

/**
 * Mobile fallback for the live FluidSim canvas — plays a pre-recorded
 * loop of the ambient sim instead of running the WebGL pipeline live.
 *
 * Why: iOS Safari's tile compositor culls position:fixed WebGL layers
 * during momentum scroll under GPU pressure, causing a visible blink.
 * `<video>` elements get composited via the platform media path which
 * survives scroll without cull. The trade-off is that mobile loses
 * pointer interactivity, but that was already disabled on coarse-
 * pointer (the hero/long-scroll showcase); interaction lives in the
 * playground experiment routes which run their own per-experiment
 * WebGL contexts.
 *
 * The loop asset is generated once via `<AmbientRecorder />` (see
 * that file's header comment) and committed to public/. The video
 * has paper-bg + grain + ink baked in (render-toon writes opaque
 * paper-bg under the ink), so the visible result matches what the
 * live canvas was painting.
 *
 * If the asset is missing (initial bootstrap), the <video> element
 * silently fails to load — body bg-paper shows through and the page
 * still works (just no animated bg on mobile).
 *
 * Initial fade-in: starts at opacity 0, fades to opacity 1 over
 * ~800ms once the first frame is decoded (`onLoadedData`). One-shot —
 * the loop wrap-around at 60s isn't accompanied by another fade since
 * `loaded` only flips once. The transition happens via CSS opacity
 * which doesn't restart on video loop boundary.
 */
export function AmbientVideo() {
  const [loaded, setLoaded] = useState(false);

  return (
    // biome-ignore lint/a11y/useMediaCaption: ambient bg has no audio + no semantic content
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      data-scene="root"
      onLoadedData={() => setLoaded(true)}
      className="pointer-events-none transition-opacity duration-700 ease-out"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        objectFit: "cover",
        opacity: loaded ? 1 : 0,
      }}
    >
      {/* MP4 / H.264 — universal browser support, including older
          iOS Safari. The earlier WebM/VP9 attempt rendered as a still
          image on iOS 18 (codec was technically supported but only the
          first frame decoded reliably). */}
      <source src="/ambient-loop.mp4" type="video/mp4" />
    </video>
  );
}
