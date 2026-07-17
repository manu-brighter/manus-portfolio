import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CvActions } from "@/components/cv/CvActions";
import { PlateCornerMarks } from "@/components/ui/PlateCornerMarks";
import { Link } from "@/i18n/navigation";
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
 * CvDocument — the /cv "Druckbogen" (press sheet).
 *
 * One editorial sheet in the site's riso language: display-serif name
 * with a static rose misregistration ghost, mono stamp labels with
 * rotating spot dots, two-column body (experience + projects as the
 * main flow, skills/languages/engagement/strengths/education as the
 * side rail). Because every color rides the theme tokens, the sheet
 * re-inks with the active sim preset — and since `window.print()` is
 * the PDF export (see CvActions + the @media print block in
 * globals.css), the downloaded PDF does too.
 *
 * Content policy (docs/cv.md "Privacy"): this is the PUBLIC version —
 * no street address, no phone number, no birth date. Email + region
 * only; the footer notes that full details come on request.
 *
 * Server component — `cv` strings never ship to the client; the print
 * button receives its two strings as props.
 */

const SPOT_SEQUENCE = ["rose", "amber", "mint", "violet"] as const;

function SpotDot({ index }: { index: number }) {
  const spot = SPOT_SEQUENCE[index % SPOT_SEQUENCE.length];
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full border border-ink/40"
      style={{ background: `var(--color-spot-${spot})` }}
    />
  );
}

