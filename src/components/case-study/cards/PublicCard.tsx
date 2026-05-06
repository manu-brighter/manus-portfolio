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
  shots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

/**
 * PublicCard — Card 6 of the diorama. 3 polaroids in a flex row with
 * diagonal-stagger marginTop offsets, plus reflection block and footer
 * link below.
 */
export function PublicCard({
  shots,
  reflectionLabel,
  reflectionBody,
  footerLabel,
  footerDomain,
  footerUrl,
  footerExternal,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-[clamp(0.5rem,1.2vh,0.75rem)]">
      <div className="flex flex-1 items-start gap-[clamp(0.375rem,0.9vh,0.5rem)]">
        {shots.map((s, i) => {
          const widths = s.aspect === "9/16" ? [360, 540, 720] : [480, 800, 1200];
          const fallbackW = s.aspect === "9/16" ? 540 : 800;
          const renderHeight = s.aspect === "9/16" ? 960 : 450;
          const renderWidth = s.aspect === "9/16" ? 540 : 800;
          // Diagonal stagger: first polaroid pushed further down to clear
          // the coffee mug above-left; second at top, third halfway down —
          // creates a fan-out cascade.
          const offsetTopVh = [18, 0, 5][i] ?? 0;
          return (
            <div
              key={s.slug}
              className="flex-shrink-0"
              style={{
                width: s.aspect === "9/16" ? "22%" : "39%",
                marginTop: `${offsetTopVh}vh`,
                transform: `rotate(${s.rotate}deg)`,
              }}
            >
              <Polaroid
                aspect={s.aspect}
                rotate={0}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
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
            </div>
          );
        })}
      </div>
      <div className="border-l-2 border-spot-amber pl-2">
        <p className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.18em] text-ink-muted">
          {reflectionLabel}
        </p>
        <p className="mt-1 font-display italic text-ink text-[clamp(0.875rem,1.4vh,1.4rem)] leading-snug">
          {reflectionBody}
        </p>
      </div>
      <a
        href={footerUrl}
        target="_blank"
        rel="noreferrer noopener external"
        className="inline-flex items-baseline gap-2 bg-spot-amber px-3 py-2 font-display italic text-ink text-[clamp(1rem,1.5vh,1.5rem)] leading-none w-fit shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.2em] text-ink">
          {footerLabel}
        </span>
        {footerDomain}
        <span aria-hidden="true" className="font-mono text-base not-italic">
          ↗
        </span>
        <span className="sr-only">{footerExternal}</span>
      </a>
    </div>
  );
}
