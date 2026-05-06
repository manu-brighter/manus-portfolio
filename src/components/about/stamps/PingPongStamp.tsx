/**
 * Ping-pong icon — replaced the inline SVG paddle with the hand-
 * designed PNG icon under public/about/objects/. Source asset:
 * content-input/icons/ping pong.png (688×660, transparent bg).
 * 1x + 2x retina variants.
 *
 * See AudiStamp.tsx for the rationale on keeping width 140 × height
 * 90 (grid alignment) and the unused-but-preserved spotVar prop
 * (parent dispatcher uniformity).
 */

type Props = { spotVar: string };

export function PingPongStamp({ spotVar: _spotVar }: Props) {
  return (
    <img
      src="/about/objects/pingpong-120w.png"
      srcSet="/about/objects/pingpong-120w.png 1x, /about/objects/pingpong-240w.png 2x"
      alt=""
      aria-hidden="true"
      className="block h-16 w-auto max-w-[140px] object-contain"
      style={{ transform: "rotate(-2deg)" }}
    />
  );
}
