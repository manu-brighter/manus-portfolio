"use client";

import { useEffect } from "react";

/**
 * One-shot recording tool — captures the live FluidSim canvas as a
 * VP9 webm via MediaRecorder + downloads it. Used to generate the
 * `public/ambient-loop.mp4` asset that the mobile path plays back
 * instead of running the WebGL pipeline live (iOS Safari was culling
 * the position:fixed WebGL layer during momentum scroll, causing a
 * visible blink — pre-rendered video is composited differently and
 * doesn't hit that path). MediaRecorder outputs webm; we transcode
 * to H.264 mp4 for universal iOS Safari support.
 *
 * Dev-only: gated in `[locale]/layout.tsx` via NODE_ENV + next/dynamic
 * so the chunk is tree-shaken from production bundles entirely. The
 * MediaRecorder glue here never ships to prod users.
 *
 * Usage (one-time, from Manuel's dev environment):
 *
 *   1. `pnpm dev`
 *   2. Open http://localhost:3000?record-bg=30 (30 = duration in
 *      seconds; 30-60s gives a good balance of file size vs
 *      perceptible loop). Optional: open Chrome DevTools mobile
 *      emulation first (iPhone Pro Max preset) so the captured
 *      aspect ratio matches mobile viewports without object-fit
 *      cropping.
 *   3. Wait for the page to load + the loader to fade. Wait another
 *      ~4 seconds for the sim's ambient warmup. The recorder waits
 *      automatically, but visual feedback helps you confirm.
 *   4. After `record-bg` seconds the browser auto-downloads
 *      `ambient-loop-Ns.webm`. Transcode to H.264 mp4 for iOS
 *      Safari compatibility (VP9 mp4 plays as a still on iOS):
 *        ffmpeg -i ambient-loop-Ns.webm -c:v libx264 -crf 30 \
 *          -movflags +faststart -an public/ambient-loop.mp4
 *      Optionally boomerang for a seamless loop:
 *        ffmpeg -i ambient-loop.mp4 \
 *          -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0" \
 *          -c:v libx264 -crf 30 -movflags +faststart public/ambient-loop.mp4
 *
 * Inactive when no query param. Returns null in all cases — pure
 * side-effect component.
 */
export function AmbientRecorder() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("record-bg");
    if (!raw) return;

    const seconds = Number.parseInt(raw, 10);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 600) {
      // biome-ignore lint/suspicious/noConsole: debug tool
      console.warn("[ambient-recorder] invalid duration; expected 1-600", raw);
      return;
    }

    let cancelled = false;

    const run = async () => {
      // Wait for the sim to be in steady state. SceneProvider defers
      // the canvas mount by 1700ms after loader-complete on fresh
      // visits; the warmup gate opens ~100ms after FluidSim mounts;
      // ambient ramps in over the next ~1s. Total ~3s after loader
      // fades. Add 1s slack.
      const WARMUP_WAIT_MS = 4000;
      // biome-ignore lint/suspicious/noConsole: debug tool
      console.log(`[ambient-recorder] warming up for ${WARMUP_WAIT_MS}ms...`);
      await new Promise((r) => setTimeout(r, WARMUP_WAIT_MS));
      if (cancelled) return;

      const canvas = document.querySelector<HTMLCanvasElement>('[data-scene="root"] canvas');
      if (!canvas) {
        // biome-ignore lint/suspicious/noConsole: debug tool
        console.error('[ambient-recorder] no [data-scene="root"] canvas found');
        return;
      }

      const stream = canvas.captureStream(60);
      // VP9 is widely supported on modern browsers and gives much
      // better quality-per-byte than VP8. iOS Safari 17+ supports
      // playback. Bitrate 4 Mbps is a good middle ground for a 30s
      // mobile bg loop (~15MB output).
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 4_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ambient-loop-${seconds}s.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        // biome-ignore lint/suspicious/noConsole: debug tool
        console.log(
          `[ambient-recorder] downloaded ambient-loop-${seconds}s.webm (${(blob.size / 1024 / 1024).toFixed(1)}MB)`,
        );
      };

      recorder.start();
      // biome-ignore lint/suspicious/noConsole: debug tool
      console.log(`[ambient-recorder] recording ${seconds}s @ 60fps, 4Mbps VP9...`);
      window.setTimeout(() => {
        if (cancelled) return;
        recorder.stop();
      }, seconds * 1000);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
