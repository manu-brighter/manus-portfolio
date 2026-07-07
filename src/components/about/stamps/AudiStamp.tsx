/**
 * Audi S5 / car icon — hand-designed PNG under public/about/objects/.
 * Source asset: content-input/icons/car.png (902×657, transparent bg);
 * Nachtdruck-recolored variant car-dark.
 *
 * Width 140 x height ~102 (aspect ~1.37:1) matches the other stamps so
 * the grid tile heights stay aligned. Rendering (night-swap, 1x/2x
 * srcSet, unused-but-preserved spotVar prop for parent dispatcher
 * uniformity) lives in RasterStamp.
 */

import { RasterStamp } from "./RasterStamp";

type Props = { spotVar: string };

export function AudiStamp({ spotVar: _spotVar }: Props) {
  return <RasterStamp slug="car" width={140} height={102} rotate="0.5deg" />;
}
