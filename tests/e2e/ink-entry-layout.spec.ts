import { expect, test } from "@playwright/test";

test("the opening has visible moving ink before application hydration", async ({ page }) => {
  await page.addInitScript(() => {
    const frames: string[] = [];
    Object.defineProperty(window, "earlyInkFrames", { value: frames });
    const begin = performance.now();
    const inspect = () => {
      const mark = document.querySelector('[data-testid="loader-ink-mark"]');
      const overlay = document.querySelector('[data-testid="loader-overlay"]');
      if (mark && overlay) {
        const bounds = mark.getBoundingClientRect();
        const style = getComputedStyle(mark);
        if (
          document.documentElement.dataset.intro === "running" &&
          bounds.width > 24 &&
          bounds.height > 24 &&
          style.animationName !== "none" &&
          Number(getComputedStyle(overlay).opacity) > 0.2
        ) {
          frames.push(style.transform);
        }
      }
      if (performance.now() - begin < 4000) requestAnimationFrame(inspect);
    };
    requestAnimationFrame(inspect);
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await gate;
    await route.continue();
  });
  const navigation = page.goto("/de/", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.locator("#hero-heading")).toBeAttached();
    await expect
      .poll(() =>
        page.evaluate(
          () => new Set((window as Window & { earlyInkFrames: string[] }).earlyInkFrames).size,
        ),
      )
      .toBeGreaterThan(2);
  } finally {
    release();
    await navigation;
  }
  await expect(page.locator('#hero-heading [data-layer="ink"]').first()).toHaveCSS("opacity", "1");
});

test("studio hint and arrow keep a gap above the button at each breakpoint", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.removeItem("manus-studio-hint-shown"));
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/de/");
    // Capture both boxes together before this bounded decoration disappears.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const note = document.querySelector('[data-testid="ink-studio-hint"]');
            const button = document.querySelector('[data-testid="ink-studio"] > button');
            if (!note?.textContent?.includes("Psst") || !button) return null;
            const bounds = note.getBoundingClientRect();
            return {
              gapAboveButton: bounds.bottom + 8 <= button.getBoundingClientRect().top,
              fitsViewport: bounds.left >= 0 && bounds.right <= window.innerWidth,
            };
          }),
        { timeout: 10000 },
      )
      .toEqual({ gapAboveButton: true, fitsViewport: true });
  }
});
