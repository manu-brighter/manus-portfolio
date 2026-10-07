"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { DioramaIllustration } from "@/components/case-study/DioramaIllustration";
import { TRACK_WIDTH_VH } from "@/components/case-study/DioramaTrack";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Geometry, all in vh (the diorama's track unit). The SVG draws the
 * lupe in a 200-unit box rendered WRAP_VH tall, so one SVG unit is
 * WRAP_VH / 200 vh.
 */
const WRAP_VH = 22;
const UNIT_VH = WRAP_VH / 200;
/** Lens centre inside the SVG box (units). */
const LENS_C = 70;
/** Glass radius (units) — the magnified view is clipped to a circle
 *  that reaches under the rim stroke so no seam shows. */
const LENS_R = 57;
/** Lens centre on the track at rest, over the top of the Admin card's
 *  screenshot (nav bar + "Admin Dashboard" header), so the sweep always
 *  has something to magnify (card: left 140vh, top 18vh, width 72vh). */
const CENTER_X_VH = 174;
const CENTER_Y_VH = 25.5;
/** Horizontal sweep amplitude (±) and half-period. */
const SWEEP_VH = 25;
const SWEEP_S = 5.5;
/** Magnification factor of the lens. */
const ZOOM = 1.8;

const WRAP_LEFT_VH = CENTER_X_VH - LENS_C * UNIT_VH;
const WRAP_TOP_VH = CENTER_Y_VH - LENS_C * UNIT_VH;
/** Lens box offset inside the wrapper, and its track position. */
const LENS_OFFSET_VH = (LENS_C - LENS_R) * UNIT_VH;
const LENS_SIZE_VH = 2 * LENS_R * UNIT_VH;
const LENS_LEFT_VH = WRAP_LEFT_VH + LENS_OFFSET_VH;
const LENS_TOP_VH = WRAP_TOP_VH + LENS_OFFSET_VH;

/**
 * Transform of the magnified copy for a sweep offset `p` (vh).
 *
 * The copy is laid out exactly like the real track (origin moved to the
 * track origin), so at scale 1 and translate(-p) it would line up with
 * what is beneath. Scaling by ZOOM around the lens centre (which sits at
 * CENTER + p on the track) and cancelling the wrapper's own +p gives
 *   translate((1 - Z) * CX - Z * p, (1 - Z) * CY) scale(Z)
 * with transform-origin 0 0.
 */
function copyTransform(p: number): string {
  const tx = (1 - ZOOM) * CENTER_X_VH - ZOOM * p;
  const ty = (1 - ZOOM) * CENTER_Y_VH;
  return `translate(${tx}vh, ${ty}vh) scale(${ZOOM})`;
}

type Props = {
  /** Decorative copies of the cards that sit under the lens sweep
   *  (rendered in track coordinates on top of the illustration). */
  children?: ReactNode;
};

/**
 * DioramaLupe — foreground magnifier above the Admin card.
 *
 * The lens shows a real magnified view of what lies beneath: a
 * decorative copy of the track (illustration + the cards passed as
 * children) is laid out in track coordinates inside a circular clip,
 * scaled by ZOOM around the lens centre. As the lupe sweeps, the copy
 * counter-moves so the magnified point always tracks the lens centre.
 * Both moves are transforms on the shared GSAP ticker; nothing
 * re-lays out per frame. The copy is `inert` + aria-hidden, so it adds
 * no focus stops and no duplicate content for assistive tech.
 *
 * The sweep pauses while the lupe is off screen and is skipped under
 * prefers-reduced-motion (the lens still magnifies, statically).
 */
export function DioramaLupe({ children }: Props) {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const wrapper = wrapperRef.current;
    const copy = copyRef.current;
    if (!wrapper || !copy) return;

    const state = { p: -SWEEP_VH };
    const render = () => {
      wrapper.style.transform = `translate3d(${state.p}vh, 0, 0)`;
      copy.style.transform = copyTransform(state.p);
    };
    render();
    const tween = gsap.to(state, {
      p: SWEEP_VH,
      duration: SWEEP_S,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      onUpdate: render,
    });

    // No point ticking a loop nobody can see (the diorama is one of
    // seven home sections).
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) tween.resume();
      else tween.pause();
    });
    io.observe(wrapper);

    return () => {
      io.disconnect();
      tween.kill();
      wrapper.style.transform = "";
      copy.style.transform = copyTransform(0);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{
        left: `${WRAP_LEFT_VH}vh`,
        top: `${WRAP_TOP_VH}vh`,
        width: `${WRAP_VH}vh`,
        height: `${WRAP_VH}vh`,
      }}
    >
      {/* Magnified view, clipped to the glass. */}
      <div
        className="absolute overflow-hidden rounded-full bg-paper"
        style={{
          left: `${LENS_OFFSET_VH}vh`,
          top: `${LENS_OFFSET_VH}vh`,
          width: `${LENS_SIZE_VH}vh`,
          height: `${LENS_SIZE_VH}vh`,
        }}
      >
        <div
          ref={copyRef}
          inert
          className="absolute origin-top-left bg-paper"
          style={{
            left: `${-LENS_LEFT_VH}vh`,
            top: `${-LENS_TOP_VH}vh`,
            width: `${TRACK_WIDTH_VH}vh`,
            height: "100vh",
            transform: copyTransform(0),
          }}
        >
          <DioramaIllustration />
          {children}
        </div>
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {/* Glass sheen: a faint tint plus a highlight arc on the upper
            left, so the lens reads as glass over the magnified copy. */}
        <circle cx={LENS_C} cy={LENS_C} r={LENS_R} fill="var(--color-paper-tint)" opacity={0.12} />
        <path
          d={`M ${LENS_C - 40} ${LENS_C - 14} A 42 42 0 0 1 ${LENS_C - 14} ${LENS_C - 40}`}
          fill="none"
          stroke="var(--color-paper-tint)"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.75}
        />
        <circle
          cx={LENS_C}
          cy={LENS_C}
          r={58}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={6}
        />
        {/* Handle, drawn along +x and rotated into place: a short
            ferrule, then a grip whose ends are fully rounded (rx is
            half the height). Everything stays inside the viewBox, so
            nothing gets cut off at the SVG edge. */}
        <g transform={`rotate(35 ${LENS_C} ${LENS_C})`}>
          <rect
            x={LENS_C + 60}
            y={LENS_C - 6}
            width={16}
            height={12}
            rx={3}
            fill="var(--color-ink)"
          />
          <rect
            x={LENS_C + 74}
            y={LENS_C - 9}
            width={56}
            height={18}
            rx={9}
            fill="var(--color-ink)"
          />
          <line
            x1={LENS_C + 82}
            y1={LENS_C - 3}
            x2={LENS_C + 120}
            y2={LENS_C - 3}
            stroke="var(--color-paper-tint)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.45}
          />
        </g>
      </svg>
    </div>
  );
}
