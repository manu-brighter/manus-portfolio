// tests/unit/fluidOrchestrator.spec.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * SF-3 — FluidOrchestrator factory + multi-instance smoke.
 *
 * Pre-work for the Mobile Rework (see
 * `docs/superpowers/specs/2026-05-20-mobile-rework-design.md` §3.3): the
 * mobile branch will mount three independent orchestrator instances
 * (Hero, Case-Study, Photography), so cross-talk between instances is a
 * fatal regression. This spec exercises:
 *   - Static guards (factory export, no `!` definite-assignment-asserts
 *     remaining) via source-level introspection. Cheap, no browser
 *     fixture needed, and survives the lack of WebGL2 in pure-node
 *     environments.
 *   - Live two-instance behaviour via the dev server: navigate to a
 *     page that simultaneously hosts the Hero FluidSim and the
 *     Playground InkDropMiniSims, then assert no console / page errors
 *     surfaced during steady-state RAF.
 *
 * Skip path: set HAS_WEBGL=0 to opt out of the live-instance test if
 * running in an environment without working WebGL2 (very old SwiftShader
 * builds, headless containers without EXT_color_buffer_float). The
 * source-level assertions still run.
 */

const ROOT = resolve(__dirname, "..", "..");
const ORCHESTRATOR_PATH = resolve(ROOT, "src/lib/gl/fluidOrchestrator.ts");

