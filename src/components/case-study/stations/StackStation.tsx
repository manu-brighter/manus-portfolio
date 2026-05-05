import { PenScribble } from "@/components/case-study/cliparts/PenScribble";
import { StackNotebook } from "@/components/case-study/StackNotebook";

type StackRow = { tech: string; use: string; why: string };

type Props = {
  heading: string;
  rule: string;
  intro: string;
  modules: string;
  stack: StackRow[];
};

export function StackStation({ heading, rule, intro, modules, stack }: Props) {
  return (
    <div className="relative flex h-full max-w-sm flex-col justify-center gap-5 px-6 md:px-8">
      <p className="type-body text-ink-soft">{intro}</p>
      <StackNotebook
        heading={heading}
        items={
          <ul className="space-y-2">
            {stack.map((row) => (
              <li key={row.tech} className="flex items-baseline gap-3">
                <span className="font-medium text-ink">{row.tech}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{row.use}</span>
              </li>
            ))}
          </ul>
        }
      />
      <p className="type-body-sm text-ink-muted italic">{modules}</p>
      <PenScribble className="absolute -top-4 right-4 hidden md:block" />
      <span className="absolute right-6 bottom-4 hidden font-mono text-[0.65rem] tracking-[0.2em] text-ink-muted md:block">
        {rule}
      </span>
    </div>
  );
}
