"use client";

import { useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useState } from "react";

/**
 * Mobile hamburger menu — only mounts the dropdown subtree on mobile
 * viewports (<md). Animated slide-down via CSS transform/opacity, no
 * GSAP required for a simple one-shot reveal.
 *
 * Uses `useState` for open/close + matchMedia listener that auto-closes
 * on viewport-resize past md breakpoint (avoids stuck-open on device
 * rotate from portrait → landscape). Esc closes via document keydown.
 *
 * A11y when open:
 * - aria-modal="true" on the panel (signals to AT that content behind
 *   the overlay is inert)
 * - `inert` attribute on <main id="main"> blocks keyboard/AT reach
 *   into the backgrounded page content
 * - document.body overflow:hidden prevents scroll-behind
 * All three are cleaned up symmetrically on close / resize / unmount.
 */

type NavItem = { href: string; key: string };

type Props = {
  items: readonly NavItem[];
  activeSection: string | null;
  /** Builds the final href for a hash-anchor; on sub-routes prefixes the locale path. */
  buildHref: (hash: string) => string;
  /** Sub-route anchor click handler — preventDefault + stashes target for ScrollToOnLoad. */
  onAnchorClick: (e: MouseEvent<HTMLAnchorElement>, hash: string) => void;
};

export function NavMobileMenu({ items, activeSection, buildHref, onAnchorClick }: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  // Close on viewport-resize past md breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus trap + scroll lock when menu is open.
  // - inert on <main> blocks keyboard/AT from reaching behind the overlay
  // - overflow:hidden on body prevents scroll-behind
  useEffect(() => {
    const main = document.getElementById("main");
    if (open) {
      if (main) main.setAttribute("inert", "");
      document.body.style.overflow = "hidden";
    } else {
      if (main) main.removeAttribute("inert");
      document.body.style.overflow = "";
    }
    // Cleanup runs on unmount regardless of open state.
    return () => {
      if (main) main.removeAttribute("inert");
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close menu on anchor-click so the user lands on the section without
  // the dropdown obscuring it. Also delegate to the parent's sub-route
  // handler so /playground/[slug] -> home anchors stash a sessionStorage
  // target for <ScrollToOnLoad />.
  const onItemClick = (e: MouseEvent<HTMLAnchorElement>, hash: string) => {
    setOpen(false);
    onAnchorClick(e, hash);
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? t("nav.mobileMenu.close") : t("nav.mobileMenu.open")}
        aria-expanded={open}
        aria-controls="mobile-nav-list"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 text-ink"
      >
        <span
          className={`h-0.5 w-5 bg-ink transition-transform duration-200 ${
            open ? "translate-y-2 rotate-45" : ""
          }`}
        />
        <span
          className={`h-0.5 w-5 bg-ink transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`h-0.5 w-5 bg-ink transition-transform duration-200 ${
            open ? "-translate-y-2 -rotate-45" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          aria-modal="true"
          role="dialog"
          aria-label={t("nav.mobileMenu.open")}
          className="absolute top-full right-0 left-0 border-paper-line border-b bg-paper shadow-lg"
        >
          <ul id="mobile-nav-list" className="flex flex-col gap-3 px-6 py-6">
            {items.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <li key={item.href}>
                  <a
                    href={buildHref(item.href)}
                    onClick={(e) => onItemClick(e, item.href)}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative block py-2 type-label transition-colors active:scale-[0.97] active:duration-100 after:pointer-events-none after:absolute after:bottom-1 after:left-0 after:h-[1.5px] after:w-12 after:origin-left after:bg-ink after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:after:scale-x-100 ${
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
        </div>
      ) : null}
    </div>
  );
}
