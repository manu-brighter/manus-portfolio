"use client";

import gsap from "gsap";
import { useLocale, useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useViewTransition } from "@/hooks/useViewTransition";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { rememberLocale } from "@/lib/localePreference";
import { dur } from "@/lib/motion/tokens";

/**
 * LocaleSwitcher: the navbar language control.
 *
 * Closed: a hand-drawn globe icon. The navbar used to show the current
 * code ("DE") next to "CV", and two two-letter abbreviations side by side
 * read as one cryptic label. The toggle's accessible name carries the
 * current language instead ("Sprache wählen, aktuell Deutsch").
 *
 * Open: the globe winds up, spins and bursts like an ink stamp, a paper
 * proof strip stamps in under the navbar, and DE / EN / FR / IT land one
 * after another with an overshoot. Each code arrives with a rose and a
 * violet plate out of register that snap into place and vanish (the
 * tile-reveal "Andruck" snap). The toggle shows a close mark while open.
 * Closing plays the same timeline backwards at a higher time scale.
 *
 * SEO: the four options are real `<a href hreflang lang>` links and are
 * always in the static HTML. Closed they are `aria-hidden`, `tabIndex=-1`
 * and `visibility: hidden`, so the toggle is the only tab stop. Clicks
 * keep the client-side switch (remember the choice, router.replace inside
 * a view transition); modified clicks fall through to the browser.
 *
 * Motion ownership: the closed/open look is expressed with CSS classes
 * (that is the SSR state and the whole reduced-motion branch, an instant
 * swap). With full motion a paused GSAP timeline pins every animated node
 * with inline styles, which win over the classes, and plays/reverses on
 * toggle. Teardown kills the timeline and clears the inline props so the
 * classes take over again. Transform/opacity only.
 *
 * GSAP eases are named on purpose: GSAP 3 does not parse
 * "cubic-bezier(...)" strings without the CustomEase plugin. `expo.out`
 * stands in for `ease.expo`, `power3.inOut` for `ease.riso`.
 */

const STAGGER_S = 0.05;
const CLOSE_TIME_SCALE = 1.9;

const GLOBE_PATHS = [
  // Outline: a slightly lopsided circle, drawn like a pen stroke.
  "M12.1 3.1c4.8-.1 8.9 3.9 8.8 8.9-.1 4.9-4 8.9-8.9 8.9-5 .1-9-3.9-8.9-8.9.1-4.9 4-8.8 9-8.9z",
  // Meridians.
  "M12 3.3c-2.6 2.5-3.9 5.5-3.9 8.7 0 3.3 1.3 6.3 3.8 8.8",
  "M12.1 3.3c2.5 2.5 3.8 5.6 3.8 8.8 0 3.2-1.3 6.2-3.7 8.7",
  // Equator + two latitudes.
  "M3.3 11.9c5.8.6 11.7.6 17.6-.2",
  "M4.8 7.6c4.7.7 9.8.7 14.6-.1",
  "M4.9 16.5c4.8-.6 9.7-.5 14.5.2",
];

// Rounded: server (Node) and client (browser) trig can differ in the last
// float digit, which React reports as a hydration attribute mismatch.
const round2 = (n: number) => Math.round(n * 100) / 100;
const BURST_TICKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.2;
  const inner = i % 2 === 0 ? 11.5 : 12.5;
  const outer = i % 2 === 0 ? 15.5 : 14.5;
  return {
    x1: round2(16 + Math.cos(angle) * inner),
    y1: round2(16 + Math.sin(angle) * inner),
    x2: round2(16 + Math.cos(angle) * outer),
    y2: round2(16 + Math.sin(angle) * outer),
  };
});

