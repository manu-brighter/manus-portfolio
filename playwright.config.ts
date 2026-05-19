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
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      // i18n key-parity is pure node (no browser fixture). Running it on
      // every project doubles CI time for identical results. Chromium only.
      testIgnore: /tests\/i18n\//,
    },
    // F-testing-coverage-2: Mobile Chrome project for hamburger nav and
    // coarse-pointer paths that are md:hidden on desktop (never exercised
    // by the chromium + webkit projects above).
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      // Only run the mobile-specific spec plus the shared smoke + axe suites.
      // Skipping i18n (node-only, already runs in chromium) and visual
      // (visual baseline is desktop-only) keeps CI time bounded.
      testIgnore: /tests\/(i18n|visual)\//,
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
