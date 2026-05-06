"use client";

import { useLocale, useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useState } from "react";
import { useViewTransition } from "@/components/motion/useViewTransition";
import { NavMobileMenu } from "@/components/ui/NavMobileMenu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

/**
 * Top navigation — Phase 2 (i18n wired).
 *
 * Editorial layout per plan §4.3 / §5:
 *   [ Brand (mono stamp) ]      [ Work · About · Playground · Contact ]
 *                                                       [ DE EN FR IT ]
 *
 * Client component because the locale switcher needs the current
 * pathname (to switch locale on the same route) and the active-locale
 * state for `aria-current`. Server-rendered text still comes through
 * `NextIntlClientProvider` which wraps the locale layout.
 */

// Order matches the on-page section flow in [locale]/page.tsx:
//   Hero → About → Skills → Work → CaseStudy → Photography → Playground → Contact
// Hero is meta (not anchored). CaseStudy is reachable from the Work card,
// kept out of the desktop bar to avoid 7+ items but surfaced in the mobile
// menu for completeness.
const NAV_ITEMS_DESKTOP = [
  { href: "#about", key: "about" },
  { href: "#skills", key: "skills" },
  { href: "#work", key: "work" },
  { href: "#photography", key: "photography" },
  { href: "#playground", key: "playground" },
  { href: "#contact", key: "contact" },
] as const;

export const NAV_ITEMS_MOBILE = [
  { href: "#about", key: "about" },
  { href: "#skills", key: "skills" },
  { href: "#work", key: "work" },
  { href: "#case-study", key: "casestudy" },
  { href: "#photography", key: "photography" },
  { href: "#playground", key: "playground" },
  { href: "#contact", key: "contact" },
] as const;

const SECTION_IDS = [
  "about",
  "skills",
  "work",
  "case-study",
  "photography",
  "playground",
  "contact",
];

export function Nav() {
  const t = useTranslations();
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const startTransition = useViewTransition();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Hash-anchors only resolve on the home route, since the sections live
  // there. On sub-routes (/playground/[slug], /impressum, /datenschutz)
  // we emit absolute paths so the browser navigates home + scrolls to
  // the anchor in one click. `usePathname()` returns the locale-stripped
  // path, so "/" === home.
  const onHome = pathname === "/";
  const buildHref = (hash: string) => (onHome ? hash : `/${currentLocale}/${hash}`);

  // Sub-route -> home anchor navigation: stash the target section id in
  // sessionStorage and let next-intl's router push us home. The browser's
  // native hash-scroll fires before GSAP ScrollTrigger pins the case-study
  // section, so the user would land on the wrong section ("alle um eins
  // verschoben"). <ScrollToOnLoad /> reads the storage entry post-mount
  // and smooth-scrolls once the pin extent is live. On the home route we
  // let the browser handle anchors natively — no preventDefault.
  const handleSubRouteAnchor = (e: MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (onHome) return;
    e.preventDefault();
    const target = hash.startsWith("#") ? hash.slice(1) : hash;
    sessionStorage.setItem("scrollToOnLoad", target);
    router.push("/");
  };

  // Scroll-spy: tracks which page section currently sits in the central
  // viewport band. rootMargin "-20% 0px -70% 0px" treats a section as
  // active only once its top crosses into the 20%–30% viewport strip,
  // which avoids the active-state flicker when a section is just
  // peeking in from below.
  useEffect(() => {
    const targets = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label={t("nav.ariaLabel")}
      className="sticky top-0 z-50 border-paper-line border-b bg-paper/90 backdrop-blur-sm"
    >
      <div className="container-page flex items-center justify-between gap-6 py-4">
        <Link href="/" className="type-label-stamp" aria-label={t("brand.aria")}>
          {t("brand.label")}
        </Link>

        <div className="flex items-center gap-6 md:gap-10">
          <NavMobileMenu
            items={NAV_ITEMS_MOBILE}
            activeSection={activeSection}
            buildHref={buildHref}
            onAnchorClick={handleSubRouteAnchor}
          />
          <ul className="hidden items-center gap-5 md:flex md:gap-7">
            {NAV_ITEMS_DESKTOP.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <li key={item.href}>
                  <a
                    href={buildHref(item.href)}
                    onClick={(e) => handleSubRouteAnchor(e, item.href)}
                    aria-current={isActive ? "true" : undefined}
                    className={`type-label transition-colors ${
                      isActive ? "text-ink" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {t(`nav.items.${item.key}`)}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* TODO(phase 3): `usePathname` strips query + hash. Once real
              in-page sections exist, compose `href` from `usePathname()`
              + `window.location.hash` so `#work`-anchored users don't
              lose position when switching locale. */}
          <ul aria-label={t("localeSwitcher.ariaLabel")} className="flex items-center gap-1.5">
            {routing.locales.map((locale) => {
              const isActive = locale === currentLocale;
              const name = t(`localeSwitcher.locales.${locale satisfies Locale}`);
              const label = isActive
                ? t("localeSwitcher.currentLabel", { name })
                : t("localeSwitcher.switchLabel", { name });

              return (
                <li key={locale}>
                  <button
                    type="button"
                    onClick={() => startTransition(() => router.replace(pathname, { locale }))}
                    {...{ hrefLang: locale }}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={label}
                    className={`type-label no-underline transition-colors ${
                      isActive ? "text-ink" : "text-ink-muted hover:text-ink-soft"
                    }`}
                  >
                    {locale.toUpperCase()}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
