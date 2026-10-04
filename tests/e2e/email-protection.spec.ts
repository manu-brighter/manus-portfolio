// tests/e2e/email-protection.spec.ts
import { expect, test } from "@playwright/test";

/**
 * The contact address must never ship as plaintext (mail harvesters
 * regex the raw HTML). It is joined in the browser after hydration, so
 * the raw response carries only the "[at]" placeholder while the live
 * page still shows a working mailto link.
 */

const ADDRESS_RE = /[a-z0-9._%+-]+@bluewin\.ch/i;

for (const path of ["/de/", "/de/cv/", "/de/impressum/", "/de/datenschutz/", "/maintenance.html"]) {
  test(`${path} ships no plaintext address but renders a mailto after load`, async ({
    page,
    request,
  }) => {
    const raw = await (await request.get(path)).text();
    expect(raw).not.toMatch(ADDRESS_RE);

    await page.goto(path);
    await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute("href", ADDRESS_RE);
  });
}
