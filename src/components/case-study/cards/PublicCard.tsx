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
  onShotClick?: (shotIndex: number) => void;
  lightboxBaseIndex?: number;
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
  onShotClick,
  lightboxBaseIndex,
}: Props) {
  return (
    // No overflow-hidden here: the 3 polaroid widths intentionally sum to
    // 100%+ with rotation extending past the right edge for a Riso
    // "scattered prints" feel. A defensive overflow-hidden flat-clips the
    // rightmost (phone) shot — see commit 9620676 (Drop ruler / unclip
    // PublicCard). Other 5 cards keep overflow-hidden; they have inner
    // content that benefits from the safety net.
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
          // Mobile layout: slightly bigger polaroids (42% / 24% vs
          // desktop's 39% / 22%) and a vertically-stacked composition
          // where Gönnerverwaltung sits ABOVE Statistics. Gönner
          // pulls -ml-44 (-176px) via flex cascade — that puts its
          // horizontal range entirely above the Statistics
          // screenshot. Formular gets a positive `ml-8` (+32px) to
          // counter Gönner's extra cascade so its absolute position
          // stays where the previous iteration placed it.
          // Desktop layout (md:* overrides) is unchanged.
          const widthClass = s.aspect === "9/16" ? "w-[24%] md:w-[22%]" : "w-[42%] md:w-[39%]";
          // Statistics (i=0) gets a small `ml-3` (12px) on mobile so
          // the whole trio shifts right together — Gönner + Formular
          // cascade by the same 12px via flex layout.
          const mobileShift =
            i === 0
              ? "ml-3 md:ml-0"
              : i === 1
                ? "-ml-44 md:ml-0"
                : i === 2
                  ? "ml-8 md:ml-0"
                  : "";
          return (
            <div
              key={s.slug}
              className={`flex-shrink-0 ${widthClass} ${mobileShift}`}
              style={{
                marginTop: `${offsetTopVh}vh`,
              }}
            >
              <Polaroid
                aspect={s.aspect}
                rotate={s.rotate}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
                onClick={onShotClick ? () => onShotClick(i) : undefined}
                lightboxIndex={lightboxBaseIndex !== undefined ? lightboxBaseIndex + i : undefined}
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
        className="inline-flex items-baseline gap-2 border-b-2 border-ink font-display italic text-ink text-[clamp(1rem,1.5vh,1.5rem)] leading-none w-fit hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
      >
        <span className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.2em] text-ink-muted">
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
