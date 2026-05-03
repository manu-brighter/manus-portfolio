import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Shared renderer for /impressum and /datenschutz.
 *
 * Both pages share the exact same shape — section label, headline, lede,
 * a `sections[]` array of `{ id, heading, body[] }`, plus a "Stand"
 * date and back-to-home link. Pulling that into a single component
 * keeps the two route pages trivial and the legal copy in one place.
 *
 * Namespace is parametrised so the same renderer drives both pages from
 * `legal.impressum` and `legal.datenschutz`.
 */

type LegalSection = {
  id: string;
  heading: string;
  body: string[];
};

type LegalDocumentProps = {
  namespace: "legal.impressum" | "legal.datenschutz";
};

export function LegalDocument({ namespace }: LegalDocumentProps) {
  const t = useTranslations(namespace);
  const tCommon = useTranslations("legal.common");

  const sections = t.raw("sections") as LegalSection[];

  return (
    <article className="container-page py-20 md:py-28" aria-labelledby="legal-heading">
      <header className="grid-12 mb-14 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h1 id="legal-heading" className="type-h1 text-ink">
            {t("headline")}
          </h1>
          <p className="type-body-lg mt-4 text-ink-soft">{t("lede")}</p>
        </div>
      </header>

      <div className="grid-12 gap-y-10">
        <div className="col-span-12 flex flex-col gap-10 md:col-span-8 md:col-start-3">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`legal-section-${section.id}`}>
              <h2 id={`legal-section-${section.id}`} className="type-label mb-3 text-ink-muted">
                {section.heading}
              </h2>
              <div className="flex flex-col gap-3">
                {section.body.map((paragraph, i) => (
                  <p
                    key={`${section.id}-p-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable + content doesn't reorder
                      i
                    }`}
                    className="type-body text-ink"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <footer className="mt-6 flex flex-col gap-4 border-paper-line border-t pt-6 md:flex-row md:items-center md:justify-between">
            <p className="type-label text-ink-muted">
              {tCommon("lastUpdatedLabel")}
              <span aria-hidden="true"> · </span>
              {tCommon("lastUpdated")}
            </p>
            <Link
              href="/"
              className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint"
            >
              ← {tCommon("backLabel")}
            </Link>
          </footer>
        </div>
      </div>
    </article>
  );
}
