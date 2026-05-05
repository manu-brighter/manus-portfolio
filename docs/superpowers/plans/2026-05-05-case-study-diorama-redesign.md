# Case Study Diorama Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the failed slideshow-style flex-track Case Study with a horizontal-pan **Diorama**: a single wide comic-style illustration of a photographer's table with scattered/overlapping cards, embedded tools, and dedicated WebGL fluid-sim dark-ink columns at viewport edges.

**Architecture:** vh-based coordinate system (4200×1000 viewBox, rendered at 100vh tall, ~420vh wide). Sticky-pin section + horizontal-translate track via GSAP ScrollTrigger. Single SVG illustration component holds table outlines + tools + decorations. Cards are HTML `<div>`s absolutely positioned in vh units over the SVG. Dedicated WebGL2 canvas above the diorama renders dark-ink fluid columns at left+right viewport edges via continuous edge-splat injection.

**Tech Stack:** Existing — Next.js 16, React 19, TypeScript, Tailwind v4, GSAP + ScrollTrigger, next-intl, sharp. New deps: none.

**Spec reference:** [`docs/superpowers/specs/2026-05-05-case-study-diorama-redesign.md`](../specs/2026-05-05-case-study-diorama-redesign.md)

**Branch:** `feat/work-casestudy-rework` (continuation; current state at commit `97247da`).

---

## File structure

### New files

```
src/components/case-study/
├── DioramaTrack.tsx               # Sticky-pin + horizontal-translate wrapper
├── DioramaIllustration.tsx        # SVG: table outlines + tools + decorative splats
├── DioramaCards.tsx               # Card layer: 6 cards absolute-positioned in vh
├── InkColumnFluidSim.tsx          # Dedicated WebGL2 fluid-sim for ink columns
└── cards/
    ├── HookCard.tsx               # Card 1 — phone-screenshot polaroid + pull-quote
    ├── WhatCard.tsx               # Card 2 — facts dl + story prose
    ├── StackCard.tsx              # Card 3 — tech-stack notebook
    ├── AdminHighlightCard.tsx     # Card 4 — admin-dashboard polaroid + features
    ├── OverlayHighlightCard.tsx   # Card 5 — overlay-stream polaroid + features
    └── PublicCard.tsx             # Card 6 — 3 sub-polaroids (stats/members/form)
```

### Modified files

- `src/components/sections/CaseStudy.tsx` — full rewrite
- `.claude/CLAUDE.md` — Phase 12 case-study redesign deviation entry

### Deleted files (obsolete after redesign)

```
src/components/case-study/StationContainer.tsx       # Replaced by DioramaTrack
src/components/case-study/StationFrame.tsx           # No longer needed
src/components/case-study/TrackDecor.tsx             # Decorations now in DioramaIllustration
src/components/case-study/InkSplat.tsx               # Decorations now in DioramaIllustration
src/components/case-study/PaperWorkplace.tsx         # Already disabled, drop file
src/components/case-study/InkTransition.tsx          # Replaced by InkColumnFluidSim
src/components/case-study/stations/HookStation.tsx   # Replaced by cards/HookCard.tsx
src/components/case-study/stations/WhatStation.tsx   # Replaced by cards/WhatCard.tsx
src/components/case-study/stations/StackStation.tsx  # Replaced by cards/StackCard.tsx
src/components/case-study/stations/HighlightStation.tsx  # Split into Admin + Overlay cards
src/components/case-study/stations/PublicStation.tsx # Replaced by cards/PublicCard.tsx
src/components/case-study/cliparts/Lupe.tsx          # Drawn in DioramaIllustration
src/components/case-study/cliparts/PenScribble.tsx   # Drawn in DioramaIllustration (or dropped)
src/components/case-study/cliparts/TintenSpot.tsx    # Drawn in DioramaIllustration
src/components/case-study/cliparts/CoffeeRing.tsx    # Drawn in DioramaIllustration
```

### Files unchanged (kept as-is)

- `src/components/case-study/Polaroid.tsx` — primitive reused by cards
- `src/components/case-study/StackNotebook.tsx` — primitive reused by StackCard
- `src/lib/pathTween.ts` — kept for potential future use, no consumer now
- `src/components/sections/CaseStudy.tsx` — modified, not deleted
- `messages/{de,en,fr,it}.json` — `caseStudy.*` and `caseStudy.stations.*` keys remain valid
- `src/lib/gl/compileShader.ts` — consumed by InkColumnFluidSim
- `src/lib/raf.ts` — consumed by InkColumnFluidSim
- `src/shaders/ink-mask/{advect,splat,mask}.frag.glsl` — reused by InkColumnFluidSim

---

## Task list

### Task 1: Cleanup obsolete case-study files

**Files:**
- Delete: 16 files listed above (StationContainer, StationFrame, TrackDecor, InkSplat, PaperWorkplace, InkTransition, 5 station files, 4 clipart files)

- [ ] **Step 1.1: Delete obsolete files**

```bash
git rm src/components/case-study/StationContainer.tsx \
       src/components/case-study/StationFrame.tsx \
       src/components/case-study/TrackDecor.tsx \
       src/components/case-study/InkSplat.tsx \
       src/components/case-study/PaperWorkplace.tsx \
       src/components/case-study/InkTransition.tsx \
       src/components/case-study/stations/HookStation.tsx \
       src/components/case-study/stations/WhatStation.tsx \
       src/components/case-study/stations/StackStation.tsx \
       src/components/case-study/stations/HighlightStation.tsx \
       src/components/case-study/stations/PublicStation.tsx \
       src/components/case-study/cliparts/Lupe.tsx \
       src/components/case-study/cliparts/PenScribble.tsx \
       src/components/case-study/cliparts/TintenSpot.tsx \
       src/components/case-study/cliparts/CoffeeRing.tsx
rmdir src/components/case-study/stations src/components/case-study/cliparts
```

- [ ] **Step 1.2: Stub CaseStudy.tsx temporarily**

Until Task 7 wires up the new composition, replace `src/components/sections/CaseStudy.tsx` with a minimal stub so the build doesn't break. Replace its entire contents with:

```tsx
"use client";

import { useTranslations } from "next-intl";

/**
 * CaseStudy — temporary stub during diorama redesign (Task 1 of plan
 * 2026-05-05). Will be rewritten in Task 7 to compose DioramaTrack +
 * DioramaIllustration + DioramaCards + InkColumnFluidSim.
 */
export function CaseStudy() {
  const t = useTranslations("caseStudy");
  return (
    <section
      id="case-study"
      aria-labelledby="case-study-heading"
      className="container-page py-20 text-center"
    >
      <h2 id="case-study-heading" className="type-h2 text-ink-muted">
        {t("headline")} — Diorama Redesign in Progress
      </h2>
    </section>
  );
}
```

- [ ] **Step 1.3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all clean. (Stub renders a placeholder, build succeeds.)

- [ ] **Step 1.4: Commit**

