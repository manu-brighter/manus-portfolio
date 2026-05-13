/**
 * Jogge di Balla icon — replaced the inline SVG cocktail-glass-in-
 * oval-frame with the hand-designed PNG logo under
 * public/about/objects/. Source asset: content-input/icons/jogge di
 * balla.PNG (3500×3500, transparent bg). 1x + 2x retina variants.
 *
 * See AudiStamp.tsx for the rationale on keeping width 140 x height
 * 90 (grid alignment) and the unused-but-preserved spotVar prop
 * (parent dispatcher uniformity).
 *
 * <picture> skeleton ships AVIF + WebP source slots — TODO (Manuel):
 * add `joggediballa-{120,240}w.{avif,webp}` to public/about/objects/
 * via the optimize-assets pipeline. Browsers fall through to the PNG
 * fallback until then, so no 404s.
 */

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar: _spotVar }: Props) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/about/objects/joggediballa-120w.avif 1x, /about/objects/joggediballa-240w.avif 2x"
      />
      <source
        type="image/webp"
        srcSet="/about/objects/joggediballa-120w.webp 1x, /about/objects/joggediballa-240w.webp 2x"
      />
      <img
        src="/about/objects/joggediballa-120w.png"
        srcSet="/about/objects/joggediballa-120w.png 1x, /about/objects/joggediballa-240w.png 2x"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={120}
        height={120}
        className="block h-16 w-auto max-w-[140px] object-contain"
        style={{ transform: "rotate(-0.5deg)" }}
      />
    </picture>
  );
}