/** Mono stamp section label with a rotating spot dot. */
function CvSection({
  index,
  label,
  children,
  className,
}: {
  index: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`break-inside-avoid ${className ?? ""}`}>
      <h2 className="mb-4 flex items-center gap-2 border-ink border-b pb-2 font-mono text-ink text-xs uppercase tracking-[0.22em]">
        <SpotDot index={index} />
        {label}
      </h2>
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

  const contacts = [
    { label: SITE.author.email, href: `mailto:${SITE.author.email}` },
    { label: "manuelheller.dev", href: SITE.url },
    { label: "github.com/manu-brighter", href: SITE.author.socials.github },
    { label: "linkedin.com/in/manuel-heller", href: SITE.author.socials.linkedin },
  ];

  return (
    <article
      aria-labelledby="cv-heading"
      className="container-page py-16 print:py-0 md:py-24"
      data-page="cv"
    >
      <div className="plate-corners relative border-[1.5px] border-ink bg-paper-tint p-6 print:border-0 print:bg-transparent print:p-0 md:p-12">
        <PlateCornerMarks />

        {/* Header — stamps row, monumental name, profile + contact. */}
        <header className="mb-10 print:mb-6 md:mb-14">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <p className="type-label-stamp">
              {t("sectionLabel")}
              <span aria-hidden="true"> · </span>
              {t("editionStamp")}
            </p>
            <CvActions label={t("download.label")} hint={t("download.hint")} />
          </div>

          <h1
            id="cv-heading"
            className="mt-8 font-display text-[clamp(2.75rem,7vw,5.5rem)] text-ink italic leading-[0.95] tracking-[-0.03em] print:mt-4 print:text-[2.6rem]"
            style={{
              textShadow: "3px 2px 0 color-mix(in srgb, var(--color-spot-rose) 45%, transparent)",
            }}
          >
            {t("name")}
          </h1>
          <p className="mt-3 font-mono text-ink-soft text-sm uppercase tracking-[0.2em]">
            {t("role")}
            <span aria-hidden="true"> · </span>
            {t("region")}
          </p>

          <p className="mt-6 max-w-[70ch] type-body text-ink print:mt-4 print:text-[0.8rem]">
            {t("profile")}
          </p>

          <ul
            className="mt-6 flex flex-wrap gap-x-3 gap-y-2 print:mt-4"
            aria-label={t("contactLabel")}
          >
            {contacts.map((contact) => (
              <li key={contact.label}>
                <a
                  href={contact.href}
                  {...(contact.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="inline-block rounded-[2px] border border-ink px-2.5 py-1 font-mono text-ink text-xs tracking-[0.08em] transition-colors hover:bg-ink hover:text-paper-tint print:px-1.5"
                >
                  {contact.label}
                </a>
              </li>
            ))}
          </ul>
        </header>

        <div className="grid-12 gap-y-12 print:gap-y-6">
          {/* Main flow — experience + projects. */}
          <div className="col-span-12 flex flex-col gap-12 print:gap-6 md:col-span-7">
            <CvSection index={0} label={t("experience.label")}>
              <div className="flex flex-col gap-8 print:gap-4">
                {experience.map((item) => (
                  <div key={`${item.period}-${item.org}`} className="break-inside-avoid">
                    <p className="font-mono text-ink-muted text-xs uppercase tracking-[0.18em]">
                      {item.period}
                    </p>
                    <h3 className="mt-1 font-display text-ink text-xl italic print:text-lg">
                      {item.role}
                    </h3>
                    <p className="font-mono text-ink-soft text-xs uppercase tracking-[0.14em]">
                      {item.org}
                    </p>
                    <ul className="mt-3 flex list-none flex-col gap-1.5 print:mt-2 print:gap-1">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2 type-body-sm text-ink print:text-[0.72rem]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink"
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
              <div className="grid gap-5 print:gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <div
                    key={project.title}
                    className="break-inside-avoid border border-ink/30 p-4 print:p-2.5"
                  >
                    <h3 className="font-display text-ink text-lg italic print:text-base">
                      {project.title}
                    </h3>
                    <p className="mt-1 font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.14em]">
                      {project.meta}
                    </p>
                    <p className="mt-2 type-body-sm text-ink-soft print:text-[0.7rem]">
                      {project.description}
                    </p>
                  </div>
                ))}
              </div>
            </CvSection>
          </div>

          {/* Side rail — skills, languages, engagement, strengths, education. */}
          <div className="col-span-12 flex flex-col gap-10 print:gap-5 md:col-span-4 md:col-start-9">
            <CvSection index={2} label={t("skills.label")}>
              <dl className="flex flex-col gap-4 print:gap-2.5">
                {skillGroups.map((group) => (
                  <div key={group.label} className="break-inside-avoid">
                    <dt className="font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.16em]">
                      {group.label}
                    </dt>
                    <dd className="mt-1 type-body-sm text-ink print:text-[0.72rem]">
                      {group.items}
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>

            <CvSection index={3} label={t("languages.label")}>
              <dl className="flex flex-col gap-1.5">
                {languages.map((language) => (
                  <div key={language.name} className="flex items-baseline justify-between gap-4">
                    <dt className="type-body-sm text-ink print:text-[0.72rem]">{language.name}</dt>
                    <dd className="font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.12em]">
                      {language.level}
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>

            <CvSection index={0} label={t("engagement.label")}>
              <div className="flex flex-col gap-4">
                {engagement.map((item) => (
                  <div key={item.title} className="break-inside-avoid">
                    <p className="font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.16em]">
                      {item.period}
                    </p>
                    <h3 className="mt-1 font-display text-base text-ink italic">{item.title}</h3>
                    <p className="mt-1.5 type-body-sm text-ink-soft print:text-[0.7rem]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </CvSection>

            <CvSection index={1} label={t("strengths.label")}>
              <ul className="flex list-none flex-col gap-1.5">
                {strengths.map((strength) => (
                  <li
                    key={strength}
                    className="flex gap-2 type-body-sm text-ink print:text-[0.72rem]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink"
                    />
                    {strength}
                  </li>
                ))}
              </ul>
            </CvSection>

            <CvSection index={2} label={t("education.label")}>
              <dl className="flex flex-col gap-3 print:gap-2">
                {education.map((item) => (
                  <div key={item.title} className="break-inside-avoid">
                    <dt className="font-mono text-[0.65rem] text-ink-muted uppercase tracking-[0.16em]">
                      {item.period}
                    </dt>
                    <dd className="mt-0.5 type-body-sm text-ink print:text-[0.72rem]">
                      {item.title}
                      <span className="text-ink-muted"> · {item.org}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </CvSection>
          </div>
        </div>

        {/* Sheet footer — provenance stamp + privacy note; back link is
            screen-only. */}
        <footer className="mt-12 flex flex-col gap-4 border-paper-line border-t pt-6 print:mt-6 print:pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="type-label text-ink-muted print:text-[0.6rem]">
              {t("footer.printedNote")}
            </p>
            <p className="type-label text-ink-muted print:text-[0.6rem]">
              {t("footer.publicNote")}
            </p>
          </div>
          <Link
            href="/"
            className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint print:hidden"
          >
            ← {t("backLabel")}
          </Link>
        </footer>
      </div>
    </article>
  );
}
