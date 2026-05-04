import { Polaroid } from "@/components/case-study/Polaroid";

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

type Props = {
  publicShots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

export function PublicStation({
  publicShots,
  reflectionLabel,
  reflectionBody,
  footerLabel,
  footerDomain,
  footerUrl,
  footerExternal,
}: Props) {
  return (
    <div className="flex h-full max-w-5xl flex-col justify-center gap-12 px-12">
      <div className="flex flex-wrap items-center gap-8">
        {publicShots.map((s) => {
          const widths = s.aspect === "9/16" ? [360, 540, 720] : [480, 800, 1200];
          const fallbackW = s.aspect === "9/16" ? 540 : 800;
          const renderHeight = s.aspect === "9/16" ? 960 : 450;
          const renderWidth = s.aspect === "9/16" ? 540 : 800;
          return (
            <Polaroid
              key={s.slug}
              aspect={s.aspect}
              rotate={s.rotate}
              spot={s.spot}
              datestamp={s.datestamp}
              caption={s.caption}
              className={s.aspect === "9/16" ? "w-[180px]" : "w-[300px]"}
            >
              <picture className="block h-full w-full">
                <source
                  type="image/avif"
                  srcSet={widths
                    .map((w) => `/projects/joggediballa/${s.slug}-${w}w.avif ${w}w`)
                    .join(", ")}
                />
                <source
                  type="image/webp"
                  srcSet={widths
                    .map((w) => `/projects/joggediballa/${s.slug}-${w}w.webp ${w}w`)
                    .join(", ")}
                />
                <img
                  src={`/projects/joggediballa/${s.slug}-${fallbackW}w.jpg`}
                  alt={s.alt}
                  width={renderWidth}
                  height={renderHeight}
                  loading="lazy"
                  className="block h-full w-full object-cover object-top"
                />
              </picture>
            </Polaroid>
          );
        })}
      </div>
      <div className="border-l-2 border-spot-amber pl-6">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
          {reflectionLabel}
        </p>
        <p className="mt-3 font-display italic text-ink text-[clamp(1.25rem,2.4vw,1.875rem)] leading-[1.3]">
          {reflectionBody}
        </p>
      </div>
      <div className="flex items-baseline gap-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
          {footerLabel}
        </p>
        <a
          href={footerUrl}
          target="_blank"
          rel="noreferrer noopener external"
          className="group inline-flex items-baseline gap-3 border-b-2 border-ink font-display italic text-ink text-[clamp(1.25rem,2.5vw,1.75rem)] leading-none tracking-[-0.01em] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
        >
          {footerDomain}
          <span aria-hidden="true" className="font-mono text-base not-italic">
            ↗
          </span>
          <span className="sr-only">{footerExternal}</span>
        </a>
      </div>
    </div>
  );
}
