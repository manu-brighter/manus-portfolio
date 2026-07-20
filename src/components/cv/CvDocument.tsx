import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { CvActions } from "@/components/cv/CvActions";
import { CvInkStamp } from "@/components/cv/CvInkStamp";
import { PlateCornerMarks } from "@/components/ui/PlateCornerMarks";
import { Link } from "@/i18n/navigation";
import { SPOT_CSS_VAR, type SpotColor } from "@/lib/palette";
import { SITE } from "@/lib/site";
import type {
  CvEducationItems,
  CvEngagementItems,
  CvExperienceItems,
  CvLanguageItems,
  CvProjectItems,
  CvSkillGroups,
  CvStrengthItems,
} from "@/types/i18n-shapes";

/**
 * CvDocument — the /cv press proof.
 *
 * PRINT PARITY IS THE DESIGN RULE HERE. The sheet is a fixed-width
 * `max-w-[184mm]` block whose typography uses only fixed rem sizes
 * (no vw/clamp — viewport units resolve differently against the A4
 * page box and would reflow the PDF). `@page` margin is 11mm, so the
 * 184mm sheet fits the printable area 1:1: what you see on screen IS
 * the PDF, minus the desk backdrop, topbar, and drop shadow (all
 * `print:`-stripped without touching geometry). Never add `print:`
 * overrides that change sizes, gaps, or columns — that reintroduces
 * the "PDF layout is shifted" bug this layout replaced.
 *
 * Pressroom conceit (all of it theme-aware because everything rides
 * the paper/ink/spot tokens): crop marks on the sheet, a Druckprobe
 * calibration bar in the header, ink splats + registration dots in
 * the margins, hand-drawn wobble rules under the section stamps, a
 * misregistered double ghost on the name, and a live `CvInkStamp`
 * in the sheet footer that names the ACTIVE ink character (reads
 * `data-sim-theme`) — switching presets re-inks the sheet AND
 * re-labels the proof, on screen and in the saved PDF.
 *
 * Content policy (docs/cv.md "Privacy"): PUBLIC version — no street
 * address, no phone number, no birth date. Email + region only; the
 * footer notes that full details come on request. Contact chips are
 * limited to targets whose visible text equals the destination
 * (email, manuelheller.dev, GitHub) — no LinkedIn: its shortened
 * label lied about the URL and shortened URLs are useless on paper.
 *
 * Server component — `cv` strings never ship to the client; the two
 * client islands (print button, ink stamp) get strings as props.
 */

const SPOT_SEQUENCE: readonly SpotColor[] = ["rose", "amber", "mint", "violet"];

function spotAt(index: number): string {
  return SPOT_CSS_VAR[SPOT_SEQUENCE[index % SPOT_SEQUENCE.length] as SpotColor];
}

/** Hand-drawn horizontal rule — same visual family as the switcher
 *  hint arrow. Optional spot ghost line prints slightly offset, like
 *  a second plate out of register.
 *
 *  `drips` hangs wet ink off the rule: the section's plate ran before
 *  it dried.
 *
 *  Two constraints shape the implementation. (1) Positions are a fixed
 *  table indexed by section, NEVER Math.random — this is a server
 *  component and a per-render value would hydrate-mismatch and re-roll
 *  on every navigation. (2) The drips are ABSOLUTELY positioned and
 *  cost zero layout height. Their first version added ~19px per rule,
 *  which across eight sections grew the sheet by 152px and tipped the
 *  PDF from two pages to three — the sheet runs at ~92% of two A4
 *  pages, so decorative height is not free here. */
// Lengths stay under ~14px: the rule sits 12px above its content, and
// a longer run reaches into the first line of text (screenshot-checked
// against the Sprachen and Stärken blocks, where it collided).
const DRIP_SETS: readonly (readonly { x: number; len: number; w: number }[])[] = [
  [
    { x: 11, len: 11, w: 3 },
    { x: 36, len: 6, w: 2.2 },
    { x: 75, len: 14, w: 3.4 },
  ],
  [
    { x: 22, len: 13, w: 3.2 },
    { x: 54, len: 7, w: 2.2 },
    { x: 88, len: 10, w: 2.8 },
  ],
  [
    { x: 8, len: 8, w: 2.4 },
    { x: 47, len: 14, w: 3.4 },
    { x: 82, len: 6, w: 2.2 },
  ],
  [
    { x: 18, len: 14, w: 3.2 },
    { x: 43, len: 9, w: 2.6 },
    { x: 69, len: 12, w: 2.8 },
  ],
];

