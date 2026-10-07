import type { ReactNode } from "react";
import type { DioramaCardsProps } from "@/components/case-study/DioramaCards";
import { Polaroid } from "@/components/case-study/Polaroid";
import { ExternalLinkIcon } from "@/components/ui/ExternalLinkIcon";

/**
 * CaseStudyStacked — the case study for WIDE but SHORT viewports.
 *
 * The horizontal diorama is laid out in vh (a 100vh-tall, 420vh-wide
 * track), so below ~700px of viewport height its cards get unreadably
 * small and DioramaTrack falls back to a vertical flow. That fallback
 * used to be the phone stack, which on a 1366x768 laptop (≈1366x650
 * viewport) meant a half-screen-wide phone polaroid, vh-clamped copy at
 * 8-11px, and mobile margin hacks in the public shots.
 *
 * This is the desktop-width answer instead: one container-page column of
 * two-column rows, media ~35% and copy ~65%, all type in rem (nothing
 * here scales with viewport height), the same five stations in the
 * diorama's order. It takes the diorama's own station config, so content
 * and lightbox indices can't drift between the two layouts. Phones keep
 * their carousel (CaseStudy) and the narrow stack (DioramaTrack).
 *
 * Reduced motion also lands here at desktop widths: nothing in it
 * animates, and Polaroid zeroes its tilt under reduced motion.
 */

type Props = DioramaCardsProps & {
  headline: string;
  sectionLabel: string;
};

const IMG_BASE = "/projects/joggediballa";

// Tailwind only sees literal class names: static map, no interpolation.
const DOT_BG_CLASS = {
  admin: "bg-spot-rose",
  twitchoverlay: "bg-spot-amber",
} as const;

