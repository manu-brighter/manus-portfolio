import { ExternalLinkIcon } from "@/components/ui/ExternalLinkIcon";

export function PhotographyLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-11 max-w-full items-center gap-4 border-ink/30 border-b py-3 text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus-ring)"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-xl italic leading-tight">{label}</span>
        <span className="break-all font-mono text-[0.65rem] tracking-[0.02em] text-ink-muted">
          {new URL(href).hostname}
        </span>
      </span>
      <ExternalLinkIcon className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" />
    </a>
  );
}
