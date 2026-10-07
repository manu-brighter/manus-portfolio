// src/lib/gl/inkImpulses.ts

import type { SimPreset } from "@/lib/content/simPresets";
import type { SplatRequest } from "@/lib/fluidBus";
import { INK_PARALLAX } from "@/lib/gl/inkSheet";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";

/**
 * Bounded impulse buffer that lets the analytic Light renderer
 * (LiteInkScene) answer fluidBus splats without a simulation: each bus
 * splat becomes a short-lived ink bloom the shader prints through the
 * theme's own plates (src/shaders/ink-lite/render.frag.glsl).
 *
 * Live impulses stay packed at the front of two preallocated vec4
 * arrays, so the shader loop stops at `count` and an idle page pays
 * nothing. Nothing here allocates per frame.
 */

/** Slots in the uniform arrays. Must equal INK_IMPULSES in render.frag.glsl.
 *  Sized for the shipped storms: `manu.burst()` drops 14 at once, and the
 *  Fehldruck interval (one per 110ms) fills it with the oldest already
 *  past EVICT_AFTER_S, so the storm recycles faded slots without pops. */
export const INK_IMPULSE_CAPACITY = 16;
/** Bloom lifetime in seconds. Must equal INK_IMPULSE_LIFE in the shader. */
export const INK_IMPULSE_LIFE_S = 2.2;
/** A full buffer only evicts an impulse that has mostly faded; a younger
 *  one would visibly pop, so the newcomer is dropped instead. */
const EVICT_AFTER_S = INK_IMPULSE_LIFE_S * 0.6;
/** Full's medium-tier splatRadius. Light has no physics tier, so bus
 *  splats without a radius override bloom at this size. */
export const LITE_BASE_SPLAT_RADIUS = 0.015;
/** Spot -> ladder slot, the legacy uniform order PhotoInkMask also uses. */
const SPOT_SLOT: Record<SpotColor, number> = { mint: 0, amber: 1, rose: 2, violet: 3 };
const SPOT_LENGTH = Math.hypot(...SPOT_RGB.rose);
const SPOT_ENTRIES = Object.entries(SPOT_RGB) as [SpotColor, readonly [number, number, number]][];

export type InkImpulses = {
  /** Per impulse: x (viewport UV), y (sheet-anchored, see push), age (s), radius (height units). */
  readonly shape: Float32Array;
  /** Per impulse: dx, dy (fluidBus velocity), strength, ladder slot. */
  readonly drive: Float32Array;
  /** Live impulses, packed at the front of both arrays. */
  readonly count: number;
  /**
   * Queue a bloom. `x`/`y` are viewport UV with y up (the fluidBus
   * convention); `scroll` is the renderer's smoothed scroll in viewport
   * heights. The y anchor is stored in sheet space, so the bloom rides
   * the sheet's INK_PARALLAX drift like the ink around it.
   */
  push: (
    x: number,
    y: number,
    scroll: number,
    dx: number,
    dy: number,
    strength: number,
    slot: number,
    radius: number,
  ) => boolean;
  /** Advance every age by `dt` seconds and drop expired blooms. Returns
   *  true when the uniforms need an upload (something is or was alive). */
  advance: (dt: number) => boolean;
  clear: () => void;
};

export function createInkImpulses(): InkImpulses {
  const shape = new Float32Array(INK_IMPULSE_CAPACITY * 4);
  const drive = new Float32Array(INK_IMPULSE_CAPACITY * 4);
  let count = 0;
  let dirty = false;

  const copy = (from: number, to: number) => {
    shape.copyWithin(to * 4, from * 4, from * 4 + 4);
    drive.copyWithin(to * 4, from * 4, from * 4 + 4);
  };

  return {
    shape,
    drive,
    get count() {
      return count;
    },
    push: (x, y, scroll, dx, dy, strength, slot, radius) => {
      if (!(strength > 0) || !Number.isFinite(x + y + scroll + dx + dy + radius)) return false;
      let index = count;
      if (count === INK_IMPULSE_CAPACITY) {
        index = 0;
        for (let i = 1; i < count; i++) {
          if ((shape[i * 4 + 2] ?? 0) > (shape[index * 4 + 2] ?? 0)) index = i;
        }
        if ((shape[index * 4 + 2] ?? 0) < EVICT_AFTER_S) return false;
      } else {
        count++;
      }
      const o = index * 4;
      shape[o] = x;
      shape[o + 1] = y - 0.5 + scroll * INK_PARALLAX;
      shape[o + 2] = 0;
      shape[o + 3] = radius;
      drive[o] = dx;
      drive[o + 1] = dy;
      drive[o + 2] = strength;
      drive[o + 3] = slot;
      dirty = true;
      return true;
    },
    advance: (dt) => {
      const upload = dirty || count > 0;
      dirty = false;
      for (let i = 0; i < count; i++) {
        const age = (shape[i * 4 + 2] ?? 0) + dt;
        shape[i * 4 + 2] = age;
        if (age >= INK_IMPULSE_LIFE_S) {
          count--;
          if (i !== count) copy(count, i);
          i--;
        }
      }
      return upload;
    },
    clear: () => {
      dirty = dirty || count > 0;
      count = 0;
    },
  };
}

