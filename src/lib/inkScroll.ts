// src/lib/inkScroll.ts

import { SECTIONS } from "@/lib/content/sections";

const SECTION_SELECTOR = SECTIONS.map(({ id }) => `#${id}`).join(", ");
/** Frames between checks for a page swap (client navigation). */
const RECONNECT_CHECK_FRAMES = 60;

export type InkScrollState = {
  /** Smoothed scroll position in viewport heights. */
  scroll: number;
  /** Smoothed section quieting: 0 = full ink (hero/contact), 1 = reading. */
  quiet: number;
};

export type InkScrollTracker = {
  /** Advance the smoothing by `dt` seconds and return the current state. */
  update: (dt: number) => InkScrollState;
  /** Re-observe the page's sections (after client navigation or resize). */
  refresh: () => void;
  dispose: () => void;
};

/**
 * Scroll choreography shared by both ink renderers: a smoothed scroll
 * position (the sheet drifts as the page moves) and a per-section quiet
 * level (Work, case study and photography open a paper interval around
 * their content). Observes a narrow viewport band, independent of each
 * section's height, so the render loop never queries layout.
 *
 * Client navigation replaces the observed section nodes. Callers with
 * router access can call `refresh()` on pathname change; `update()` also
 * re-observes on its own once the observed nodes leave the document, so
 * renderers mounted outside the router context (R3F) stay in sync.
 */
export function createInkScrollTracker(onSection?: (id: string | null) => void): InkScrollTracker {
  let targetQuiet = 0.55;
  // One mutable result object: update() runs every frame.
  const state: InkScrollState = {
    scroll: window.scrollY / Math.max(1, window.innerHeight),
    quiet: 0,
  };
  let observer: IntersectionObserver | null = null;
  let observed: Element[] = [];
  let frames = 0;

  const onEntries: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      targetQuiet =
        id === "hero" || id === "contact"
          ? 0
          : id === "work" || id === "case-study" || id === "photography"
            ? 1
            : 0.55;
      onSection?.(id);
    }
  };

  const refresh = () => {
    observer?.disconnect();
    targetQuiet = 0.55;
    onSection?.(null);
    const margin = Math.round(window.innerHeight * 0.45);
    observer = new IntersectionObserver(onEntries, {
      rootMargin: `-${margin}px 0px -${margin}px 0px`,
      threshold: 0,
    });
    observed = Array.from(document.querySelectorAll(SECTION_SELECTOR));
    for (const section of observed) observer.observe(section);
  };

  refresh();
  window.addEventListener("resize", refresh);

  return {
    update: (dt) => {
      frames++;
      if (frames % RECONNECT_CHECK_FRAMES === 0) {
        const first = observed[0];
        const stale = first
          ? !first.isConnected
          : document.querySelector(SECTION_SELECTOR) !== null;
        if (stale) refresh();
      }
      state.quiet += (targetQuiet - state.quiet) * (1 - Math.exp(-dt * 2.4));
      state.scroll +=
        (window.scrollY / Math.max(1, window.innerHeight) - state.scroll) * (1 - Math.exp(-dt * 3));
      return state;
    },
    refresh,
    dispose: () => {
      observer?.disconnect();
      observer = null;
      observed = [];
      window.removeEventListener("resize", refresh);
    },
  };
}
