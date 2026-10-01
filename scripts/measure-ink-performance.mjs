/**
 * Visible Chromium / actual GPU diagnostic against a production export.
 * Usage: node scripts/measure-ink-performance.mjs URL LABEL
 * Keep this browser foreground and run without other browser tests or builds.
 * Trace instrumentation has overhead; compare identical workloads on one device.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const target = process.argv[2] ?? "http://127.0.0.1:3010/de/";
const label = (process.argv[3] ?? "ink").replace(/[^a-zA-Z0-9_-]/g, "-");
const output = join("test-results", "performance", label);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: false, chromiumSandbox: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.25,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForTimeout(6500);
  const hardware = await page.evaluate(() => {
    const canvas = document.querySelector(
      '[data-testid="lite-ink-canvas"], [data-scene="root"] canvas',
    );
    const gl = canvas?.getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : "unknown",
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
      canvas: canvas ? [canvas.width, canvas.height] : null,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
  if (/SwiftShader|llvmpipe|software/i.test(hardware.renderer)) {
    throw new Error(`Software renderer cannot establish device performance: ${hardware.renderer}`);
  }
  if (hardware.renderer === "unknown") throw new Error("Cannot verify renderer identity");
  process.stdout.write(`${JSON.stringify({ target, hardware })}\n`);
  await page.evaluate(() => {
    window.__inkMeasurement = { frames: [], last: null, positions: [] };
    const tick = (now) => {
      const state = window.__inkMeasurement;
      if (state.last !== null) state.frames.push(now - state.last);
      state.last = now;
      state.raf = requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await cdp.send("Tracing.start", {
    categories: "devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,benchmark,viz",
    transferMode: "ReturnAsStream",
  });
  const wheelStep = Math.max(420, Math.ceil((hardware.scrollHeight - 1080) / 24));
  for (let i = 0; i < 36; i++) {
    await page.mouse.wheel(0, i < 26 ? wheelStep : -wheelStep * 1.4);
    await page.waitForTimeout(220);
    await page.evaluate(() => window.__inkMeasurement.positions.push(scrollY));
  }
  const sample = await page.evaluate(() => {
    const state = window.__inkMeasurement;
    cancelAnimationFrame(state.raf);
    const sorted = [...state.frames].sort((a, b) => a - b);
    return {
      frames: sorted.length,
      averageFps: (1000 * sorted.length) / sorted.reduce((a, b) => a + b, 0),
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      over34msPercent: (100 * sorted.filter((ms) => ms > 34).length) / sorted.length,
      positions: state.positions,
    };
  });
  const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.end");
  const { stream } = await complete;
  let raw = "";
  while (true) {
    const chunk = await cdp.send("IO.read", { handle: stream });
    raw += chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString() : chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  await writeFile(join(output, "trace.json"), raw);
  const events = JSON.parse(raw).traceEvents;
  const rendererPids = new Set(
    events
      .filter((event) => event.name === "thread_name" && event.args?.name === "CrRendererMain")
      .map((event) => event.pid),
  );
  // Chromium emits reporter states for individual compositor pipelines. Preserve
  // states per layer tree instead of presenting a misleading global drop rate.
  const reporters = {};
  for (const event of events) {
    if (!rendererPids.has(event.pid) || event.name !== "PipelineReporter") continue;
    const report = event.args?.frame_reporter ?? event.args?.chrome_frame_reporter;
    if (!report?.state) continue;
    const key = `${event.pid}:${report.layer_tree_host_id ?? "unknown"}`;
    reporters[key] ??= {};
    reporters[key][report.state] = (reporters[key][report.state] ?? 0) + 1;
  }
  const presentationEvents = events.filter(
    (event) => rendererPids.has(event.pid) && event.name === "AnimationFrame::Presentation",
  ).length;
  const summary = {
    target,
    timestamp: new Date().toISOString(),
    hardware,
    wheelStep,
    sample,
    compositorReporterStates: reporters,
    presentationEvents,
    errors,
    notes: [
      "rAF sampling measures scheduling, not all displayed frames.",
      "Reporter states come from Chromium trace instrumentation, grouped by layer tree.",
      "Missing reporter data means unavailable, never zero dropped frames.",
      "Scroll workload traverses the document; trace capture adds overhead.",
    ],
  };
  await writeFile(join(output, "summary.json"), JSON.stringify(summary, null, 2));
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} finally {
  await browser.close();
}
