type Fact = { key: string; value: string };

type Props = {
  label: string;
  facts: Fact[];
  storyParas: string[];
};

export function WhatStation({ label, facts, storyParas }: Props) {
  return (
    <div className="flex h-full max-w-md flex-col items-start justify-center gap-6 px-6 md:px-8">
      <h3 className="type-h3 text-ink">{label}</h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3">
        {facts.map((f) => (
          <div key={f.key} className="contents">
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
              {f.key}
            </dt>
            <dd className="type-body-sm text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-4">
        {storyParas.map((p) => (
          <p key={p.slice(0, 32)} className="type-body text-ink-soft">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
