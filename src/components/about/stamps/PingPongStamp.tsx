/**
 * Ping-pong icon — replaced the inline SVG paddle with the hand-
 * designed PNG icon under public/about/objects/. Source asset:
 * content-input/icons/ping pong.png (688×660, transparent bg).
 * 1x + 2x retina variants.
 *
 * See AudiStamp.tsx for the rationale on keeping width 140 x height
 * 90 (grid alignment) and the unused-but-preserved spotVar prop
 * (parent dispatcher uniformity).
 *
 * <picture> skeleton ships AVIF + WebP source slots — TODO (Manuel):
 * add `pingpong-{120,240}w.{avif,webp}` to public/about/objects/ via
 * the optimize-assets pipeline. Browsers fall through to the PNG
 * fallback until then, so no 404s.
 */

type Props = { spotVar: string };

export function PingPongStamp({ spotVar: _spotVar }: Props) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/about/objects/pingpong-120w.avif 1x, /about/objects/pingpong-240w.avif 2x"
      />
      <source
        type="image/webp"
        srcSet="/about/objects/pingpong-120w.webp 1x, /about/objects/pingpong-240w.webp 2x"
      />
      <img
        src="/about/objects/pingpong-120w.png"
        srcSet="/about/objects/pingpong-120w.png 1x, /about/objects/pingpong-240w.png 2x"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={120}
        height={115}
        className="block h-16 w-auto max-w-[140px] object-contain"
        style={{ transform: "rotate(-2deg)" }}
      />
    </picture>
  );
}
