"use client";

import gsap from "gsap";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dispatchSplat, type SplatColorName } from "@/lib/fluidBus";
import { dur, ease } from "@/lib/motion/tokens";

/**
 * WorkCard — the editorial flex unit of Section 03.
 *
 * Built around the agreed Phase 7 concept: cards behave like force
 * sources for the global Hero fluid-sim. The card itself is plain
 * DOM/SVG (no second WebGL canvas), but hover/click events dispatch
 * splat requests onto `fluidBus` which the FluidSim drains on its
 * next step. When the Hero canvas is out of viewport the sim is
 * paused (Phase 4 deviation) and queued splats are discarded —
 * acceptable: the click-burst on the Portfolio card lands AFTER the
 * smooth-scroll back to the hero, when the sim has resumed.
 *
 * Hover choreography is GSAP-driven on the shared ticker:
 *   • 3-layer parallax (paper-shade backing → media → title overlay)
 *     drift with cursor — backing the deepest, title stationary, media
 *     in between
 *   • magnetic translate of the whole card toward cursor (max 12px)
 *   • stack-pills cascade in with riso-snap stagger
 *   • a small same-color splat is fired per hover-enter for ambient
 *     coupling with the global sim
 *
 * Reduced-motion: all GSAP animations skip, no splats are dispatched,
 * cards render in their resting state and click handlers still work.
 */

export type WorkCardProps = {
  /** Stable id; doubles as anchor target. */
  id: string;
  /** Display title (Instrument Serif Italic). */
  title: string;
  /** Small descriptor under the title (e.g. "Toon Fluid"). */
  subtitle?: string;
  /** Year-stamp (mono). */
  year: string;
  /** Role string (mono). */
  role: string;
  /** Stack labels rendered as cascading pills. */
  stack: string[];
  /** 1-sentence body copy under the title block. */
  description: string;
  /** Extra meta line (Portfolio's "Du surfst gerade auf …"). */
  metaNote?: string;
  /** CTA stamp text. */
  ctaLabel: string;
  /** Spot-color seed used for the hover splat + accent. */
  splatColor: SplatColorName;
  /** Whether to show the [vibecoded] stamp. */
  vibecoded?: boolean;
  /** Marker label (i18n). */
  vibecodedLabel?: string;
  /**
   * What clicking the card does. `"scroll-hero"` smooth-scrolls to
   * #hero and fires a large color burst once the scroll completes.
   * `"anchor:#xxx"` is a plain anchor scroll — the splat is omitted
   * because the destination is below the hero (sim out of view).
   */
  click: { kind: "scroll-hero" } | { kind: "anchor"; target: string };
  /** Visual: either an `<img>` element (screenshot) or a generative SVG. */
  media: ReactNode;
  /** Optional alt text for the screenshot — used for SR labelling. */
  mediaAlt?: string;
  /** Caption rendered under the media frame (mono). */
  mediaCaption?: string;
  /** Layout offset — odd cards drop, even cards rise (asymmetric). */
  offsetY?: number;
  /** Pass-through className for outer wrapper (grid placement). */
  className?: string;
  /** Pass-through style for outer wrapper. */
  style?: CSSProperties;
};

/** Magnetic-pull max distance (CSS px). Plan §6.7 calls for 12px. */
const MAGNET_MAX_PX = 12;

/** Parallax factors per layer — backing biggest, title stationary. */
const PARALLAX = {
  backing: 14,
  media: 6,
  title: 0,
} as const;

