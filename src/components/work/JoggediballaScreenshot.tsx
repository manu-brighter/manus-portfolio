"use client";

import { useNightTheme } from "@/hooks/useNightTheme";

/**
 * JoggediballaScreenshot — the Work-card <picture> that follows the
 * sim theme: Nachtdruck swaps in the site's real darkmode homepage
 * shot, every other preset shows the canonical light one.
 *
 * Night detection + hydration gating live in useNightTheme (shared
 * with the object-grid raster stamps): live sim only, so static tier
 * and reduced-motion keep the light shot even when a night preset
 * persists. Swapping srcSet re-fetches lazily — acceptable, the
 * preset switch is a deliberate, infrequent act.
 */
export function JoggediballaScreenshot({ alt }: { alt: string }) {
  const night = useNightTheme();
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
