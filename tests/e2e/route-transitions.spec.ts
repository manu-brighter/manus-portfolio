// tests/e2e/route-transitions.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Regression: navigating away from the home page must not throw
 * React's removeChild NotFoundError.
 *
 * Root cause history: DioramaTrack pinned the `section#case-study`
 * element itself — a DIRECT child of <main>. ScrollTrigger's pin
 * wraps the pinned element in a `div.pin-spacer` (a DOM move React
 * never sees), and on client-side navigation React's deletion pass
 * calls `main.removeChild(section)` while the section actually sits
 * inside the spacer → "Failed to execute 'removeChild' on 'Node'".
 * The sceneHidden pre-unmount kill can't save the layout-mount path
 * (/cv, /impressum, /datenschutz): the destination's
 * SceneVisibilityGate effect runs only AFTER the old tree is deleted.
 * Fix: pin an inner wrapper, so the spacer stays inside the section
 * and React only ever detaches the unmoved section from <main>.
 *
 * The test scrolls far enough for ScrollTrigger to initialize (and
 * pin), then navigates via the Contact CV link — the exact repro path
 * from user feedback.
 */

test("home → /cv via Contact link navigates without page errors", async ({ page, isMobile }) => {
  // The regression subject is the DESKTOP diorama pin; mobile renders
  // the vertical fallback (no ScrollTrigger, no spacer) and remounts
  // the section when the fallback branch flips post-hydration, which
  // detaches the locator mid-scroll.
  test.skip(isMobile, "diorama pin exists only on desktop viewports");
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/de/");

  // Drive real scroll so the diorama ScrollTrigger creates its pin.
  await page.locator("#case-study").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const cvLink = page.locator('#contact a[href*="/cv"]');
  await expect(cvLink).toBeVisible();
  await cvLink.click();

  await expect(page).toHaveURL(/\/de\/cv\/?$/);
  // The CV sheet actually rendered.
  await expect(page.locator('[data-page="cv"]')).toBeVisible();

  expect(errors, `page errors during navigation:\n${errors.join("\n")}`).toHaveLength(0);
});
