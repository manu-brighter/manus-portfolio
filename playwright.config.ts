import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Test target:
 *   E2E_TARGET=prod → serve ./out (static export, matches production)
 *   default         → pnpm dev (faster DX, what authors hit locally)
 *
 * CI always sets E2E_TARGET=prod so smoke + axe run against the exact
 * artifact that ships to Nginx. Avoids "green CI, broken build" drift.
 */
const TARGET = process.env.E2E_TARGET ?? "dev";
const SERVER_COMMAND =
  TARGET === "prod" ? `pnpm dlx serve out --listen ${PORT} --no-clipboard` : "pnpm dev";

// Specs that hard-pin their own device via `test.use({ ...devices[...] })`
// ignore the project's browser entirely, so running them under more than one
// project is pure duplication — and it breaks a single-browser CI shard (the
// pinned engine isn't installed there). Each runs under exactly ONE project.
const I18N = /tests\/i18n\//; // node-only key-parity; chromium runs it once
// Pixel-5-pinned mobile specs -> mobile-chrome only (they force Pixel 5 / the
// chromium engine regardless of project, so a second run is identical).
const PIXEL5_PINNED = [
  /case-study-carousel-mobile\.spec\.ts/,
  /mobile-bg-sim\.spec\.ts/,
  /mobile-nav\.spec\.ts/,
  /photography-mobile\.spec\.ts/,
  /reduced-motion-mobile\.spec\.ts/,
];
// keyboard-nav pins Desktop Chrome -> runs under the chromium project only.
const KEYBOARD_NAV = /keyboard-nav\.spec\.ts/;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Single worker everywhere: fluid-sim + SwiftShader on parallel Chromium
  // instances produces GPU stalls that time out context teardown. CI already
  // runs single-worker; local runs match so `ci:local` stays a reliable gate.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Pixel-5 specs force their own device — they run under mobile-chrome
      // only, so an identical chromium-project run would just be duplication.
      // keyboard-nav (Desktop Chrome) stays here; i18n runs here too.
      testIgnore: PIXEL5_PINNED,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      // i18n is node-only (chromium runs it once). The Pixel-5 + Desktop-Chrome
      // specs force the chromium engine, so they're meaningless under webkit
      // (and would need chromium installed in the webkit shard) — run elsewhere.
      testIgnore: [I18N, ...PIXEL5_PINNED, KEYBOARD_NAV],
    },
    // F-testing-coverage-2: Mobile Chrome project for hamburger nav and
    // coarse-pointer paths that are md:hidden on desktop (never exercised
    // by the chromium + webkit projects above). Also runs the Mobile
    // visual baseline (post-Phase-1 of Mobile-Rework).
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      // i18n node-only (runs under chromium); keyboard-nav pins Desktop Chrome
      // (runs under chromium). The Pixel-5 mobile specs run here.
      testIgnore: [I18N, KEYBOARD_NAV],
    },
  ],
  webServer: {
    command: SERVER_COMMAND,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