function WobbleRule({
  spot,
  className,
  drips,
}: {
  spot?: string;
  className?: string;
  drips?: number;
}) {
  const dripSet = drips === undefined ? null : DRIP_SETS[drips % DRIP_SETS.length];
  return (
    <div className={`relative ${className ?? ""}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 8"
        preserveAspectRatio="none"
        className="block h-[7px] w-full"
      >
        {spot ? (
          <path
            d="M 2 5.4 C 32 3.8, 64 6.8, 102 5.3 C 142 3.7, 172 7, 212 5.5 C 252 3.9, 287 6.7, 332 5.2 C 357 4.3, 382 5.8, 400 5"
            fill="none"
            stroke={spot}
            strokeWidth="2.2"
            opacity="0.55"
          />
        ) : null}
        <path
          d="M 0 3.7 C 30 2.1, 62 5.1, 100 3.6 C 140 2, 170 5.3, 210 3.8 C 250 2.2, 285 5, 330 3.5 C 355 2.6, 380 4.1, 400 3.3"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
        />
      </svg>
      {dripSet?.map((drip) => (
        // Run + the bead that gathered at its tip. Plain boxes rather
        // than SVG: the rule stretches with preserveAspectRatio="none",
        // and drips inside it would stretch with it into fat stubs.
        <span
          key={drip.x}
          aria-hidden="true"
          className="pointer-events-none absolute top-[4px] rounded-b-full opacity-60"
          style={{
            left: `${drip.x}%`,
            width: `${drip.w}px`,
            height: `${drip.len}px`,
            background: spot ?? "var(--color-ink)",
          }}
        >
          <span
            className="-translate-x-1/2 absolute bottom-0 left-1/2 block translate-y-1/4 rounded-full"
            style={{
              width: `${drip.w * 1.7}px`,
              height: `${drip.w * 1.7}px`,
              background: spot ?? "var(--color-ink)",
            }}
          />
        </span>
      ))}
    </div>
  );
}

/** Frozen frame of the fluid sim, printed onto the sheet.
 *
 *  Four wavy terraces in the ladder order (mint / amber / rose /
 *  violet — the legacy uniform order the render shaders use), stacked
 *  and bleeding off both edges: the posterized band structure the riso
 *  render pass actually outputs, held still. Every band rides a spot
 *  token, so a preset switch re-inks the still frame exactly like it
 *  re-inks the sim, and `print-color-adjust: exact` carries it into
 *  the PDF. Per-theme character (halftone under Turbulenz, wet blur
 *  under Aquarell, additive glow under Nachtdruck) is layered on in
 *  globals.css via the `cv-sim-frame` hook. */
function CvSimFrame({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 150"
      preserveAspectRatio="none"
      className={`cv-sim-frame pointer-events-none ${className ?? ""}`}
    >
      <path
        d="M-10 0 C 60 6, 120 30, 190 24 C 258 18, 300 40, 360 34 C 385 31, 400 26, 410 28 L 410 -10 L -10 -10 Z"
        fill="var(--color-spot-mint)"
        opacity="0.16"
      />
      <path
        d="M-10 26 C 52 42, 128 20, 196 40 C 262 59, 312 34, 366 48 C 388 54, 400 52, 410 50 L 410 20 C 380 26, 340 12, 288 20 C 226 30, 172 8, 108 14 C 60 18, 24 12, -10 4 Z"
        fill="var(--color-spot-amber)"
        opacity="0.2"
      />
      <path
        d="M-10 62 C 48 80, 118 54, 184 74 C 250 94, 306 66, 362 82 C 386 89, 400 88, 410 86 L 410 54 C 372 60, 330 40, 274 48 C 214 57, 158 32, 96 40 C 52 46, 20 40, -10 34 Z"
        fill="var(--color-spot-rose)"
        opacity="0.17"
      />
      <path
        d="M-10 104 C 54 124, 124 96, 190 116 C 254 135, 310 108, 366 124 C 388 130, 400 130, 410 128 L 410 96 C 374 102, 332 82, 276 90 C 216 99, 160 74, 98 82 C 54 88, 20 82, -10 76 Z"
        fill="var(--color-spot-violet)"
        opacity="0.14"
      />
      {/* Loose dye that broke off the bands. */}
      <ellipse cx="318" cy="16" rx="9" ry="5" fill="var(--color-spot-rose)" opacity="0.3" />
      <ellipse cx="64" cy="96" rx="7" ry="4" fill="var(--color-spot-mint)" opacity="0.28" />
      <ellipse cx="238" cy="132" rx="11" ry="5" fill="var(--color-spot-amber)" opacity="0.24" />
    </svg>
  );
}

/** Irregular ink splat, colored by the given spot token. */
function InkBlob({
  spot,
  className,
  variant = 0,
}: {
  spot: string;
  className?: string;
  variant?: 0 | 1;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className ?? ""}`}
      style={{ fill: spot }}
    >
      {variant === 0 ? (
        <>
          <path d="M50 4 C70 1 90 12 95 30 C99 45 92 62 74 70 C56 78 30 77 16 66 C4 56 1 38 8 24 C15 10 32 7 50 4 Z" />
          <circle cx="95" cy="12" r="3.4" />
          <circle cx="6" cy="72" r="2.6" />
        </>
      ) : (
        <>
          <path d="M42 8 C60 2 84 8 92 24 C99 39 96 58 80 68 C63 78 38 76 22 68 C7 60 2 44 8 30 C13 17 26 13 42 8 Z" />
          <circle cx="10" cy="14" r="2.8" />
          <circle cx="93" cy="66" r="3" />
        </>
      )}
    </svg>
  );
}

