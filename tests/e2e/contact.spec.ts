// tests/e2e/contact.spec.ts
import { expect, type Page, test } from "@playwright/test";

/**
 * Contact form E2E.
 *
 * The form POSTs JSON to a same-origin `/api/contact` endpoint (self-hosted
 * PHP on the prod box — absent from the static test build), then either
 * confirms success or degrades to a pre-filled mailto link. Paths covered:
 *   1. Success — mock /api/contact -> {ok:true}: confirmation, no mailto.
 *   2. Fallback — no endpoint (404/non-JSON): graceful mailto link appears.
 *   3. Honeypot — trip bot-trap: nothing happens (no mailto, status idle).
 *   4. Empty submit — HTML5 validation blocks submit, status stays empty.
 */

async function fillValidFields(page: Page) {
  const section = page.locator("#contact");
  await section.getByRole("textbox", { name: /name/i }).fill("Test User");
  await section.getByRole("textbox", { name: /e-mail/i }).fill("test@example.com");
  await section.getByRole("textbox", { name: /nachricht/i }).fill("Hello, this is a test message.");
  return section;
}

test.describe("contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("success → confirmation shown, no mailto fallback", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    const section = await fillValidFields(page);
    await section.getByRole("button", { name: /senden|send/i }).click();

    const status = page.locator('#contact [aria-live="polite"]');
    await expect(status).toContainText(/angekommen|Danke/i, { timeout: 3000 });
    await expect(status.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("no endpoint → graceful mailto fallback link appears", async ({ page }) => {
    // /api/contact is absent in the static build → 404 (or non-JSON) → the
    // form drops to the mailto fallback so the message is never lost.
    const section = await fillValidFields(page);
    await section.getByRole("button", { name: /senden|send/i }).click();

    await expect(page.locator('#contact [aria-live="polite"] a[href^="mailto:"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("honeypot trip → nothing sent, no mailto, status stays idle", async ({ page }) => {
    const section = await fillValidFields(page);

    // Programmatically trip the honeypot (hidden from real users via tabIndex=-1
    // + off-screen positioning, but reachable in tests).
    await page.locator('input[name="bot-trap"]').evaluate((el: HTMLInputElement) => {
      el.value = "I am a bot";
    });

    await section.getByRole("button", { name: /senden|send/i }).click();

    await page.waitForTimeout(500);
    await expect(page.locator('#contact [aria-live="polite"] a[href^="mailto:"]')).toHaveCount(0);
  });

  test("empty submit → HTML5 validation fires, status region stays empty", async ({ page }) => {
    const section = page.locator("#contact");

    // Submit without filling any required fields.
    await section.getByRole("button", { name: /senden|send/i }).click();

    await page.waitForTimeout(400);

    // The aria-live region must stay empty (handleSubmit never called setStatus).
    const text = (await page.locator('#contact [aria-live="polite"]').textContent()) ?? "";
    expect(text.trim()).toBe("");
  });
});
