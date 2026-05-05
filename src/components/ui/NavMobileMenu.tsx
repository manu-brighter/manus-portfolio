"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * Mobile hamburger menu — only mounts the dropdown subtree on mobile
 * viewports (<md). Animated slide-down via CSS transform/opacity, no
 * GSAP required for a simple one-shot reveal.
 *
 * Uses `useState` for open/close + matchMedia listener that auto-closes
 * on viewport-resize past md breakpoint (avoids stuck-open on device
 * rotate from portrait → landscape). Esc closes via document keydown.
 */

type NavItem = { href: string; key: string };

export function NavMobileMenu({ items }: { items: readonly NavItem[] }) {
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

  // Close menu on anchor-click so the user lands on the section without
  // the dropdown obscuring it.
  const onItemClick = () => setOpen(false);

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
        <ul
          id="mobile-nav-list"
          className="absolute top-full right-0 left-0 flex flex-col gap-3 border-paper-line border-b bg-paper px-6 py-6 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onItemClick}
                className="block py-2 text-ink type-label transition-colors hover:text-ink-soft"
              >
                {t(`nav.items.${item.key}`)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
