/**
 * Static lightbox image manifest for the Case Study section.
 *
 * Order matters: index 0 is the Hook polaroid, 1 is Admin, 2 is
 * Overlay, 3+ are the public-layer shots (in the same order as
 * `PUBLIC_SHOT_CONFIG` in `CaseStudy.tsx`). i18n captions + screenshot
 * alts are merged in at the call site since those vary per locale.
 */

export type LightboxImageConfig = {
  fullSrc: string;
  avifSrc: string;
  webpSrc: string;
  aspect: number;
};

const HOOK: LightboxImageConfig = {
  fullSrc: "/projects/joggediballa/homepage-phone-720w.jpg",
  avifSrc: "/projects/joggediballa/homepage-phone-720w.avif",
  webpSrc: "/projects/joggediballa/homepage-phone-720w.webp",
  aspect: 540 / 960,
};

const ADMIN: LightboxImageConfig = {
  fullSrc: "/projects/joggediballa/admin-1200w.jpg",
  avifSrc: "/projects/joggediballa/admin-1200w.avif",
  webpSrc: "/projects/joggediballa/admin-1200w.webp",
  aspect: 800 / 450,
};

const OVERLAY: LightboxImageConfig = {
  fullSrc: "/projects/joggediballa/twitchoverlay-1200w.jpg",
  avifSrc: "/projects/joggediballa/twitchoverlay-1200w.avif",
  webpSrc: "/projects/joggediballa/twitchoverlay-1200w.webp",
  aspect: 800 / 450,
};

export const LIGHTBOX_IMAGES = {
  hook: HOOK,
  admin: ADMIN,
  overlay: OVERLAY,
} as const;

/** Build a public-shot lightbox manifest entry. Aspect-aware: portrait
 *  shots get the 720w fallback width and a 9:16 viewBox; landscape
 *  shots get 1200w / 16:9. The slug + aspect come from
 *  `PUBLIC_SHOT_CONFIG` in CaseStudy.tsx. */
export function buildPublicShotImage(slug: string, aspect: "16/9" | "9/16"): LightboxImageConfig {
  const isPortrait = aspect === "9/16";
  const fallbackW = isPortrait ? 720 : 1200;
  return {
    fullSrc: `/projects/joggediballa/${slug}-${fallbackW}w.jpg`,
    avifSrc: `/projects/joggediballa/${slug}-${fallbackW}w.avif`,
    webpSrc: `/projects/joggediballa/${slug}-${fallbackW}w.webp`,
    aspect: isPortrait ? 540 / 960 : 800 / 450,
  };
}