/** Locale-stripped pathname → static-export href (`trailingSlash: true`). */
function localeHref(locale: Locale, pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  return `/${locale}${path}/`;
}

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const startTransition = useViewTransition();
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const globeRef = useRef<HTMLSpanElement>(null);
  const crossRef = useRef<HTMLSpanElement>(null);
  const burstRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const inkRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const roseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const violetRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // Mirrors `open` for the timeline builder (set in an effect, not render).
  const openRef = useRef(false);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  };

  // Outside pointer, Escape and focus leaving the switcher all close it.
  // Listeners only attach while open.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && root?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget;
      if (next instanceof Node && root?.contains(next)) return;
      // relatedTarget is null when focus goes to the page itself (a click
      // on non-focusable content); the pointerdown handler owns that case.
      if (next === null) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  // Build the stamp timeline once per motion preference. Reduced motion
  // builds nothing: the classes swap instantly.
  useEffect(() => {
    if (reducedMotion) return;
    const globe = globeRef.current;
    const cross = crossRef.current;
    const burst = burstRef.current;
    const panel = panelRef.current;
    const plate = plateRef.current;
    const marker = markerRef.current;
    const inks = inkRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    const roses = roseRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    const violets = violetRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    if (!globe || !cross || !burst || !panel || !plate) return;

    // Pin the closed state inline so later class flips can't leak through.
    gsap.set(globe, { opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 });
    gsap.set(cross, { opacity: 0, scale: 0.3, rotation: -60 });
    gsap.set(burst, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
    gsap.set(panel, { autoAlpha: 0, scale: 0.86, rotation: -2.5, y: -8 });
    gsap.set(plate, { x: 12, y: 10, rotation: 1.5 });
    if (marker) gsap.set(marker, { scaleX: 0 });
    gsap.set(inks, { opacity: 0, scale: 1.7, y: -10 });
    gsap.set(roses, { opacity: 0, x: 6, y: 4 });
    gsap.set(violets, { opacity: 0, x: -5, y: -3 });

    const tl = gsap.timeline({ paused: true });
    // Globe: wind-up squash, then a spin that collapses into the burst.
    tl.to(
      globe,
      {
        keyframes: [
          {
            rotation: -28,
            scaleX: 1.22,
            scaleY: 0.78,
            duration: dur.micro * 0.5,
            ease: "power2.out",
          },
          {
            rotation: 190,
            scaleX: 0.2,
            scaleY: 0.2,
            opacity: 0,
            duration: dur.micro,
            ease: "power2.in",
          },
        ],
      },
      0,
    );
    // Ink burst ring at the moment the globe vanishes.
    tl.to(
      burst,
      {
        keyframes: [
          { opacity: 1, scale: 1, duration: dur.micro * 0.4, ease: "power2.out" },
          { opacity: 0, scale: 1.65, duration: dur.short * 0.6, ease: "power2.out" },
        ],
      },
      dur.micro * 0.8,
    );
    // Close mark stamps into the emptied toggle.
    tl.to(
      cross,
      { opacity: 1, scale: 1, rotation: 0, duration: dur.short, ease: "expo.out" },
      0.16,
    );
    // Paper proof strip stamps down under the navbar.
    tl.to(
      panel,
      { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration: dur.short, ease: "expo.out" },
      0.14,
    );
    // Spot plate travels into register: overshoot lives in the keyframes,
    // the curves only decelerate (tile-plate lesson).
    tl.to(
      plate,
      {
        keyframes: [
          { x: -2, y: -1.5, rotation: -0.4, duration: dur.micro, ease: "power2.out" },
          { x: 0, y: 0, rotation: 0, duration: dur.micro, ease: "power1.out" },
        ],
      },
      0.16,
    );
    // Codes stamp in one after another; ghost plates snap into register.
    inks.forEach((ink, i) => {
      const at = 0.2 + i * STAGGER_S;
      const tilt = i % 2 === 0 ? -1 : 1;
      tl.to(
        ink,
        {
          keyframes: [
            {
              opacity: 1,
              scale: 0.88,
              y: 1.5,
              rotation: 4 * tilt,
              duration: dur.micro * 0.8,
              ease: "power2.out",
            },
            { scale: 1, y: 0, rotation: 0, duration: dur.micro * 0.8, ease: "power1.out" },
          ],
        },
        at,
      );
      const rose = roses[i];
      const violet = violets[i];
      if (rose) {
        tl.to(
          rose,
          {
            keyframes: [
              { opacity: 0.9, duration: 0.03 },
              { x: 0, y: 0, duration: dur.micro, ease: "power3.inOut" },
              { opacity: 0, duration: dur.micro * 0.6, ease: "power1.out" },
            ],
          },
          at,
        );
      }
      if (violet) {
        tl.to(
          violet,
          {
            keyframes: [
              { opacity: 0.85, duration: 0.03 },
              { x: 0, y: 0, duration: dur.micro * 1.2, ease: "power3.inOut" },
              { opacity: 0, duration: dur.micro * 0.6, ease: "power1.out" },
            ],
          },
          at + 0.02,
        );
      }
    });
    if (marker) {
      tl.to(
        marker,
        { scaleX: 1, duration: dur.short, ease: "expo.out" },
        0.2 + inks.length * STAGGER_S,
      );
    }

    // Record every start value now, then sit at the current state.
    tl.progress(1).progress(openRef.current ? 1 : 0);
    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
      gsap.set([globe, cross, burst, panel, plate, ...inks, ...roses, ...violets], {
        clearProps: "all",
      });
      if (marker) gsap.set(marker, { clearProps: "all" });
    };
  }, [reducedMotion]);

  useEffect(() => {
    openRef.current = open;
    const tl = tlRef.current;
    if (!tl) return;
    if (open) {
      tl.timeScale(1).play();
    } else {
      tl.timeScale(CLOSE_TIME_SCALE).reverse();
    }
  }, [open]);

  const onOptionClick = (e: MouseEvent<HTMLAnchorElement>, locale: Locale) => {
    // New tab / window: let the browser follow the real href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (locale === currentLocale) {
      close(true);
      return;
    }
    // Persist the explicit choice so the bare-root language sniff
    // (src/app/page.tsx) honours it on the next visit.
    rememberLocale(locale);
    startTransition(() => router.replace(pathname, { locale }));
  };

  const currentName = t(`locales.${currentLocale}`);

  return (
    <div ref={rootRef} data-no-splat className="relative flex shrink-0 items-center">
      {/* 36px hit area without growing the navbar row: negative margins
          give the layout a 12px box. They are asymmetric (11px/13px) so
          the globe's ink centres on the CAP height of the "CV" label, not
          on its text box: the box reserves descender space the uppercase
          label never uses, so box-centring left the globe ~1px low
          (tests/e2e/ink-entry-layout.spec.ts measures the cap centre). */}
      <button
        ref={toggleRef}
        type="button"
        data-testid="locale-toggle"
        aria-label={t("toggleLabel", { name: currentName })}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative -mx-2 -mt-[11px] -mb-[13px] flex size-9 items-center justify-center text-ink transition-transform active:scale-[0.92] active:duration-100"
      >
        <span
          ref={globeRef}
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center ${open ? "opacity-0" : ""}`}
        >
          <svg
            aria-hidden="true"
            data-locale-globe
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[1.3rem] overflow-visible"
          >
            {/* Rose plate out of register behind the ink drawing. */}
            <path
              d={GLOBE_PATHS[0]}
              stroke="var(--color-spot-rose)"
              strokeWidth={1.6}
              transform="translate(1.1 0.9)"
              className="mix-blend-multiply"
            />
            <g stroke="currentColor" strokeWidth={1.6}>
              {GLOBE_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
        </span>
        <span
          ref={crossRef}
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center ${open ? "" : "opacity-0"}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M6.6 6.9c3.5 3.2 6.9 6.6 10.6 10.4" />
            <path d="M17.3 6.6c-3.6 3.4-7 6.9-10.4 10.6" />
          </svg>
        </span>
        <svg
          ref={burstRef}
          aria-hidden="true"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="pointer-events-none absolute -inset-1.5 size-12 overflow-visible opacity-0"
        >
          {BURST_TICKS.map((tick) => (
            <line key={`${tick.x1}-${tick.y1}`} {...tick} />
          ))}
          <circle cx="16" cy="16" r="9.5" stroke="var(--color-spot-violet)" strokeWidth={1.2} />
        </svg>
      </button>

      <div
        ref={panelRef}
        id={panelId}
        aria-hidden={open ? undefined : true}
        className={`absolute top-full right-0 mt-[2.2rem] origin-top-right lg:mt-4 ${
          open ? "" : "invisible opacity-0"
        }`}
      >
        <span
          ref={plateRef}
          aria-hidden="true"
          className="absolute top-1 -right-1 -bottom-1 left-1 bg-spot-violet"
        />
        <ul
          aria-label={t("ariaLabel")}
          className="relative flex items-center gap-0.5 border-[1.5px] border-ink bg-paper px-1.5 py-1"
        >
          {routing.locales.map((locale, i) => {
            const isCurrent = locale === currentLocale;
            const code = locale.toUpperCase();
            return (
              <li key={locale}>
                <a
                  href={localeHref(locale, pathname)}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={isCurrent ? "true" : undefined}
                  tabIndex={open ? undefined : -1}
                  onClick={(e) => onOptionClick(e, locale)}
                  className="type-label relative block px-2.5 py-2.5 text-ink"
                >
                  <span className="sr-only">{t(`locales.${locale}`)}</span>
                  <span aria-hidden="true" className="relative inline-block">
                    <span
                      ref={(el) => {
                        roseRefs.current[i] = el;
                      }}
                      className="absolute inset-0 text-spot-rose opacity-0 mix-blend-multiply"
                    >
                      {code}
                    </span>
                    <span
                      ref={(el) => {
                        violetRefs.current[i] = el;
                      }}
                      className="absolute inset-0 text-spot-violet opacity-0 mix-blend-multiply"
                    >
                      {code}
                    </span>
                    <span
                      ref={(el) => {
                        inkRefs.current[i] = el;
                      }}
                      data-text={code}
                      className="misreg-hover relative"
                    >
                      {code}
                    </span>
                  </span>
                  {isCurrent && (
                    <span
                      ref={markerRef}
                      aria-hidden="true"
                      className="absolute right-2 bottom-1 left-2 h-[3px] origin-left bg-spot-rose"
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
