"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useCursorHostStore } from "@/lib/cursorHostStore";
import { capDPR } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";

/**
 * InkCursor — the cursor IS an ink stroke.
 *
 * The native cursor is hidden site-wide while this is active
 * (`html[data-ink-cursor] * { cursor: none }` in globals.css — user
 * decision: only the ink cursor should be visible), replaced by a
 * head dot that hugs the pointer tightly plus a continuous tapering
 * trail.
 *
 * Trail rendering: a single FILLED variable-width curved ribbon around the
 * smoothed pointer history — per-point normals offset by half the
 * tapered width, one `fill()` per frame. One fill means no
 * overlapping segment caps, which is what made the v2 stroke-per-
 * segment approach read as "dots connected by lines" (user feedback).
 * Coordinates are canvas-rect-relative (not raw client coords), which
 * kills the offset users saw when the fixed canvas didn't sit exactly
 * at the viewport origin.
 *
 * Color comes from the canvas' computed `color`, driven by the
 * `--color-ink-cursor` token (per-theme accent overrides in
 * globals.css) so dot + trail re-tint live with the sim theme;
 * `.ink-cursor-layer` overrides the blend per theme, and color +
 * blend are ONE decision: night's light ink would multiply to black,
 * so it screens (dark-mode highlight); warm keeps a dark ink but goes
 * `normal`, because multiply can only darken and its sim paints
 * near-black right under the pointer.
 *
 * Trail sampling rides the shared RAF (`subscribe`), the head dot
 * rides gsap.quickTo on gsap.ticker — same frame, one clock.
 *
 * Both layers live in one `display: contents` container that MOVES
 * into `cursorHostStore.host` while a modal owns the browser's top
 * layer (case-study lightbox): z-index cannot beat the top layer, so
 * the cursor has to join it. Moving the container instead of
 * re-pointing the portal is what keeps the canvas bitmap, the trail
 * history and the RAF subscription alive across the move, so the
 * stroke stays continuous through open and close.
 *
 * Not mounted on coarse pointers or under reduced motion (both also
 * skip the cursor-hiding attribute, so the native cursor stays).
 */

const DOT_SIZE_PX = 10;
const DOWN_SCALE = 1.6;
/** Over interactive elements the head swells and thins — ink
 *  spreading toward the thing you can press. */
const HOVER_SCALE = 2.4;
const HOVER_OPACITY = 0.8;
const INTERACTIVE_SELECTOR = "a, button, label, input, textarea, select, [role='button']";

/** Trail history length (samples at ~60Hz ≈ 400ms of movement). */
const TRAIL_SAMPLES = 26;
const TRAIL_LIFETIME_MS = 320;
/** Stroke width at the head end (tapers to 0 at the tail). */
const TRAIL_WIDTH_PX = 8;
/** Fill alpha — single fill, so this is the exact on-screen alpha. */
const TRAIL_ALPHA = 0.5;
/** Pointer-chase smoothing factor per 16ms frame. */
const CHASE = 0.35;
/** Head dot lag — near-instant since it replaces the native cursor. */
const HEAD_LAG_S = 0.08;

type Point = { x: number; y: number };
type Sample = Point & { time: number };

/** Quadratic midpoints keep the ribbon tangent continuous at sparse samples. */
function curveThrough(ctx: CanvasRenderingContext2D, points: Point[]) {
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i] as Point;
    const next = points[i + 1] as Point;
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  const last = points[points.length - 1] as Point;
  ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
}

