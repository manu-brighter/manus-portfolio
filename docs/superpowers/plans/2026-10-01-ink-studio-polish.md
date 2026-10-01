# Ink Studio and Portfolio Polish Implementation Plan

**Goal:** Ship the measured text-performance fix and turn the approved ink prototype into a polished default experience, with clear controls, section-aware movement and stronger content presentation.

**Authorization:** Manuel approved the seven proposed improvements and authorized PR merge/release on 1 October 2026. Continue autonomously through review, CI and deployment. Use the existing feature checkout; preserve current uncommitted work.

**Architecture:** The existing scene context owns the selected ink experience. Auto starts with the analytical renderer on every capable device and may lower its resolution/cadence after sustained slow frames. Explicit Light or Full choices are persistent and win over automatic adaptation. Reduced motion and graphics failure retain an honest static fallback. The existing theme switcher becomes a compact accessible Ink Studio. Section choreography and palette transitions run inside the shared lightweight renderer.

**Tech stack:** Existing Next static export, React, Zustand, GSAP ticker, WebGL2 and Playwright. No new dependencies.

## Constraints and ownership

- Keep the asymmetric hero, four languages, keyboard/touch support and real content facts.
- Keep Lite Riso's approved field and palette; section changes adjust placement/strength smoothly.
- No new permanent GPU passes or second renderer for palette transitions.
- Storage errors must not prevent use. Disclose any new storage key in all legal locales.
- Root serializes builds, GPU measurements, git operations and shipping. Agents may edit only their assigned files and run bounded static checks.
- Parent reviews each result and runs a final independent review. Existing main remains protected.

## 1. Production Ink Studio

Files: SceneProvider, SimPresetSwitcher, preview hook/helper/panel replacements, common/legal locale copy, ink experience tests.

- [x] Replace opt-in-only preview with a production experience and default Auto/Light renderer.
- [x] Preserve the `ink-preview` query as a temporary QA override; do not persist URL overrides.
- [x] Persist explicit choices with guarded localStorage. Auto must not promote to expensive physics on its own.
- [x] Keep sustained-window adaptation; expose `reducedQuality?: boolean` to LiteInkScene.
- [x] Integrate theme and motion controls in one compact disclosure with Escape/outside dismissal and focus restoration. No prototype panel on normal routes.
- [x] Cover default route, override, persistence, blocked storage, automatic reduction, explicit full preference, reduced motion and failure status with meaningful tests.

## 2. Section choreography and effect budget

Files: LiteInkScene, ink-lite shader, PhotoInkMask and playground mini-renderer components, targeted tests if behavior changes.

- [x] Add optional `reducedQuality?: boolean` to LiteInkScene; default false. Normal budget900k pixels/60Hz, reduced budget450k pixels/30Hz.
- [x] Observe the active home section; smoothly move ink toward page edges and reduce visual density for work/photos, while hero/contact retain fuller shapes. No per-frame layout reads.
- [x] Interpolate theme palette in the existing render pass; honor visibility and cleanup.
- [x] Ensure photo reveals settle once and mini experiments only initialize after deliberate interaction and pause when offscreen. Avoid permanent extra work in default Light mode.

## 3. Entry and project presentation

Files: Loader, Work/WorkCard and home translations, photography sections if useful, related browser tests.

- [x] Replace the fixed long full-screen loader with a short optional ink introduction; content/navigation remain immediately usable, repeat visits skip it, reduced motion completes immediately. Keep loader-completion subscribers reliable.
- [x] Present the main projects with an easy-to-scan problem/contribution/result hierarchy using existing verified facts and screenshots. Preserve case-study navigation and accessible links.
- [x] Keep photography generous and usable by touch; any reveal is one-shot and text/photos remain readable without GL.
- [x] Cover loader completion/returning visit and project navigation with behavioral tests.

## 4. Integration, review and release

Implementation and local production verification are complete. Browser coverage
includes Chromium, WebKit and mobile Chrome; failed cases were corrected and
rerun. Hosted CI and deployment remain the release gates below.

- [x] Update legacy tests that intentionally exercise Full mode to request that mode explicitly; retain separate default-Light tests.
- [x] Run repository lint, TypeScript/build and required local test suite against the production export.
- [x] Inspect desktop/mobile/theme screenshots and sequential real-GPU frame traces. Use measurements, not an assumed FPS guarantee.
- [x] Obtain independent review, fix verified issues, update outdated project guidance and documentation.
- [ ] Commit with the repository convention, push the named feature branch, create/attach a PR via gh.
- [ ] Drive all required CI checks green, merge the reviewed head, verify deployment and live behavior.
