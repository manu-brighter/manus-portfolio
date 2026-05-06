type Fact = { key: string; value: string };

type Props = {
  label: string;
  facts: Fact[];
  storyParas: string[];
};

/**
 * WhatCard — Card 2 of the Diorama. Text-only paper card with the
 * "Was ist Jogge di Balla?" facts dl and the story prose underneath.
 */
export function WhatCard({ label, facts, storyParas }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
      <h3 className="font-display italic text-ink text-[clamp(1.125rem,2.25vh,1.875rem)]">
        {label}
      </h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
        {facts.map((f) => (
          <div key={f.key} className="contents">
            <dt className="font-mono text-[clamp(0.625rem,1vh,0.95rem)] uppercase tracking-[0.18em] text-ink-muted">
              {f.key}
            </dt>
            <dd className="text-[clamp(0.75rem,1.1vh,1.05rem)] text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2">
        {storyParas.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable
          <p key={i} className="text-[clamp(0.75rem,1.1vh,1.05rem)] leading-snug text-ink-soft">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
