/**
 * Audi S5 / car icon — replaced the inline SVG silhouette with the
 * hand-designed PNG icon under public/about/objects/. Source asset:
 * content-input/icons/car.png (902×657, transparent bg). 1x + 2x
 * retina variants generated via the optimize-assets pipeline.
 *
 * Width 140 × height 90 matches the other stamps in the grid so the
 * tile heights stay aligned. `object-contain` keeps the source aspect
 * ratio (~1.37:1) within the slot.
 *
 * The `spotVar` prop is preserved on the signature so the parent
 * dispatcher in ObjectGrid.tsx can pass it uniformly across all six
 * stamps; this PNG-based stamp doesn't tint dynamically (pure raster)
 * and the prop goes unused.
 */

type Props = { spotVar: string };

export function AudiStamp({ spotVar: _spotVar }: Props) {
  return (
    <img
      src="/about/objects/car-120w.png"
      srcSet="/about/objects/car-120w.png 1x, /about/objects/car-240w.png 2x"
      width={140}
      height={90}
      alt=""
      aria-hidden="true"
      className="block object-contain"
      style={{ transform: "rotate(0.5deg)" }}
    />
  );
}
