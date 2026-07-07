/**
 * Jogge di Balla icon — hand-designed PNG logo under
 * public/about/objects/. Source asset: content-input/icons/jogge di
 * balla.PNG (3500×3500, transparent bg); Nachtdruck-recolored variant
 * joggediballa-dark.
 *
 * Rendering (night-swap, 1x/2x srcSet, unused-but-preserved spotVar
 * prop for parent dispatcher uniformity) lives in RasterStamp.
 */

import { RasterStamp } from "./RasterStamp";

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar: _spotVar }: Props) {
  return <RasterStamp slug="joggediballa" width={120} height={120} rotate="-0.5deg" />;
}