/** Header calibration bar — ink + the four spots, like a pressroom
 *  Druckprobe strip. The loudest theme tell besides the paper itself:
 *  the ink swatch flips with the token set. */
function CalibrationBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <span
        aria-hidden="true"
        className="size-4 border border-ink/60"
        style={{ background: "var(--color-ink)" }}
      />
      {SPOT_SEQUENCE.map((spot) => (
        <span
          key={spot}
          aria-hidden="true"
          className="size-4 border border-ink/60"
          style={{ background: SPOT_CSS_VAR[spot] }}
        />
      ))}
      <span className="ml-2 font-mono text-[0.55rem] text-ink-muted uppercase tracking-[0.24em]">
        {label}
      </span>
    </div>
  );
}

/** Section header: mono stamp label, rotated spot square, wobble rule. */
function CvSection({
  index,
  label,
  children,
  className,
  keepTogether = false,
}: {
  index: number;
  label: string;
  children: ReactNode;
  className?: string;
  /**
   * Never split this section across a PDF page. ONLY for sections
   * comfortably shorter than a page (the sidebar blocks, all <250px
   * against a 1039px page). A page-sized section with an avoid gets
   * shoved wholesale to the next page and strands a third page — the
   * original 3-page bug. Berufserfahrung and Eigene Projekte
   * deliberately stay breakable and rely on item-level avoids so the
   * cut always lands between entries.
   */
  keepTogether?: boolean;
}) {
  return (
    <section className={`${keepTogether ? "break-inside-avoid " : ""}${className ?? ""}`}>
      <h2 className="break-after-avoid flex items-center gap-2.5 font-mono text-[0.7rem] text-ink uppercase tracking-[0.24em]">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rotate-45 border border-ink"
          style={{ background: spotAt(index) }}
        />
        {label}
      </h2>
      <WobbleRule spot={spotAt(index)} drips={index} className="mt-2 mb-3 break-after-avoid" />
      {children}
    </section>
  );
}

