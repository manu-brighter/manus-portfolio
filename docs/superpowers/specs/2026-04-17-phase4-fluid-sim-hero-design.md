# Phase 4 — Fluid-Sim Hero: Design Spec

> Navier-Stokes GPU solver, toon render pass, GPU capability probe,
> 5 quality tiers, static fallback. Cursor is force source.

Reference: `docs/plan.md` §4.2, §6.2, §7, §8, §13 Phase 4.

---

## 1. Architecture Overview

### Integration Pattern: Hybrid R3F + Raw WebGL2

The fluid simulation runs as raw WebGL2 FBO ping-pong operations on the
same GL context that R3F owns. R3F serves as host container (canvas +
pointer events + scene graph for the output quad). The simulation does
NOT use R3F internals (useFBO, RenderTexture, etc.).

Tick order in shared RAF (`src/lib/raf.ts`):

| Priority | Consumer | Action |
|----------|----------|--------|
| 0 | Lenis | Scroll position (Phase 3, exists) |
| 15 | FluidOrchestrator.step() | All sim passes on raw GL |
| 20 | R3F advance() | Renders scene graph (fullscreen quad with output texture) |

### Module Map

| Module | Path | Responsibility |
|--------|------|----------------|
| FluidOrchestrator | `src/components/scene/FluidOrchestrator.ts` | Pure-TS class. Owns all WebGL2 resources (FBOs, programs, textures). Methods: `init(gl, tier)`, `step(dt, pointer)`, `resize(w, h)`, `pause()`, `resume()`, `dispose()`, `getOutputTexture()`. No React. |
| FluidSim | `src/components/scene/FluidSim.tsx` | R3F component. Creates orchestrator, maps output texture to fullscreen quad, forwards pointer events. Registers at `subscribe(fn, 15)`. |
| Canvas | `src/components/scene/Canvas.tsx` | Persistent `<Canvas frameloop="never">`, registers `advance()` at `subscribe(fn, 20)`. GL config: `antialias: false`, `alpha: false`, `powerPreference: 'high-performance'`. |
| SceneProvider | `src/components/scene/SceneProvider.tsx` | Context for GPU tier + reduced motion. Decides whether to render `<Canvas>` or static fallback. |
| gpu.ts | `src/lib/gpu.ts` | `probeGPU(gl): GPUTier` — renderer string lookup + tier config (grid, iterations, halfRate). |
| useGPUCapability | `src/hooks/useGPUCapability.ts` | Hook: calls `probeGPU` once + adaptive re-tiering after 30 frames. |

### Component Tree (in locale layout)

```
<MotionProvider>              ← Phase 3, exists
  <SceneProvider>             ← new
    <Canvas>                  ← conditional: only if !reducedMotion && tier !== 'static'
      <FluidSim />
    </Canvas>
    ─ OR ─
    <StaticFallback />        ← CSS gradient placeholder (WebP later)
    <Nav />
    <main>
      <HeroSection />         ← DOM overlay, right-aligned typography
    </main>
    <Footer />
  </SceneProvider>
</MotionProvider>
```

---

## 2. Navier-Stokes Pipeline

### Pass Order (per frame)

```
1. Splat           → inject cursor/touch force + color into velocity/dye fields
2. Curl            → compute vorticity field (for confinement)
3. Vorticity       → add vorticity confinement force to velocity
4. Advect (vel)    → semi-Lagrangian self-advection of velocity field
5. Divergence      → compute divergence of velocity field
6. Pressure        → Jacobi iteration (N× per tier) → pressure field
7. Gradient-Sub    → subtract pressure gradient from velocity → divergence-free
8. Advect (dye)    → transport dye/density field through velocity
9. Render-Toon     → posterize + color-map + Sobel outlines + paper grain
```

Passes 1–8 operate at sim-grid resolution. Pass 9 reads the final dye
field and renders at **canvas resolution** (the only fullres pass).

### FBO Topology (Ping-Pong)

| FBO Pair | Format | Size | Notes |
|----------|--------|------|-------|
| velocity A/B | RG16F | sim grid | Ping-pong for self-advection |
| dye A/B | RGBA16F | sim grid | 4 channels for spot colors |
| pressure A/B | R16F | sim grid | Jacobi iteration ping-pong |
| divergence | R16F | sim grid | Single (read-only after compute) |
| curl | R16F | sim grid | Single (read-only after compute) |

