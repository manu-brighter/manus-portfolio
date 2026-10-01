# Ink interaction follow-up

## Scope

Address the twelve concrete follow-up observations on the released Ink Studio.
Keep the existing two-renderer architecture and avoid extra permanent GPU work.

## Implementation

- Stronger analytical Aquarell with visible rose/violet variation.
- Distance-based pointer energy and smoothed velocity; studio controls excluded.
- Hollow Full Nachtdruck contours, matching the analytical theme's visual idea.
- Studio opacity/transform transition, inert closed content and reduced-motion support.
- Flow naming in all four locales; AI × Me skills badge.
- Quadratic cursor ribbon, fading history, elastic nib and precise hover ring in Full.
- Public CV link in the persistent header, including mobile.
- One measured section model for scroll-rail fill and active dot.
- Public Fly Connectome Sim and Mercurius cards with factual development/research status.
- Visible Full photo masks respond to pointer movement before the one-shot reveal,
  with bounded cadence/resolution and idle sleep.
- Native wheel/trackpad scrolling; retain smooth explicit anchor navigation.

## Verification

Targeted Chromium behavior tests pass. Production build, TypeScript, Biome and
layering checks pass; existing lint warnings remain. Headed laptop inspection
covers Aquarell, both night renderers, curved cursor trail, expanded studio,
additional projects and header widths 393/768/1024/1440. No page exceptions;
tablet header overflow corrected by using the compact menu below 1024px.
Independent review found no blockers, including the final slow-frame fixes.

The full local suite ran 631 cases: 614 passed, 15 were intentionally skipped,
and two WebKit failures exposed slow-frame edge cases. Pointer decay now uses
real elapsed time; the cursor retains three fading geometry anchors during
movement. Both original tests pass unchanged after those fixes. The focused
cross-browser rerun finished with 38 passed and two intentional skips.

Hosted CI remains the release gate. These are interaction and visual
corrections, not evidence of a new universal FPS gain.

Linux WebKit CI exposed a native-wheel regression from the previous global
`overscroll-behavior: none`. An isolated Linux reproduction confirmed that
vertical `none` and `contain` both block wheel scrolling; `auto` restores it.
Keep only horizontal gesture suppression and preserve the original wheel
behavior assertions. The motion test now passes its timeout as Playwright's
options argument.
The corrected production build passes all six targeted Linux WebKit tests and
all eighteen Windows Chromium/WebKit/Mobile Chrome motion and rail tests.
