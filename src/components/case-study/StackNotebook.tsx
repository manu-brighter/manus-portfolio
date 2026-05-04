import type { ReactNode } from "react";

/**
 * StackNotebook — handwritten notebook page primitive for Station 3 (Tech Stack).
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
      className="relative bg-paper-tint p-6 md:p-8"
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
      <h3 className="relative font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink">
        {heading}
      </h3>
      <div className="relative mt-4 font-mono text-sm leading-7 text-ink">{items}</div>
    </article>
  );
}
