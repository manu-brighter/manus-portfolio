import { expect, test } from "@playwright/test";

test("startup has no full-screen ink overlay before application hydration", async ({ page }) => {
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
    await expect(page.getByTestId("loader-overlay")).toHaveCount(0);
  } finally {
    release();
    await navigation;
  }
  await expect(page.locator('#hero-heading [data-layer="ink"]').first()).toHaveCSS("opacity", "1");
});

test("hint arrow aims at the center of the actual button at each breakpoint", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.removeItem("manus-studio-hint-shown"));
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/de/");
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const note = document.querySelector('[data-testid="ink-studio-hint"]');
            const button = document.querySelector('[data-testid="ink-studio"] button');
            const arrow = note?.querySelector("svg path") as SVGPathElement | null;
            if (!note?.textContent?.replace("▌", "").trim() || !button || !arrow) return null;
            const bounds = note.getBoundingClientRect();
            const chip = note.querySelector(".switcher-hint-chip")!.getBoundingClientRect();
            const target = button.getBoundingClientRect();
            const tip = arrow
              .getPointAtLength(arrow.getTotalLength())
              .matrixTransform(arrow.getScreenCTM()!);
            return {
              aimsAtButton: Math.abs(tip.x - (target.left + target.width / 2)) <= 4,
              closeToButton: target.top - tip.y >= 4 && target.top - tip.y <= 14,
              clearsButton: bounds.bottom + 6 <= target.top,
              fitsViewport: chip.left >= 0 && chip.right <= innerWidth,
            };
          }),
        { timeout: 10000 },
      )
      .toEqual({ aimsAtButton: true, closeToButton: true, clearsButton: true, fitsViewport: true });
  }
});

test("mobile Visuals uses a compact swatch with an accessible name", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Compact trigger is only used on touch layouts");
  await page.goto("/de/");
  const button = page.getByRole("button", { name: "Visuals", exact: true });
  await expect(button).toBeVisible();
  const bounds = await button.boundingBox();
  expect(bounds?.width).toBe(44);
  expect(bounds?.height).toBe(44);
  await expect(button.locator("[data-visuals-label]")).toBeHidden();
  await button.click();
  await expect(page.getByTestId("ink-studio-panel")).toBeVisible();
  await expect(page.getByTestId("ink-studio-panel")).toContainText("Visuals");
});

test("header CV typography aligns with language and navigation labels", async ({ page }) => {
  for (const width of [393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/de/");
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const cv = document.querySelector('nav a[href="/de/cv/"]')!;
      // The switcher toggle is an icon: align its glyph box, not text.
      const language = document.querySelector("nav [data-locale-globe]")!;
      const textCenter = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return rect.top + rect.height / 2;
      };
      // Optical centre of an uppercase label: baseline minus half the cap
      // height. The text box also holds descender space the caps never
      // use, so its centre sits ~0.5px below what the eye reads.
      const capCenter = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        const style = getComputedStyle(element);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = ctx.measureText(element.textContent?.trim() ?? "");
        return rect.top + metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent / 2;
      };
      const links = [...document.querySelectorAll("nav ul a")].filter(
        (element) =>
          element.getBoundingClientRect().width > 0 &&
          !element.closest('[inert], [aria-hidden="true"]') &&
          getComputedStyle(element).visibility === "visible",
      );
      return {
        languageOffset: Math.abs(
          capCenter(cv) -
            (language.getBoundingClientRect().top + language.getBoundingClientRect().height / 2),
        ),
        navigationOffsets: links.map((link) => Math.abs(textCenter(cv) - textCenter(link))),
        border: getComputedStyle(cv).borderTopWidth,
      };
    });
    expect(layout.languageOffset).toBeLessThanOrEqual(0.75);
    for (const offset of layout.navigationOffsets) expect(offset).toBeLessThanOrEqual(1);
    expect(layout.border).toBe("0px");
  }
});
