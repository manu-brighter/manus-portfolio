// tests/e2e/case-study.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study fallback breakpoint", () => {
  test("desktop ≥900px height renders diorama track", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    // Desktop branch mounts the 420vh-wide track inside the pin
    // wrapper (descendant, not direct child — the wrapper exists so
    // ScrollTrigger's pin-spacer never wraps the section itself).
    // Fallback branch renders no track at all.
    const track = section.locator(`div[style*="width:420vh"]`);
    await expect(track, "diorama track must mount on desktop").toHaveCount(1);
  });

  test("low-height viewport ≤699px renders vertical fallback", async ({ page }) => {
    // Threshold lowered from 899 -> 700 in commit 227ab10 to keep
    // 1920x1200 monitors at 125% Windows DPI scaling (effective
    // viewport ~744px) on the desktop diorama. Test viewport must
    // therefore be < 700px height to assert the fallback branch.
    await page.setViewportSize({ width: 1366, height: 600 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`div[style*="width:420vh"]`);
    await expect(track, "diorama track must NOT mount on short viewport").toHaveCount(0);
    // Fallback uses .container-page wrapper.
    const fallbackContainer = section.locator("> div.container-page");
    await expect(fallbackContainer, "fallback container must mount").toHaveCount(1);
    // Wide but short gets the desktop-width stacked layout, not the
    // phone stack: two-column rows, rem type, a capped phone polaroid.
    const stacked = section.locator('[data-case-study-layout="stacked"]');
    await expect(stacked, "wide-short viewport must use the stacked layout").toHaveCount(1);
    const phoneShot = stacked.locator('[data-lightbox-index="0"]');
    const box = await phoneShot.boundingBox();
    expect(box?.height ?? 0, "hook polaroid must fit a laptop viewport").toBeLessThan(500);
  });

  test("reduced motion at desktop width renders the stacked layout", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section.locator('[data-case-study-layout="stacked"]')).toHaveCount(1);
  });

  test("narrow viewport <768px width renders vertical fallback", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`div[style*="width:420vh"]`);
    await expect(track, "diorama track must NOT mount on mobile").toHaveCount(0);
    await expect(section.locator('[data-case-study-layout="stacked"]')).toHaveCount(0);
  });

  test("runtime switch out of the pinned diorama does not crash", async ({ page }) => {
    // React must never detach the pinned div itself (GSAP moved it into
    // a pin-spacer): the keyed pin host in DioramaTrack. Resizing while
    // pinned used to throw NotFoundError from section.removeChild.
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1920, height: 950 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section.locator(".pin-spacer")).toHaveCount(1);
    // Scroll into the pin so the spacer is active, not just created.
    await section.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 600);
    });
    await page.waitForTimeout(500);

    await page.setViewportSize({ width: 1366, height: 650 });
    await expect(section.locator('[data-case-study-layout="stacked"]')).toHaveCount(1);
    await expect(section.locator(".pin-spacer")).toHaveCount(0);

    await page.setViewportSize({ width: 1920, height: 950 });
    await expect(section.locator('[data-case-study-layout="stacked"]')).toHaveCount(0);
    await expect(section.locator(".pin-spacer")).toHaveCount(1);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
