"use client";

/**
 * OverprintReveal — the Risograph misregistration reveal primitive
 * (plan §4.3 Editorial-Regeln, §6.3 Signature Moment 3).
 *
 * Composition: for every character we render three stacked copies:
 *   1. ink  — the semantic character, in the document flow, --color-ink
 *   2. rose ghost — absolutely positioned, translated +offset, spot-rose
 *   3. mint ghost — absolutely positioned, translated -offset, spot-mint
 *
 * On enter (IntersectionObserver one-shot) the ghosts fade in from
 * exaggerated offsets and snap to their resting 2–3px misregistration
 * using ease `riso`. The ink layer then fades in on top. The resting
 * ghost offset is kept (not animated to 0) so the print-registration
 * feel persists after the reveal — Riso plates never perfectly align.
 *
 * A tiny per-character offset variance gives the "handset" feel called
 * out in plan §4.3: each glyph shifts by its own deterministic sub-
 * pixel amount so the row doesn't read as a uniform drop-shadow.
 *
 * Performance: GSAP timelines ride the shared `gsap.ticker`, which is
 * our shared RAF (see `src/lib/raf.ts`), so Lenis and this animation
 * settle inside the same frame — no ScrollTrigger needed.
 *
 * Accessibility:
 *   - Rendered charstacks (inline-block per char) would otherwise read
 *     as "H e l l e r ," in a screen reader — each block treated as its
 *     own word. So we mark the entire visual composition aria-hidden
 *     and expose a sibling `sr-only` text node as the accessible-name
 *     source. The H1 / landmark that wraps us picks that up unchanged.
 *   - `aria-label` on the root span is intentionally NOT used: ARIA
 *     prohibits `aria-label` on `role="generic"` and axe flags it.
 *   - `prefers-reduced-motion`: ghost layers are omitted entirely
 *     (less DOM, less paint) and the text renders as a single inline
 *     string — no animation, no per-char split.
 */

