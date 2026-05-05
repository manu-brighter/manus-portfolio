import { StackNotebook } from "@/components/case-study/StackNotebook";

type StackRow = { tech: string; use: string };

type Props = {
  heading: string;
  stack: StackRow[];
};

/**
 * StackCard — Card 3 of the Diorama. Just a notebook-style stack list.
 * Intro/modules/rule were dropped after visual review — Stack-Notiz
 * alone is enough; the surrounding props introduced visual noise.
 */
export function StackCard({ heading, stack }: Props) {
  return (
    <div className="flex h-full flex-col gap-2">
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
    </div>
  );
}
