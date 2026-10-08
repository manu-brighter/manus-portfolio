// tests/unit/ink-impulses.spec.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { SimPreset } from "../../src/lib/content/simPresets";
import {
  createInkImpulses,
  INK_IMPULSE_CAPACITY,
  INK_IMPULSE_LIFE_S,
  LITE_BASE_SPLAT_RADIUS,
  liteBloomRadius,
  pushPresetImpulses,
  pushSplatImpulse,
} from "../../src/lib/gl/inkImpulses";
import { INK_PARALLAX } from "../../src/lib/gl/inkSheet";

/**
 * Light's fluidBus impulse buffer: bounded, packed, allocation-free, and
 * reading bus coordinates exactly as FluidSim does (normalised, y up).
 */

const shapeOf = (impulses: ReturnType<typeof createInkImpulses>, i: number) =>
  Array.from(impulses.shape.subarray(i * 4, i * 4 + 4));
const driveOf = (impulses: ReturnType<typeof createInkImpulses>, i: number) =>
  Array.from(impulses.drive.subarray(i * 4, i * 4 + 4));

test("bus splats keep viewport x and anchor y in the sheet's parallax space", () => {
  const impulses = createInkImpulses();
  expect(pushSplatImpulse(impulses, { x: 0.25, y: 0.75, color: "violet", dx: 0.3 }, 2)).toBe(true);
  const [x, y, age, radius] = shapeOf(impulses, 0);
  expect(x).toBeCloseTo(0.25);
  // Same expression as the shader's p.y at the drop moment.
  expect(y).toBeCloseTo(0.75 - 0.5 + 2 * INK_PARALLAX);
  expect(age).toBe(0);
  expect(radius).toBeCloseTo(liteBloomRadius(LITE_BASE_SPLAT_RADIUS));
  const [dx, dy, strength, slot] = driveOf(impulses, 0);
  expect(dx).toBeCloseTo(0.3);
  expect(dy).toBe(0);
  expect(strength).toBeCloseTo(1);
  // Legacy ladder order: mint 0, amber 1, rose 2, violet 3.
  expect(slot).toBe(3);
});

test("zero-dye force splats are ignored and RGB splats map to the nearest spot slot", () => {
  const impulses = createInkImpulses();
  expect(
    pushSplatImpulse(impulses, { x: 0.5, y: 0.5, color: [0, 0, 0], dy: -0.4, radius: 1.2 }, 0),
  ).toBe(false);
  expect(impulses.count).toBe(0);
  expect(pushSplatImpulse(impulses, { x: 0.5, y: 0.5, color: [0.5, 0.9, 0.75] }, 0)).toBe(true);
  expect(driveOf(impulses, 0)[3]).toBe(0);
});

test("preset radius scale and explicit radii size the bloom; wide blooms deposit less", () => {
  const impulses = createInkImpulses();
  pushSplatImpulse(impulses, { x: 0.5, y: 0.5, color: "rose" }, 0, 0.3);
  pushSplatImpulse(impulses, { x: 0.5, y: 0.5, color: "rose" }, 0, 6.5);
  pushSplatImpulse(impulses, { x: 0.5, y: 0.5, color: "rose", radius: 0.004 }, 0, 6.5);
  const tiny = shapeOf(impulses, 0)[3] ?? 0;
  const wide = shapeOf(impulses, 1)[3] ?? 0;
  expect(tiny).toBeLessThan(wide);
  expect(shapeOf(impulses, 2)[3]).toBeCloseTo(liteBloomRadius(0.004));
  // The density damp lives in the shader and must track the reference bloom.
  const frag = readFileSync(
    resolve(__dirname, "../../src/shaders/ink-lite/render.frag.glsl"),
    "utf8",
  );
  expect(liteBloomRadius(LITE_BASE_SPLAT_RADIUS).toFixed(6)).toBe("0.122474");
  expect(frag).toContain("0.122474 / max(shape.w, 0.001)");
  // Strength is the spot weight. Wide Aquarell blooms used to damp it
  // too, and the spot plate then never cleared its threshold.
  expect(driveOf(impulses, 0)[2]).toBeCloseTo(1);
  expect(driveOf(impulses, 1)[2]).toBeCloseTo(1);
});

