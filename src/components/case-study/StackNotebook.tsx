import type { ReactNode } from "react";

/**
 * StackNotebook — handwritten notebook page primitive used by StackCard.
 *
 * Visual: paper-tint background with subtle ruled lines (SVG pattern), slight rotation,
 * page-curl corner (CSS clip-path), spot-color note-corner.
 */

type Props = {
  /** Heading (the notebook page title) */
  heading: string;
  /** List items rendered as bullet entries with mono-font. */
  items: ReactNode;
  /** Rotation in degrees */
  rotate?: number;
};

export function StackNotebook({ heading, items, rotate = -1.5 }: Props) {
  return (
    <article
      className="relative bg-paper-tint p-[clamp(0.875rem,2.4vh,2rem)]"
      style={{
        transform: `rotate(${rotate}deg)`,
        boxShadow: "4px 4px 0 var(--color-ink), 2px 2px 0 var(--color-spot-amber)",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
      }}
    >
      {/* Ruled lines pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent 0, transparent 22px, var(--color-ink) 22px, var(--color-ink) 23px)",
        }}
      />
      {/* Page-curl corner accent */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 size-5"
        style={{ background: "var(--color-paper-shade)" }}
      />
      <h3 className="relative font-mono text-[clamp(0.625rem,1vh,0.75rem)] uppercase tracking-[0.2em] text-ink">
        {heading}
      </h3>
      <div className="relative mt-[clamp(0.5rem,1.6vh,1rem)] font-mono text-[clamp(0.75rem,1.2vh,0.875rem)] leading-[1.7] text-ink">
        {items}
      </div>
    </article>
  );
}
