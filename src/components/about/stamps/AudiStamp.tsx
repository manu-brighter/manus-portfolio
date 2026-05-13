/**
 * Audi S5 / car icon — replaced the inline SVG silhouette with the
 * hand-designed PNG icon under public/about/objects/. Source asset:
 * content-input/icons/car.png (902×657, transparent bg). 1x + 2x
 * retina variants generated via the optimize-assets pipeline.
 *
 * Width 140 x height 90 matches the other stamps in the grid so the
 * tile heights stay aligned. `object-contain` keeps the source aspect
 * ratio (~1.37:1) within the slot.
 *
 * The `spotVar` prop is preserved on the signature so the parent
 * dispatcher in ObjectGrid.tsx can pass it uniformly across all six
 * stamps; this PNG-based stamp doesn't tint dynamically (pure raster)
 * and the prop goes unused.
 *
 * <picture> skeleton ships AVIF + WebP source slots — TODO (Manuel):
 * add `car-{120,240}w.{avif,webp}` to public/about/objects/ via the
 * optimize-assets pipeline. Browsers fall through to the PNG fallback
 * until then, so no 404s.
 */

type Props = { spotVar: string };

export function AudiStamp({ spotVar: _spotVar }: Props) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/about/objects/car-120w.avif 1x, /about/objects/car-240w.avif 2x"
      />
      <source
        type="image/webp"
        srcSet="/about/objects/car-120w.webp 1x, /about/objects/car-240w.webp 2x"
      />
      <img
        src="/about/objects/car-120w.png"
        srcSet="/about/objects/car-120w.png 1x, /about/objects/car-240w.png 2x"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={140}
        height={102}
        className="block h-16 w-auto max-w-[140px] object-contain"
        style={{ transform: "rotate(0.5deg)" }}
      />
    </picture>
  );
}
