// tests/e2e/ink-fluidbus.spec.ts
import { expect, type Page, test } from "@playwright/test";

/**
 * Animation (LiteInkScene) answers fluidBus splats: a bus splat prints a
 * short ink bloom into the sheet at the dispatched position, then drains.
 *
 * The splat is emitted through `window.manu.burst(1)` (a real bus
 * producer) with Math.random pinned, so it lands at a known spot. The
 * check is screenshot pixels, never a GL readback: the page DOM is
 * hidden so the shot is the ink alone, and the mirrored region across
 * the horizontal midline is the control. The sheet keeps drifting on
 * its own, so the target must change clearly more than the control;
 * it also pins the y-up convention (a y-down read lands in the control).
 */

test.use({
  viewport: { width: 1280, height: 800 },
  // CSS-pixel screenshots. The mobile project otherwise keeps its device
  // scale, and the sample rects below are laid out for a 1x 1280x800 shot.
  deviceScaleFactor: 1,
});

type Rect = { x: number; y: number; width: number; height: number };

// fluidBus (0.25, 0.75) with y measured from the bottom -> screen (320, 200).
const TARGET: Rect = { x: 260, y: 140, width: 120, height: 120 };
const MIRROR: Rect = { x: 260, y: 540, width: 120, height: 120 };
/** Gap between the two shots of each interval; the bloom is near full
 *  strength by then (and still is after the slow software-GL capture). */
const INTERVAL_MS = 200;

/** Mean absolute RGB difference per channel inside each rect, decoded on
 *  a blank page so the app under test is not touched. */
async function regionDiffs(decoder: Page, before: Buffer, after: Buffer, rects: Rect[]) {
  return decoder.evaluate(
    async ({ a, b, rects: regions }) => {
      const decode = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Expected a 2D context");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [first, second] = await Promise.all([decode(a), decode(b)]);
      return regions.map((rect) => {
        let sum = 0;
        for (let y = rect.y; y < rect.y + rect.height; y++) {
          for (let x = rect.x; x < rect.x + rect.width; x++) {
            const i = (y * first.width + x) * 4;
            for (let c = 0; c < 3; c++) {
              sum += Math.abs((first.data[i + c] ?? 0) - (second.data[i + c] ?? 0));
            }
          }
        }
        return sum / (rect.width * rect.height * 3);
      });
    },
    { a: before.toString("base64"), b: after.toString("base64"), rects },
  );
}

test("a fluidBus splat blooms in the Animation renderer where it was dropped, then drains", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("/de/?ink-preview=light");
  const canvas = page.getByTestId("lite-ink-canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => typeof window.manu?.burst === "function");
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } [data-testid="lite-ink-canvas"] { visibility: visible !important; }',
  });
  const impulseCount = () =>
    canvas.evaluate((element) => {
      const gl = (element as HTMLCanvasElement).getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      if (!gl) throw new Error("Expected the Animation WebGL context");
      const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
      const location = gl.getUniformLocation(program, "uImpulseCount");
      if (!location) throw new Error("Expected the Animation impulse uniform");
      return gl.getUniform(program, location) as number;
    });
  // Idle frames carry no impulses.
  expect(await impulseCount()).toBe(0);
  // WebKit's page screenshot does not include the WebGL drawing buffer, so
  // the position check (which needs those pixels) runs on Chromium only.
  // Every browser still has to show the uniform going live and draining.
  const pixels = browserName !== "webkit";
  const decoder = pixels ? await context.newPage() : null;
  let drift = 0;
  let settled: Buffer | null = null;
  if (decoder) {
    const before = await page.screenshot();
    await page.waitForTimeout(INTERVAL_MS);
    settled = await page.screenshot();
    [drift = 0] = await regionDiffs(decoder, before, settled, [TARGET]);
  }
  await page.evaluate(() => {
    // burst() reads x, y, colour, dx, dy from Math.random in that order:
    // x = 0.08 + r * 0.84 -> 0.25, y -> 0.75, rest centred (mint, no throw).
    const queue = [0.17 / 0.84, 0.67 / 0.84, 0.5, 0.5, 0.5];
    const random = Math.random;
    Math.random = () => queue.shift() ?? 0.5;
    try {
      window.manu?.burst(1);
    } finally {
      Math.random = random;
    }
  });
  await expect.poll(impulseCount, { timeout: 2000 }).toBeGreaterThan(0);
  if (decoder && settled) {
    await page.waitForTimeout(INTERVAL_MS);
    const [bloom = 0, mirror = 0] = await regionDiffs(decoder, settled, await page.screenshot(), [
      TARGET,
      MIRROR,
    ]);
    // Compared over one equal interval each: the ambient sheet keeps drifting,
    // so "eventually different" would also pass for a misplaced bloom.
    expect(bloom).toBeGreaterThan(6);
    expect(bloom).toBeGreaterThan(drift * 2 + 2);
    expect(bloom).toBeGreaterThan(mirror * 1.5);
    await decoder.close();
  }
  // The bloom is short-lived: the buffer drains back to an idle frame.
  await expect.poll(impulseCount, { timeout: 10000 }).toBe(0);
});
