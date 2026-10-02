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
    // Pin a wide viewport on this context too: the describe-level
    // test.use({ viewport }) does NOT reach browser.newContext(), so without
    // this the context falls back to Playwright's 1280x720 default. That's
    // still desktop-width, but pinning here keeps the branch decision
    // deterministic and matches the describe-level intent (force the desktop
    // editorial layout, not the PhotographyMobile swiper).
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    await page.goto("/de/");

    const section = page.locator("#photography");
    // Assert the desktop layout has hydrated first (5 figures present), then
    // that the mask canvases are gone. Ordering matters: the static export
    // ships the 5 PhotoInkMask <canvas> in the SSR HTML (useReducedMotion's
    // server snapshot is false), and they only disappear once the client
    // hydrates, reads prefers-reduced-motion, and React unmounts them. On a
    // loaded CI runner that unmount can lag past the default 5s expect poll —
    // the entire cause of the earlier webkit flake (canvases still present at
    // assert time). The generous timeout absorbs that hydration window.
    const slots = section.locator("[data-photo-slide]");
    await expect(slots).toHaveCount(5);

    // No mask canvases under reduced-motion (PhotoInkMask returns null).
    await expect(section.locator("canvas")).toHaveCount(0, { timeout: 10_000 });

    await context.close();
  });

  test("Animation shows clean photographs without simulation mask canvases", async ({ page }) => {
    await page.goto("/de/?ink-preview=light");
    const section = page.locator("#photography");
    await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
    const photo = section.locator("[data-photo-slide] picture img").first();
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(section.locator("canvas")).toHaveCount(0);
  });

  test("Full mode mounts five paper masks before photography is reached", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    });
    await page.goto("/de/?ink-preview=full");
    await expect(page.locator("#photography canvas")).toHaveCount(5, { timeout: 15000 });
  });

  test("Full mode settles a photo reveal once and releases its mask canvas", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    });
    await page.goto("/de/?ink-preview=full");
    const section = page.locator("#photography");
    const targetSlide = section.locator("[data-photo-slide]").nth(1);
    const canvas = targetSlide.locator("canvas");
    await expect(canvas).toHaveCount(1, { timeout: 15000 });
    // The desktop case study inserts scroll space on its second animation
    // frame. Wait for that layout before calculating a photo scroll target.
    await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);

    // Scroll the second photo slide so its centre sits at the viewport
    // centre (block: "center") — the reveal now fires when the photo's
    // middle crosses the viewport middle (centre sentinel + rootMargin
    // "-49.5% 0px -49.5% 0px"), which block:"center" lands exactly on.
    await targetSlide.evaluate((el) => {
      el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await expect(targetSlide).toBeInViewport();
    // Only a successful first mask draw clears the pre-reveal CSS paper.
    // A GL failure also unmounts the canvas, so removal alone is insufficient.
    await expect(canvas).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(canvas).toHaveCount(0, { timeout: 10000 });
    await expect(targetSlide.locator("picture img")).toBeVisible();
    await page.locator("#hero").scrollIntoViewIfNeeded();
    await targetSlide.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveCount(0);
  });
});
