/**
 * Home-page section descriptors — single source of truth for the on-
 * scroll narrative ordering that `Nav` (top-bar links + scroll-spy) and
 * `ScrollProgress` (Ink-Bleed-Dots indicator) consume.
 *
 * Order MUST match the actual page flow (see `[locale]/page.tsx`).
 * IntersectionObserver-driven `activeSection` / `activeIndex` derive
 * from `id`s in DOM order, and the dots-strip colour cycle cascades
 * across the ordered list — out-of-order entries flicker.
 *
 * The home-page JSX itself stays declarative (`[locale]/page.tsx` is
 * not derived from this list) — `page.tsx` owns layout/composition,
 * not just ids. This list is just the nav/progress projection.
 */

import type { SpotColor } from "@/lib/palette";

export type SectionDescriptor = {
  /** Anchor `id` on the <section> element. */
  id: string;
  /** i18n key under `nav.items.*` (mapped to label via next-intl).
   *  `null` for sections without a top-level nav item (Hero,
   *  About-Objects). */
  navLabelKey: string | null;
  /** Riso spot color cycled into the ScrollProgress dot strip. */
  color: SpotColor;
  /** Appears in the desktop nav bar. */
  showInDesktopNav: boolean;
  /** Appears in the mobile hamburger menu. */
  showInMobileNav: boolean;
  /** Appears in the right-edge ScrollProgress dots. */
  showInScrollProgress: boolean;
};

// Riso 4-spot rotation cycles mint -> rose -> amber -> violet so each
// adjacent pair has distinct colour identity. See ScrollProgress for
// the original cycle.
export const SECTIONS: readonly SectionDescriptor[] = [
  {
    id: "hero",
    navLabelKey: null,
    color: "mint",
    showInDesktopNav: false,
    showInMobileNav: false,
    showInScrollProgress: true,
  },
  {
    id: "about",
    navLabelKey: "about",
    color: "rose",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "about-objects",
    navLabelKey: null,
    color: "amber",
    showInDesktopNav: false,
    showInMobileNav: false,
    showInScrollProgress: true,
  },
  {
    id: "skills",
    navLabelKey: "skills",
    color: "violet",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "work",
    navLabelKey: "work",
    color: "mint",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "case-study",
    navLabelKey: "casestudy",
    color: "rose",
    showInDesktopNav: false,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "photography",
    navLabelKey: "photography",
    color: "amber",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "playground",
    navLabelKey: "playground",
    color: "violet",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
  {
    id: "contact",
    navLabelKey: "contact",
    color: "mint",
    showInDesktopNav: true,
    showInMobileNav: true,
    showInScrollProgress: true,
  },
] as const;