export function InkCursor() {
  const reducedMotion = useReducedMotion();
  const { inkUnavailable } = useScene();
  const coarsePointer = useCoarsePointer();
  const host = useCursorHostStore((s) => s.host);
  const dotRef = useRef<HTMLDivElement>(null);
  const nibRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Stable portal container. Created once, then MOVED between <body>
   *  and the top-layer host. Portalling straight into `host` would
   *  change the portal container, which remounts both layers — a fresh
   *  (blank) canvas bitmap, an empty trail array and a re-subscribed
   *  RAF on every lightbox open and close. Moving one container the
   *  layers never leave keeps all of that alive; `display: contents`
   *  generates no box, so the fixed children resolve against the
   *  viewport and join the host's stacking context exactly as if they
   *  were its own children.
   *
   *  Created in an effect, not in a `useState` initializer: a
   *  `typeof document === "undefined"` branch in render is exactly the
   *  server/client split React rejects, and it threw a hydration
   *  mismatch on the whole tree. Server and first client render both
   *  produce null here; the portal appears on the second render. */
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.display = "contents";
    setPortalHost(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    if (!portalHost) return;
    (host ?? document.body).appendChild(portalHost);
  }, [host, portalHost]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(portalHost): deliberate re-run trigger — the layer refs are null until the portal container exists, so this effect must re-run once it does
  useEffect(() => {
    // Guard inside the effect (not only via the null render) so a
    // mid-session preference flip re-runs cleanup, detaches the
    // document listeners and restores the native cursor.
    if (reducedMotion || inkUnavailable || coarsePointer) return;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    const nib = nibRef.current;
    if (!dot || !canvas || !nib) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hide the native cursor while the ink cursor is alive.
    document.documentElement.setAttribute("data-ink-cursor", "");

    // --- canvas sizing -------------------------------------------------
    const dpr = capDPR(1.5);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      // Explicit CSS size so backing-store scale is exactly `dpr`
      // regardless of how inset-0 resolves.
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // --- head dot ------------------------------------------------------
    gsap.set(dot, {
      xPercent: -50,
      yPercent: -50,
      x: -100,
      y: -100,
      scale: 1,
      opacity: 0,
    });
    const xTo = gsap.quickTo(dot, "x", { duration: HEAD_LAG_S, ease: "power2.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: HEAD_LAG_S, ease: "power2.out" });

    let shown = false;
    let overInteractive = false;
    const restScale = () => (overInteractive ? HOVER_SCALE : 1);
    const restOpacity = () => (overInteractive ? HOVER_OPACITY : 1);

    // --- trail state ---------------------------------------------------
    const target: Point = { x: -100, y: -100 };
    const smooth: Point = { x: -100, y: -100 };
    const trail: Sample[] = [];
    let stretch = 1;
    let angle = 0;
    let trailPainted = false;
    let color = getComputedStyle(canvas).color;
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sim-theme"],
    });

    const onMove = (event: PointerEvent) => {
      // Rect-relative coordinates: immune to any offset between the
      // fixed canvas box and the viewport origin.
      const rect = canvas.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
      if (!shown) {
        // First move: snap everything to position before fading in so
        // nothing streaks across from the parking spot.
        shown = true;
        smooth.x = target.x;
        smooth.y = target.y;
        trail.length = 0;
        gsap.set(dot, { x: event.clientX, y: event.clientY });
        gsap.to(dot, { opacity: restOpacity(), duration: 0.3, ease: "power2.out" });
      }
      xTo(event.clientX);
      yTo(event.clientY);
    };
    // Swell + thin over anything pressable. pointerover bubbles from
    // the real target, so a closest() check per boundary-cross is
    // enough (no per-move cost).
    const onOver = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const next = Boolean(el?.closest(INTERACTIVE_SELECTOR));
      if (next === overInteractive) return;
      overInteractive = next;
      nib.style.background = next ? "transparent" : "var(--color-ink-cursor)";
      nib.style.boxShadow = next ? "inset 0 0 0 1px var(--color-ink-cursor)" : "none";
      gsap.to(dot, {
        scale: restScale(),
        opacity: shown ? restOpacity() : 0,
        duration: 0.25,
        ease: "power2.out",
      });
    };
    const onDown = () => {
      gsap.to(dot, { scale: DOWN_SCALE, duration: 0.18, ease: "power2.out" });
    };
    const onUp = () => {
      gsap.to(dot, { scale: restScale(), duration: 0.3, ease: "power2.out" });
    };
    const onLeave = () => {
      shown = false;
      trail.length = 0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      trailPainted = false;
      gsap.to(dot, { opacity: 0, duration: 0.2, ease: "power2.out" });
    };

    // --- trail render (shared RAF) --------------------------------------
    const unsubscribe = subscribe((deltaMs) => {
      if (document.hidden || !shown) return;

      // Frame-rate-independent chase toward the pointer.
      const dt = Math.min(deltaMs, 50);
      const k = 1 - (1 - CHASE) ** (dt / 16.67);
      const dx = (target.x - smooth.x) * k;
      const dy = (target.y - smooth.y) * k;
      smooth.x += dx;
      smooth.y += dy;
      const distance = Math.hypot(dx, dy);
      const now = performance.now();
      if (distance > 0.15) trail.push({ x: smooth.x, y: smooth.y, time: now });
      // Keep enough geometry for a curve even when slow frames are farther
      // apart than its fade time. Old anchors have zero width below; they
      // cannot keep a stationary trail alive after its last sample expires.
      if (trail.length && now - (trail[trail.length - 1] as Sample).time > TRAIL_LIFETIME_MS) {
        trail.length = 0;
      }
      while (trail.length > 3 && now - (trail[0] as Sample).time > TRAIL_LIFETIME_MS) trail.shift();
      if (trail.length > TRAIL_SAMPLES) trail.shift();

      // A small liquid nib stretches into a stroke, returning to a precise
      // ring over controls. It shares the existing clock and needs no GL pass.
      const targetStretch = overInteractive
        ? 1
        : 1 + Math.min(distance / Math.max(dt, 1), 2) * 0.32;
      stretch += (targetStretch - stretch) * k;
      if (distance > 0.3) angle = Math.atan2(dy, dx);
      nib.style.transform = `rotate(${angle}rad) scale(${stretch}, ${1 / stretch})`;

      const n = trail.length;
      // After the tail fades, an idle cursor needs no full-canvas clearing.
      if (n < 3) {
        if (trailPainted) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        trailPainted = false;
        return;
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Offset both sides along local normals, then curve through them.
      // Age-based fading avoids the last samples bunching into visible beads.
      const left: Point[] = [];
      const right: Point[] = [];
      for (let i = 0; i < n; i++) {
        // Safe: indices are clamped into 0..n-1
        const point = trail[i] as Point;
        const prev = trail[Math.max(0, i - 1)] as Point;
        const next = trail[Math.min(n - 1, i + 1)] as Point;
        let dx = next.x - prev.x;
        let dy = next.y - prev.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.0001) {
          dx = 1;
          dy = 0;
        } else {
          dx /= len;
          dy /= len;
        }
        const t = i / (n - 1);
        const age = Math.max(0, 1 - (now - (point as Sample).time) / TRAIL_LIFETIME_MS);
        const half = (TRAIL_WIDTH_PX * t * t * age) / 2;
        left.push({ x: point.x - dy * half, y: point.y + dx * half });
        right.push({ x: point.x + dy * half, y: point.y - dx * half });
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = TRAIL_ALPHA;
      ctx.beginPath();
      const start = left[0] as Point;
      ctx.moveTo(start.x, start.y);
      curveThrough(ctx, left);
      const head = trail[n - 1] as Point;
      const opposite = right[n - 1] as Point;
      ctx.quadraticCurveTo(head.x + dx * 0.2, head.y + dy * 0.2, opposite.x, opposite.y);
      curveThrough(ctx, right.reverse());
      ctx.closePath();
      ctx.fill();
      trailPainted = true;
      ctx.globalAlpha = 1;
    }, 40);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      document.documentElement.removeAttribute("data-ink-cursor");
      unsubscribe();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(dot);
    };
    // `portalHost` goes null -> element exactly once (the effect above,
    // on mount) and the layer refs only exist after it does. It is NOT
    // the host swap — that moves the container without remounting, so
    // this effect and everything it owns survive an open/close.
  }, [reducedMotion, inkUnavailable, coarsePointer, portalHost]);

  if (reducedMotion || inkUnavailable || coarsePointer || !portalHost) return null;

  const layers = (
    <>
      {/* z-[10001]: above EVERYTHING incl. Nav (50), Loader (9999) and
          InkWipeOverlay (10000) — the native cursor is hidden, so this
          IS the cursor and must never disappear behind chrome. Beats
          everything except the top layer, which is what `host` is for.
          pointer-events-none + multiply/screen blend keep it from
          obscuring anything meaningfully. Inside a host the blend
          group is that element, whose background is transparent — so
          ink multiplies onto the photo but paints at full strength
          over the empty backdrop area. That is deliberate: this is the
          cursor, it has to stay findable. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="ink-cursor-layer pointer-events-none fixed top-0 left-0 z-[10001] hidden mix-blend-multiply md:block"
        style={{ color: "var(--color-ink-cursor)" }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="ink-cursor-layer pointer-events-none fixed top-0 left-0 z-[10001] hidden rounded-full mix-blend-multiply md:block"
        style={{
          width: DOT_SIZE_PX,
          height: DOT_SIZE_PX,
        }}
      >
        <span
          ref={nibRef}
          className="block size-full rounded-full"
          style={{ background: "var(--color-ink-cursor)" }}
        />
      </div>
    </>
  );

  return createPortal(layers, portalHost);
}