Total: 11 FBOs (10 sim + 1 output). At 256² Medium tier with float16:
- velocity: 2 × 256² × 4B = 512 KB
- dye: 2 × 256² × 8B = 1 MB
- pressure: 2 × 256² × 2B = 256 KB
- divergence + curl: 2 × 256² × 2B = 256 KB
- output: 1 × canvas-res × 8B (RGBA16F) — render-toon target, exposed via `getOutputTexture()`
- **Total sim: ~2 MB + output at canvas res** (well within budget even on Iris Xe)

### Render-Toon Pass Detail

Renders to a dedicated **output FBO** (RGBA16F, canvas resolution — not
sim-grid resolution). This texture is exposed via `getOutputTexture()`
and mapped onto the R3F fullscreen quad. All in one fragment shader
(`render-toon.frag.glsl`):

1. Sample dye field → `vec4 raw`
2. Posterize: `floor(raw * levels + 0.5) / levels` with `levels = 3.0–4.0`
3. Color-map: map posterized luminance to spot colors (rose → amber → mint → violet)
4. Sobel: 3×3 kernel on posterized field → edge intensity → black outlines (2px retina-aware via `dFdx`/`dFdy` scaling)
5. Paper grain: procedural noise on luminance, mixed with paper base color

### Shared Vertex Shader

All passes share a common fullscreen-quad vertex shader (`src/shaders/common/quad.vert.glsl`):
- Attribute-less: `gl_VertexID` → clip-space triangle that covers the viewport
- Outputs UV for fragment shaders
- Single `gl.drawArrays(gl.TRIANGLES, 0, 3)` per pass

---

## 3. GPU Capability Probe + Adaptive Quality

### Tier Configuration

| Tier | Grid | Jacobi Iter | Pressure Iter | Half-Rate | Trigger |
|------|------|-------------|---------------|-----------|---------|
| high | 512² | 25 | 40 | no | Renderer matches RTX/M2+, or frametime < 8ms |
| medium | 256² | 20 | 30 | no | Default start, or frametime 8–14ms |
| low | 128² | 15 | 20 | yes | Renderer "Iris Xe" / older iGPU, or frametime 14–22ms |
| minimal | 96² | 10 | 15 | yes | Frametime > 22ms |
| static | — | — | — | — | `prefers-reduced-motion` OR no WebGL2 OR probe failed |

### Probe Flow

```
1. SceneProvider mounts
2. useReducedMotion() → true?  → static fallback, done.
3. Canvas mounts → gl context available
4. gpu.probeGPU(gl):
   a. WebGL2 check — no WebGL2? → static
   b. WEBGL_debug_renderer_info → parse renderer string
      - Match in lookup map? → direct tier, SKIP adaptive
      - No match / extension blocked? → medium as start tier
5. FluidOrchestrator.init(gl, tier)
6. First 30 frames: measure frametime (glFinish + performance.now)
7. Median frametime → adjust tier (up or down, one-time)
8. Cache final tier in localStorage (key: 'manus-gpu-tier', expire: 30 days)
```

### Renderer String Lookup

Substring match, case-insensitive:

```
high:    'rtx', 'rx 7', 'apple m2', 'apple m3', 'apple m4'
low:     'iris xe', 'iris plus', 'uhd 6', 'uhd 7'
minimal: 'mali-g', 'adreno 6'
```

Everything unmatched → medium + adaptive measurement.

### Half-Rate

Tied to tier, not adaptive. The orchestrator splits its work into two
phases per tick:

1. **Sim-step** (passes 1–8): runs every frame at full-rate tiers, every
   other frame at half-rate tiers (low/minimal). Writes to sim FBOs.
2. **Render-step** (pass 9, render-toon): runs **every frame** regardless
   of half-rate. Reads the latest dye field (which may be 1 frame stale
   at half-rate) and writes to the output FBO.

This keeps visual output at 60fps while halving sim compute cost.

---

## 4. Interaction

### Cursor / Pointer (Desktop)

- `pointermove` on canvas → continuous velocity injection along movement direction
- `pointerdown` → splat (radial burst of dye + velocity)
- Pointer position and delta are passed as uniforms to the splat pass
- Splat color cycles through spot colors (rose → amber → mint → violet)

### Touch

Same physics as desktop:
- `pointermove` (touch) → velocity injection along drag
- `pointerdown` (touch) → splat
- No custom cursor on touch (`pointer: coarse` media query)
- `touch-action: none` on canvas to suppress browser gestures

### Ambient Motion (Idle)

