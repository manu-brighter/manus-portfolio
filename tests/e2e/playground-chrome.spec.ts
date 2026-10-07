// tests/e2e/playground-chrome.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Experiment chrome carries a tech readout stamp built from the tier
 * the experiments really run at (PLAYGROUND_SIM_TIER -> 256² grid), plus
 * one sentence on what is simulated.
 */

test("experiment chrome shows the tech stamp and what is simulated", async ({ page }) => {
  await page.goto("/de/playground/ink-drop-studio/");
  const stamp = page.getByText("WebGL2 · Navier-Stokes · 256² Grid");
  await expect(stamp).toBeVisible({ timeout: 15_000 });
  await expect(stamp).toHaveAttribute("lang", "en");
  await expect(page.getByText(/inkompressible Flüssigkeit/).first()).toBeAttached();
});
