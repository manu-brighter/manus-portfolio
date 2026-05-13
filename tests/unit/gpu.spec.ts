// tests/unit/gpu.spec.ts
import { expect, test } from "@playwright/test";

/**
 * F-testing-coverage-10: GPU tier detection — pure-function coverage.
 *
 * `tierFromFrametime` and `matchRenderer` are pure TypeScript functions
 * with no browser dependencies. We import them directly and run them as
 * node-only Playwright tests (same pattern as tests/i18n/key-parity.spec.ts).
 *
 * CLAUDE.md hard constraint: "Iris Xe is a supported target — no regression
 * that drops Low tier below 40fps." `matchRenderer("Intel(R) Iris(R) Xe
 * Graphics") -> "low"` is the regression guard.
 *
 * Thresholds verified against src/lib/gpu.ts:
 *   medianMs < 8    → "high"
 *   medianMs < 14   → "medium"
 *   medianMs < 22   → "low"
 *   otherwise       → "minimal"
 */

// Import the compiled output through a dynamic require so this stays
// node-only (no browser fixture needed). We read the source path and
// parse out the exported functions using node:vm to avoid adding a
// ts-node/tsx dep. However, since Playwright can run TS files directly
// via its built-in transpilation (same mechanism as key-parity.spec.ts),
// we import the source file directly.

// Playwright's test runner transpiles TS on the fly — direct TS import works.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gpu = require("../../src/lib/gpu") as {
  tierFromFrametime: (medianMs: number) => string;
  matchRenderer: (renderer: string) => string | null;
  getCachedTier: () => string | null;
  cacheTier: (tier: string) => void;
  probeGPU: (gl: WebGL2RenderingContext) => unknown;
};

test.describe("gpu.ts — tierFromFrametime thresholds", () => {
  test("7ms (< 8) → 'high'", () => {
    expect(gpu.tierFromFrametime(7)).toBe("high");
  });

  test("7.99ms (< 8) → 'high'", () => {
    expect(gpu.tierFromFrametime(7.99)).toBe("high");
  });

  test("8ms (>= 8, < 14) → 'medium'", () => {
    expect(gpu.tierFromFrametime(8)).toBe("medium");
  });

  test("13ms (< 14) → 'medium'", () => {
    expect(gpu.tierFromFrametime(13)).toBe("medium");
  });

  test("14ms (>= 14, < 22) → 'low'", () => {
    expect(gpu.tierFromFrametime(14)).toBe("low");
  });

  test("20ms (< 22) → 'low'", () => {
    expect(gpu.tierFromFrametime(20)).toBe("low");
  });

  test("22ms (>= 22) → 'minimal'", () => {
    expect(gpu.tierFromFrametime(22)).toBe("minimal");
  });

  test("30ms → 'minimal'", () => {
    expect(gpu.tierFromFrametime(30)).toBe("minimal");
  });

  test("100ms → 'minimal'", () => {
    expect(gpu.tierFromFrametime(100)).toBe("minimal");
  });
});

test.describe("gpu.ts — matchRenderer pattern matching", () => {
  // CLAUDE.md hard constraint: Iris Xe must resolve to "low".
  test("Intel(R) Iris(R) Xe Graphics → 'low' [HARD CONSTRAINT]", () => {
    expect(gpu.matchRenderer("Intel(R) Iris(R) Xe Graphics")).toBe("low");
  });

  test("ANGLE (Intel(R) Iris(R) Xe Graphics) — ANGLE-wrapped name → 'low'", () => {
    // Windows ANGLE wraps the renderer string — both forms must match.
    expect(gpu.matchRenderer("ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)")).toBe("low");
  });

  test("iris plus → 'low'", () => {
    expect(gpu.matchRenderer("Intel UHD Graphics 620 (Iris Plus)")).toBe("low");
  });

  test("RTX series → 'high'", () => {
    expect(gpu.matchRenderer("NVIDIA GeForce RTX 3080")).toBe("high");
  });

  test("RTX 4090 → 'high'", () => {
    expect(gpu.matchRenderer("NVIDIA GeForce RTX 4090")).toBe("high");
  });

  test("Apple M3 → 'high'", () => {
    expect(gpu.matchRenderer("Apple M3")).toBe("high");
  });

  test("Mali-G → 'minimal'", () => {
    expect(gpu.matchRenderer("Mali-G78 MP22")).toBe("minimal");
  });

  test("Adreno 530 → 'minimal'", () => {
    expect(gpu.matchRenderer("Adreno (TM) 530")).toBe("minimal");
  });

  test("unknown renderer string → null (no match)", () => {
    expect(gpu.matchRenderer("Some Unknown GPU Vendor XYZ")).toBeNull();
  });

  test("empty string → null", () => {
    expect(gpu.matchRenderer("")).toBeNull();
  });
});