/** Light bloom radius (height units) for a Full splat radius (the
 *  Gaussian denominator in splat.frag.glsl, so its e-fold is the sqrt). */
export function liteBloomRadius(splatRadius: number): number {
  return Math.min(0.42, Math.max(0.04, Math.sqrt(Math.max(0, splatRadius))));
}

const BASE_BLOOM_RADIUS = liteBloomRadius(LITE_BASE_SPLAT_RADIUS);

/** Wide blooms deposit less ink per area, the way Full's lower Aquarell
 *  dyeScale offsets its huge splats: without it one card hover floods the
 *  viewport into the top plate. Small blooms keep full strength. */
function wideBloomDamping(radius: number): number {
  return Math.min(1, BASE_BLOOM_RADIUS / radius);
}

/**
 * Translate a fluidBus request into an impulse, read exactly as
 * FluidSim reads it: x/y normalised to the fixed full-viewport canvas,
 * y measured from the bottom. Zero-dye requests (ScrollInkCoupling's
 * invisible force field) are ignored: Light already drifts its sheet
 * against the scroll, a second push would double it.
 * `radiusScale` is the active preset's splatRadiusScale: Full scales its
 * default splat radius by it (applySimPreset), so bus splats without an
 * explicit radius stay tiny under Turbulenz and bloom wide under Aquarell.
 */
export function pushSplatImpulse(
  impulses: InkImpulses,
  req: SplatRequest,
  scroll: number,
  radiusScale = 1,
): boolean {
  let slot = 3;
  let strength = 1;
  if (typeof req.color === "string") {
    slot = SPOT_SLOT[req.color];
  } else {
    const [r, g, b] = req.color;
    strength = Math.min(1.2, Math.hypot(r, g, b) / SPOT_LENGTH);
    if (strength < 0.05) return false;
    let best = Number.POSITIVE_INFINITY;
    for (const [spot, rgb] of SPOT_ENTRIES) {
      const distance = (rgb[0] - r) ** 2 + (rgb[1] - g) ** 2 + (rgb[2] - b) ** 2;
      if (distance < best) {
        best = distance;
        slot = SPOT_SLOT[spot];
      }
    }
  }
  const radius = liteBloomRadius(req.radius ?? LITE_BASE_SPLAT_RADIUS * radiusScale);
  return impulses.push(
    req.x,
    req.y,
    scroll,
    req.dx ?? 0,
    req.dy ?? 0,
    strength * wideBloomDamping(radius),
    slot,
    radius,
  );
}

/**
 * Centred preview bloom on a live preset switch, the Light counterpart
 * of Full's firePresetBurst: the radius carries the preset's
 * splatRadiusScale (tiny Turbulenz droplets, a broad Aquarell wash) and
 * swarm presets scatter a droplet cloud instead of one ring. Stays within
 * half the buffer so a switch never evicts a storm.
 */
export function pushPresetImpulses(
  impulses: InkImpulses,
  preset: SimPreset,
  scroll: number,
  aspect: number,
): void {
  // Offsets are laid out in height units; x is divided back into UV.
  const ax = 1 / Math.max(0.1, aspect);
  const scale = preset.physics.splatRadiusScale ?? 1;
  const splatCount = preset.visuals.splatCount ?? 1;
  const scatter = preset.visuals.splatScatter ?? 0;
  if (splatCount > 1) {
    const radius = liteBloomRadius(LITE_BASE_SPLAT_RADIUS * scale);
    for (let i = 0; i < 7; i++) {
      // Golden-angle spiral: an even cloud without a visible ring.
      const angle = i * 2.39996;
      const spread = Math.max(0.04, scatter * 6) * Math.sqrt((i + 0.5) / 7) * 1.6;
      impulses.push(
        0.5 + Math.cos(angle) * spread * ax,
        0.5 + Math.sin(angle) * spread,
        scroll,
        Math.cos(angle) * 1.2,
        Math.sin(angle) * 1.2,
        wideBloomDamping(radius),
        i % 4,
        radius,
      );
    }
    return;
  }
  const radius = liteBloomRadius(LITE_BASE_SPLAT_RADIUS * scale * 1.2);
  const damping = wideBloomDamping(radius);
  impulses.push(0.5, 0.5, scroll, 0, 0, 1.15 * damping, 3, radius * 1.25);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    impulses.push(
      0.5 + Math.cos(angle) * radius * 0.6 * ax,
      0.5 + Math.sin(angle) * radius * 0.6,
      scroll,
      Math.cos(angle) * 1.2,
      Math.sin(angle) * 1.2,
      0.9 * damping,
      i,
      radius,
    );
  }
}
