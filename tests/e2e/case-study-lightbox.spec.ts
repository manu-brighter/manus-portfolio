// tests/e2e/case-study-lightbox.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study lightbox", () => {
  // Lightbox lives inside the desktop diorama branch only.
  // 1920x1080 satisfies the height-aware breakpoint added in
  // fix/case-study-responsive (height >= 900).
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("clicking the admin polaroid opens the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const adminPolaroid = page
      .locator("article", { has: page.getByText(/Admin-Dashboard|Highlight 01|Sichtbarstes/) })
      .locator("[aria-haspopup='dialog']")
      .first();
    await adminPolaroid.scrollIntoViewIfNeeded();
    await adminPolaroid.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Counter should read "n / 6"
    await expect(dialog.locator("[data-testid='lightbox-counter']")).toHaveText(/\/\s*6/);
  });

  test("ESC closes the open lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page.locator("section#case-study [aria-haspopup='dialog']").first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("right-arrow advances to the next image (with wrap-around)", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page.locator("section#case-study [aria-haspopup='dialog']").first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const counter = page.locator("dialog[open] [data-testid='lightbox-counter']");
    await expect(counter).toHaveText(/^\s*1\s*\/\s*6\s*$/);
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText(/^\s*2\s*\/\s*6\s*$/);
  });

  test("backdrop click closes the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page.locator("section#case-study [aria-haspopup='dialog']").first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Click far from the image — top-left corner of the dialog should be backdrop.
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  // Regression: `dialog.showModal()` promotes the lightbox into the
  // browser's top layer, which no z-index can reach — the ink cursor
  // (and its trail) used to vanish the moment the lightbox opened,
  // leaving the modal with no cursor at all because the native one is
  // hidden site-wide. InkCursor moves its layer container into the
  // open dialog so they ride the same layer.
  test("the ink cursor rides along into the lightbox's top layer", async ({ page, isMobile }) => {
    // The ink cursor replaces the native one, so it only mounts on
    // fine pointers — the Pixel-5 project renders no layers at all
    // even with this describe's desktop viewport override.
    test.skip(Boolean(isMobile), "ink cursor is fine-pointer only");
    await page.goto("/de/");
    const layers = page.locator(".ink-cursor-layer");
    // Doubles as the hydration gate: the layers are client-only.
    await expect(layers).toHaveCount(2);

    const firstClickable = page.locator("section#case-study [aria-haspopup='dialog']").first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    await expect(page.locator("dialog[open]")).toBeVisible();

    // Both layers now sit inside the dialog — and there are still
    // exactly two of them (moved, not duplicated).
    await expect(page.locator("dialog[open] .ink-cursor-layer")).toHaveCount(2);
    await expect(layers).toHaveCount(2);
    // The head dot is a painted element, not a 0-opacity ghost. Poll:
    // the click above is the cursor's first pointer event, and that
    // triggers a 300ms opacity fade-in — a single read right after the
    // dialog opens catches it mid-tween at 0.
    const dot = page.locator("dialog[open] div.ink-cursor-layer");
    await expect(dot).toBeVisible();
    await expect
      .poll(() => dot.evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeGreaterThan(0);

    // The trail is the other half of the requirement, and node
    // parentage alone can't see it — a 0x0 or never-drawn canvas would
    // pass every assertion above. Stroke across the photo, then read
    // the pixels back. Pauses between moves let the shared RAF sample
    // the pointer; it pushes one trail point per frame, not per event.
    const stroke = [
      [760, 470],
      [840, 495],
      [920, 520],
      [1000, 545],
      [1080, 565],
    ] as const;
    for (const [x, y] of stroke) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(40);
    }
    const painted = await page
      .locator("dialog[open] canvas.ink-cursor-layer")
      .evaluate((el, path) => {
        const canvas = el as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0) return false;
        // Backing store is scaled by the capped DPR — derive it rather
        // than assuming, the projects run at different scale factors.
        const scale = canvas.width / window.innerWidth;
        const xs = path.map(([x]) => x);
        const ys = path.map(([, y]) => y);
        const pad = 40;
        const left = Math.max(0, Math.floor((Math.min(...xs) - pad) * scale));
        const top = Math.max(0, Math.floor((Math.min(...ys) - pad) * scale));
        const right = Math.min(canvas.width, Math.ceil((Math.max(...xs) + pad) * scale));
        const bottom = Math.min(canvas.height, Math.ceil((Math.max(...ys) + pad) * scale));
        // Bounded region only — a full-canvas read is tens of MB.
        const { data } = ctx.getImageData(left, top, right - left, bottom - top);
        for (let i = 3; i < data.length; i += 4) {
          if ((data[i] ?? 0) > 0) return true;
        }
        return false;
      }, stroke);
    expect(painted).toBe(true);

    // Navigation must NOT move the cursor around (that would churn the
    // container on every arrow press).
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("dialog[open] [data-testid='lightbox-counter']")).toHaveText(
      /^\s*2\s*\/\s*6\s*$/,
    );
    await expect(page.locator("dialog[open] .ink-cursor-layer")).toHaveCount(2);

    // Closing hands them back to the body. The closed lightbox still
    // renders a `hidden` <dialog>, so a stale host would strand the
    // cursor inside a display:none element — assert against ANY
    // dialog, not just the open one.
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.locator("dialog .ink-cursor-layer")).toHaveCount(0);
    await expect(layers).toHaveCount(2);
  });

  test("reduced-motion: no FLIP transform applied", async ({ page, browserName }) => {
    // Skipped on WebKit: the reduced-motion code path is identical
    // across browsers (same useReducedMotion hook gates the same GSAP
    // branch in Lightbox.tsx), so chromium coverage is sufficient.
    // WebKit's slower hydration + the DioramaTrack desktop->fallback
    // swap together make the click setup flaky here even with
    // generous waits. Genuine WebKit-specific reduced-motion
    // regressions would also fail on chromium — the redundancy isn't
    // worth a flake in CI.
    test.skip(
      browserName === "webkit",
      "reduced-motion code path is browser-agnostic; chromium covers it",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    // Under reduced-motion DioramaTrack swaps from desktop diorama to
    // mobileFallback on hydration. That swap detaches + remounts the
    // polaroid wrapper, invalidating any earlier captured locator.
    // Wait past the loader (~2.2s) + hydration settle, THEN locate
    // and click in one fluent call so Playwright's auto-wait + auto-
    // scroll handles whatever DOM state we end up in.
    // Wait for the loader overlay to disappear — deterministic signal that
    // the epic ~2.2s loader animation finished and DioramaTrack has had time
    // to swap desktop↔fallback branches on hydration. Replaces the brittle
    // waitForTimeout(3500) (F-testing-coverage-8).
    await page.waitForLoadState("networkidle");
    await page
      .locator('[data-testid="loader-overlay"]')
      .waitFor({ state: "hidden", timeout: 8000 });
    await page
      .locator("section#case-study [aria-haspopup='dialog']")
      .first()
      .click({ timeout: 10000 });
    const img = page.locator("dialog[open] img").first();
    await expect(img).toBeVisible();
    // After 250ms (longer than the reduced-motion fade), the transform must
    // still be none (no scale/translate left over from FLIP).
    await page.waitForTimeout(250);
    const transform = await img.evaluate((el) => getComputedStyle(el).transform);
    expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });
});
