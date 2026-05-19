type StackRow = { tech: string; use: string };

type Props = {
  heading: string;
  stack: StackRow[];
};

/**
 * StackCard — Card 3 of the Diorama. Handwritten-notebook visual with
 * paper-tint background, subtle ruled lines (SVG pattern), slight
 * rotation, page-curl corner (CSS clip-path), and amber spot-color
 * note-corner accent. Inlined the previous StackNotebook primitive
 * (single consumer, tightly coupled — the indirection didn't earn its
 * keep).
 */
export function StackCard({ heading, stack }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.375rem,0.9vh,0.5rem)]">
      <article
        className="relative bg-paper-tint p-[clamp(0.875rem,2.4vh,2rem)]"
        style={{
          transform: "rotate(-1.5deg)",
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
          <ul className="space-y-1">
            {stack.map((row) => (
              <li key={row.tech} className="flex items-baseline gap-2">
                <span className="font-medium text-ink">{row.tech}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{row.use}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
