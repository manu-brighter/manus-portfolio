import { Polaroid } from "@/components/case-study/Polaroid";

type Feature = { title: string; body: string };

type Props = {
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

/**
 * OverlayHighlightCard — Card 5 of the diorama. Same shape as
 * AdminHighlightCard but for the twitch-overlay screenshot, amber spot.
 */
export function OverlayHighlightCard({
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
  return (
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
      <div className="flex-shrink-0">
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot="amber"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
          onClick={onPolaroidClick}
          lightboxIndex={lightboxIndex}
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet="/projects/joggediballa/twitchoverlay-480w.avif 480w, /projects/joggediballa/twitchoverlay-800w.avif 800w, /projects/joggediballa/twitchoverlay-1200w.avif 1200w"
            />
            <source
              type="image/webp"
              srcSet="/projects/joggediballa/twitchoverlay-480w.webp 480w, /projects/joggediballa/twitchoverlay-800w.webp 800w, /projects/joggediballa/twitchoverlay-1200w.webp 1200w"
            />
            <img
              src="/projects/joggediballa/twitchoverlay-800w.jpg"
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
          <span aria-hidden="true" className="inline-block size-1.5 bg-spot-amber" />
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