import gsap from "gsap";
import { type CSSProperties, useEffect, useId, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { splitChars } from "@/lib/motion/splitChars";
import { dur, ease } from "@/lib/motion/tokens";

type OverprintRevealProps = {
  /** Text content — keep it a string so we can split + flow chars. */
  text: string;
  /** Visual class applied to the outer element (font size, alignment). */
  className?: string;
  /** Scroll-reveal threshold, 0–1. Default 0.35 matches ScrollProgress. */
  threshold?: number;
  /** Delay before the timeline starts once `enter` fires (seconds). */
  delay?: number;
  /** Per-char stagger (seconds). Default `dur.micro / 5` ≈ 28ms. */
  stagger?: number;
  /** Style pass-through — lets callers set line-height etc. */
  style?: CSSProperties;
};

/** Resting misregistration — kept after snap, the signature "print" feel. */
const RESTING_OFFSET_PX = 2;
/** Entry offset — ghosts fly in from this distance. */
const ENTRY_OFFSET_PX = 18;
/** Per-char deterministic jitter (±px) added to the resting offset. */
const JITTER_PX = 1;

/**
 * Deterministic small hash → jitter factor in roughly [-JITTER_PX, +JITTER_PX].
 * Keeps SSR and client-first-render byte-identical because the jitter
 * is a pure function of char + index.
 */
function jitterFor(char: string, index: number): number {
  const seed = (char.charCodeAt(0) + index * 31) % 17;
  return (seed / 8 - 1) * JITTER_PX;
}

export function OverprintReveal({
  text,
  className,
  threshold = 0.35,
  delay = 0,
  stagger,
  style,
}: OverprintRevealProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const uid = useId();

  const chars = splitChars(text);

  useEffect(() => {
    if (reducedMotion) return;
    const root = rootRef.current;
    if (!root) return;

    const roseLayer = root.querySelectorAll<HTMLSpanElement>("[data-layer='rose']");
    const mintLayer = root.querySelectorAll<HTMLSpanElement>("[data-layer='mint']");
    const inkLayer = root.querySelectorAll<HTMLSpanElement>("[data-layer='ink']");

    if (roseLayer.length === 0) return;

    const resolvedStagger = stagger ?? dur.micro / 5;
    const easeCurve = `cubic-bezier(${ease.riso.join(",")})`;

    // Prime state — ghosts displaced further than their resting offset,
    // ink invisible. `gsap.set` avoids a one-frame flash before the
    // IntersectionObserver fires on slow mounts.
    gsap.set(roseLayer, { x: ENTRY_OFFSET_PX, y: -ENTRY_OFFSET_PX, opacity: 0 });
    gsap.set(mintLayer, { x: -ENTRY_OFFSET_PX, y: ENTRY_OFFSET_PX, opacity: 0 });
    gsap.set(inkLayer, { opacity: 0 });

    let fired = false;
    let timeline: gsap.core.Timeline | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          observer.disconnect();

          timeline = gsap.timeline({ delay });

          // Ghosts fly in toward their resting misregistration with a
          // per-char stagger. Each ghost gets its own deterministic
          // jitter so the row has "handset" inconsistency.
          timeline.to(
            roseLayer,
            {
              x: (_i, el) => {
                const c = (el as HTMLElement).dataset.char ?? "";
                const idx = Number((el as HTMLElement).dataset.index ?? 0);
                return RESTING_OFFSET_PX + jitterFor(c, idx);
              },
              y: (_i, el) => {
                const c = (el as HTMLElement).dataset.char ?? "";
                const idx = Number((el as HTMLElement).dataset.index ?? 0);
                return -RESTING_OFFSET_PX + jitterFor(c, idx + 7);
              },
              opacity: 0.85,
              duration: dur.medium,
              ease: easeCurve,
              stagger: resolvedStagger,
            },
            0,
          );

          timeline.to(
            mintLayer,
            {
              x: (_i, el) => {
                const c = (el as HTMLElement).dataset.char ?? "";
                const idx = Number((el as HTMLElement).dataset.index ?? 0);
                return -RESTING_OFFSET_PX + jitterFor(c, idx + 13);
              },
              y: (_i, el) => {
                const c = (el as HTMLElement).dataset.char ?? "";
                const idx = Number((el as HTMLElement).dataset.index ?? 0);
                return RESTING_OFFSET_PX + jitterFor(c, idx + 19);
              },
              opacity: 0.85,
              duration: dur.medium,
              ease: easeCurve,
              stagger: resolvedStagger,
            },
            0,
          );

          // Ink layer fades in on top a beat after ghosts start snapping —
          // gives the viewer a moment to read the misregistration before
          // the "final print" lands.
          timeline.to(
            inkLayer,
            {
              opacity: 1,
              duration: dur.short,
              ease: "power2.out",
              stagger: resolvedStagger,
            },
            dur.medium * 0.55,
          );
        }
      },
      { threshold },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      timeline?.kill();
    };
  }, [reducedMotion, threshold, delay, stagger]);

  // Reduced-motion branch: no ghost layers, no per-char split. Renders
  // the text as a plain inline string — simplest DOM, zero animation,
  // and the text reads naturally in a screen reader.
  if (reducedMotion) {
    return (
      <span ref={rootRef} className={className} style={style}>
        {text}
      </span>
    );
  }

  // Default (motion-enabled) branch: three stacked layers per char for
  // the visual composition, the entire thing aria-hidden, plus a sibling
  // sr-only text node as the accessible-name source.
  //
  // Ink carries layout (document flow); ghosts are absolutely positioned
  // over it so the row's width is authored by ink alone and doesn't
  // jitter during the animation.
  return (
    <span ref={rootRef} className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline">
        {chars.map((r) => {
          const key = `${uid}-${r.index}`;
          if (r.isWhitespace) {
            return (
              <span key={key} className="whitespace-pre">
                {"\u00A0"}
              </span>
            );
          }

          return (
            <span key={key} className="relative inline-block" style={{ overflow: "visible" }}>
              {/* Ink layer — in document flow, carries accessible name. */}
              <span
                data-layer="ink"
                data-char={r.char}
                data-index={r.index}
                className="relative z-10 block text-ink"
                style={{ willChange: "opacity" }}
              >
                {r.char}
              </span>
              {/* Rose ghost — absolutely positioned over the ink glyph. */}
              <span
                data-layer="rose"
                data-char={r.char}
                data-index={r.index}
                aria-hidden="true"
                className="absolute inset-0 block"
                style={{
                  color: "var(--color-spot-rose)",
                  mixBlendMode: "multiply",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                }}
              >
                {r.char}
              </span>
              {/* Mint ghost — absolutely positioned over the ink glyph. */}
              <span
                data-layer="mint"
                data-char={r.char}
                data-index={r.index}
                aria-hidden="true"
                className="absolute inset-0 block"
                style={{
                  color: "var(--color-spot-mint)",
                  mixBlendMode: "multiply",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                }}
              >
                {r.char}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
