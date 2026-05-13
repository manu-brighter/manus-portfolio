import { Polaroid } from "@/components/case-study/Polaroid";
import type { SpotColor } from "@/lib/palette";

type Feature = { title: string; body: string };

type Props = {
  /** Picks the project slug for the screenshot srcset + the dot
   *  accent's Tailwind class. `admin` -> spot-rose; `twitchoverlay` ->
   *  spot-amber. */
  slug: "admin" | "twitchoverlay";
  /** Riso spot frame on the Polaroid. */
  spot: SpotColor;
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
  onPolaroidClick?: () => void;
  lightboxIndex?: number;
};

// Tailwind v4's JIT scans literal class strings only — interpolated
// names get purged. Static map keeps the dot accent's spot colour in
// sync with the polaroid frame.
const DOT_BG_CLASS = {
  admin: "bg-spot-rose",
  twitchoverlay: "bg-spot-amber",
} as const;

/**
 * HighlightCard — shared diorama card for the two case-study
 * highlight stations (Admin / Twitch-Overlay). Both stations have
 * byte-identical layout — a polaroid above a feature list — so
 * AdminHighlightCard + OverlayHighlightCard collapsed into this one
 * component parameterised on `slug` + `spot`.
 */
export function HighlightCard({
  slug,
  spot,
  kicker,
  title,
  lede,
  features,
  screenshotAlt,
  datestamp,
  polaroidCaption,
  onPolaroidClick,
  lightboxIndex,
}: Props) {
  const base = `/projects/joggediballa/${slug}`;
  return (
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
      <div className="flex-shrink-0">
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot={spot}
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
          onClick={onPolaroidClick}
          lightboxIndex={lightboxIndex}
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet={`${base}-480w.avif 480w, ${base}-800w.avif 800w, ${base}-1200w.avif 1200w`}
            />
            <source
              type="image/webp"
              srcSet={`${base}-480w.webp 480w, ${base}-800w.webp 800w, ${base}-1200w.webp 1200w`}
            />
            <img
              src={`${base}-800w.jpg`}
              alt={screenshotAlt}
              width={800}
              height={450}
              loading="lazy"
              className="block h-full w-full object-cover object-top"
            />
          </picture>
        </Polaroid>
      </div>
      <div className="flex flex-1 flex-col gap-[clamp(0.375rem,0.9vh,0.5rem)] min-h-0">
        <p className="font-mono text-[clamp(0.625rem,1vh,0.95rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block size-1.5 ${DOT_BG_CLASS[slug]}`} />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(1.0625rem,1.75vh,1.75rem)] leading-tight">
          {title}
        </h3>
        <p className="text-[clamp(0.6875rem,1.05vh,1rem)] leading-snug text-ink-soft">{lede}</p>
        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f.title} className="border-l border-ink pl-2">
              <p className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.14em] text-ink">
                {f.title}
              </p>
              <p className="mt-0.5 text-[clamp(0.625rem,1vh,0.95rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
