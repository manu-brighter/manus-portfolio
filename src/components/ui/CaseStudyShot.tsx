/**
 * CaseStudyShot — Riso-framed screenshot primitive for the Joggediballa
 * case study (Section 04).
 *
 * The screenshot itself stays in its native colors — we want pro UI
 * captures legible. The "Riso treatment" lives entirely in the framing:
 *
 *   • paper-shade backing rectangle, offset bottom-right (the spot
 *     accent), peeks out behind the screenshot
 *   • 2px ink border on the screenshot frame
 *   • optional mono caption underneath
 *
 * Phase 9's photo-duotone shader (plan §6.5) can later wrap these
 * frames with a runtime color treatment if the look calls for it.
 */

type CaseStudyShotProps = {
  /** Filename slug under /public/projects/joggediballa/ (no width suffix). */
  slug: string;
  alt: string;
  caption?: string;
  /** Spot color used for the offset backing block. */
  accent?: "rose" | "amber" | "mint" | "violet";
  /** Aspect-ratio override for the frame; defaults to 16:10. */
  aspect?: string;
};

export function CaseStudyShot({
  slug,
  alt,
  caption,
  accent = "amber",
  aspect = "16/10",
}: CaseStudyShotProps) {
  const base = `/projects/joggediballa/${slug}`;
  return (
    <figure className="relative">
      {/* Spot-color backing block, shifted bottom-right. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3"
        style={{ background: `var(--color-spot-${accent})`, opacity: 0.18 }}
      />
      {/* Screenshot frame. */}
      <div
        className="relative overflow-hidden border-2 border-ink bg-paper-shade"
        style={{ aspectRatio: aspect }}
      >
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet={`${base}-480w.avif 480w, ${base}-800w.avif 800w, ${base}-1200w.avif 1200w`}
            sizes="(min-width: 1024px) 36rem, (min-width: 640px) 60vw, 100vw"
          />
          <source
            type="image/webp"
            srcSet={`${base}-480w.webp 480w, ${base}-800w.webp 800w, ${base}-1200w.webp 1200w`}
            sizes="(min-width: 1024px) 36rem, (min-width: 640px) 60vw, 100vw"
          />
          <img
            src={`${base}-800w.jpg`}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </picture>
      </div>
      {caption ? (
        <figcaption className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
