/**
 * StampDivider — asterism row between AboutBlocks. Reads the
 * outgoing block's `--block-spot` (inherited via the surrounding
 * about-block container) so the divider tints to that block's
 * spot-color. Renders as `· · ✱ · ·`.
 *
 * Decorative — `aria-hidden`. Pure markup, no JS, no animation.
 */

export function StampDivider() {
  return (
    <div aria-hidden="true" className="my-12 flex items-center justify-center gap-3 md:my-20">
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="text-xl" style={{ color: "var(--block-spot, var(--color-ink-muted))" }}>
        ✱
      </span>
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
    </div>
  );
}