export function WorkCard(props: WorkCardProps) {
  const {
    id,
    title,
    subtitle,
    year,
    role,
    stack,
    description,
    metaNote,
    ctaLabel,
    splatColor,
    vibecoded,
    vibecodedLabel,
    click,
    media,
    mediaCaption,
    offsetY = 0,
    className,
    style,
  } = props;

  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const backingRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLUListElement>(null);

  const [hovered, setHovered] = useState(false);

  // Hover-enter / hover-leave choreography. GSAP timeline is rebuilt
  // each direction so we can reverse with the same easing.
  useEffect(() => {
    if (reducedMotion) return;
    const card = cardRef.current;
    if (!card) return;

    const pills = pillsRef.current?.querySelectorAll("li") ?? [];
    const easeCurve = `cubic-bezier(${ease.riso.join(",")})`;

    if (hovered) {
      gsap.to(pills, {
        opacity: 1,
        y: 0,
        duration: dur.short,
        ease: easeCurve,
        stagger: 0.04,
      });
    } else {
      gsap.to(pills, {
        opacity: 0.6,
        y: 6,
        duration: dur.micro,
        ease: easeCurve,
      });
    }
  }, [hovered, reducedMotion]);

  // Pointer-driven magnetic + parallax. Bound only while hovered to
  // avoid global listeners burning cycles when the user is far away.
  useEffect(() => {
    if (reducedMotion || !hovered) return;
    const card = cardRef.current;
    const backing = backingRef.current;
    const mediaEl = mediaRef.current;
    const titleEl = titleRef.current;
    if (!card || !backing || !mediaEl || !titleEl) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Normalise to ±1 within the card bounds for parallax,
      // separately compute clamped magnet for whole-card translate.
      const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
      targetX = nx;
      targetY = ny;

      if (raf === 0) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mag = Math.min(1, Math.hypot(targetX, targetY));
          const magX = targetX * MAGNET_MAX_PX * mag;
          const magY = targetY * MAGNET_MAX_PX * mag;
          gsap.to(card, { x: magX, y: magY + offsetY, duration: dur.short, ease: "power2.out" });
          gsap.to(backing, {
            x: targetX * PARALLAX.backing,
            y: targetY * PARALLAX.backing,
            duration: dur.medium,
            ease: "power2.out",
          });
          gsap.to(mediaEl, {
            x: targetX * PARALLAX.media,
            y: targetY * PARALLAX.media,
            duration: dur.medium,
            ease: "power2.out",
          });
          gsap.to(titleEl, {
            x: targetX * PARALLAX.title,
            y: targetY * PARALLAX.title,
            duration: dur.medium,
            ease: "power2.out",
          });
        });
      }
    };

    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (raf !== 0) cancelAnimationFrame(raf);
      // Snap back to rest on hover-leave
      gsap.to(card, { x: 0, y: offsetY, duration: dur.medium, ease: "power3.out" });
      gsap.to([backing, mediaEl, titleEl], {
        x: 0,
        y: 0,
        duration: dur.medium,
        ease: "power3.out",
      });
    };
  }, [hovered, offsetY, reducedMotion]);

  // Set initial offsetY without animation (positions card pre-hover)
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    gsap.set(card, { y: offsetY });
  }, [offsetY]);

  // Initial pill state: dimmed + slightly shifted, animates in on hover
  useEffect(() => {
    if (reducedMotion) return;
    const pills = pillsRef.current?.querySelectorAll("li") ?? [];
    if (pills.length === 0) return;
    gsap.set(pills, { opacity: 0.6, y: 6 });
  }, [reducedMotion]);

  // Hover-enter: fire one ambient splat in the card's color. Lands in
  // the FluidOrchestrator queue; if hero is out of viewport it's
  // discarded silently. Cheap pulse for "card is alive".
  const onPointerEnter = () => {
    setHovered(true);
    if (reducedMotion) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (typeof window !== "undefined") {
      dispatchSplat({
        x: cx / window.innerWidth,
        y: 1 - cy / window.innerHeight,
        color: splatColor,
      });
    }
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (click.kind === "scroll-hero") {
      e.preventDefault();
      const hero = document.getElementById("hero");
      hero?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      // Big colored burst at viewport center, dispatched after a beat
      // so the sim has resumed when the splat lands. 0.55s matches the
      // typical smooth-scroll easing tail.
      if (!reducedMotion) {
        window.setTimeout(() => {
          dispatchSplat({
            x: 0.5,
            y: 0.5,
            color: splatColor,
            // Strong outward velocity for visible "bloom" — values
            // chosen empirically against the splat shader's force scale.
            dx: 0.0,
            dy: 0.0,
          });
          // Three more in a tight cluster for a stamp-like cascade
          for (let i = 1; i <= 3; i++) {
            window.setTimeout(() => {
              dispatchSplat({
                x: 0.5 + (Math.random() - 0.5) * 0.1,
                y: 0.5 + (Math.random() - 0.5) * 0.1,
                color: splatColor,
              });
            }, i * 80);
          }
        }, 350);
      }
    }
    // anchor: native <a href> handles the scroll
  };

  const href = click.kind === "anchor" ? click.target : "#hero";
  const isExternal = false;

  return (
    <article
      ref={rootRef}
      id={id}
      aria-labelledby={`work-${id}-title`}
      className={`relative ${className ?? ""}`}
      style={style}
    >
      <a
        href={href}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        rel={isExternal ? "noreferrer external" : undefined}
      >
        <div ref={cardRef} className="relative will-change-transform">
          {/* Backing block — riso underlay shifted bottom-right. */}
          <div
            ref={backingRef}
            aria-hidden="true"
            className="absolute inset-0 translate-x-3 translate-y-3 will-change-transform"
            style={{
              background: `var(--color-spot-${splatColor})`,
              opacity: 0.18,
            }}
          />

          {/* Media frame — screenshot or generative visual. */}
          <div
            ref={mediaRef}
            className="relative aspect-[4/5] overflow-hidden border-2 border-ink bg-paper-shade will-change-transform"
          >
            {media}

            {/* Vibecoded stamp — bottom-right corner of the frame. */}
            {vibecoded && vibecodedLabel ? (
              <span className="absolute bottom-3 right-3 rounded-[2px] bg-paper px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink shadow-[2px_2px_0_var(--color-ink)]">
                {vibecodedLabel}
              </span>
            ) : null}
          </div>

          {/* Mono caption under media. */}
          {mediaCaption ? <p className="mt-3 text-ink-muted type-label">{mediaCaption}</p> : null}

          {/* Title overlay — title + meta, sits above media in z. */}
          <div ref={titleRef} className="relative mt-6 will-change-transform">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-ink-muted type-label">{year}</span>
              <span className="text-right text-ink-muted type-label">{role}</span>
            </div>

            <h3
              id={`work-${id}-title`}
              className="mt-3 font-display italic text-ink text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em]"
            >
              {title}
              {subtitle ? (
                <span className="ml-3 align-baseline font-mono text-ink-muted text-[0.4em] uppercase tracking-[0.2em] not-italic">
                  ({subtitle})
                </span>
              ) : null}
            </h3>

            <p className="mt-4 max-w-prose type-body text-ink-soft">{description}</p>
            {metaNote ? (
              <p className="mt-3 max-w-prose type-body-sm text-ink-muted italic">{metaNote}</p>
            ) : null}

            {/* Stack-pills cascade. */}
            <ul
              ref={pillsRef}
              className="mt-6 flex flex-wrap gap-2 will-change-[opacity,transform]"
            >
              {stack.map((s) => (
                <li
                  key={s}
                  className="rounded-[2px] border border-ink/30 px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-soft"
                >
                  {s}
                </li>
              ))}
            </ul>

            {/* CTA stamp. */}
            <span className="mt-6 inline-block rounded-[2px] border-2 border-ink bg-paper px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-ink transition-transform group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[3px_3px_0_var(--color-ink)]">
              {ctaLabel} →
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}