function Shot({
  base,
  widths,
  width,
  height,
  sizes,
  alt,
}: {
  base: string;
  widths: readonly number[];
  width: number;
  height: number;
  sizes: string;
  alt: string;
}) {
  const set = (ext: string) => widths.map((w) => `${base}-${w}w.${ext} ${w}w`).join(", ");
  return (
    <picture className="block h-full w-full">
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`${base}-${width}w.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="block h-full w-full object-cover object-top"
      />
    </picture>
  );
}

/** One station: media column (~35%) beside a copy column (~65%). */
function Row({
  media,
  children,
  align = "start",
}: {
  media: ReactNode;
  children: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,35fr)_minmax(0,65fr)] gap-10 lg:gap-16 ${
        align === "center" ? "items-center" : "items-start"
      }`}
    >
      <div className="min-w-0">{media}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Highlight({
  slug,
  spot,
  index,
  config,
}: {
  slug: "admin" | "twitchoverlay";
  spot: "rose" | "amber";
  index: number;
  config: DioramaCardsProps["admin"];
}) {
  return (
    <Row
      media={
        <Polaroid
          aspect="16/9"
          rotate={index === 1 ? 1 : -1}
          spot={spot}
          datestamp={config.station.datestamp}
          caption={config.station.polaroidCaption ?? ""}
          className="w-full"
          onClick={config.onClick}
          lightboxIndex={index}
          scale="rem"
        >
          <Shot
            base={`${IMG_BASE}/${slug}`}
            widths={[480, 800, 1200]}
            width={800}
            height={450}
            sizes="35vw"
            alt={config.screenshotAlt}
          />
        </Polaroid>
      }
    >
      <p className="type-label inline-flex items-center gap-2 text-ink">
        <span aria-hidden="true" className={`inline-block size-2 ${DOT_BG_CLASS[slug]}`} />
        {config.kicker}
      </p>
      <h3 className="type-h3 mt-3 italic text-ink">{config.title}</h3>
      <p className="type-body mt-3 text-ink-soft">{config.lede}</p>
      <ul className="mt-5 grid gap-3">
        {config.features.map((f) => (
          <li key={f.title} className="border-ink border-l-[1.5px] pl-3">
            <p className="type-label text-ink">{f.title}</p>
            <p className="type-body-sm mt-1 text-ink-soft">{f.body}</p>
          </li>
        ))}
      </ul>
    </Row>
  );
}

export function CaseStudyStacked({
  headline,
  sectionLabel,
  hook,
  context,
  admin,
  overlay,
  public: pub,
}: Props) {
  return (
    <div data-case-study-layout="stacked" className="container-page flex flex-col gap-20 py-8">
      <header className="flex flex-col items-start gap-5">
        <p aria-hidden="true" className="type-label-stamp text-ink-muted">
          {sectionLabel}
        </p>
        <h2 id="case-study-heading" className="type-h1 text-ink">
          {headline}
        </h2>
      </header>

      {/* Hook: the phone shot is capped at 13rem so a 9:16 frame stays
          shorter than a laptop viewport. */}
      <Row
        align="center"
        media={
          <div className="w-full max-w-[13rem]">
            <Polaroid
              aspect="9/16"
              rotate={-2}
              spot="rose"
              datestamp={hook.station.datestamp}
              caption={hook.station.polaroidCaption ?? ""}
              className="w-full"
              onClick={hook.onClick}
              lightboxIndex={0}
              scale="rem"
            >
              <Shot
                base={`${IMG_BASE}/homepage-phone`}
                widths={[360, 540, 720]}
                width={540}
                height={960}
                sizes="13rem"
                alt={hook.screenshotAlt}
              />
            </Polaroid>
          </div>
        }
      >
        <blockquote className="max-w-[34ch] font-display text-[1.75rem] text-ink italic leading-snug tracking-[-0.01em] lg:text-[2rem]">
          <span aria-hidden="true" className="mr-1 text-spot-amber">
            «
          </span>
          {hook.hookText}
          <span aria-hidden="true" className="ml-1 text-spot-amber">
            »
          </span>
        </blockquote>
      </Row>

      {/* Context: stack notebook beside the facts and the story. */}
      <Row
        media={
          <div
            className="relative -rotate-1 bg-paper-tint p-6 motion-reduce:rotate-0"
            style={{
              boxShadow: "4px 4px 0 var(--color-ink), 2px 2px 0 var(--color-spot-amber)",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent 0, transparent 22px, var(--color-ink) 22px, var(--color-ink) 23px)",
              }}
            />
            <h3 className="type-label relative text-ink">{context.stackHeading}</h3>
            <ul className="relative mt-4 grid gap-1.5 font-mono text-[0.8125rem] text-ink leading-[1.6]">
              {context.stack.map((row) => (
                <li key={row.tech} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{row.tech}</span>
                  <span aria-hidden="true" className="text-ink-muted">
                    ·
                  </span>
                  <span className="text-ink-soft">{row.use}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <h3 className="type-h3 italic text-ink">{context.whatLabel}</h3>
        <dl className="mt-5 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          {context.facts.map((f) => (
            <div key={f.key} className="contents">
              <dt className="type-label pt-1 text-ink-muted">{f.key}</dt>
              <dd className="type-body text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 space-y-3">
          {context.storyParas.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable
            <p key={i} className="type-body text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      </Row>

      <Highlight slug="admin" spot="rose" index={1} config={admin} />
      <Highlight slug="twitchoverlay" spot="amber" index={2} config={overlay} />

      {/* Public layer: the three live shots side by side (two landscape,
          one phone), then the reflection in the copy column. */}
      <div className="flex flex-col gap-10">
        <div className="grid max-w-[60rem] grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-8">
          {pub.shots.map((s, i) => {
            const phone = s.aspect === "9/16";
            return (
              <Polaroid
                key={s.slug}
                aspect={s.aspect}
                rotate={s.rotate}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
                onClick={pub.onShotClick ? () => pub.onShotClick?.(i) : undefined}
                lightboxIndex={3 + i}
                scale="rem"
              >
                <Shot
                  base={`${IMG_BASE}/${s.slug}`}
                  widths={phone ? [360, 540, 720] : [480, 800, 1200]}
                  width={phone ? 540 : 800}
                  height={phone ? 960 : 450}
                  sizes={phone ? "12rem" : "24rem"}
                  alt={s.alt}
                />
              </Polaroid>
            );
          })}
        </div>
        <Row media={<p className="type-label pt-1 text-ink-muted">{pub.reflectionLabel}</p>}>
          <p className="max-w-[48ch] border-spot-amber border-l-2 pl-4 font-display text-[1.375rem] text-ink italic leading-snug">
            {pub.reflectionBody}
          </p>
          <a
            href={pub.footerUrl}
            target="_blank"
            rel="noreferrer noopener external"
            className="mt-6 inline-flex w-fit items-baseline gap-2 border-ink border-b-2 font-display text-[1.375rem] text-ink italic leading-none transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint motion-reduce:transition-none"
          >
            <span className="type-label text-ink-muted not-italic">{pub.footerLabel}</span>
            {pub.footerDomain}
            <ExternalLinkIcon />
            <span className="sr-only">{pub.footerExternal}</span>
          </a>
        </Row>
      </div>
    </div>
  );
}
