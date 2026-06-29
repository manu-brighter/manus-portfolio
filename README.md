<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0608,40:1a0e12,70:ff6ba0,100:b89aff&height=200&section=header&text=manuelheller.dev&fontSize=42&fontColor=f0e8dc&fontAlignY=38&desc=Craft%20Portfolio%20%E2%80%94%20Toon%20Fluid%20%C2%B7%20Risograph%20%C2%B7%20WebGL&descAlignY=58&descColor=ffc474&animation=fadeIn" width="100%" />

<div align="center">

[![Live](https://img.shields.io/badge/live-manuelheller.dev-ff6ba0?style=for-the-badge&logo=vercel&logoColor=f0e8dc&labelColor=0a0608)](https://manuelheller.dev)&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0a0608)&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-16-f0e8dc?style=for-the-badge&logo=nextdotjs&logoColor=0a0608&labelColor=0a0608)&nbsp;
![License](https://img.shields.io/badge/code-MIT-7ce8c4?style=for-the-badge&labelColor=0a0608)

</div>

<br>

> **Full-Stack Developer · Visual Tinkerer.** Code, Foto, Design — alles dasselbe Handwerk in unterschiedlicher Form.

A production-grade personal portfolio built with AI-augmented workflows. The design direction is **Toon Fluid**: a fullscreen GPU Navier-Stokes fluid simulation, cel-shaded in Risograph aesthetic. The cursor is the force source — ink reacts to every pointer event.

**[→ See it live at manuelheller.dev](https://manuelheller.dev)**

<br>

---

## ✦ What makes it interesting

<table>
<tr>
<td width="50%" valign="top">

**WebGL Fluid Simulation**
One persistent Three.js canvas runs a GPU Navier-Stokes simulation at up to 512² resolution. Five GPU quality tiers (High → Static WebP) are chosen at startup based on renderer detection + frametime probe. The cursor drives ink across every section, including ambient splats for the Photography gallery.

**Risograph Aesthetic**
Four spot colors — Rose `#ff6ba0`, Amber `#ffc474`, Mint `#7ce8c4`, Violet `#b89aff` — on a warm paper base `#f0e8dc`. Cel-shaded fluid, OverprintReveal misregistration animations, and Polaroid framing keep the aesthetic consistent end-to-end.

**OverprintReveal**
The hero H1 uses a custom primitive that stacks three per-character layers (ink + rose ghost + mint ghost), drives them with GSAP, and lands with ±2px resting misregistration. Screen readers get a single `sr-only` sibling — the animated DOM is `aria-hidden`.

</td>
<td width="50%" valign="top">

**Case Study Diorama**
A 4200×1000px SVG illustration pinned horizontally via GSAP ScrollTrigger creates a 420vh scroll track. Absolute-positioned HTML cards animate in sync. Falls back to a mobile carousel at `<768px` or `<900px` height (catches 1366×768 laptops).

**Per-Photo Ink Reveal**
Each photography section image has its own isolated WebGL2 fluid context — a simplified three-program sim (advect + splat + mask) that dissolves a paper overlay to reveal the photograph as it enters the viewport.

**Single RAF Ticker**
GSAP, Lenis smooth-scroll, and React Three Fiber share one `requestAnimationFrame` loop via `src/lib/raf.ts`. No tick duplication, no jitter from competing schedulers.

**4 Locales**
DE (default) / EN / FR / IT via next-intl. Routes always include the `[locale]` segment. Zero hard-coded strings in components.

</td>
</tr>
</table>

<br>

---

## ✦ Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 — App Router, static export |
| **UI** | React 19 · Tailwind v4 · Instrument Serif |
| **WebGL / 3D** | React Three Fiber · Three.js · custom GLSL shaders |
| **Motion** | GSAP · ScrollTrigger · Lenis · single shared RAF ticker |
| **i18n** | next-intl — DE / EN / FR / IT |
| **State** | Zustand — scene visibility, ink-wipe overlay, fluid bus |
| **Testing** | Playwright E2E + axe-core accessibility |
| **Quality** | Biome (lint + format) · TypeScript strict |
| **Deploy** | Static export → Nginx + Cloudflare CDN |
| **Contact** | Cloudflare Worker → Resend (edge, no server runtime) |

</div>

<br>

---

## ✦ Sections

| Section | Description |
|---|---|
| **Hero** | Fullscreen fluid sim · OverprintReveal H1 · right-aligned Instrument Serif |
| **About** | 8-spine editorial flow · Riso PullQuote blocks · object-grid stamps |
| **Skills** | Tech stack · VibecodedStamp · pulsing GSAP loop |
| **Work** | Editorial DOM/SVG cards · each dispatches fluid splats on hover |
| **Case Study** | Diorama horizontal pin · 420vh scroll track · GSAP ScrollTrigger |
| **Photography** | Per-image WebGL ink reveal · asymmetric editorial layout |
| **Playground** | InkDropStudio · TypeAsFluid · runtime Tweakpane controls |
| **Contact** | Form → Cloudflare Worker → Resend · honeypot · mailto fallback |

<br>

---

## ✦ GPU Quality Tiers

| Tier | Resolution | Target |
|---|---|---|
| High | 512² | Discrete GPU |
| Medium | 256² | Integrated GPU (mid) |
| Low | 128² | Integrated GPU (Iris Xe, ≥40fps) |
| Minimal | 96² | Very low-end / mobile |
| Static WebP | — | No WebGL / reduced-motion |

Tier selection runs at startup via renderer name match + frametime probe, cached to `localStorage` to avoid blank-flash on re-visits.

<br>

---

## ✦ Notable source files

```
src/components/scene/FluidSim.tsx          GPU Navier-Stokes sim — 8-pass pipeline
src/components/scene/PhotoInkMask.tsx      Per-photo dedicated WebGL2 fluid reveal
src/components/motion/OverprintReveal.tsx  Riso misregistration reveal primitive
src/components/case-study/DioramaTrack.tsx Sticky-pin horizontal diorama track
src/lib/raf.ts                             Single shared RAF ticker (GSAP+Lenis+R3F)
src/lib/gpu.ts                             GPU capability detection + tier selection
src/lib/fluidBus.ts                        Pub/sub for cross-component splat injection
src/shaders/fluid/                         GLSL — advect, diverge, pressure, splat, render
public/maintenance.html                    Self-contained Riso-styled 503 page
```

<br>

---

## ✦ Development

```bash
pnpm install
pnpm dev          # localhost:3000  (Windows: use dev.cmd instead)

pnpm build        # static export → ./out
pnpm ci:local     # lint + typecheck + build + e2e (mirrors CI)
pnpm test:a11y    # axe across all 4 locales
pnpm lighthouse   # Lighthouse against ./out (Linux/CI; broken on Windows)
```

<br>

---

## ✦ License

Code is **MIT**. All photography © Manuel Heller, all rights reserved.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:b89aff,40:ff6ba0,100:0a0608&height=100&section=footer" width="100%" />