```bash
git add src/components/sections/CaseStudy.tsx
git commit -m "chore(case-study): clean slate — drop obsolete slideshow components, stub section for diorama rebuild"
```

---

### Task 2: DioramaTrack — sticky-pin + horizontal-translate

**Files:**
- Create: `src/components/case-study/DioramaTrack.tsx`

- [ ] **Step 2.1: Write the component**

Create `src/components/case-study/DioramaTrack.tsx` with this content:

```tsx
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * DioramaTrack — wraps the Case Study diorama (illustration + cards),
 * pins the section vertically, translates the inner track horizontally
 * as the user scrolls.
 *
 * vh-based coordinate system: the diorama is intrinsically 4200×1000
 * (viewBox units). Rendered at height: 100vh, width: 420vh — so the
 * track scales consistently across normal desktop and ultrawide
 * displays. Ink-column fluid sim is rendered separately by parent.
 *
 * Mobile (<768px) and reduced-motion: pin disabled, children render
 * in a vertical fallback flow (parent passes a `mobileFallback` prop
 * with a vertical-stack representation).
 */

const MOBILE_BREAKPOINT = 768;
const TRACK_WIDTH_VH = 420;

type Props = {
  /** Diorama content — typically <DioramaIllustration /> + <DioramaCards />. */
  children: ReactNode;
  /** Vertical-stack fallback rendered on mobile / reduced-motion. */
  mobileFallback: ReactNode;
};

export function DioramaTrack({ children, mobileFallback }: Props) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let trigger: ScrollTrigger | null = null;
    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const trackWidth = track.scrollWidth;
        const viewportWidth = section.clientWidth;
        let distance = trackWidth - viewportWidth;
        if (distance <= 0) return;

        trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            distance = track.scrollWidth - section.clientWidth;
          },
          onUpdate: (self) => {
            gsap.set(track, { x: -distance * self.progress });
          },
        });

        ScrollTrigger.refresh();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      trigger?.kill();
      gsap.set(track, { x: 0 });
    };
  }, [reducedMotion, isMobile]);

  if (isMobile || reducedMotion) {
    return (
      <section id="case-study" aria-labelledby="case-study-heading" className="relative py-20">
        {mobileFallback}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative h-screen overflow-hidden"
    >
      <div
        ref={trackRef}
        className="relative h-full"
        style={{ width: `${TRACK_WIDTH_VH}vh` }}
      >
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 2.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 2.3: Commit**

```bash
git add src/components/case-study/DioramaTrack.tsx
git commit -m "feat(case-study): DioramaTrack — sticky-pin + horizontal-translate wrapper for vh-based diorama"
```

---

### Task 3: DioramaIllustration — SVG with table outlines + tools + decorations

**Files:**
- Create: `src/components/case-study/DioramaIllustration.tsx`

- [ ] **Step 3.1: Write the component**

Create `src/components/case-study/DioramaIllustration.tsx`:

```tsx
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * DioramaIllustration — single SVG component rendering all background
 * elements of the Case Study diorama:
 *   - Comic-style table-edge outlines (top + bottom)
 *   - Embedded tools: camera, hot-shoe flash, pencil, ruler, lupe,
 *     coffee mug top-down
 *   - Decorative ink splats (Riso spot colors, scattered)
 *
 * ViewBox 4200×1000, preserveAspectRatio xMidYMid meet. Rendered at
 * h-full inside DioramaTrack (track is 420vh wide, so SVG fills track).
 *
 * The Lupe element bobs ±2px y in a 3s sine loop (preserves the prior
 * Lupe.tsx animation behaviour). Other tools are static.
 */

export function DioramaIllustration() {
  const reducedMotion = useReducedMotion();
  const lupeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const lupe = lupeRef.current;
    if (!lupe) return;
    const tween = gsap.to(lupe, {
      y: -2,
      duration: 1.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 4200 1000"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      <title>Case Study Foto-Workplace illustration</title>

      {/* Comic-style table-edge outlines (top + bottom) */}
      <path
        d="M 110 80 Q 600 65, 1200 90 Q 1800 70, 2400 95 Q 3000 75, 3600 95 L 4090 95"
        stroke="var(--color-ink)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 110 920 Q 700 935, 1300 920 Q 1900 940, 2500 925 Q 3100 935, 3700 920 L 4090 920"
        stroke="var(--color-ink)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />

      {/* Camera (Sony α7-style top-down, enlarged ~30% from prior iteration) */}
      <g transform="translate(240, 130)">
        <rect x={0} y={28} width={190} height={108} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} rx={8} />
        <rect x={55} y={0} width={80} height={28} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} />
        <circle cx={95} cy={82} r={38} fill="none" stroke="var(--color-ink)" strokeWidth={3} />
        <circle cx={95} cy={82} r={24} fill="var(--color-spot-rose)" opacity={0.5} />
        <circle cx={95} cy={82} r={14} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
        <circle cx={166} cy={40} r={5} fill="var(--color-ink)" />
      </g>

      {/* Hot-shoe flash (top-down) */}
      <g transform="translate(540, 145) rotate(8)">
        <rect x={0} y={0} width={90} height={55} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} rx={3} />
        <rect x={8} y={8} width={74} height={39} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
        <line x1={20} y1={14} x2={20} y2={42} stroke="var(--color-ink)" strokeWidth={0.8} opacity={0.5} />
        <line x1={40} y1={14} x2={40} y2={42} stroke="var(--color-ink)" strokeWidth={0.8} opacity={0.5} />
        <line x1={60} y1={14} x2={60} y2={42} stroke="var(--color-ink)" strokeWidth={0.8} opacity={0.5} />
        <rect x={22} y={55} width={46} height={70} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} rx={3} />
        <rect x={32} y={125} width={26} height={10} fill="var(--color-ink)" />
        <circle cx={45} cy={85} r={7} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      </g>

      {/* Pencil */}
      <g transform="translate(1100, 110) rotate(-20)">
        <rect x={0} y={0} width={180} height={14} fill="var(--color-spot-amber)" stroke="var(--color-ink)" strokeWidth={2} />
        <polygon points="180,0 200,7 180,14" fill="var(--color-ink)" />
        <rect x={-15} y={0} width={15} height={14} fill="var(--color-ink)" />
      </g>

      {/* Ruler */}
      <g transform="translate(1900, 760) rotate(15)">
        <rect x={0} y={0} width={220} height={22} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} />
        <g stroke="var(--color-ink)" strokeWidth={1}>
          <line x1={20} y1={0} x2={20} y2={14} />
          <line x1={40} y1={0} x2={40} y2={8} />
          <line x1={60} y1={0} x2={60} y2={14} />
          <line x1={80} y1={0} x2={80} y2={8} />
          <line x1={100} y1={0} x2={100} y2={14} />
          <line x1={120} y1={0} x2={120} y2={8} />
          <line x1={140} y1={0} x2={140} y2={14} />
          <line x1={160} y1={0} x2={160} y2={8} />
          <line x1={180} y1={0} x2={180} y2={14} />
          <line x1={200} y1={0} x2={200} y2={8} />
        </g>
      </g>

      {/* Coffee mug top-down */}
      <g transform="translate(3000, 130)">
        <circle cx={80} cy={80} r={105} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={3} />
        <circle cx={80} cy={80} r={75} fill="var(--color-paper-shade)" stroke="var(--color-ink)" strokeWidth={3} />
        <circle cx={80} cy={80} r={60} fill="#5a3a22" />
        <ellipse cx={65} cy={65} rx={25} ry={15} fill="#7a5a3a" opacity={0.5} />
        <path d="M 155 80 Q 195 80, 195 50 L 195 30" fill="none" stroke="var(--color-ink)" strokeWidth={3} />
      </g>

      {/* Lupe (magnifier) — over Admin polaroid; bobs via GSAP */}
      <g ref={lupeRef} transform="translate(2050, 380) rotate(-12)">
        <circle cx={40} cy={40} r={55} fill="none" stroke="var(--color-ink)" strokeWidth={4} />
        <circle cx={40} cy={40} r={44} fill="var(--color-paper-tint)" opacity={0.4} stroke="var(--color-ink)" strokeWidth={1} />
        <line x1={86} y1={86} x2={135} y2={135} stroke="var(--color-ink)" strokeWidth={6} strokeLinecap="round" />
      </g>

      {/* Decorative ink splats — Riso spot colors */}
      <ellipse cx={850} cy={850} rx={35} ry={20} fill="var(--color-spot-rose)" opacity={0.6} transform="rotate(-15 850 850)" />
      <ellipse cx={1500} cy={200} rx={40} ry={25} fill="var(--color-spot-amber)" opacity={0.55} />
      <ellipse cx={2400} cy={850} rx={32} ry={18} fill="var(--color-spot-mint)" opacity={0.5} />
      <ellipse cx={3700} cy={280} rx={38} ry={22} fill="var(--color-spot-violet)" opacity={0.55} />
      <circle cx={900} cy={820} r={4} fill="var(--color-spot-rose)" opacity={0.7} />
      <circle cx={2440} cy={880} r={3} fill="var(--color-spot-mint)" opacity={0.7} />
      <circle cx={3650} cy={250} r={4} fill="var(--color-spot-violet)" opacity={0.7} />
    </svg>
  );
}
```

- [ ] **Step 3.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean (biome may auto-format long single-line attributes — run `pnpm exec biome format --write src/components/case-study/DioramaIllustration.tsx` if needed and re-stage).

- [ ] **Step 3.3: Commit**

```bash
git add src/components/case-study/DioramaIllustration.tsx
git commit -m "feat(case-study): DioramaIllustration — SVG background with table outlines + tools + decorations"
```

---

### Task 4: Six card content components

**Files:**
- Create: `src/components/case-study/cards/HookCard.tsx`
- Create: `src/components/case-study/cards/WhatCard.tsx`
- Create: `src/components/case-study/cards/StackCard.tsx`
- Create: `src/components/case-study/cards/AdminHighlightCard.tsx`
- Create: `src/components/case-study/cards/OverlayHighlightCard.tsx`
- Create: `src/components/case-study/cards/PublicCard.tsx`

Each card renders inside its DioramaCards positioning wrapper (Task 5). Cards are pure content components without their own positioning.

- [ ] **Step 4.1: Make the directory**

```bash
mkdir -p src/components/case-study/cards
```

- [ ] **Step 4.2: HookCard**

Create `src/components/case-study/cards/HookCard.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
};

