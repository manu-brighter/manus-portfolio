import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/ui/ContactForm";
import { SITE } from "@/lib/site";

/**
 * Contact — Section 07.
 *
 * Editorial split:
 *   left 5 cols  — section meta, "Let's talk." headline, direct channels
 *   right 7 cols — the form itself
 *
 * Form lives in a client component (`ContactForm`), this wrapper stays a
 * server component so the static section labels render server-side and
 * we don't pay a hydration cost for the editorial copy.
 *
 * Direct-channel list duplicates a subset of Footer social pointers, by
 * design — the Footer treats them as small ornamental stamps; this block
 * makes them readable mailto/url targets near the form.
 */

type DirectChannel = {
  key: "email" | "github" | "linkedin" | "photos";
  label: string;
  value: string;
  href: string;
};

export function Contact() {
  const t = useTranslations("contact");

  const channels: DirectChannel[] = [
    {
      key: "email",
      label: t("channels.email"),
      value: SITE.author.email,
      href: `mailto:${SITE.author.email}`,
    },
    {
      key: "github",
      label: t("channels.github"),
      value: "github.com/manu-brighter",
      href: SITE.author.socials.github,
    },
    {
      key: "linkedin",
      label: t("channels.linkedin"),
      value: "linkedin.com/in/manuel-heller",
      href: SITE.author.socials.linkedin,
    },
    {
      key: "photos",
      label: t("channels.photos"),
      value: "manuelheller.myportfolio.com",
      href: SITE.author.socials.photos,
    },
  ];

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="container-page relative py-20 md:py-28"
    >
      <header className="grid-12 mb-14 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="contact-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      <div className="grid-12 gap-y-12">
        {/* `<aside>` would land axe `landmark-complementary-is-top-level`
            because we're inside `<section>` (same trap docs in
            `.claude/CLAUDE.md` Phase 6 deviations). Plain `<div>` —
            same visual, no spurious landmark. */}
        <div className="col-span-12 flex flex-col gap-10 md:col-span-5">
          <div>
            <p className="mb-3 type-label text-ink-muted">{t("intro.label")}</p>
            <p className="type-body text-ink">{t("intro.body")}</p>
          </div>

          <div className="border-ink border-t-2 pt-6">
            <p className="mb-4 type-label text-ink">{t("channels.label")}</p>
            <dl className="flex flex-col gap-3">
              {channels.map((channel) => (
                <div key={channel.key} className="flex items-baseline gap-3 font-mono text-sm">
                  <dt className="w-24 shrink-0 text-ink-muted uppercase tracking-[0.18em] text-xs">
                    {channel.label}
                  </dt>
                  <dd>
                    <a
                      href={channel.href}
                      {...(channel.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-ink underline decoration-spot-rose decoration-2 underline-offset-4 transition-colors hover:text-ink-soft"
                    >
                      {channel.value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 type-body-sm text-ink-muted">{t("channels.note")}</p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-7 md:pl-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
