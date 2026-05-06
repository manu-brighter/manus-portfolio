/**
 * Jogge di Balla icon — replaced the inline SVG cocktail-glass-in-
 * oval-frame with the hand-designed PNG logo under
 * public/about/objects/. Source asset: content-input/icons/jogge di
 * balla.PNG (3500×3500, transparent bg). 1x + 2x retina variants.
 *
 * See AudiStamp.tsx for the rationale on keeping width 140 × height
 * 90 (grid alignment) and the unused-but-preserved spotVar prop
 * (parent dispatcher uniformity).
 */

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar: _spotVar }: Props) {
  return (
    <img
      src="/about/objects/joggediballa-120w.png"
      srcSet="/about/objects/joggediballa-120w.png 1x, /about/objects/joggediballa-240w.png 2x"
      width={140}
      height={90}
      alt=""
      aria-hidden="true"
      className="block object-contain"
      style={{ transform: "rotate(-0.5deg)" }}
    />
  );
}
