"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SpotColor } from "@/lib/palette";

/**
 * Mobile-Diorama decorations — the illustrated "desk" flair from the Desktop
 * Diorama (DioramaIllustration / DioramaLupe), re-cut into small standalone
 * SVG props that can be scattered into the mobile carousel slides' empty
 * space: camera, hot-shoe flash, pencil, ruler, coffee mug, ink splats,
 * comic table-edge lines, and the animated magnifier (Lupe).
 *
 * All are `aria-hidden`, `pointer-events-none`, absolutely positioned by the
 * caller. Geometry is lifted verbatim from DioramaIllustration so the look
 * matches the Desktop scene exactly.
 */

const SPOT_VAR: Record<SpotColor, string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

type PropProps = { className?: string; style?: React.CSSProperties };

/** Sony α7-style camera, top-down (rose lens). */
export function CameraProp({ className, style }: PropProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 142" className={className} style={style} fill="none">
      <rect
        x={5}
        y={28}
        width={190}
        height={108}
        rx={8}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <rect
        x={60}
        y={2}
        width={80}
        height={28}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <circle cx={100} cy={84} r={38} fill="none" stroke="var(--color-ink)" strokeWidth={3} />
      <circle cx={100} cy={84} r={24} fill="var(--color-spot-rose)" opacity={0.5} />
      <circle cx={100} cy={84} r={14} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={171} cy={42} r={5} fill="var(--color-ink)" />
    </svg>
  );
}

/** Hot-shoe flash, top-down. */
export function FlashProp({ className, style }: PropProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 96 140" className={className} style={style} fill="none">
      <rect
        x={3}
        y={3}
        width={90}
        height={55}
        rx={3}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <rect
        x={11}
        y={11}
        width={74}
        height={39}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      <line
        x1={23}
        y1={17}
        x2={23}
        y2={45}
        stroke="var(--color-ink)"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <line
        x1={43}
        y1={17}
        x2={43}
        y2={45}
        stroke="var(--color-ink)"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <line
        x1={63}
        y1={17}
        x2={63}
        y2={45}
        stroke="var(--color-ink)"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <rect
        x={25}
        y={58}
        width={46}
        height={70}
        rx={3}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <rect x={35} y={128} width={26} height={10} fill="var(--color-ink)" />
      <circle cx={48} cy={88} r={7} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
    </svg>
  );
}

/** Amber pencil. */
export function PencilProp({ className, style }: PropProps) {
  return (
    <svg aria-hidden="true" viewBox="-18 -2 222 18" className={className} style={style} fill="none">
      <rect
        x={0}
        y={0}
        width={180}
        height={14}
        fill="var(--color-spot-amber)"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      <polygon points="180,0 200,7 180,14" fill="var(--color-ink)" />
      <rect x={-15} y={0} width={15} height={14} fill="var(--color-ink)" />
    </svg>
  );
}

/** Ruler with tick marks. */
export function RulerProp({ className, style }: PropProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 222 24" className={className} style={style} fill="none">
      <rect
        x={1}
        y={1}
        width={220}
        height={22}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <g stroke="var(--color-ink)" strokeWidth={1}>
        <line x1={21} y1={1} x2={21} y2={15} />
        <line x1={41} y1={1} x2={41} y2={9} />
        <line x1={61} y1={1} x2={61} y2={15} />
        <line x1={81} y1={1} x2={81} y2={9} />
        <line x1={101} y1={1} x2={101} y2={15} />
        <line x1={121} y1={1} x2={121} y2={9} />
        <line x1={141} y1={1} x2={141} y2={15} />
        <line x1={161} y1={1} x2={161} y2={9} />
        <line x1={181} y1={1} x2={181} y2={15} />
        <line x1={201} y1={1} x2={201} y2={9} />
      </g>
    </svg>
  );
}

/** Coffee mug, top-down. */
export function CoffeeProp({ className, style }: PropProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-28 -28 246 216"
      className={className}
      style={style}
      fill="none"
    >
      <circle
        cx={80}
        cy={80}
        r={105}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <circle
        cx={80}
        cy={80}
        r={75}
        fill="var(--color-paper-shade)"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      <circle cx={80} cy={80} r={60} fill="#5a3a22" />
      <ellipse cx={65} cy={65} rx={25} ry={15} fill="#7a5a3a" opacity={0.5} />
      <path
        d="M 155 80 Q 195 80, 195 50 L 195 30"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
    </svg>
  );
}

/** A single Riso ink splat (decorative). */
export function InkSplat({ color, className, style }: { color: SpotColor } & PropProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 70" className={className} style={style}>
      <ellipse
        cx={50}
        cy={42}
        rx={38}
        ry={22}
        fill={SPOT_VAR[color]}
        opacity={0.55}
        transform="rotate(-12 50 42)"
      />
      <circle cx={78} cy={20} r={5} fill={SPOT_VAR[color]} opacity={0.7} />
      <circle cx={20} cy={56} r={3} fill={SPOT_VAR[color]} opacity={0.6} />
    </svg>
  );
}

/** Hand-drawn comic table-edge line (one wavy stroke, full width). */
export function TableLine({ className, style }: PropProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={className}
      style={style}
      fill="none"
    >
      <path
        d="M 4 6 Q 60 2, 120 7 Q 180 11, 240 5 Q 300 1, 360 7 L 396 6"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Animated magnifier (Lupe) — mobile variant of DioramaLupe. Gentle
 * horizontal sweep on a sine loop; suppressed under reduced-motion.
 */
export function MobileLupe({ className, style }: PropProps) {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const w = wrapperRef.current;
    if (!w) return;
    const tween = gsap.fromTo(
      w,
      { x: "-12%", rotate: -4 },
      { x: "12%", rotate: 4, duration: 5, ease: "sine.inOut", yoyo: true, repeat: -1 },
    );
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <div ref={wrapperRef} aria-hidden="true" className={className} style={style}>
      <svg aria-hidden="true" viewBox="0 0 155 155" className="h-full w-full">
        <g transform="rotate(-12 72 72)">
          <circle cx={60} cy={60} r={55} fill="none" stroke="var(--color-ink)" strokeWidth={4} />
          <circle
            cx={60}
            cy={60}
            r={44}
            fill="var(--color-paper-tint)"
            opacity={0.4}
            stroke="var(--color-ink)"
            strokeWidth={1}
          />
          <line
            x1={100}
            y1={100}
            x2={142}
            y2={142}
            stroke="var(--color-ink)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx={146} cy={146} r={5} fill="var(--color-ink)" />
        </g>
      </svg>
    </div>
  );
}
