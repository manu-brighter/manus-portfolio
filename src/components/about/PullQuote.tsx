"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PullQuote — the editorial signature of each storied About block.
 *
 * Takes the quote text with `{}` placeholders marking the keyword
 * span. The keyword inherits the block's `--block-spot` colour via
 * `.pull-highlight` and gets a hand-drawn-stroke SVG underline that
 * animates draw-in on viewport-entry (B9, plan §4).
 *
 * Visual reveal is `<OverprintReveal>` per word — the existing
 * primitive handles per-char misregistration and reduced-motion.
 */

type PullQuoteProps = {
  /** Quote text with `[[keyword]]` markers around the highlighted span.
   * `[[` / `]]` is used instead of `{...}` because next-intl interprets
   * curly braces as ICU MessageFormat placeholders. */
  text: string;
  /** Threshold for the IO that triggers OverprintReveal + underline. */
  threshold?: number;
};

const UNDERLINE_THRESHOLD_DEFAULT = 0.35;

/** Parse `text` into segments. Tokens wrapped in `[[...]]` become highlight,
 * everything else stays plain. Multiple highlight spans are supported but
 * only the first one gets the SVG underline (B9 spec). */
function parseHighlight(text: string): { plain: string; highlight: string; tail: string } {
  const match = text.match(/^([\s\S]*?)\[\[([\s\S]+?)\]\]([\s\S]*)$/);
  if (!match) return { plain: text, highlight: "", tail: "" };
  return { plain: match[1] ?? "", highlight: match[2] ?? "", tail: match[3] ?? "" };
}

export function PullQuote({ text, threshold = UNDERLINE_THRESHOLD_DEFAULT }: PullQuoteProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLQuoteElement>(null);
  const underlineRef = useRef<SVGPathElement>(null);

  const { plain, highlight, tail } = parseHighlight(text);
  const hasHighlight = highlight !== "";

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const path = underlineRef.current;
    if (!container || !path) return;

    // Initial state: underline drawn 0%.
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    let fired = false;
    let tween: gsap.core.Tween | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          observer.disconnect();
          // Draw-in tied to the OverprintReveal cadence — fires the
          // underline ~600ms in so the ink chars land first.
          tween = gsap.to(path, {
            strokeDashoffset: 0,
            duration: 0.65,
            delay: 0.6,
            ease: "power2.out",
          });
        }
      },
      { threshold },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [reducedMotion, threshold]);

  return (
    <blockquote ref={containerRef} className="pull-quote relative">
      <OverprintReveal text={plain} className="inline" />
      {hasHighlight ? (
        <span className="relative inline-block">
          {/* Hand-drawn-stroke underline. SVG path is a single curved
              line under the keyword. Width 100% of the keyword via
              the parent's inline-block. */}
          <span className="pull-highlight relative inline">
            <OverprintReveal text={highlight} className="inline" />
          </span>
          {!reducedMotion ? (
            <svg
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-3 w-full"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
            >
              <path
                ref={underlineRef}
                d="M2 8 Q 25 4, 50 7 T 98 6"
                stroke="var(--block-spot)"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : null}
        </span>
      ) : null}
      {tail ? <OverprintReveal text={tail} className="inline" /> : null}
    </blockquote>
  );
}
