import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

test("wheel input stays native while the motion provider is active", async ({ page }) => {
  await page.goto("/de/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.evaluate(() => {
    document.documentElement.dataset.wheelHandled = "pending";
    window.addEventListener(
      "wheel",
      (event) => {
        window.setTimeout(() => {
          document.documentElement.dataset.wheelHandled = String(event.defaultPrevented);
        }, 0);
      },
      { passive: true, once: true },
    );
  });
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(60, 400);
  await page.mouse.wheel(0, 600);
  await expect(page.locator("html")).toHaveAttribute("data-wheel-handled", "false");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test("rail fill follows its active section through unequal sections and the pin span", async ({
  page,
}) => {
  await page.goto("/de/");
  const rail = page.getByRole("navigation", { name: "Abschnitt-Navigation", exact: true });
  await expect(rail).toBeVisible();
  await expect(page.locator("#case-study .pin-spacer")).toBeAttached();
  const ids = ["work", "case-study", "photography"];
  for (const id of ids) {
    await page.evaluate((sectionId) => {
      const section = document.getElementById(sectionId);
      if (!section) throw new Error(`Missing section: ${sectionId}`);
      window.scrollTo({
        top: section.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25 + 2,
        behavior: "instant",
      });
    }, id);
    const index = id === "work" ? 4 : id === "case-study" ? 5 : 6;
    await expect(rail.getByRole("button").nth(index)).toHaveAttribute("aria-current", "location");
    // The visible fill endpoint must reach the active dot, rather than a
    // global page percentage which is distorted by long sections/pinning.
    await expect
      .poll(() =>
        rail.evaluate((element, active) => {
          const fill = element.querySelector<HTMLElement>(".origin-top");
          const dot = element.querySelectorAll("button")[active];
          if (!fill || !dot) return Infinity;
          const rect = dot.getBoundingClientRect();
          return Math.abs(fill.getBoundingClientRect().bottom - (rect.top + rect.height / 2));
        }, index),
      )
      .toBeLessThan(3);
    if (id === "case-study") {
      await page.evaluate(() => {
        const current = document.getElementById("case-study");
        const next = document.getElementById("photography");
        if (!current || !next) throw new Error("Missing pin boundaries");
        window.scrollTo({
          top:
            (current.getBoundingClientRect().top + next.getBoundingClientRect().top) / 2 +
            window.scrollY -
            window.innerHeight * 0.25,
          behavior: "instant",
        });
      });
      await expect(rail.getByRole("button").nth(5)).toHaveAttribute("aria-current", "location");
      await expect
        .poll(() =>
          rail.evaluate((element) => {
            const fill = element.querySelector<HTMLElement>(".origin-top");
            const dots = element.querySelectorAll("button");
            const first = dots[5]?.getBoundingClientRect();
            const second = dots[6]?.getBoundingClientRect();
            if (!fill || !first || !second) return Infinity;
            const middle = (first.top + first.height / 2 + second.top + second.height / 2) / 2;
            return Math.abs(fill.getBoundingClientRect().bottom - middle);
          }),
        )
        .toBeLessThan(3);
    }
  }
  // Resizing rebuilds the pin span. The rail must measure the final layout.
  await page.setViewportSize({ width: 1280, height: 900 });
  const photoDot = rail.getByRole("button").nth(6);
  await photoDot.click();
  await expect(photoDot).toHaveAttribute("aria-current", "location");
});
