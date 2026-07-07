/**
 * Ping-pong icon — hand-designed PNG under public/about/objects/.
 * Source asset: content-input/icons/ping pong.png (688×660,
 * transparent bg); Nachtdruck-recolored variant pingpong-dark.
 *
 * Rendering (night-swap, 1x/2x srcSet, unused-but-preserved spotVar
 * prop for parent dispatcher uniformity) lives in RasterStamp.
 */

import { RasterStamp } from "./RasterStamp";

type Props = { spotVar: string };

export function PingPongStamp({ spotVar: _spotVar }: Props) {
  return <RasterStamp slug="pingpong" width={120} height={115} rotate="-2deg" />;
}
