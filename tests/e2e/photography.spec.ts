import { expect, test } from "@playwright/test";

// Phase 9 — Photography section ("Through the Lens"), ink-reveal rework.
// Layout: 5 photos in editorial-asymmetric flow, each photo lives in
// the DOM as a <picture>, an ink-mask <canvas> overlay dissolves on
// IO entry to reveal the clean photo. Reduced-motion: skips the canvas
// and just shows the picture.

test.describe("photography section", () => {
  // This spec asserts the DESKTOP editorial layout (5 data-photo-slide
  // figures, 5 PhotoInkMask canvases, centre-band scroll reveal). On the
  // mobile-chrome project (Pixel 5, coarse pointer, 393px) Photography hands
  // off entirely to the PhotographyMobile swiper — different DOM contract,
  // covered separately by photography-swiper.spec.ts. Pin a wide viewport so
  // useMobileLayout (coarse && width < 768) resolves false and the desktop
  // branch renders here regardless of project — same convention as
  // case-study-lightbox.spec.ts / legal-nav.spec.ts.
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("renders heading, lede, tech-stamp", async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    await expect(section).toBeAttached();

    // Headline is i18n'd per locale post-rework (F-i18n-4). On /de/ it reads
    // "Durch die Linse." — match either the German or English variant so the
    // test stays locale-stable.
    const heading = section.getByRole("heading", { name: /Durch die Linse\.|Through the Lens\./ });
    await expect(heading).toBeVisible();
    // The DE lede also mentions "Sony α7 IV"; scope to the type-label-stamp
    // class so we only match the tech stamp itself, not the body copy.
    await expect(section.locator(".type-label-stamp", { hasText: "SONY α7 IV" })).toBeVisible();
  });

  test("all 5 photo slots render with picture + caption", async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    const slots = section.locator("[data-photo-slide]");
    await expect(slots).toHaveCount(5);

    // Each slot should contain a <picture> with at least one <source>
    // and a fallback <img>.
    for (let i = 0; i < 5; i++) {
      const slot = slots.nth(i);
      await expect(slot.locator("picture img")).toHaveAttribute("alt", /.+/);
    }
  });

  test("CTA points at myportfolio.com and opens externally", async ({ page }) => {
    await page.goto("/de/");
    const cta = page.locator("#photography").getByRole("link", { name: /myportfolio\.com/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /manuelheller\.myportfolio\.com/);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", /noopener/);
  });

  test("reduced-motion: ink-mask canvas omitted, picture stays", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/de/");

    const section = page.locator("#photography");
    // No mask canvases under reduced-motion (PhotoInkMask returns null).
    const canvases = section.locator("canvas");
    await expect(canvases).toHaveCount(0);

    // The 5 photos themselves still render.
    const slots = section.locator("[data-photo-slide]");
    await expect(slots).toHaveCount(5);

    await context.close();
  });

  // F-testing-coverage-6: assert 5 canvases mount and the IO-triggered
  // ink-reveal fires when a photo enters the central viewport band.
  // Pattern: expect.poll on getComputedStyle(canvas).opacity — same
  // pattern as overprint.spec.ts. Skip under reduced-motion (no canvases
  // mount there; existing test above covers that branch).
  test("default motion: 5 ink-mask canvases are mounted", async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    // Scroll photography section into the viewport so IntersectionObserver
    // can detect it; canvases mount after the section enters the DOM.
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("canvas")).toHaveCount(5, { timeout: 5000 });
  });

  test("default motion: scrolling a photo into central band triggers ink reveal", async ({
    page,
  }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    await section.scrollIntoViewIfNeeded();

    // Confirm 5 canvases mount first.
    await expect(section.locator("canvas")).toHaveCount(5, { timeout: 5000 });

    // Scroll the second photo slide so its centre sits at the viewport
    // centre (block: "center") — the reveal now fires when the photo's
    // middle crosses the viewport middle (centre sentinel + rootMargin
    // "-49.5% 0px -49.5% 0px"), which block:"center" lands exactly on.
    const targetSlide = section.locator("[data-photo-slide]").nth(1);
    const handle = await targetSlide.elementHandle();
    if (handle) {
      await page.evaluate((el) => {
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }, handle);
    } else {
      await targetSlide.scrollIntoViewIfNeeded();
    }

    // The corresponding canvas (nth(1) — same order as slides) should
    // transition from opacity 0 to > 0 as the ink mask reveals.
    const canvas = section.locator("canvas").nth(1);
    await expect
      .poll(
        () =>
          canvas.evaluate((c) => {
            const style = getComputedStyle(c);
            return Number.parseFloat(style.opacity ?? "0");
          }),
        { timeout: 5000, intervals: [100, 200, 500] },
      )
      .toBeGreaterThan(0);
  });
});
