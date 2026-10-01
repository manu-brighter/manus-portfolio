# Adaptive ink comparison

> Historical prototype specification. Superseded by the approved
> [production Ink Studio plan](../plans/2026-10-01-ink-studio-polish.md).
> Its query-only scope, memory-only preferences and automatic Full-to-Light
> transition no longer describe production: Auto now starts Light and may
> reduce its budget; explicit mode choices are persisted.

Manuel approved continuously animated, equally considered visual variants on 2026-10-01. The lighter variant can approximate ink instead of solving full fluid physics. Visitors must be able to override automatic reduction with a clearly explained full-simulation switch.

## Reviewable first deliverable

A local comparison on the existing home page, enabled only by `?ink-preview=auto`, `light`, or `full`. Normal routes retain their shipped behavior until the visual comparison is reviewed. This prototype establishes actual laptop performance and visual suitability before a production rollout.

Both variants use the same content, typography and five palettes. Light ink remains continuously animated and responds to pointer and scrolling. One inexpensive full-screen shader replaces the fluid solver; resolution is capped by total pixel count. Optional photo/cursor/wipe effects use the same light-mode signal.

The preview panel exposes a native checkbox labelled “Volle Tintensimulation”, an automatic-mode reset and the current rendering mode. Automatic reduction gets the copy “Etwas weniger Wirbel, damit alles flüssig bleibt.” followed by an explanation and the possibility of stutter when overriding. A manually selected light mode must not claim the device was measured as slow. Preview mode and preferences stay in memory, with no new storage keys.

Automatic mode watches foreground frame intervals after startup. Repeated slow windows can select light once; manual full must remain full. A transient pause, resize or background tab must not trigger a downgrade. Reduced motion and unavailable WebGL continue to win over every preference.

## Validation

First verify the actual renderer in a visible Playwright browser. Compare identical viewport, fresh contexts and scripted idle, pointer and scroll workloads sequentially. Frame intervals measure page scheduling, not exact GPU execution or presentation. Record p95 and long frames in addition to the average. Run multiple variants on the same laptop; do not interpret software-renderer CI as hardware evidence.

Browser checks cover preview gating, light/full toggle, automatic-reduction copy, reduced motion, keyboard operation, theme changes and absence of shader/runtime errors. Build, types and focused lint are required. Screenshots and the interactive local preview support Manuel's visual decision.

## Production follow-up after visual review

Conservative startup, long-lived preference semantics, translated privacy disclosure if persistence is added, measured quality upgrades, seamless transitions and wider mobile/browser/device acceptance remain a separate production decision. The old “no runtime watchdog” instruction is intentionally reconsidered by this approved performance direction; the current experiment is query-gated.