export function CvDocument() {
  const t = useTranslations("cv");

  const experience = t.raw("experience.items") as CvExperienceItems;
  const projects = t.raw("projects.items") as CvProjectItems;
  const skillGroups = t.raw("skills.groups") as CvSkillGroups;
  const education = t.raw("education.items") as CvEducationItems;
  const languages = t.raw("languages.items") as CvLanguageItems;
  const engagement = t.raw("engagement.items") as CvEngagementItems;
  const strengths = t.raw("strengths.items") as CvStrengthItems;

  // Paper targets only: visible text === destination. No LinkedIn —
  // a shortened label that differs from the real URL is worthless in
  // a printed document.
  const contacts = [
    { label: SITE.author.email, href: `mailto:${SITE.author.email}` },
    { label: "manuelheller.dev", href: SITE.url },
    { label: "github.com/manu-brighter", href: SITE.author.socials.github },
  ];

  return (
    <div
      data-page="cv"
      className="bg-paper-shade/60 py-10 print:bg-transparent print:py-0 md:py-16"
    >
      {/* Topbar — screen chrome, never printed. Lives OUTSIDE the sheet
          so the printable geometry stays untouched. */}
      <div className="mx-auto mb-8 flex w-full max-w-[184mm] flex-wrap items-start justify-between gap-4 px-4 print:hidden sm:px-0">
        <Link
          href="/"
          className="type-label-stamp bg-paper transition-colors hover:bg-ink hover:text-paper-tint"
        >
          <span aria-hidden="true">← </span>
          {t("backLabel")}
        </Link>
        <CvActions label={t("download.label")} hint={t("download.hint")} />
      </div>

      {/* The sheet. Fixed 184mm width, fixed type sizes — identical on
          screen and in the printed PDF. */}
      <article
        aria-labelledby="cv-heading"
        className="plate-corners relative mx-auto w-full max-w-[184mm] bg-paper-tint px-5 py-8 shadow-[10px_10px_0_color-mix(in_srgb,var(--color-ink)_18%,transparent)] print:shadow-none sm:px-[11mm] sm:py-[12mm]"
      >
        <PlateCornerMarks />

        {/* Per-theme wash (halftone / bands / wet pools / neon bloom).
            Empty under Riso — see globals.css. */}
        <div aria-hidden="true" className="cv-theme-texture" />

        {/* Margin ink — registration droplets in the sheet's gutter,
            outside every text block. */}
        <InkBlob
          spot={SPOT_CSS_VAR.amber}
          variant={1}
          className="absolute top-[36%] right-1.5 h-4 w-5 rotate-[24deg] opacity-80"
        />
        <span
          aria-hidden="true"
          className="absolute top-[38.5%] right-4 size-1.5 rounded-full opacity-70"
          style={{ background: SPOT_CSS_VAR.violet }}
        />
        <InkBlob
          spot={SPOT_CSS_VAR.mint}
          variant={0}
          className="absolute bottom-[22%] left-2 h-3.5 w-4 rotate-[-12deg] opacity-80"
        />

        {/* Sim still frame — the ladder terraces bled onto the sheet,
            edge to edge (negative insets cancel the sheet padding).
            Positioned, so the also-positioned <header> after it in DOM
            order paints on top. */}
        <CvSimFrame className="absolute top-0 right-0 left-0 z-0 h-[42%] opacity-75" />

        {/* ---- Header ---- */}
        <header className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <p className="type-label-stamp rotate-[-1deg] bg-paper">
              {t("sectionLabel")}
              <span aria-hidden="true"> · </span>
              {t("editionStamp")}
            </p>
            <CalibrationBar label={t("calibrationLabel")} />
          </div>

          <div className="relative mt-7">
            <InkBlob
              spot={SPOT_CSS_VAR.rose}
              className="absolute top-[-1.1rem] left-[-1.2rem] h-[4.6rem] w-[6.4rem] rotate-[-9deg] opacity-90"
            />
            {/* Misregistration lives in `.cv-name` (globals.css), not
                in an inline style: the per-theme blocks need to be
                able to replace it, and an inline text-shadow beats
                every stylesheet rule. */}
            <h1
              id="cv-heading"
              className="cv-name relative font-display text-[2.5rem] text-ink italic leading-[0.98] tracking-[-0.02em] sm:text-[3.3rem]"
            >
              {t("name")}
            </h1>
          </div>
          <p className="mt-3 font-mono text-[0.75rem] text-ink-soft uppercase tracking-[0.2em]">
            {t("role")}
            <span aria-hidden="true"> · </span>
            {t("region")}
          </p>

          <WobbleRule className="mt-4" />

          <p className="mt-4 max-w-[66ch] type-body-sm text-ink leading-relaxed">{t("profile")}</p>

          <ul className="mt-4 flex flex-wrap gap-x-2.5 gap-y-2" aria-label={t("contactLabel")}>
            {contacts.map((contact) => (
              <li key={contact.label}>
                <a
                  href={contact.href}
                  {...(contact.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="inline-block rounded-[2px] border border-ink bg-paper px-2.5 py-1 font-mono text-[0.7rem] text-ink tracking-[0.08em] transition-colors hover:bg-ink hover:text-paper-tint"
                >
                  {contact.label}
                </a>
              </li>
            ))}
          </ul>
        </header>

        {/* ---- Body: main flow + side rail ---- */}
        <div className="relative z-10 mt-8 grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-[1.45fr_1fr]">
          <div className="flex flex-col gap-10">
            <CvSection index={0} label={t("experience.label")}>
              {/* Timeline spine — the left rule + registration dots
                  encode real chronology, newest at the top. */}
              <div className="flex flex-col gap-6 border-ink/70 border-l-2 pl-5">
                {experience.map((item, i) => (
                  <div key={`${item.period}-${item.org}`} className="relative break-inside-avoid">
                    <span
                      aria-hidden="true"
                      className="absolute top-[0.2rem] left-[-27px] size-3 rounded-full border-2 border-ink"
                      style={{ background: spotAt(i) }}
                    />
                    <p className="font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.16em]">
                      {item.period}
                      <span aria-hidden="true"> · </span>
                      {item.org}
                    </p>
                    <h3 className="mt-1 font-display text-[1.35rem] text-ink italic leading-snug">
                      {item.role}
                    </h3>
                    <ul className="mt-2 flex list-none flex-col gap-1.5">
                      {item.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 type-body-sm text-ink">
                          <span
                            aria-hidden="true"
                            className="mt-[0.5em] size-1.5 shrink-0 bg-ink/80"
                          />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CvSection>

            <CvSection index={1} label={t("projects.label")}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((project, i) => (
                  <div
                    key={project.title}
                    className="relative break-inside-avoid border border-ink/40 bg-paper/60 p-3"
                    style={{ "--card-spot": spotAt(i) } as CSSProperties}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 size-2"
                      style={{ background: "var(--card-spot)" }}
                    />
                    <h3 className="font-display text-[1rem] text-ink italic">{project.title}</h3>
                    <p className="mt-0.5 font-mono text-[0.58rem] text-ink-muted uppercase tracking-[0.12em]">
                      {project.meta}
                    </p>
                    <p className="mt-1.5 text-[0.72rem] text-ink-soft leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                ))}
              </div>
            </CvSection>
          </div>

          <div className="flex flex-col gap-8">
            <CvSection index={2} keepTogether label={t("skills.label")}>
              <dl className="flex flex-col gap-3">
                {skillGroups.map((group) => (
                  <div key={group.label} className="break-inside-avoid">
                    <dt className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.14em]">
                      {group.label}
                    </dt>
                    <dd className="mt-0.5 text-[0.74rem] text-ink leading-relaxed">
                      {group.items}
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>

            <CvSection index={3} keepTogether label={t("languages.label")}>
              <dl className="flex flex-col gap-1.5">
                {languages.map((language) => (
                  <div key={language.name} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.74rem] text-ink">{language.name}</dt>
                    <dd className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.12em]">
                      {language.level}
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>

            <CvSection index={0} keepTogether label={t("engagement.label")}>
              <div className="flex flex-col gap-3">
                {engagement.map((item) => (
                  <div key={item.title} className="break-inside-avoid">
                    <p className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.14em]">
                      {item.period}
                    </p>
                    <h3 className="mt-0.5 font-display text-[0.95rem] text-ink italic">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[0.72rem] text-ink-soft leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </CvSection>

            <CvSection index={1} keepTogether label={t("strengths.label")}>
              <ul className="flex list-none flex-col gap-1.5">
                {strengths.map((strength) => (
                  <li key={strength} className="flex gap-2 text-[0.74rem] text-ink">
                    <span aria-hidden="true" className="mt-[0.5em] size-1.5 shrink-0 bg-ink/80" />
                    {strength}
                  </li>
                ))}
              </ul>
            </CvSection>

            <CvSection index={2} keepTogether label={t("education.label")}>
              <dl className="flex flex-col gap-2.5">
                {education.map((item) => (
                  <div key={item.title} className="break-inside-avoid">
                    <dt className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.14em]">
                      {item.period}
                    </dt>
                    <dd className="mt-0.5 text-[0.74rem] text-ink">
                      {item.title}
                      <span className="text-ink-muted"> · {item.org}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>
          </div>
        </div>

        {/* Second still frame, flipped: the sheet's foot ran through the
            press the other way round. */}
        <CvSimFrame className="absolute right-0 bottom-0 left-0 z-0 h-[22%] rotate-180 opacity-70" />

        {/* ---- Sheet footer: provenance + the live ink stamp ---- */}
        <footer className="relative z-10 mt-8">
          <WobbleRule className="mb-4" />
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.14em]">
                {t("footer.printedNote")}
              </p>
              <p className="font-mono text-[0.62rem] text-ink-muted uppercase tracking-[0.14em]">
                {t("footer.publicNote")}
              </p>
            </div>
            <CvInkStamp label={t("footer.inkLabel")} />
          </div>
        </footer>
      </article>
    </div>
  );
}
