import { StackNotebook } from "@/components/case-study/StackNotebook";

type StackRow = { tech: string; use: string; why: string };

type Props = {
  heading: string;
  rule: string;
  intro: string;
  modules: string;
  stack: StackRow[];
};

/**
 * StackCard — Card 3 of the Diorama. Notebook-style with tech-stack
 * list. Rotated -7° via parent. Sized 240×280.
 */
export function StackCard({ heading, rule, intro, modules, stack }: Props) {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-[clamp(0.65rem,0.9vh,0.85rem)] leading-snug text-ink-soft">{intro}</p>
      <StackNotebook
        heading={heading}
        items={
          <ul className="space-y-1">
            {stack.map((row) => (
              <li key={row.tech} className="flex items-baseline gap-2">
                <span className="font-medium text-ink">{row.tech}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{row.use}</span>
              </li>
            ))}
          </ul>
        }
      />
      <p className="text-[clamp(0.55rem,0.8vh,0.75rem)] text-ink-muted italic">{modules}</p>
      <p className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] tracking-[0.2em] text-ink-muted uppercase">
        {rule}
      </p>
    </div>
  );
}
