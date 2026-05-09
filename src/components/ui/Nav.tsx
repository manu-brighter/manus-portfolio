"use client";

import { useLocale, useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useViewTransition } from "@/components/motion/useViewTransition";
import { NavMobileMenu } from "@/components/ui/NavMobileMenu";
import { useLenis } from "@/hooks/useLenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // Locale switcher starts collapsed (current locale only) on every
  // viewport. Click on the active locale expands; click on an inactive
  // locale switches (which reloads the page and resets state); click
  // outside or Esc collapses. Desktop and mobile share the same UX —
  // the previous md:* CSS-overrides + isDesktop matchMedia escape hatch
  // were dropped in favour of unified JS-driven visibility.
  const [localeOpen, setLocaleOpen] = useState(false);
  const localeSwitcherRef = useRef<HTMLUListElement>(null);

  // Click outside / Esc closes the open switcher. Listeners only attach
  // while open so we don't pay for them in the resting state.
  useEffect(() => {
    if (!localeOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = localeSwitcherRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setLocaleOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocaleOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [localeOpen]);

  // Hash-anchors only resolve on the home route, since the sections live
  // there. On sub-routes (/playground/[slug], /impressum, /datenschutz)
  // we emit absolute paths so the browser navigates home + scrolls to
  // the anchor in one click. `usePathname()` returns the locale-stripped
  // path, so "/" === home.
  const onHome = pathname === "/";
  const buildHref = (hash: string) => (onHome ? hash : `/${currentLocale}/${hash}`);

  // Anchor navigation handler. Two flows:
  //   - On home: preventDefault + Lenis-aware smooth scroll. Native
  //     `scrollIntoView` was being silently swallowed by Lenis on the
  //     first click after mount — Lenis owns the document scroll, so
  //     native scroll calls compete with its internal target tracking
  //     and sometimes lose. Routing through `lenis.scrollTo()` keeps
  //     scroll authority in one place and lands the target reliably
  //     on every click.
  //   - On sub-route (/playground/[slug] etc): stash the target id in
  //     sessionStorage and let next-intl's router push us home. The
  //     browser's native hash-scroll fires before GSAP ScrollTrigger
  //     pins the case-study section, so user would land on the wrong
  //     section ("alle um eins verschoben"). <ScrollToOnLoad /> reads
  //     the storage entry post-mount and smooth-scrolls once pin extent
  //     is live.
  const handleAnchor = (e: MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    const target = hash.startsWith("#") ? hash.slice(1) : hash;
    if (onHome) {
      const el = document.getElementById(target);
      if (!el) return;
      if (lenis && !reducedMotion) {
        // Offset clears the sticky navbar (~64px). Same offset
        // pattern as WorkCard's anchor scroll.
        lenis.scrollTo(el, { offset: -64 });
      } else {
        el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
      return;
    }
    sessionStorage.setItem("scrollToOnLoad", target);
    router.push("/");
  };

  // Scroll-spy: tracks which page section currently sits in the central
  // viewport band. rootMargin "-20% 0px -70% 0px" treats a section as
  // active only once its top crosses into the 20%–30% viewport strip,
  // which avoids the active-state flicker when a section is just
  // peeking in from below.
  //
  // Effect re-runs on pathname change so that:
  //   - On /playground/[slug] experiment routes the "Playground"
  //     nav-item stays underlined so the user has a sense-of-place
  //     indicator — they're inside a Playground sub-route.
  //   - On other non-home routes (/impressum, /datenschutz) the
  //     section ids don't exist in the DOM and there's no equivalent
  //     nav-item, so activeSection drops to null (no underline).
  //   - On nav back to home, the observer reattaches to the freshly-
  //     mounted sections.
  useEffect(() => {
    if (!onHome) {
      if (pathname.startsWith("/playground/")) {
        setActiveSection("playground");
      } else {
        setActiveSection(null);
      }
      return;
    }
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
  }, [onHome, pathname]);

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
            onAnchorClick={handleAnchor}
          />
          <ul className="hidden items-center gap-5 md:flex md:gap-7">
            {NAV_ITEMS_DESKTOP.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <li key={item.href}>
                  <a
                    href={buildHref(item.href)}
                    onClick={(e) => handleAnchor(e, item.href)}
                    aria-current={isActive ? "true" : undefined}
                    className={`type-label relative inline-block transition-colors active:scale-[0.94] active:duration-100 after:pointer-events-none after:absolute after:bottom-[-3px] after:left-0 after:h-[1.5px] after:w-full after:origin-left after:bg-ink after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:after:scale-x-100 ${
                      isActive
                        ? "text-ink after:scale-x-100"
                        : "text-ink-soft after:scale-x-0 hover:text-ink"
                    }`}
                  >
                    {t(`nav.items.${item.key}`)}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Locale switcher — unified mobile + desktop UX.
              Closed state: only the current locale is visible (single
              tab stop, only it is announced). Click on it expands the
              inactive locales inline with a max-width transition;
              clicking outside, hitting Esc, or clicking the active
              locale again collapses. Click on an inactive locale
              switches via router.replace which reloads the page and
              naturally lands the user back at the collapsed state.
              TODO: `usePathname` strips query + hash. If `#work`-
              anchored users switch locale they lose position; compose
              href from `usePathname()` + `window.location.hash` once
              that's a real complaint. */}
          <ul
            ref={localeSwitcherRef}
            aria-label={t("localeSwitcher.ariaLabel")}
            className="flex items-center gap-1.5"
          >
            {routing.locales.map((locale) => {
              const isActive = locale === currentLocale;
              const name = t(`localeSwitcher.locales.${locale satisfies Locale}`);
              const label = isActive
                ? t("localeSwitcher.currentLabel", { name })
                : t("localeSwitcher.switchLabel", { name });
              const visible = isActive || localeOpen;

              return (
                <li
                  key={locale}
                  className={`overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
                    visible ? "max-w-[3rem] opacity-100" : "max-w-0 opacity-0"
                  }`}
                  aria-hidden={visible ? undefined : true}
                >
                  <button
                    type="button"
                    onClick={() => {
                      // Click on current = toggle expand. Click on
                      // inactive switches locale + reloads.
                      if (isActive) {
                        setLocaleOpen((v) => !v);
                        return;
                      }
                      startTransition(() => router.replace(pathname, { locale }));
                    }}
                    aria-current={isActive ? "true" : undefined}
                    aria-expanded={isActive ? localeOpen : undefined}
                    aria-label={label}
                    tabIndex={visible ? 0 : -1}
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
