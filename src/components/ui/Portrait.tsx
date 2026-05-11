import type { ReactNode } from "react";

/**
 * Portrait — still photo with Riso editorial framing.
 *
 * Phase 6 intentionally ships without the duotone shader originally
 * sketched in plan §6.5 / briefing §2.4. The frame is the treatment:
 * a 2px ink border offset slightly toward the bottom-right so the
 * paper-shade backing reads as a Riso underlay (mis-registered
 * `--color-spot-rose` block). Photo itself is untouched — the craft
 * belongs to the subject, not to a shader. See CLAUDE.md Phase 6
 * deviations for rationale.
 *
 * Image delivery: native `<picture>` with AVIF → WebP → JPG sources
 * and a 480/800/1200w srcset. `next/image` is bypassed because
 * `next.config.ts` has `images.unoptimized: true` (static export),
 * which would force a single resolution regardless.
 *
 * Asset origin: one-off optimization via `pnpm dlx sharp-cli` against
 * `content-input/profile/profile-picture.jpg` (gitignored). Phase 9
 * will generalize this into `scripts/optimize-assets.ts`.
 */

type PortraitProps = {
  /** Required alt text — briefing §2.4 sample is "Portraitfoto von Manuel Heller". */
  alt: string;
  /** Mono caption stamp rendered below the frame (optional). */
  caption?: ReactNode;
  /** Responsive `sizes` attribute; default fits the 5-col About layout. */
  sizes?: string;
  /** Additional wrapper classes for layout composition. */
  className?: string;
};

export function Portrait({
  alt,
  caption,
  sizes = "(min-width: 1024px) 28rem, (min-width: 640px) 40vw, 80vw",
  className,
}: PortraitProps) {
  return (
    <figure className={className}>
      <div className="relative">
        {/* Riso "plate" — a paper-shade block offset behind the photo,
            reads as a misregistered print underlay. Purely decorative. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-2 translate-y-2 bg-spot-rose/15"
        />
        <picture className="relative block aspect-[2/3] overflow-hidden border-[2px] border-ink bg-paper-shade">
          <source
            type="image/avif"
            srcSet="/profile/manuel-heller-portrait-480w.avif 480w, /profile/manuel-heller-portrait-800w.avif 800w, /profile/manuel-heller-portrait-1200w.avif 1200w"
            sizes={sizes}
          />
          <source
            type="image/webp"
            srcSet="/profile/manuel-heller-portrait-480w.webp 480w, /profile/manuel-heller-portrait-800w.webp 800w, /profile/manuel-heller-portrait-1200w.webp 1200w"
            sizes={sizes}
          />
          <img
            src="/profile/manuel-heller-portrait-800w.jpg"
            alt={alt}
            width={800}
            height={1200}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover"
          />
        </picture>
      </div>
      {caption ? (
        <figcaption className="mt-4 text-ink-muted type-label">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