test("expired blooms leave the packed buffer and the drain uploads exactly once", () => {
  const impulses = createInkImpulses();
  expect(impulses.advance(0.016)).toBe(false);
  pushSplatImpulse(impulses, { x: 0.1, y: 0.1, color: "mint" }, 0);
  impulses.advance(1);
  pushSplatImpulse(impulses, { x: 0.9, y: 0.9, color: "amber" }, 0);
  expect(impulses.advance(INK_IMPULSE_LIFE_S - 0.9)).toBe(true);
  // The older one expired; the younger one moved to the front.
  expect(impulses.count).toBe(1);
  expect(shapeOf(impulses, 0)[0]).toBeCloseTo(0.9);
  expect(impulses.advance(INK_IMPULSE_LIFE_S)).toBe(true);
  expect(impulses.count).toBe(0);
  // Count 0 has been uploaded; idle frames upload nothing after that.
  expect(impulses.advance(INK_IMPULSE_LIFE_S)).toBe(false);
});

test("a full buffer never pops a young bloom, but recycles a mostly faded one", () => {
  const impulses = createInkImpulses();
  for (let i = 0; i < INK_IMPULSE_CAPACITY; i++) {
    expect(pushSplatImpulse(impulses, { x: i / 20, y: 0.5, color: "rose" }, 0)).toBe(true);
    impulses.advance(0.05);
  }
  expect(pushSplatImpulse(impulses, { x: 0.99, y: 0.5, color: "rose" }, 0)).toBe(false);
  impulses.advance(INK_IMPULSE_LIFE_S * 0.92 - 0.05 * (INK_IMPULSE_CAPACITY - 1));
  expect(pushSplatImpulse(impulses, { x: 0.99, y: 0.5, color: "rose" }, 0)).toBe(true);
  expect(impulses.count).toBe(INK_IMPULSE_CAPACITY);
  // The oldest slot (the first push) was recycled.
  expect(shapeOf(impulses, 0)[0]).toBeCloseTo(0.99);
  expect(shapeOf(impulses, 0)[2]).toBe(0);
});

test("a preset switch previews a centred bloom within half the buffer", () => {
  const preset = (physics: object, visuals: object) =>
    ({ physics, visuals }) as unknown as SimPreset;
  const ring = createInkImpulses();
  pushPresetImpulses(ring, preset({ splatRadiusScale: 0.7 }, {}), 0, 16 / 9);
  expect(ring.count).toBe(5);
  expect(shapeOf(ring, 0).slice(0, 2)).toEqual([0.5, 0]);
  const swarm = createInkImpulses();
  pushPresetImpulses(
    swarm,
    preset({ splatRadiusScale: 0.3 }, { splatCount: 7, splatScatter: 0.035 }),
    0,
    16 / 9,
  );
  expect(swarm.count).toBe(7);
  expect(swarm.count).toBeLessThanOrEqual(INK_IMPULSE_CAPACITY / 2);
});

test("the Animation shader compiles with the impulse uniforms", async ({ page }) => {
  const root = resolve(__dirname, "..", "..");
  const read = (path: string) => readFileSync(resolve(root, path), "utf8");
  // Same order as LiteInkScene: ink-sheet is inlined first, then the
  // quiet function it includes. A single replace leaves inkQuiet undefined.
  let fragment = read("src/shaders/ink-lite/render.frag.glsl");
  for (const [name, path] of [
    ["ink-sheet", "src/shaders/common/ink-sheet.glsl"],
    ["ink-quiet", "src/shaders/common/ink-quiet.glsl"],
  ] as const) {
    fragment = fragment.replace(`// #include <${name}>`, read(path));
  }
  await page.goto("about:blank");
  const log = await page.evaluate(
    ({ vertex, fragment: frag }) => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) return "no-webgl2";
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return "createShader failed";
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const info = gl.getShaderInfoLog(shader) ?? "";
        return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? "" : info;
      };
      const vertexLog = compile(gl.VERTEX_SHADER, vertex);
      const fragmentLog = compile(gl.FRAGMENT_SHADER, frag);
      if (!vertexLog && !fragmentLog) {
        const program = gl.createProgram();
        if (!program) return "createProgram failed";
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!vs || !fs) return "createShader failed";
        gl.shaderSource(vs, vertex);
        gl.shaderSource(fs, frag);
        gl.compileShader(vs);
        gl.compileShader(fs);
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        return gl.getProgramParameter(program, gl.LINK_STATUS)
          ? ""
          : (gl.getProgramInfoLog(program) ?? "link failed");
      }
      return [vertexLog, fragmentLog].filter(Boolean).join("\n");
    },
    { vertex: read("src/shaders/common/quad.vert.glsl"), fragment },
  );
  expect(log).toBe("");
});
