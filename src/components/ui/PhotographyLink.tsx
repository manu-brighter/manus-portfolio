import { ExternalLinkIcon } from "@/components/ui/ExternalLinkIcon";

// Rose carries the colour as fills only (underline bar + icon stamp):
// as text it fails AA on paper, so the label stays ink.
export function PhotographyLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-11 max-w-full items-center gap-4 border-spot-rose border-b-2 py-3 text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus-ring)"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-xl italic leading-tight">{label}</span>
        <span className="break-all font-mono text-[0.65rem] tracking-[0.02em] text-ink-muted">
          {new URL(href).hostname}
        </span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-spot-rose shadow-[2px_2px_0_var(--color-ink)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:shadow-[3px_3px_0_var(--color-ink)] motion-reduce:transform-none">
        <ExternalLinkIcon className="size-5" />
      </span>
    </a>
  );
}
