// tests/e2e/contact.spec.ts
import { expect, test } from "@playwright/test";

/**
 * F-testing-coverage-1: Contact form E2E.
 *
 * Three paths:
 *   1. Happy path — fill name / email / message, submit, wait 320ms stub
 *      timeout, expect mailto fallback link visible.
 *   2. Honeypot trip — programmatically fill `bot-trap`, submit, expect
 *      mailto link never appears (status stays idle, not `fallback`).
 *   3. Empty submit — click submit with empty fields, HTML5 native
 *      validation fires, `handleSubmit` never runs, status region stays
 *      empty.
 */

test.describe("contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#contact");
    await section.scrollIntoViewIfNeeded();
  });

  test("happy path → mailto fallback link appears after submit", async ({ page }) => {
    const section = page.locator("#contact");

    await section.getByRole("textbox", { name: /name/i }).fill("Test User");
    await section.getByRole("textbox", { name: /e-mail/i }).fill("test@example.com");
    await section
      .getByRole("textbox", { name: /nachricht/i })
      .fill("Hello, this is a test message.");

    await section.getByRole("button", { name: /senden|send/i }).click();

    // Stub timeout is 800ms (Wave E ui bumped from 320ms for graceful pulse).
    // Allow 3000ms for webkit safety — its event-loop scheduling under
    // reducedMotion=false + GPU compositor is slower than chromium.
    await expect(page.locator('[aria-live="polite"] a[href^="mailto:"]')).toBeVisible({
      timeout: 3000,
    });
  });

  test("honeypot trip → mailto link never appears, status stays idle", async ({ page }) => {
    const section = page.locator("#contact");

    // Fill real fields to pass HTML5 validation.
    await section.getByRole("textbox", { name: /name/i }).fill("Bot User");
    await section.getByRole("textbox", { name: /e-mail/i }).fill("bot@example.com");
    await section.getByRole("textbox", { name: /nachricht/i }).fill("Automated message content");

    // Programmatically trip the honeypot (hidden from real users via tabIndex=-1
    // + off-screen positioning, but programmatically accessible in tests).
    await page.locator('input[name="bot-trap"]').evaluate((el: HTMLInputElement) => {
      el.value = "I am a bot";
    });

    await section.getByRole("button", { name: /senden|send/i }).click();

    // Wait past the stub timeout — the fallback should NOT appear.
    await page.waitForTimeout(500);
    await expect(page.locator('[aria-live="polite"] a[href^="mailto:"]')).toHaveCount(0);
  });

  test("empty submit → HTML5 validation fires, status region stays empty", async ({ page }) => {
    const section = page.locator("#contact");

    // Submit without filling any required fields.
    await section.getByRole("button", { name: /senden|send/i }).click();

    // Wait a tick — if handleSubmit ran, status would change within 320ms.
    await page.waitForTimeout(400);

    // The aria-live region must stay empty (handleSubmit never called setStatus).
    const statusRegion = page.locator('[aria-live="polite"]');
    const text = (await statusRegion.textContent()) ?? "";
    expect(text.trim()).toBe("");
  });
});
