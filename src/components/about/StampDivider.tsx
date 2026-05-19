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
 * Decorative — `aria-hidden`. Pure markup, no JS, no animation.
 */

type Props = {
  /** Outgoing block's spot-color. Falls back to ink-muted if omitted. */
  spot?: SpotColor;
};

export function StampDivider({ spot }: Props) {
  const color = spot ? SPOT_CSS_VAR[spot] : "var(--color-ink-muted)";
  return (
    <div aria-hidden="true" className="my-12 flex items-center justify-center gap-3 md:my-20">
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="text-xl" style={{ color }}>
        ✱
      </span>
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
    </div>
  );
}