/**
 * HookCard — Card 1 of the Diorama. Phone-screenshot polaroid
 * (eye-catcher size) + pull-quote underneath. Sized 240×380 in viewBox
 * units (~24vh tall on desktop).
 */
export function HookCard({ hookText, datestamp, polaroidCaption }: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <Polaroid
        aspect="9/16"
        rotate={0}
        spot="rose"
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-full"
      >
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet="/projects/joggediballa/homepage-phone-360w.avif 360w, /projects/joggediballa/homepage-phone-540w.avif 540w, /projects/joggediballa/homepage-phone-720w.avif 720w"
          />
          <source
            type="image/webp"
            srcSet="/projects/joggediballa/homepage-phone-360w.webp 360w, /projects/joggediballa/homepage-phone-540w.webp 540w, /projects/joggediballa/homepage-phone-720w.webp 720w"
          />
          <img
            src="/projects/joggediballa/homepage-phone-540w.jpg"
            alt="Joggediballa Homepage Mobile"
            width={540}
            height={960}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
        </picture>
      </Polaroid>
      <blockquote className="font-display italic text-ink text-[clamp(1rem,1.6vh,1.4rem)] leading-[1.2] tracking-[-0.01em]">
        <span aria-hidden="true" className="mr-1 text-spot-amber">
          «
        </span>
        {hookText}
        <span aria-hidden="true" className="ml-1 text-spot-amber">
          »
        </span>
      </blockquote>
    </div>
  );
}
```

- [ ] **Step 4.3: WhatCard**

Create `src/components/case-study/cards/WhatCard.tsx`:

```tsx
type Fact = { key: string; value: string };

type Props = {
  label: string;
  facts: Fact[];
  storyParas: string[];
};

/**
 * WhatCard — Card 2 of the Diorama. Text-only paper card with the
 * "Was ist Jogge di Balla?" facts dl + story prose. Sized 380×220.
 */
