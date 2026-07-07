"use client";

import { useEffect, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * JoggediballaScreenshot — the Work-card `<picture>` that follows the
 * sim theme: Nachtdruck swaps in the site's real darkmode homepage
 * shot, every other preset shows the canonical light one.
 *
 * Gating mirrors SimThemeSync (live sim only: motion allowed + WebGL
 * tier resolved) so StaticFallback and reduced-motion keep the light
 * shot even when a night preset persists in the store — the page
 * around it never flips to night there either.
 *
 * Hydration: `mounted` starts false so the first client render
 * matches the server's light-shot markup; the swap lands in the
 * effect pass. Swapping `srcSet` re-fetches lazily — acceptable, the
 * preset switch itself is a deliberate, infrequent act.
 */
export function JoggediballaScreenshot({ alt }: { alt: string }) {
  const presetId = useSimPresetStore((s) => s.presetId);
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const night = mounted && Boolean(config) && !reducedMotion && presetId === "nachtdruck";
  const base = night ? "/projects/joggediballa/homepage-dark" : "/projects/joggediballa/homepage";

  return (
    <picture className="block h-full w-full">
      <source
        type="image/avif"
        srcSet={`${base}-480w.avif 480w, ${base}-800w.avif 800w, ${base}-1200w.avif 1200w`}
        sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
      />
      <source
        type="image/webp"
        srcSet={`${base}-480w.webp 480w, ${base}-800w.webp 800w, ${base}-1200w.webp 1200w`}
      />
      <img
        src={`${base}-800w.jpg`}
        alt={alt}
        width={800}
        height={450}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover object-top"
      />
    </picture>
  );
}
