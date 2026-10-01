# Ink performance and verification

The default experience uses a single-pass analytical ink renderer. Full fluid
simulation remains an explicit visitor choice in the Ink Studio. Both renderers
share the five colour themes. Auto starts with Flow (the analytical renderer)
and reduces its pixel budget
and update cadence after two sustained slow sampling windows. A manual choice is
not silently replaced. Reduced motion and failed graphics initialization take
precedence over animated modes.

## What actually improved scroll performance

Settled OverprintReveal headings previously retained separate colour layers for
every character. They now retain the printed accents with text shadows and
release their animation layers after the reveal. Scroll progress updates its
transform directly instead of triggering a React render on each scroll frame.
In Full mode, photo masks allocate when visible, wake briefly on cursor movement
before their one-shot reveal, then release resources on completion. Ambient work
sleeps after 750 ms without input; mask rendering is capped at 30 Hz and 450,000
output pixels. Flow keeps clean photographs without mask simulations.
Experiment previews require intentional mouse or keyboard interaction
and pause outside the viewport or while the document is hidden.

## Measurements on 1 October 2026

Production export, Windows, AMD Radeon 860M through Chromium ANGLE/D3D11,
1920 × 1080 viewport, device scale factor 1.25. Software-rendered headless results
were not used to claim laptop performance.

In a controlled CSS A/B on the same intermediate build and scroll workload,
restoring the old permanent heading layers produced 53.7 average rAF FPS.
The new settled-text implementation produced 66.8 and 66.3 in two runs.
Time attributed to Layerize fell from 3.96 seconds to 1.95–2.13 seconds.
That workload covered the upper portion of the page, not the entire photo section.

The subsequent full-document workload recorded 66.6 FPS before studio polish
and 67.3 FPS after it, with the same 26.7 ms p95 interval. This is essentially
unchanged performance, not evidence of another material FPS improvement.
The corresponding Chromium traces also contain partial and dropped compositor
reports. Report counts were 21 versus 64 `STATE_DROPPED`; these are individual
pipeline reports, not a validated global displayed-frame drop percentage.
The traces do not establish universally smooth delivery or an improvement in
compositor drops. Background applications, refresh cadence and trace overhead
affect these short measurements.

## Interaction follow-up

Wheel and trackpad input now use native browser scrolling. Lenis remains for
explicit anchor navigation. A headed-browser baseline on the preceding release
intercepted all 13 sampled wheel events and continued one scroll impulse for
about 874 ms. This change removes that additional interpolation, not every
possible source of dropped frames. The regression test asserts actual wheel
events remain uncancelled and scroll the document; no new FPS gain is claimed.

The section rail now derives its active dot and fill from the same cached
section boundaries, including the case-study pin span. Flow pointer energy
depends on travelled distance and smoothed velocity, rather than resetting to
full strength for every event. Pointer response uses real visible elapsed time,
so slow frames cannot stretch its decay across many seconds. Ambient animation
steps retain their cap. Studio controls do not inject pointer energy.
Full Nachtdruck uses hollow, antialiased density contours with three dye samples
in its existing render pass. Neither visual correction adds a render pass.

## Reproduce a hardware trace

Serve the production `out` directory, then run:

```sh
node scripts/measure-ink-performance.mjs http://127.0.0.1:3010/de/ auto
node scripts/measure-ink-performance.mjs 'http://127.0.0.1:3010/de/?ink-preview=full' full
```

Run one browser at a time, keep its window in front, and avoid builds or other
browser tests during measurement. The script refuses known software renderers
and writes a summary and raw Chrome trace under ignored `test-results/performance`.
It traverses the full page and records both rAF intervals and compositor pipeline
states. rAF timing alone does not prove every frame reached the display.

Temporary `ink-preview=auto|light|full` query overrides do not replace a visitor's
saved choice. The normal interface is the Ink Studio. Browser tests cover mode
persistence, blocked storage, real canvas resolution reduction, explicit Full,
reduced motion and graphics failures.