test.describe("FluidOrchestrator — source-level invariants", () => {
  // These three checks are the structural acceptance criteria from the
  // SF-3 brief. They live as source-level regex matches because the
  // orchestrator module imports `.glsl` raw strings via webpack /
  // turbopack `asset/source` — which the Playwright node transpiler
  // does not apply, so a direct `require()` of the module at this layer
  // would fail. Source-level scanning catches the regressions the brief
  // cares about (lost factory export, smuggled-back assertion patterns)
  // without needing the GLSL pipeline.

  test("exports both `class FluidOrchestrator` and `createFluidOrchestrator` factory", () => {
    const src = readFileSync(ORCHESTRATOR_PATH, "utf8");
    expect(src).toMatch(/export\s+class\s+FluidOrchestrator\b/);
    expect(src).toMatch(/export\s+function\s+createFluidOrchestrator\s*\(/);
  });

  test("no `!`-definite-assignment-assertion fields remain on the class", () => {
    // Pattern `private name!:` (or `protected/public name!:`). Comments
    // referring to the historical assertions are filtered out.
    const src = readFileSync(ORCHESTRATOR_PATH, "utf8");
    const lines = src.split("\n");
    const offenders: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip pure comment lines so the historical context block doesn't
      // false-positive.
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        continue;
      }
      // Match `private gl!: WebGL2RenderingContext;` style class-field
      // definite-assignment-assertions.
      if (/^\s*(?:private|protected|public)\s+\w+!\s*:/.test(line)) {
        offenders.push(trimmed);
      }
    }
    expect(offenders, `Found non-null-assertion class fields: ${offenders.join(" | ")}`).toEqual(
      [],
    );
  });

  test("no `state!.` non-null-assertions on the state handle in source", () => {
    // The SF-3 refactor pattern is `requireState()` everywhere instead
    // of `this.state!.foo`. Catch accidental backslide.
    const src = readFileSync(ORCHESTRATOR_PATH, "utf8");
    const lines = src.split("\n");
    const offenders: string[] = [];
    for (const [i, line] of lines.entries()) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        continue;
      }
      if (/\bstate!\./.test(line)) {
        offenders.push(`L${i + 1}: ${trimmed}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("public API surface is preserved (all SF-3 contract methods present)", () => {
    const src = readFileSync(ORCHESTRATOR_PATH, "utf8");
    // The SF-3 brief lists these as the public API that MUST be preserved.
    const requiredMethods = [
      "init",
      "step",
      "injectSplat",
      "triggerAmbient",
      "start",
      "pause",
      "isStarted",
      "setPointerSplatEnabled",
      "resize",
      "dispose",
    ];
    const missing = requiredMethods.filter((m) => {
      // Match `methodName(` as a method definition or call site.
      const pattern = new RegExp(`\\b${m}\\s*\\(`);
      return !pattern.test(src);
    });
    expect(
      missing,
      `Missing public-API methods on FluidOrchestrator: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

test.describe("FluidOrchestrator — live multi-instance smoke", () => {
  test.skip(
    process.env.HAS_WEBGL === "0",
    "HAS_WEBGL=0 set — skipping browser-fixture orchestrator tests",
  );

  test("two orchestrator instances coexist on home (hero + mini-sim)", async ({ page }) => {
    // Multi-instance contract: Mobile-Rework Phase 3-5 will mount three
    // concurrent orchestrators (Hero scroll-attached, Photography swiper,
    // Case-Study scrolly). This test asserts the existing Home page
    // already runs at least 2 orchestrators (Hero FluidSim + a Playground
    // mini-sim activated via focus) without cross-talk crashes — a
    // strict subset of the Mobile-Rework guarantee that we can verify
    // pre-Mobile-Rework.
    //
    // What "cross-talk" looks like if it regresses:
    //   - INVALID_OPERATION GL errors from a shared FBO/texture handle
    //   - dispose-during-active-step exceptions surfaced as pageerror
    //   - Module-level singleton mutations that survive instance bounds
    // All would surface as page.on('pageerror') or console errors.
    //
    // What this test does NOT cover:
    //   - True state-isolation between instances (would require a
    //     window-side getter on each orchestrator, which we don't want
    //     in prod). The coexistence + steady-state-no-error test is the
    //     practical regression net without dev instrumentation.

    const errors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    // Hero FluidSim mounts via SceneProvider — its canvas should be in
    // the DOM after networkidle. Single-canvas baseline.
    const heroOnly = await page.locator("canvas").count();
    expect(heroOnly, "hero FluidSim canvas should be mounted").toBeGreaterThanOrEqual(1);

    // Scroll Playground into view, then focus a card to activate its
    // InkDropMiniSim. Per CLAUDE.md "Mini-sims on cards stay paused
    // after first hover/focus" — focus triggers the mount, hover would
    // too but focus is more reliable in headless runs.
    await page.evaluate(() => {
      document
        .querySelector("#playground")
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);

    const playgroundCard = page.locator('a[href*="/playground/"]').first();
    await playgroundCard.scrollIntoViewIfNeeded();
    await playgroundCard.focus();

    // Mini-sim mount + first RAF frame.
    await page.waitForTimeout(1500);

    // Coexistence assertion: at least 2 canvases now (hero + mini-sim).
    // If the FluidOrchestrator factory regressed multi-instance support
    // (e.g. module-level state collision), the mini-sim either fails to
    // mount or throws, taking the canvas count back below 2.
    const coexisting = await page.locator("canvas").count();
    expect(
      coexisting,
      `after Playground card focus, expected ≥2 canvases (hero + mini-sim), got ${coexisting}`,
    ).toBeGreaterThanOrEqual(2);

    // Steady-state — RAF runs for both orchestrators, any deferred
    // cross-talk would surface as a GL error in console.
    await page.waitForTimeout(800);

    const fatal = errors.filter((e) => !/ResizeObserver loop/i.test(e));
    expect(fatal, `Page errors during multi-instance run: ${fatal.join(" | ")}`).toEqual([]);

    // Orchestrator-tagged console errors (filter out unrelated noise
    // like font-preload mismatch in dev mode).
    const orchestratorRelated = consoleErrors.filter((e) =>
      /orchestrator|fluid|webgl|INVALID_OPERATION/i.test(e),
    );
    expect(orchestratorRelated, `Orchestrator errors: ${orchestratorRelated.join(" | ")}`).toEqual(
      [],
    );
  });
});