export function WhatCard({ label, facts, storyParas }: Props) {
  return (
    <div className="flex h-full flex-col gap-3 bg-paper-tint p-4">
      <h3 className="font-display italic text-ink text-[clamp(1rem,1.8vh,1.5rem)]">{label}</h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
        {facts.map((f) => (
          <div key={f.key} className="contents">
            <dt className="font-mono text-[clamp(0.55rem,0.8vh,0.75rem)] uppercase tracking-[0.18em] text-ink-muted">
              {f.key}
            </dt>
            <dd className="text-[clamp(0.65rem,0.9vh,0.85rem)] text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1.5">
        {storyParas.map((p) => (
          <p key={p.slice(0, 32)} className="text-[clamp(0.65rem,0.9vh,0.85rem)] leading-snug text-ink-soft">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: StackCard**

Create `src/components/case-study/cards/StackCard.tsx`:

```tsx
import { StackNotebook } from "@/components/case-study/StackNotebook";

type StackRow = { tech: string; use: string; why: string };

type Props = {
  heading: string;
  rule: string;
  intro: string;
  modules: string;
  stack: StackRow[];
};

/**
 * StackCard — Card 3 of the Diorama. Notebook-style with tech-stack
 * list. Rotated -7° via parent. Sized 240×280.
 */
export function StackCard({ heading, rule, intro, modules, stack }: Props) {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-[clamp(0.65rem,0.9vh,0.85rem)] leading-snug text-ink-soft">{intro}</p>
      <StackNotebook
        heading={heading}
        items={
          <ul className="space-y-1">
            {stack.map((row) => (
              <li key={row.tech} className="flex items-baseline gap-2">
                <span className="font-medium text-ink">{row.tech}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{row.use}</span>
              </li>
            ))}
          </ul>
        }
      />
      <p className="text-[clamp(0.55rem,0.8vh,0.75rem)] text-ink-muted italic">{modules}</p>
      <p className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] tracking-[0.2em] text-ink-muted uppercase">
        {rule}
      </p>
    </div>
  );
}
```

- [ ] **Step 4.5: AdminHighlightCard**

Create `src/components/case-study/cards/AdminHighlightCard.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type Feature = { title: string; body: string };

type Props = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
};

/**
 * AdminHighlightCard — Card 4 of the Diorama. 16:9 polaroid (admin-
 * dashboard screenshot) + features list. Sized 500×350. Lupe drawn
 * over this card by DioramaIllustration.
 */
export function AdminHighlightCard({
  kicker,
  title,
  lede,
  features,
  screenshotAlt,
  datestamp,
  polaroidCaption,
}: Props) {
  return (
    <div className="flex h-full gap-3 bg-paper-tint p-3">
      <div className="flex-shrink-0" style={{ width: "55%" }}>
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet="/projects/joggediballa/admin-480w.avif 480w, /projects/joggediballa/admin-800w.avif 800w, /projects/joggediballa/admin-1200w.avif 1200w"
            />
            <source
              type="image/webp"
              srcSet="/projects/joggediballa/admin-480w.webp 480w, /projects/joggediballa/admin-800w.webp 800w, /projects/joggediballa/admin-1200w.webp 1200w"
            />
            <img
              src="/projects/joggediballa/admin-800w.jpg"
              alt={screenshotAlt}
              width={800}
              height={450}
              loading="lazy"
              className="block h-full w-full object-cover object-top"
            />
          </picture>
        </Polaroid>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <p className="font-mono text-[clamp(0.55rem,0.8vh,0.75rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-1.5 bg-spot-rose" />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(0.95rem,1.4vh,1.4rem)] leading-tight">
          {title}
        </h3>
        <p className="text-[clamp(0.6rem,0.85vh,0.8rem)] leading-snug text-ink-soft">{lede}</p>
        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f.title} className="border-l border-ink pl-2">
              <p className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] uppercase tracking-[0.14em] text-ink">
                {f.title}
              </p>
              <p className="mt-0.5 text-[clamp(0.55rem,0.78vh,0.75rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.6: OverlayHighlightCard**

Create `src/components/case-study/cards/OverlayHighlightCard.tsx` (same shape as AdminHighlightCard but for overlay screenshot, spot=amber):

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type Feature = { title: string; body: string };

type Props = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
};

/**
 * OverlayHighlightCard — Card 5 of the Diorama. Same shape as
 * AdminHighlightCard but for the twitchoverlay screenshot, amber spot.
 * Sized 500×340.
 */
export function OverlayHighlightCard({
  kicker,
  title,
  lede,
  features,
  screenshotAlt,
  datestamp,
  polaroidCaption,
}: Props) {
  return (
    <div className="flex h-full gap-3 bg-paper-tint p-3">
      <div className="flex-shrink-0" style={{ width: "55%" }}>
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot="amber"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
        >
          <picture className="block h-full w-full">
            <source
              type="image/avif"
              srcSet="/projects/joggediballa/twitchoverlay-480w.avif 480w, /projects/joggediballa/twitchoverlay-800w.avif 800w, /projects/joggediballa/twitchoverlay-1200w.avif 1200w"
            />
            <source
              type="image/webp"
              srcSet="/projects/joggediballa/twitchoverlay-480w.webp 480w, /projects/joggediballa/twitchoverlay-800w.webp 800w, /projects/joggediballa/twitchoverlay-1200w.webp 1200w"
            />
            <img
              src="/projects/joggediballa/twitchoverlay-800w.jpg"
              alt={screenshotAlt}
              width={800}
              height={450}
              loading="lazy"
              className="block h-full w-full object-cover object-top"
            />
          </picture>
        </Polaroid>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <p className="font-mono text-[clamp(0.55rem,0.8vh,0.75rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-1.5 bg-spot-amber" />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(0.95rem,1.4vh,1.4rem)] leading-tight">
          {title}
        </h3>
        <p className="text-[clamp(0.6rem,0.85vh,0.8rem)] leading-snug text-ink-soft">{lede}</p>
        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f.title} className="border-l border-ink pl-2">
              <p className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] uppercase tracking-[0.14em] text-ink">
                {f.title}
              </p>
              <p className="mt-0.5 text-[clamp(0.55rem,0.78vh,0.75rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.7: PublicCard**

Create `src/components/case-study/cards/PublicCard.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

type Props = {
  shots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

/**
 * PublicCard — Card 6 of the Diorama. 3 sub-polaroids (Stats /
 * Members / Form-Phone) + reflection + live link. The 3 polaroids are
 * positioned absolutely WITHIN the card by the parent DioramaCards
 * (each polaroid has its own offset). This component renders them as
 * a horizontal row plus the reflection + link.
 */
export function PublicCard({
  shots,
  reflectionLabel,
  reflectionBody,
  footerLabel,
  footerDomain,
  footerUrl,
  footerExternal,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 items-start gap-2">
        {shots.map((s) => {
          const widths = s.aspect === "9/16" ? [360, 540, 720] : [480, 800, 1200];
          const fallbackW = s.aspect === "9/16" ? 540 : 800;
          const renderHeight = s.aspect === "9/16" ? 960 : 450;
          const renderWidth = s.aspect === "9/16" ? 540 : 800;
          return (
            <div
              key={s.slug}
              className="flex-shrink-0"
              style={{
                width: s.aspect === "9/16" ? "20%" : "37%",
                transform: `rotate(${s.rotate}deg)`,
              }}
            >
              <Polaroid
                aspect={s.aspect}
                rotate={0}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
              >
                <picture className="block h-full w-full">
                  <source
                    type="image/avif"
                    srcSet={widths
                      .map((w) => `/projects/joggediballa/${s.slug}-${w}w.avif ${w}w`)
                      .join(", ")}
                  />
                  <source
                    type="image/webp"
                    srcSet={widths
                      .map((w) => `/projects/joggediballa/${s.slug}-${w}w.webp ${w}w`)
                      .join(", ")}
                  />
                  <img
                    src={`/projects/joggediballa/${s.slug}-${fallbackW}w.jpg`}
                    alt={s.alt}
                    width={renderWidth}
                    height={renderHeight}
                    loading="lazy"
                    className="block h-full w-full object-cover object-top"
                  />
                </picture>
              </Polaroid>
            </div>
          );
        })}
      </div>
      <div className="border-l-2 border-spot-amber pl-2">
        <p className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] uppercase tracking-[0.18em] text-ink-muted">
          {reflectionLabel}
        </p>
        <p className="mt-1 font-display italic text-ink text-[clamp(0.75rem,1.1vh,1.1rem)] leading-snug">
          {reflectionBody}
        </p>
      </div>
      <a
        href={footerUrl}
        target="_blank"
        rel="noreferrer noopener external"
        className="inline-flex items-baseline gap-2 border-b-2 border-ink font-display italic text-ink text-[clamp(0.85rem,1.2vh,1.2rem)] leading-none w-fit hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
      >
        <span className="font-mono text-[clamp(0.5rem,0.7vh,0.7rem)] uppercase tracking-[0.2em] text-ink-muted">
          {footerLabel}
        </span>
        {footerDomain}
        <span aria-hidden="true" className="font-mono text-base not-italic">
          ↗
        </span>
        <span className="sr-only">{footerExternal}</span>
      </a>
    </div>
  );
}
```

- [ ] **Step 4.8: Verify all 6 cards**

Run: `pnpm typecheck && pnpm lint`
Expected: clean (run `pnpm exec biome format --write src/components/case-study/cards/` if biome reformats anything).

- [ ] **Step 4.9: Commit**

```bash
git add src/components/case-study/cards/
git commit -m "feat(case-study): six diorama card content components (Hook/What/Stack/Admin/Overlay/Public)"
```

---

### Task 5: DioramaCards positioning layer

**Files:**
- Create: `src/components/case-study/DioramaCards.tsx`

- [ ] **Step 5.1: Write the component**

Create `src/components/case-study/DioramaCards.tsx`:

```tsx
import type { CSSProperties } from "react";
import { AdminHighlightCard } from "@/components/case-study/cards/AdminHighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { OverlayHighlightCard } from "@/components/case-study/cards/OverlayHighlightCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why: string };
type Feature = { title: string; body: string };
type StationDateCaption = { datestamp: string; polaroidCaption?: string };
type PublicShotI18n = { datestamp: string; caption: string };

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

type Props = {
  hookText: string;
  hookStation: StationDateCaption;
  whatLabel: string;
  facts: Fact[];
  storyParas: string[];
  stackHeading: string;
  stackRule: string;
  platformIntro: string;
  platformModules: string;
  stack: StackRow[];
  adminKicker: string;
  adminTitle: string;
  adminLede: string;
  adminFeatures: Feature[];
  adminScreenshotAlt: string;
  adminStation: StationDateCaption;
  overlayKicker: string;
  overlayTitle: string;
  overlayLede: string;
  overlayFeatures: Feature[];
  overlayScreenshotAlt: string;
  overlayStation: StationDateCaption;
  publicShots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

/**
 * DioramaCards — absolute-positioned card layer over DioramaIllustration.
 *
 * Coordinates in vh units (top, left, width, height) so the layout
 * scales consistently across normal and ultrawide displays. The track
 * is 420vh wide; each card's left/top is defined relative to that.
 *
 * Positions match the v3 mockup approved during brainstorming
 * (2026-05-05). Hook polaroid enlarged as eye-catcher per Manuel's
 * feedback.
 */

const CARD_LAYOUT: Record<string, CSSProperties> = {
  hook: { left: "42vh", top: "29vh", width: "24vh", height: "38vh", transform: "rotate(-4deg)" },
  what: { left: "82vh", top: "48vh", width: "38vh", height: "22vh", transform: "rotate(2deg)" },
  stack: { left: "128vh", top: "28vh", width: "24vh", height: "28vh", transform: "rotate(-7deg)" },
  admin: { left: "162vh", top: "38vh", width: "50vh", height: "35vh", transform: "rotate(3deg)" },
  overlay: { left: "230vh", top: "24vh", width: "50vh", height: "34vh", transform: "rotate(-3deg)" },
  public: { left: "320vh", top: "38vh", width: "85vh", height: "44vh", transform: "rotate(2deg)" },
};

export function DioramaCards(props: Props) {
  return (
    <div aria-hidden={false} className="absolute inset-0">
      <article style={{ position: "absolute", ...CARD_LAYOUT.hook }}>
        <HookCard
          hookText={props.hookText}
          datestamp={props.hookStation.datestamp}
          polaroidCaption={props.hookStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.what }}>
        <WhatCard label={props.whatLabel} facts={props.facts} storyParas={props.storyParas} />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.stack }}>
        <StackCard
          heading={props.stackHeading}
          rule={props.stackRule}
          intro={props.platformIntro}
          modules={props.platformModules}
          stack={props.stack}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.admin }}>
        <AdminHighlightCard
          kicker={props.adminKicker}
          title={props.adminTitle}
          lede={props.adminLede}
          features={props.adminFeatures}
          screenshotAlt={props.adminScreenshotAlt}
          datestamp={props.adminStation.datestamp}
          polaroidCaption={props.adminStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.overlay }}>
        <OverlayHighlightCard
          kicker={props.overlayKicker}
          title={props.overlayTitle}
          lede={props.overlayLede}
          features={props.overlayFeatures}
          screenshotAlt={props.overlayScreenshotAlt}
          datestamp={props.overlayStation.datestamp}
          polaroidCaption={props.overlayStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.public }}>
        <PublicCard
          shots={props.publicShots}
          reflectionLabel={props.reflectionLabel}
          reflectionBody={props.reflectionBody}
          footerLabel={props.footerLabel}
          footerDomain={props.footerDomain}
          footerUrl={props.footerUrl}
          footerExternal={props.footerExternal}
        />
      </article>
    </div>
  );
}
```

- [ ] **Step 5.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/case-study/DioramaCards.tsx
git commit -m "feat(case-study): DioramaCards — absolute-positioned card layer in vh coordinates"
```

---

### Task 6: InkColumnFluidSim — dedicated WebGL fluid sim

**Files:**
- Create: `src/components/case-study/InkColumnFluidSim.tsx`

**Reference:** `src/components/scene/PhotoInkMask.tsx` (Phase 9, ~489 lines) is the architectural blueprint. This task produces a smaller (~250-280 LOC) section-scoped variant.

- [ ] **Step 6.1: Write the component**

Create `src/components/case-study/InkColumnFluidSim.tsx`:

```tsx
"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { compileShader } from "@/lib/gl/compileShader";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { subscribe } from "@/lib/raf";

import advectSrc from "@/shaders/ink-mask/advect.frag.glsl";
import maskSrc from "@/shaders/ink-mask/mask.frag.glsl";
import splatSrc from "@/shaders/ink-mask/splat.frag.glsl";
import quadSrc from "@/shaders/common/quad.vert.glsl";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * InkColumnFluidSim — dedicated WebGL2 fluid sim for the Case Study
 * dark-ink columns at viewport edges.
 *
 * Lifecycle:
 *   - Mounts canvas + initialises FBOs + compiles shaders on first
 *     ScrollTrigger onEnter (case-study top hits viewport bottom)
 *   - While in viewport: continuous edge-splat injection (every ~140ms,
 *     2 splats — one each at left + right edges with slight inward
 *     velocity) keeps the columns "wet"
 *   - Density advects + dissipates per `DYE_DISSIPATION`
 *   - Composite shader renders dark paper-color over the scene with
 *     alpha derived from density → only the dark edges show through
 *   - On ScrollTrigger onLeave: dispose context, deallocate FBOs
 *
 * Reduced-motion + mobile (<768px): component returns null entirely
 * (no canvas mount, no fluid sim).
 *
 * IMPORTANT: this implementation reuses the FBO + uniform-binding
 * patterns from `src/components/scene/PhotoInkMask.tsx`. Read that
 * file before writing — adapt its createFBO + render-loop logic.
 *
 * DO NOT call `gl.getExtension("WEBGL_lose_context")?.loseContext()`
 * on cleanup (Phase 9 deviation: StrictMode double-invoke trap).
 */

const FBO_SIZE = 256;
const DYE_DISSIPATION = 0.95;
const SPLAT_INTERVAL_MS = 140;
const INK_RGB: readonly [number, number, number] = [0.04, 0.02, 0.03];
const MOBILE_BREAKPOINT = 768;

export function InkColumnFluidSim() {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const advectProg = compileShader(gl, quadSrc, advectSrc);
    const maskProg = compileShader(gl, quadSrc, maskSrc);
    const splatProg = compileShader(gl, quadSrc, splatSrc);
    if (!advectProg || !maskProg || !splatProg) return;

    // === FBO ping-pong setup ===
    // Adapt from src/components/scene/PhotoInkMask.tsx — copy the
    // createFBO helper (allocates a framebuffer with one RGBA texture
    // color attachment at FBO_SIZE × FBO_SIZE, LINEAR filtering,
    // CLAMP_TO_EDGE wrapping) and the densityRead/densityWrite swap
    // pattern. The PhotoInkMask file is ~489 lines; the FBO + uniform
    // helpers are ~80 lines and copy directly.
    //
    // Pattern shape (illustrative — replicate the actual helper from
    // PhotoInkMask):
    //
    //   function createFBO(): { fbo: WebGLFramebuffer; tex: WebGLTexture } {
    //     const tex = gl.createTexture()!;
    //     gl.bindTexture(gl.TEXTURE_2D, tex);
    //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FBO_SIZE, FBO_SIZE, 0,
    //                   gl.RGBA, gl.UNSIGNED_BYTE, null);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //     const fbo = gl.createFramebuffer()!;
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
    //                             gl.TEXTURE_2D, tex, 0);
    //     return { fbo, tex };
    //   }
    //
    //   const densityA = createFBO();
    //   const densityB = createFBO();
    //   let densityRead = densityA;
    //   let densityWrite = densityB;
    //   const swap = () => { [densityRead, densityWrite] = [densityWrite, densityRead]; };
    //
    // Plus a uniform-cache helper:
    //
    //   const uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    //   function uniform(prog: WebGLProgram, name: string): WebGLUniformLocation | null {
    //     let prog Cache = uniformCache.get(prog);
    //     if (!progCache) { progCache = new Map(); uniformCache.set(prog, progCache); }
    //     if (!progCache.has(name)) progCache.set(name, gl.getUniformLocation(prog, name));
    //     return progCache.get(name) ?? null;
    //   }
    //
    // And an empty VAO for attribute-less fullscreen-triangle draws:
    //
    //   const emptyVAO = gl.createVertexArray()!;
    //   gl.bindVertexArray(emptyVAO);
    //
    // The actual implementation should COPY these helpers verbatim
    // from PhotoInkMask.tsx and use them below.

    // [PASTE: createFBO, uniform helper, emptyVAO, densityA/B from PhotoInkMask]

    let active = false;

    const drawQuad = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

    const injectSplat = (x: number, y: number, dx: number, dy: number) => {
      // Reuse PhotoInkMask's splat-pass pattern: bind splatProg, set
      // uTarget=(x,y), uRadius=0.22, uColor=INK_RGB, uPrevDensity=
      // densityRead.tex via gl.uniform1i(loc, 0). Render to densityWrite.fbo.
      // After draw, swap.
      //
      // [PASTE: splat pass implementation from PhotoInkMask injectSplat]
    };

    const advect = (dt: number) => {
      // Bind advectProg, set uDt, uDissipation=DYE_DISSIPATION,
      // uVelocity=(0,0) (no velocity field — splats supply their own
      // dx/dy via splat color encoding), uDensity sampler. Render to
      // densityWrite.fbo. Swap.
      //
      // [PASTE: advect pass implementation from PhotoInkMask step]
    };

    const composite = () => {
      // Bind default framebuffer (canvas), bind maskProg, set
      // uPaperColor=INK_RGB, uDensity sampler. Draw fullscreen quad.
      //
      // [PASTE: mask-composite pass from PhotoInkMask render]
    };

    let lastSplatTs = 0;
    const unsubscribe = subscribe((deltaMs) => {
      if (!active) return;
      const dt = Math.min(deltaMs * 0.001, 0.033);

      const now = performance.now();
      if (now - lastSplatTs > SPLAT_INTERVAL_MS) {
        lastSplatTs = now;
        // Edge splats: 2 per tick, randomised y, slight inward velocity
        const yL = 0.1 + Math.random() * 0.8;
        const yR = 0.1 + Math.random() * 0.8;
        injectSplat(0.02, yL, 0.06, (Math.random() - 0.5) * 0.02);
        injectSplat(0.98, yR, -0.06, (Math.random() - 0.5) * 0.02);
      }

      advect(dt);
      composite();
    }, 30);

    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        active = true;
      },
      onEnterBack: () => {
        active = true;
      },
      onLeave: () => {
        active = false;
      },
      onLeaveBack: () => {
        active = false;
      },
    });

    return () => {
      unsubscribe();
      st.kill();
      gl.deleteProgram(advectProg);
      gl.deleteProgram(maskProg);
      gl.deleteProgram(splatProg);
      // [PASTE: delete densityA + densityB FBOs + textures + emptyVAO]
      // DO NOT call loseContext()
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
```

**IMPORTANT:** the `[PASTE: ...]` placeholders above are NOT acceptable as final code. The implementer MUST open `src/components/scene/PhotoInkMask.tsx`, locate the corresponding helpers (createFBO, uniform cache, emptyVAO setup, splat pass, advect pass, composite pass, deletion in cleanup), and inline-replicate them in this file. The result should be a complete ~250-280 line working component with no placeholders. Estimated implementation time: 60-90 minutes including shader debugging.

- [ ] **Step 6.2: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. Build verifies the GLSL imports work via Turbopack's `as: "*.js"` rule.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/case-study/InkColumnFluidSim.tsx
git commit -m "feat(case-study): InkColumnFluidSim — dedicated WebGL fluid sim for dark ink edges"
```

---

### Task 7: Rewrite CaseStudy.tsx — compose all pieces

**Files:**
- Modify: `src/components/sections/CaseStudy.tsx` (replace stub from Task 1.2 with the full composition)

- [ ] **Step 7.1: Rewrite the file**

Replace the entire contents of `src/components/sections/CaseStudy.tsx` with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { DioramaCards } from "@/components/case-study/DioramaCards";
import { DioramaIllustration } from "@/components/case-study/DioramaIllustration";
import { DioramaTrack } from "@/components/case-study/DioramaTrack";
import { InkColumnFluidSim } from "@/components/case-study/InkColumnFluidSim";
import { AdminHighlightCard } from "@/components/case-study/cards/AdminHighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { OverlayHighlightCard } from "@/components/case-study/cards/OverlayHighlightCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why: string };
type Feature = { title: string; body: string };
type Highlight = {
  id: string;
  kicker: string;
  title: string;
  lede: string;
  screenshot: string;
  screenshotAlt: string;
  features: Feature[];
};
type StationDateCaption = { datestamp: string; polaroidCaption?: string };
type PublicShotI18n = { datestamp: string; caption: string };

const PUBLIC_SHOT_CONFIG: {
  slug: string;
  aspect: "16/9" | "9/16";
  spot: "mint" | "violet" | "rose" | "amber";
  rotate: number;
}[] = [
  { slug: "statistics", aspect: "16/9", spot: "mint", rotate: -2 },
  { slug: "goennerverwaltung", aspect: "16/9", spot: "violet", rotate: 3 },
  { slug: "formular-phone", aspect: "9/16", spot: "rose", rotate: -1 },
];

export function CaseStudy() {
  const t = useTranslations("caseStudy");

  const facts = t.raw("context.facts") as Fact[];
  const storyParas = t.raw("context.story") as string[];
  const stack = t.raw("platform.stack") as StackRow[];
  const highlights = t.raw("highlights.items") as Highlight[];
  const hookStation = t.raw("stations.hook") as StationDateCaption;
  const stackStation = t.raw("stations.stack") as { heading: string; rule: string };
  const highlightAdmin = t.raw("stations.highlightAdmin") as StationDateCaption;
  const highlightOverlay = t.raw("stations.highlightOverlay") as StationDateCaption;
  const publicShotsI18n = t.raw("stations.publicShots") as PublicShotI18n[];

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  const publicShots = PUBLIC_SHOT_CONFIG.map((cfg, i) => ({
    ...cfg,
    alt: `${t("publicLayer.label")} ${i + 1}`,
    datestamp: publicShotsI18n[i]?.datestamp ?? "",
    caption: publicShotsI18n[i]?.caption ?? "",
  }));

  // Mobile / reduced-motion fallback: render the cards in a vertical
  // stack without illustration or fluid-sim.
  const mobileFallback = (
    <div className="container-page flex flex-col gap-12 py-12">
      <h2 id="case-study-heading" className="type-h2 text-ink">
        {t("headline")}
      </h2>
      <HookCard
        hookText={t("hook")}
        datestamp={hookStation.datestamp}
        polaroidCaption={hookStation.polaroidCaption ?? ""}
      />
      <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
      <StackCard
        heading={stackStation.heading}
        rule={stackStation.rule}
        intro={t("platform.intro")}
        modules={t("platform.modules")}
        stack={stack}
      />
      {adminHighlight ? (
        <AdminHighlightCard
          kicker={adminHighlight.kicker}
          title={adminHighlight.title}
          lede={adminHighlight.lede}
          features={adminHighlight.features}
          screenshotAlt={adminHighlight.screenshotAlt}
          datestamp={highlightAdmin.datestamp}
          polaroidCaption={highlightAdmin.polaroidCaption ?? ""}
        />
      ) : null}
      {overlayHighlight ? (
        <OverlayHighlightCard
          kicker={overlayHighlight.kicker}
          title={overlayHighlight.title}
          lede={overlayHighlight.lede}
          features={overlayHighlight.features}
          screenshotAlt={overlayHighlight.screenshotAlt}
          datestamp={highlightOverlay.datestamp}
          polaroidCaption={highlightOverlay.polaroidCaption ?? ""}
        />
      ) : null}
      <PublicCard
        shots={publicShots}
        reflectionLabel={t("reflection.label")}
        reflectionBody={t("reflection.body")}
        footerLabel={t("footerLink.label")}
        footerDomain={t("footerLink.domain")}
        footerUrl={t("footerLink.url")}
        footerExternal={t("footerLink.external")}
      />
    </div>
  );

  // Desktop: full diorama with sticky-pin + horizontal scroll +
  // dark-ink fluid columns at viewport edges.
  return (
    <>
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>
      <DioramaTrack mobileFallback={mobileFallback}>
        <DioramaIllustration />
        {adminHighlight && overlayHighlight ? (
          <DioramaCards
            hookText={t("hook")}
            hookStation={hookStation}
            whatLabel={t("context.label")}
            facts={facts}
            storyParas={storyParas}
            stackHeading={stackStation.heading}
            stackRule={stackStation.rule}
            platformIntro={t("platform.intro")}
            platformModules={t("platform.modules")}
            stack={stack}
            adminKicker={adminHighlight.kicker}
            adminTitle={adminHighlight.title}
            adminLede={adminHighlight.lede}
            adminFeatures={adminHighlight.features}
            adminScreenshotAlt={adminHighlight.screenshotAlt}
            adminStation={highlightAdmin}
            overlayKicker={overlayHighlight.kicker}
            overlayTitle={overlayHighlight.title}
            overlayLede={overlayHighlight.lede}
            overlayFeatures={overlayHighlight.features}
            overlayScreenshotAlt={overlayHighlight.screenshotAlt}
            overlayStation={highlightOverlay}
            publicShots={publicShots}
            reflectionLabel={t("reflection.label")}
            reflectionBody={t("reflection.body")}
            footerLabel={t("footerLink.label")}
            footerDomain={t("footerLink.domain")}
            footerUrl={t("footerLink.url")}
            footerExternal={t("footerLink.external")}
          />
        ) : null}
      </DioramaTrack>
      <InkColumnFluidSim />
    </>
  );
}
```

- [ ] **Step 7.2: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. The build verifies all message keys resolve.

- [ ] **Step 7.3: Manual visual check (dev server)**

Run: `pnpm dev` (or `./dev.cmd` on Windows).

Open `http://localhost:3000/de` in browser. Scroll to the Case Study section.

Verify:
- Section pins, horizontal scroll-jacks
- DioramaIllustration renders SVG with table outlines + tools (camera, hot-shoe flash, pencil, ruler, lupe, coffee mug) + scattered ink splats
- 6 cards visible at correct positions, overlapping, slightly rotated
- Hook polaroid (first card) is the eye-catcher size
- Lupe over Admin polaroid bobs gently
- InkColumnFluidSim canvas mounts on enter, dark-ink columns appear at left + right viewport edges
- On scroll past end: section unpins, vertical scroll continues to Photography section
- Mobile (DevTools 375×800): vertical stack, no diorama, no fluid sim
- Reduced-motion (DevTools toggle): same as mobile

Stop dev server.

- [ ] **Step 7.4: Commit**

```bash
git add src/components/sections/CaseStudy.tsx
git commit -m "feat(case-study): rewrite section composing diorama + ink-column fluid sim"
```

---

### Task 8: Full ci:local + a11y verification

**Files:** none (verification only)

- [ ] **Step 8.1: Run pnpm ci:local**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright shows ≥49 passing + 2 documented pre-existing failures (overprint reduced-motion, playground trailing-slash).

If any new failures appear: investigate per axe rule, fix, re-run.

- [ ] **Step 8.2: A11y suite**

Run: `pnpm build && E2E_TARGET=prod pnpm test:a11y`
Expected: 16/16 passing.

- [ ] **Step 8.3: Iris-Xe sanity (manual, on Manuel's laptop)**

Manuel runs locally on his Iris-Xe machine. Acceptance: continuous frametime < 25ms (≥ 40fps) during home + case-study scroll. The InkColumnFluidSim is the most expensive new addition; if it drops the budget, gate it on `useGPUCapability` tier (skip on `low`/`minimal`).

- [ ] **Step 8.4: No commit (verification only)**

---

### Task 9: CLAUDE.md Phase 12 case-study redesign deviations

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 9.1: Append Phase-12 case-study redesign subsection**

In `.claude/CLAUDE.md`, locate the existing Phase 12 deviation section (or append at the end if Phase 12 doesn't have its own section yet). Append:

```markdown

### Phase 12 — Case Study diorama redesign (post-T18 rework)

The original Phase 12 plan's Case Study section (slideshow-style flex
track of discrete `StationFrame` items) failed 5 visual-review
iterations. The replacement design pivots to a **diorama**: one wide
SVG illustration of a photographer's table that the user pans across
horizontally. Spec at
`docs/superpowers/specs/2026-05-05-case-study-diorama-redesign.md`,
plan at
`docs/superpowers/plans/2026-05-05-case-study-diorama-redesign.md`.

- **vh-based coordinate system** (4200×1000 viewBox at 100vh tall →
  420vh wide track). Consistent across normal desktop and ultrawide
  displays — fixed-px decorations on the prior slideshow looked tiny
  on 3840×1600 viewports.
- **Single SVG illustration component** (`<DioramaIllustration />`)
  draws all background elements: comic-style table-edge outlines,
  embedded tools (camera, hot-shoe flash, pencil, ruler, lupe, coffee
  mug top-down), and scattered Riso-color ink splats. Tools are
  drawn INTO the illustration rather than sprinkled as separate
  components — coherence over modularity. The Lupe element retains
  its prior bob animation (±2px y, 3s sine loop) via a single GSAP
  tween in the illustration component itself.
- **Cards as absolute-positioned HTML divs** (`<DioramaCards />`) layered
  above the SVG illustration, in vh-unit coordinates. Six cards: Hook,
  What, Stack, Admin, Overlay, Public. Cards overlap deliberately
  (admin + overlay) and are slightly rotated for the hand-laid feel.
  Hook polaroid enlarged 20% from prior iteration as eye-catcher.
- **Dedicated WebGL2 fluid-sim for ink columns** (`<InkColumnFluidSim />`)
  — NOT the Hero-FluidSim. The hero-sim is colored Riso ambient; mixing
  dark-ink dispatches into it produced muddy color noise. A separate
  256² FBO ping-pong fluid sim runs at viewport scale, with continuous
  edge-splat injection (every 140ms, 2 splats — left edge + right
  edge with slight inward velocity) keeping dark-ink density "wet" at
  the columns. ScrollTrigger lifecycle mounts the canvas only while
  case-study is in viewport. WebGL context budget: 1 (hero-sim) + 5
  (photo-ink-mask) + 2 (playground card mini-sims) + 1 (case-study) =
  9, comfortably within browser's ~16 soft-limit.
- **`pathTween.ts` kept but unused** — primitive remains in the codebase
  for future fluid-effect work; current redesign uses static SVG paths
  for tools + decorations and per-frame WebGL render for ink columns,
  neither requiring path interpolation.
- **Mobile + reduced-motion fallback**: vertical stack of card content,
  no diorama, no fluid sim. Same content via the cards themselves; the
  illustration + tools are decorative-only and don't translate to
  vertical layout.
- **Massive cleanup**: 16 files deleted from prior slideshow attempt
  (StationContainer, StationFrame, TrackDecor, InkSplat, PaperWorkplace,
  InkTransition, 5 station components, 4 cliparts). Polaroid and
  StackNotebook primitives kept (consumed by cards).
- **Translation deferred**: existing `caseStudy.*` and
  `caseStudy.stations.*` keys remain valid (cards consume same data
  in different layout). DE-mirrored across EN/FR/IT, matches prior
  pattern.
```

- [ ] **Step 9.2: Verify lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 9.3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: CLAUDE.md — Phase 12 case-study diorama redesign deviations"
```

---

### Task 10: Final visual review GATE

**Files:** none (verification only)

- [ ] **Step 10.1: Re-run pnpm ci:local**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright tests pass (≥49) with only the 2 pre-existing failures.

- [ ] **Step 10.2: Manuel manual visual review**

Manuel opens `http://localhost:3000/de` (after `pnpm dev`) and verifies against the brainstorm v3 mockup at `.superpowers/brainstorm/289-1777980346/content/diorama-v3.html`:

1. Section enters → sticky-pin + horizontal scroll engages
2. DioramaIllustration matches mockup: comic table outlines + 6 tools at correct positions
3. Hook polaroid as eye-catcher (enlarged)
4. Cards positioned correctly, overlap admin+overlay
5. Lupe bobs over Admin polaroid
6. Dark-ink fluid columns appear at left + right viewport edges (real fluid sim, not static)
7. End of horizontal scroll → unpin, vertical resumes
8. Mobile + reduced-motion: vertical stack, no diorama
9. Locale-switch DE→EN→FR→IT: layout intact
10. Iris-Xe FPS check: continuous frametime < 25ms

If any visual issue not matching the spec — open a follow-up task, do not amend this plan.

- [ ] **Step 10.3: No commit (verification only)**

---

## Summary of commits

When the plan is complete, the git log should show this sequence (one commit per task):

```
chore(case-study): clean slate — drop obsolete slideshow components, stub section for diorama rebuild
feat(case-study): DioramaTrack — sticky-pin + horizontal-translate wrapper for vh-based diorama
feat(case-study): DioramaIllustration — SVG background with table outlines + tools + decorations
feat(case-study): six diorama card content components (Hook/What/Stack/Admin/Overlay/Public)
feat(case-study): DioramaCards — absolute-positioned card layer in vh coordinates
feat(case-study): InkColumnFluidSim — dedicated WebGL fluid sim for dark ink edges
feat(case-study): rewrite section composing diorama + ink-column fluid sim
docs: CLAUDE.md — Phase 12 case-study diorama redesign deviations
```

8 functional commits + verification gates (Tasks 8 + 10 are no-commit).

Estimated implementation time: 6-9 hours. The InkColumnFluidSim (Task 6) is the most demanding — budget 60-90 min including shader debugging. The rest are mostly mechanical (component creates from spec'd code).
