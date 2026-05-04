import { Polaroid } from "@/components/case-study/Polaroid";

type Feature = { title: string; body: string };

type Props = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotSlug: string;
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate?: number;
};

export function HighlightStation({
  kicker,
  title,
  lede,
  features,
  screenshotSlug,
  screenshotAlt,
  datestamp,
  polaroidCaption,
  spot,
  rotate = 2,
}: Props) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-8 px-12 md:flex-row md:items-center md:gap-12">
      <Polaroid
        aspect="16/9"
        rotate={rotate}
        spot={spot}
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-full shrink-0 md:w-[460px]"
      >
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet={`/projects/joggediballa/${screenshotSlug}-480w.avif 480w, /projects/joggediballa/${screenshotSlug}-800w.avif 800w, /projects/joggediballa/${screenshotSlug}-1200w.avif 1200w`}
          />
          <source
            type="image/webp"
            srcSet={`/projects/joggediballa/${screenshotSlug}-480w.webp 480w, /projects/joggediballa/${screenshotSlug}-800w.webp 800w, /projects/joggediballa/${screenshotSlug}-1200w.webp 1200w`}
          />
          <img
            src={`/projects/joggediballa/${screenshotSlug}-800w.jpg`}
            alt={screenshotAlt}
            width={800}
            height={450}
            loading="lazy"
            className="block h-full w-full object-cover object-top"
          />
        </picture>
      </Polaroid>
      <div className="max-w-md space-y-5">
        <p className="type-label inline-flex items-center gap-2 text-ink">
          <span
            aria-hidden="true"
            className="inline-block size-2"
            style={{ background: `var(--color-spot-${spot})` }}
          />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.015em]">
          {title}
        </h3>
        <p className="type-body text-ink-soft">{lede}</p>
        <ul className="space-y-4">
          {features.map((f) => (
            <li key={f.title} className="border-l-2 border-ink pl-3">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink">
                {f.title}
              </p>
              <p className="mt-1 type-body-sm text-ink-soft">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