- Timer tracks last pointer activity
- After 10s idle: curl-noise amplitude fades in over 2s (`uAmbientStrength` uniform, 0 → target)
- On pointer move: fade-out over 0.5s
- Curl-noise frequency + amplitude are Leva-tunable uniforms in dev
- Curl-noise is injected as additional force in the splat pass, conditioned on `uAmbientStrength > 0.0`

---

## 5. Pause / Resume

### IntersectionObserver

FluidSim registers an `IntersectionObserver` on the hero section element.
When the hero is not visible → `orchestrator.pause()` (skips `step()` in
the tick callback, R3F still renders the last frame as static). When
visible again → `orchestrator.resume()`.

### Visibility Change

Tab in background: GSAP ticker already pauses natively via
`lagSmoothing(0)` (set in Phase 3). Since FluidOrchestrator.step() is
driven by the shared RAF which is the GSAP ticker, it automatically
pauses when the tab is hidden. No additional handling needed.

---

## 6. Static Fallback

### Condition

Rendered when `useReducedMotion() === true` OR `gpuTier === 'static'`.

### Phase 4 Implementation

CSS gradient placeholder in Riso spot colors. Structure:

```tsx
<div
  className="absolute inset-0"
  style={{
    background: 'linear-gradient(135deg, var(--color-spot-rose), var(--color-spot-amber), var(--color-spot-mint), var(--color-spot-violet))',
    opacity: 0.3,
    mixBlendMode: 'multiply',
  }}
/>
```

Overlaid on paper background. Subtler than the live sim but maintains
the Riso color presence.

### Follow-up (post Phase 4)

Replace CSS gradient with pre-rendered WebP stills (< 30kB each):
- 3 viewport variants: desktop (16:9), tablet (4:3), mobile (9:16)
- Generated by screenshotting the live sim at representative states
- NOT per-locale (fluid output is language-independent)

---

## 7. Shader Files

```
src/shaders/
├── common/
│   ├── quad.vert.glsl         — attribute-less fullscreen triangle
│   ├── noise.glsl             — simplex + curl noise helpers
│   ├── posterize.glsl         — step-quantization function
│   └── sobel.glsl             — 3×3 edge detection
└── fluid/
    ├── splat.frag.glsl        — cursor force + color injection
    ├── curl.frag.glsl         — vorticity field computation
    ├── vorticity.frag.glsl    — vorticity confinement force
    ├── advect.frag.glsl       — semi-Lagrangian advection
    ├── divergence.frag.glsl   — velocity divergence
    ├── pressure.frag.glsl     — Jacobi pressure solve (single iteration)
    ├── gradient-subtract.frag.glsl — pressure gradient subtraction
    └── render-toon.frag.glsl  — posterize + color-map + outlines + grain
```

All fragment shaders use `#version 300 es` (WebGL2). Precision: `highp float`
for sim passes, `mediump float` acceptable for render-toon on mobile.

Common GLSL files are included via string concatenation at program compile
time in FluidOrchestrator (no `#include` in WebGL2 — we prepend shared
chunks before compilation).

---

## 8. Performance Constraints

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Frametime (High, RTX) | < 8ms | < 12ms |
| Frametime (Low, Iris Xe) | < 18ms | < 22ms |
| Frametime (Minimal, mobile) | < 28ms | < 33ms |
| FBO memory (Medium tier) | ~2 MB | < 5 MB |
| JS overhead (orchestrator) | < 0.5ms/frame | < 1ms/frame |
| Lighthouse perf | ≥ 95 | ≥ 90 |

Canvas config: `antialias: false` (toon rendering doesn't benefit),
`alpha: false` (paper color as clear color saves compositing).

---

## 9. Deviations from Plan

Document in `.claude/CLAUDE.md` under deviations:

- **curl.frag.glsl added**: Plan §5 lists 7 fluid shaders. We add a
  dedicated curl pass (8th) rather than inlining curl computation in
  the vorticity shader. Cleaner separation, negligible perf cost.
- **quad.vert.glsl in common/**: Plan implies vertex shader per pass
  but all passes share the same fullscreen triangle. Single file.
- **CSS gradient as static fallback**: Plan says WebP stills. Phase 4
  uses CSS gradient placeholder; WebP stills follow when sim is
  visually complete.
- **Adaptive quality tier**: Plan §8 describes fixed tiers only. We add
  runtime adaptive measurement (30 frames) with localStorage caching
  as an enhancement for unrecognized GPUs.
