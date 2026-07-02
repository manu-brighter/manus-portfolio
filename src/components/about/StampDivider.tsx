import { FadeIn } from "@/components/motion/FadeIn";
import { SPOT_CSS_VAR, type SpotColor } from "@/lib/palette";

/**
 * StampDivider — asterism row between AboutBlocks. Tints the centre
 * asterism to the outgoing block's spot-color. Renders as `· · ✱ · ·`.
 *
 * Note on the `spot` prop: the divider is rendered as a *sibling* of
 * the AboutBlock (not nested), so CSS custom-property cascade can't
 * pull `--block-spot` through the DOM tree. Caller must pass the
 * outgoing block's spot explicitly.
 *
 * Decorative — `aria-hidden`, no focus stops. Glyphs pop in staggered
 * (dots first, asterisk lands last) via `FadeIn scale`; reduced-motion
 * renders statically through the primitive.
 */

type Props = {
  /** Outgoing block's spot-color. Falls back to ink-muted if omitted. */
  spot?: SpotColor;
};

// Outer dots lead, asterisk (index 2) lands last — stamp cadence.
const POP_ORDER = [0, 1, 4, 2, 3] as const;

export function StampDivider({ spot }: Props) {
  const color = spot ? SPOT_CSS_VAR[spot] : "var(--color-ink-muted)";
  return (
    <div aria-hidden="true" className="my-12 flex items-center justify-center gap-3 md:my-20">
      <FadeIn scale={0.4} delay={POP_ORDER[0] * 0.09}>
        <span className="block size-1 rounded-full bg-ink-muted" />
      </FadeIn>
      <FadeIn scale={0.4} delay={POP_ORDER[1] * 0.09}>
        <span className="block size-1 rounded-full bg-ink-muted" />
      </FadeIn>
      <FadeIn scale={0.4} delay={POP_ORDER[2] * 0.09}>
        <span className="block text-xl" style={{ color }}>
          ✱
        </span>
      </FadeIn>
      <FadeIn scale={0.4} delay={POP_ORDER[3] * 0.09}>
        <span className="block size-1 rounded-full bg-ink-muted" />
      </FadeIn>
      <FadeIn scale={0.4} delay={POP_ORDER[4] * 0.09}>
        <span className="block size-1 rounded-full bg-ink-muted" />
      </FadeIn>
    </div>
  );
}
