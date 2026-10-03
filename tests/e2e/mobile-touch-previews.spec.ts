import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, "Exercises the coarse-pointer mobile lifecycle");
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    // Observe real splat coordinates while avoiding software GPU simulation cost.
    const uniforms = new WeakMap<WebGLUniformLocation, string>();
    const getLocation = WebGL2RenderingContext.prototype.getUniformLocation;
    WebGL2RenderingContext.prototype.getUniformLocation = function (program, name) {
      const location = getLocation.call(this, program, name);
      if (location) uniforms.set(location, name);
      return location;
    };
    const uniform = WebGL2RenderingContext.prototype.uniform2f;
    WebGL2RenderingContext.prototype.uniform2f = function (location, x, y) {
      const canvas = this.canvas;
      if (
        location &&
        uniforms.get(location) === "uPoint" &&
        canvas instanceof HTMLCanvasElement &&
        canvas.dataset.testid === "mobile-bg-sim"
      ) {
        const points = JSON.parse(canvas.dataset.splatPoints ?? "[]") as [number, number][];
        points.push([x, y]);
        canvas.dataset.splatPoints = JSON.stringify(points.slice(-100));
      }
      return uniform.call(this, location, x, y);
    };
    WebGL2RenderingContext.prototype.drawArrays = () => {};
  });
});

test("single-touch movement splats once per frame without consuming scroll gestures", async ({
  page,
  browserName,
}) => {
  await page.goto("/de/?ink-preview=full");
  const canvas = page.getByTestId("mobile-bg-sim");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-testid="loader-overlay"]')).toHaveCount(0, { timeout: 15000 });
  // Ambient points confirm the orchestrator's warmup gate has opened.
  await expect(canvas).toHaveAttribute("data-splat-points", /\[\[/, { timeout: 15000 });
  const expected = await page.evaluate(async () => {
    const target = document.body;
    const send = (type: string, x: number, y: number) => {
      // WebKit exposes touch input but forbids constructing Touch/TouchEvent.
      const touch: Pick<Touch, "identifier" | "target" | "clientX" | "clientY"> = {
        identifier: 41,
        target,
        clientX: x,
        clientY: y,
      };
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        touches: { value: [touch] },
        changedTouches: { value: [touch] },
      });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const canceled = [send("touchstart", 60, 400)];
    for (let i = 0; i < 20; i++) canceled.push(send("touchmove", 100 + i, 330 - i));
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { x: 119 / innerWidth, y: 1 - 311 / innerHeight, canceled };
  });
  expect(expected.canceled.every((value) => !value)).toBe(true);
  const matchingSplats = () =>
    canvas.evaluate((element, point) => {
      const points = JSON.parse((element as HTMLElement).dataset.splatPoints ?? "[]") as [
        number,
        number,
      ][];
      return points.filter(
        ([x, y]) => Math.abs(x - point.x) < 0.0001 && Math.abs(y - point.y) < 0.0001,
      ).length;
    }, expected);
  await expect.poll(matchingSplats).toBe(1);

  // A real browser touch drag must still scroll with the passive listener installed.
  // CDP supplies trusted drag input only in Chromium; all engines above
  // verify splats and that the touch events remain uncanceled.
  if (browserName !== "chromium") return;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 650 }],
  });
  for (const y of [600, 520, 420, 300]) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 200, y }],
    });
    await page.waitForTimeout(30);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await session.detach();
});

