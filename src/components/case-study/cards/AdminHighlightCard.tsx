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
};

/**
 * AdminHighlightCard — Card 4 of the Diorama. 16:9 polaroid (admin-
 * dashboard screenshot) + features list. Sized 500×350. Lupe drawn
 * over this card by DioramaIllustration.
 */
export function AdminHighlightCard({
  kicker,
  title,
  lede,
  features,
  screenshotAlt,
  datestamp,
  polaroidCaption,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-3 bg-paper-tint p-4">
      <div className="flex-shrink-0">
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet="/projects/joggediballa/admin-480w.avif 480w, /projects/joggediballa/admin-800w.avif 800w, /projects/joggediballa/admin-1200w.avif 1200w"
            />
            <source
              type="image/webp"
              srcSet="/projects/joggediballa/admin-480w.webp 480w, /projects/joggediballa/admin-800w.webp 800w, /projects/joggediballa/admin-1200w.webp 1200w"
            />
            <img
              src="/projects/joggediballa/admin-800w.jpg"
              alt={screenshotAlt}
              width={800}
              height={450}
              loading="lazy"
              className="block h-full w-full object-cover object-top"
            />
          </picture>
        </Polaroid>
      </div>
      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <p className="font-mono text-[clamp(0.7rem,1vh,0.95rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-1.5 bg-spot-rose" />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(1.2rem,1.75vh,1.75rem)] leading-tight">
          {title}
        </h3>
        <p className="text-[clamp(0.75rem,1.05vh,1rem)] leading-snug text-ink-soft">{lede}</p>
        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f.title} className="border-l border-ink pl-2">
              <p className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.14em] text-ink">
                {f.title}
              </p>
              <p className="mt-0.5 text-[clamp(0.7rem,1vh,0.95rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
