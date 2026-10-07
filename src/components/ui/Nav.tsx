"use client";

import { useLocale, useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NavMobileMenu } from "@/components/ui/NavMobileMenu";
import { useLenis } from "@/hooks/useLenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { SECTIONS } from "@/lib/content/sections";
import { navLabelLang } from "@/lib/navLang";

/**
 * Top navigation — Phase 2 (i18n wired).
 *
 * Editorial layout per plan §4.3 / §5:
 *   [ Brand (mono stamp) ]      [ Work · About · Playground · Contact ]
 *                                                       [ globe -> DE EN FR IT ]
 *
 * Client component because the locale switcher needs the current
 * pathname (to switch locale on the same route) and the active-locale
 * state for `aria-current`. Server-rendered text still comes through
 * `NextIntlClientProvider` which wraps the locale layout.
 */

// Derived from `SECTIONS` (`@/lib/content/sections`). Hero / About-
// Objects (`navLabelKey === null`) are filtered out of both nav lists;
// Case Study is mobile-only by `showInDesktopNav: false`. The order
// matches the on-page section flow in [locale]/page.tsx — keep both
// the SECTIONS list and that file in sync.
const NAV_ITEMS_DESKTOP = SECTIONS.filter(
  (s): s is typeof s & { navLabelKey: string } => s.showInDesktopNav && s.navLabelKey !== null,
).map((s) => ({ href: `#${s.id}`, key: s.navLabelKey }));

const NAV_ITEMS_MOBILE = SECTIONS.filter(
  (s): s is typeof s & { navLabelKey: string } => s.showInMobileNav && s.navLabelKey !== null,
).map((s) => ({ href: `#${s.id}`, key: s.navLabelKey }));

// Scroll-spy observes every section that any nav row points at.
const SECTION_IDS = SECTIONS.filter((s) => s.showInDesktopNav || s.showInMobileNav).map(
  (s) => s.id,
);

export function Nav() {
  const t = useTranslations();
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Hash-anchors only resolve on the home route, since the sections live
  // there. On sub-routes (/playground/[slug], /impressum, /datenschutz)
  // we emit absolute paths so the browser navigates home + scrolls to
  // the anchor in one click. `usePathname()` returns the locale-stripped
  // path, so "/" === home.
  const onHome = pathname === "/";
  // `trailingSlash: true` can surface as "/cv/"; normalise before matching.
  const onCv = pathname.replace(/\/$/, "") === "/cv";
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
        // pattern as WorkCard's anchor scroll. `immediate` mirrors
        // reducedMotion so a runtime preference flip between
        // MotionProvider's Lenis-dispose and this click doesn't
        // smooth-scroll past the user's choice.
        lenis.scrollTo(el, { offset: -64, immediate: reducedMotion });
      } else {
        el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
      return;
    }
    let destination = "/";
    try {
      sessionStorage.setItem("scrollToOnLoad", target);
    } catch {
      // The URL carries the target when private-mode storage is blocked.
      // ScrollToOnLoad corrects the early native jump after pinning settles.
      destination = `/${hash}`;
    }
    router.push(destination);
  };

  // The wordmark is the site's "back to the top of home" control. As a
  // bare <Link href="/"> it dead-ended on the home page itself: the
  // router treats it as a same-route navigation, so a user scrolled
  // deep into the page clicked it and nothing moved. On home we take
  // over and scroll; everywhere else the link navigates as before.
  const handleBrand = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) return;
    e.preventDefault();
    if (lenis && !reducedMotion) {
      lenis.scrollTo(0, { immediate: reducedMotion });
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }
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
        // Prefer the section with the highest intersectionRatio (i.e.
        // the one most visibly inside the active band). Tiebreaker:
        // topmost in viewport for stable order when two adjacent
        // sections both fill the band. Matches ScrollProgress for
        // handoff consistency.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            if (b.intersectionRatio !== a.intersectionRatio) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
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
      <div className="container-page flex items-center justify-between gap-4 py-4">
        <Link
          href="/"
          onClick={handleBrand}
          className="type-label-stamp"
          aria-label={t("brand.aria")}
        >
          {t("brand.label")}
        </Link>

        <div className="flex items-center gap-3 md:gap-5 lg:gap-8">
          <NavMobileMenu
            items={NAV_ITEMS_MOBILE}
            activeSection={activeSection}
            buildHref={buildHref}
            onAnchorClick={handleAnchor}
          />
          <ul className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS_DESKTOP.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <li key={item.href}>
                  <a
                    href={buildHref(item.href)}
                    onClick={(e) => handleAnchor(e, item.href)}
                    aria-current={isActive ? "location" : undefined}
                    lang={navLabelLang(item.key, currentLocale)}
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

          <span className="shrink-0">
            <Link
              href="/cv"
              aria-current={onCv ? "page" : undefined}
              lang={navLabelLang("cv", currentLocale)}
              className={`type-label relative inline-block transition-colors active:scale-[0.94] active:duration-100 after:pointer-events-none after:absolute after:bottom-[-3px] after:left-0 after:h-[1.5px] after:w-full after:origin-left after:bg-ink after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:after:scale-x-100 ${
                onCv ? "text-ink after:scale-x-100" : "text-ink-soft after:scale-x-0 hover:text-ink"
              }`}
            >
              {t("nav.items.cv")}
            </Link>
          </span>

          {/* Locale switcher: globe toggle + crawlable hreflang links.
              TODO: `usePathname` strips query + hash. If `#work`-
              anchored users switch locale they lose position; compose
              href from `usePathname()` + `window.location.hash` once
              that's a real complaint. */}
          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