test("canceled, multiple and interactive touches never leave a queued background splat", async ({
  page,
}) => {
  await page.goto("/de/?ink-preview=full");
  const canvas = page.getByTestId("mobile-bg-sim");
  await expect(canvas).toHaveAttribute("data-splat-points", /\[\[/, { timeout: 20000 });
  const forbidden = await page.evaluate(async () => {
    type TestTouch = Pick<Touch, "identifier" | "target" | "clientX" | "clientY">;
    const points: [number, number][] = [];
    const send = (target: Element, type: string, touches: TestTouch[], changed = touches) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        touches: { value: touches },
        changedTouches: { value: changed },
      });
      target.dispatchEvent(event);
    };
    for (const [index, mode] of ["cancel", "multi", "control"].entries()) {
      const target = mode === "control" ? document.querySelector("button") : document.body;
      if (!target) throw new Error("Expected an interactive control");
      const start: TestTouch = { identifier: 10, target, clientX: 63 + index * 30, clientY: 403 };
      const move: TestTouch = { identifier: 10, target, clientX: 183 + index * 30, clientY: 303 };
      points.push([start.clientX / innerWidth, 1 - start.clientY / innerHeight]);
      points.push([move.clientX / innerWidth, 1 - move.clientY / innerHeight]);
      send(target, "touchstart", [start]);
      send(target, "touchmove", [move]);
      if (mode === "cancel") send(target, "touchcancel", [], [move]);
      if (mode === "multi") {
        const second: TestTouch = { identifier: 11, target, clientX: 280, clientY: 450 };
        send(target, "touchstart", [move, second], [second]);
        send(target, "touchend", [move], [second]);
      }
      send(target, "touchend", [], [move]);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return points;
  });
  const actual = JSON.parse((await canvas.getAttribute("data-splat-points")) ?? "[]") as [
    number,
    number,
  ][];
  expect(
    actual.some(([x, y]) =>
      forbidden.some(([fx, fy]) => Math.abs(x - fx) < 0.0001 && Math.abs(y - fy) < 0.0001),
    ),
  ).toBe(false);
});

test("centered mobile experiment previews run, release offscreen and retain working links", async ({
  page,
}) => {
  await page.goto("/de/?ink-preview=light");
  const cards = page.locator('#playground a[href*="/playground/"]');
  await expect(cards).toHaveCount(2);
  // SSR cards precede mobile layout and font readiness. Position media
  // against the final document geometry after those dependencies settle.
  await expect(page.getByTestId("photo-slide")).toHaveCount(5);
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByTestId("loader-overlay")).toHaveCount(0, { timeout: 15000 });
  await expect(cards.locator("canvas")).toHaveCount(0);
  await cards
    .first()
    .locator("div")
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      window.scrollBy({ top: rect.top + rect.height / 2 - innerHeight / 2, behavior: "instant" });
    });
  await expect
    .poll(() =>
      cards
        .first()
        .locator("div")
        .first()
        .evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (rect.top + rect.height / 2) / innerHeight;
        }),
    )
    .toBeCloseTo(0.5, 1);
  await expect(cards.first().locator("canvas")).toHaveCount(1);
  // A visible frame above the center band must release its GPU preview.
  // Percentage root margins use viewport width, so tall phones need pixels.
  await cards
    .first()
    .locator("div")
    .first()
    .evaluate((element) => {
      window.scrollTo({
        top: scrollY + element.getBoundingClientRect().bottom - innerHeight * 0.3,
        behavior: "instant",
      });
    });
  await expect(cards.first().locator("canvas")).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    const card = cards.nth(i);
    await card
      .locator("div")
      .first()
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        window.scrollBy({ top: rect.top + rect.height / 2 - innerHeight / 2, behavior: "instant" });
      });
    await expect(card.locator("canvas")).toHaveCount(1, { timeout: 10000 });
    await expect(cards.nth(1 - i).locator("canvas")).toHaveCount(0);
    await expect(card.locator("canvas").locator("..")).toHaveCSS("opacity", "1");
  }
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(cards.locator("canvas")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(cards.nth(1).locator("canvas")).toHaveCount(1);
  await cards.nth(1).click();
  await expect(page).toHaveURL(/\/playground\/type-as-fluid/);
});

test("reduced motion keeps centered mobile experiment previews static", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/de/?ink-preview=light");
  const cards = page.locator('#playground a[href*="/playground/"]');
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("svg")).toBeVisible();
    await expect(card.locator("canvas")).toHaveCount(0);
  }
});
