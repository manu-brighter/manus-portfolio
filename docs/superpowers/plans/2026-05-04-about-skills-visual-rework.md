# About + Skills Visual Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `<About />` and `<Skills />` from a typographic-list layout into an editorial Riso-print sequence with deliberate dramaturgy, layered Riso theatrics, and a subtle interactive layer on Skills — without competing with the Hero or Playground signature moments.

**Architecture:** A small set of new primitives (`AboutBlock`, `PullQuote`, `PlateCornerMarks`, `StampDivider`, `ObjectGrid`, six inline-SVG stamps, `VibecodedStamp`, `HeroSkillPulse`) composed into a rewritten `<About />` and an extended `<Skills />`. Hover-misregistration is pure CSS via pseudo-elements. Drop-caps are CSS `:first-letter`. All animation rides the existing shared RAF (`gsap.ticker`); no new RAF loops, no new WebGL contexts.

**Tech Stack:** Existing — Next.js 16, React 19, TypeScript, Tailwind v4, GSAP, next-intl. New deps: none.

**Spec reference:** [`docs/superpowers/specs/2026-05-04-about-skills-visual-rework-design.md`](../specs/2026-05-04-about-skills-visual-rework-design.md)

---

## Locked-in implementation decisions

These were deferred in spec § 12 and are now committed:

- **DropCap**: pure CSS via `:first-letter`. Color comes from a per-block CSS custom property (`--block-spot`), set on the block container. No JS-driven DropCap component.
- **StampDivider**: dotted-row with a centered asterism — `· · ✱ · ·` rendered via Flexbox, spot-color from the outgoing block via inherited `--block-spot`. No SVG.
- **MisregistrationHover**: pure CSS class `.misreg-hover`. Pseudo-elements `::before` (mint ghost, `translate -2px`) and `::after` (rose ghost, `translate +2px`), `mix-blend-mode: multiply`, 150ms transitions on `:hover`/`:focus-visible`.
- **Block 04 body**: single-column. Mobile-first; 2-column risks readability.
- **Plate-corner glyph**: `+` rendered as two crossed lines via SVG, 12×12px, `--color-ink` 1.5px stroke. One inline SVG, four corners absolutely positioned.

---

## File structure

### New files

```
src/components/about/
├── AboutBlock.tsx              # Generic block container w/ layout variant + spot-color
├── PullQuote.tsx               # XXL Italic pull-quote w/ OverprintReveal + word-highlight + B9 underline
├── PlateCornerMarks.tsx        # 4-corner `+` SVG registration marks
├── StampDivider.tsx            # Asterism row between blocks
├── ObjectGrid.tsx              # Object-Grid container + Currently sub-band
└── stamps/
    ├── CameraStamp.tsx
    ├── AudiStamp.tsx
    ├── JoggediballaStamp.tsx
    ├── SchneeStamp.tsx
    ├── TauchenStamp.tsx
    └── PingPongStamp.tsx

src/components/skills/
├── VibecodedStamp.tsx          # Animated [vibecoded] marker
└── HeroSkillPulse.tsx          # Ambient halo behind XXL hero skill
```

### Modified files

- `src/components/sections/About.tsx` — full restructure
- `src/components/sections/Skills.tsx` — wire C1/C2/C3
- `src/app/globals.css` — drop-cap rule, hover-misreg pseudo-elements, plate-corner SVG class, block-spot variable
- `messages/{de,en,fr,it}.json` — pull-quote keys, marginalia, object-grid texts
- `.claude/CLAUDE.md` — Phase 11 polish-rework deviation entry

---

## Task list

### Task 1: CSS foundation — block-spot variable, drop-cap, hover-misregistration, plate-corner

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1.1: Append component-layer rules to globals.css**

Open `src/app/globals.css`. Inside the existing `@layer components { ... }` block, append the following rules (after the `riso-submit` block):

```css
  /* ------------------------------------------------------------
   * About-rework primitives (Phase 11 polish-sprint)
   * ------------------------------------------------------------ */

  /* Per-block spot-color slot. Each AboutBlock sets `--block-spot`
   * to one of `var(--color-spot-{rose,mint,amber,violet})`. The
   * drop-cap, word-highlight, and stamp-divider all read this. */

  .about-block {
    --block-spot: var(--color-spot-rose);
  }

  /* Drop-Cap on the first paragraph's first letter inside an
   * about-block's body-prose region. ~4× line-height, dropped 3
   * lines tight, in the block's spot-color. The :first-letter
   * pseudo applies on first inline content of the element. */

  .about-block-body > p:first-of-type::first-letter {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    font-size: 4.5em;
    line-height: 0.85;
    float: left;
    margin: 0.05em 0.08em -0.15em 0;
    color: var(--block-spot);
  }

  /* Word-highlight inside a pull-quote. The keyword span carries
   * .pull-highlight + the parent block's --block-spot. */

  .pull-highlight {
    color: var(--block-spot);
  }

  /* Hover-misregistration: pseudo-element ghost layers around any
   * inline element. Used by .misreg-hover wrapper around skill
   * words. Pseudo-elements borrow the host's text content via
   * `attr(data-text)`. Triggered by :hover and :focus-visible.
   *
   * Note: data-text attribute is required on the element for the
   * pseudo-elements to render the same glyphs in offset position. */

  .misreg-hover {
    position: relative;
    display: inline-block;
  }

  .misreg-hover::before,
  .misreg-hover::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    mix-blend-mode: multiply;
    transition:
      opacity 150ms ease-out,
      transform 150ms ease-out;
  }

  .misreg-hover::before {
    color: var(--color-spot-mint);
    transform: translate(0, 0);
  }

  .misreg-hover::after {
    color: var(--color-spot-rose);
    transform: translate(0, 0);
  }

  .misreg-hover:hover::before,
  .misreg-hover:focus-visible::before {
    opacity: 0.7;
    transform: translate(-2px, -1px);
  }

  .misreg-hover:hover::after,
  .misreg-hover:focus-visible:hover::after,
  .misreg-hover:focus-visible::after {
    opacity: 0.7;
    transform: translate(2px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .misreg-hover::before,
    .misreg-hover::after {
      display: none;
    }
  }

  /* Plate-corner marks — small `+` registration crosses at the four
   * corners of a section/block. Container needs `position: relative`. */

  .plate-corners {
    position: relative;
  }
```

- [ ] **Step 1.2: Run lint to verify CSS parses**

Run: `pnpm lint`
Expected: clean, no new errors.

- [ ] **Step 1.3: Run dev server briefly + verify globals.css compiles**

Run: `pnpm exec next build` (faster than full ci:local — just confirms tailwind compiles).
Expected: build succeeds, no CSS parse errors.

- [ ] **Step 1.4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add about-rework CSS primitives — block-spot, drop-cap, misreg-hover, plate-corners"
```

---

### Task 2: PlateCornerMarks component

**Files:**
- Create: `src/components/about/PlateCornerMarks.tsx`

- [ ] **Step 2.1: Write the component**

Create `src/components/about/PlateCornerMarks.tsx`:

```tsx
/**
 * Riso-Plate-Corner-Marks — 4 small `+` registration crosses at the
 * corners of a section or block. References print-shop plate-
 * registration markers (the kind printers use to align colour
 * separations on real Risograph plates).
 *
 * Parent must have `position: relative` (or use the `.plate-corners`
 * helper class). The marks are absolutely positioned to the parent's
 * 4 corners with a 12px outset so they sit just outside the visible
 * frame.
 *
 * Decorative — `aria-hidden`. Pure SVG, no JS, no animation.
 */

const SIZE = 12;
const STROKE = 1.5;
const OUTSET = 6; // half the size, places the centre at the corner

function Cross() {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      <title>Registration mark</title>
      <line
        x1={0}
        y1={SIZE / 2}
        x2={SIZE}
        y2={SIZE / 2}
        stroke="var(--color-ink)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <line
        x1={SIZE / 2}
        y1={0}
        x2={SIZE / 2}
        y2={SIZE}
        stroke="var(--color-ink)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlateCornerMarks() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ top: -OUTSET, left: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ top: -OUTSET, right: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ bottom: -OUTSET, left: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ bottom: -OUTSET, right: -OUTSET }}
      >
        <Cross />
      </span>
    </>
  );
}
```

- [ ] **Step 2.2: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 2.3: Commit**

```bash
git add src/components/about/PlateCornerMarks.tsx
git commit -m "feat: PlateCornerMarks — 4-corner Riso registration cross marks"
```

---

### Task 3: StampDivider component

**Files:**
- Create: `src/components/about/StampDivider.tsx`

- [ ] **Step 3.1: Write the component**

Create `src/components/about/StampDivider.tsx`:

```tsx
/**
 * StampDivider — asterism row between AboutBlocks. Reads the
 * outgoing block's `--block-spot` (inherited via the surrounding
 * about-block container) so the divider tints to that block's
 * spot-color. Renders as `· · ✱ · ·`.
 *
 * Decorative — `aria-hidden`. Pure markup, no JS, no animation.
 */

export function StampDivider() {
  return (
    <div
      aria-hidden="true"
      className="my-12 flex items-center justify-center gap-3 md:my-20"
    >
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
      <span
        className="text-xl"
        style={{ color: "var(--block-spot, var(--color-ink-muted))" }}
      >
        ✱
      </span>
      <span className="size-1 rounded-full bg-ink-muted" />
      <span className="size-1 rounded-full bg-ink-muted" />
    </div>
  );
}
```

- [ ] **Step 3.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 3.3: Commit**

```bash
git add src/components/about/StampDivider.tsx
git commit -m "feat: StampDivider — dotted asterism row in outgoing-block spot-color"
```

---

### Task 4: AboutBlock generic container

**Files:**
- Create: `src/components/about/AboutBlock.tsx`

- [ ] **Step 4.1: Write the component**

Create `src/components/about/AboutBlock.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import { PlateCornerMarks } from "./PlateCornerMarks";

/**
 * AboutBlock — generic block container for the rewritten About
 * section. Sets the `--block-spot` CSS variable from the `spot`
 * prop so children (drop-cap, word-highlight, stamp-divider, etc.)
 * inherit the block's Riso-plate identity.
 *
 * Layout variants describe the column composition:
 *   - "marg-left-content-right" (Block 01): 4/12 marginalia + 8/12 content
 *   - "content-left-marg-right" (Block 02): 6/12 content + 3/12 marginalia
 *   - "loud-centered"           (Block 04): 10/12 centred (the loud block)
 *   - "short-centered"          (Block 05): 8/12 centred (atmender Pause)
 *
 * `marginalia` is the small left/right column content (block-counter,
 * year-stamps, etc.). Pass null for blocks that don't need it.
 *
 * Plate-corner-marks render at the block's 4 corners.
 */

export type Spot = "rose" | "mint" | "amber" | "violet";

export type AboutBlockLayout =
  | "marg-left-content-right"
  | "content-left-marg-right"
  | "loud-centered"
  | "short-centered";

const SPOT_VAR: Record<Spot, string> = {
  rose: "var(--color-spot-rose)",
  mint: "var(--color-spot-mint)",
  amber: "var(--color-spot-amber)",
  violet: "var(--color-spot-violet)",
};

type AboutBlockProps = {
  id: string;
  spot: Spot;
  layout: AboutBlockLayout;
  marginalia?: ReactNode;
  children: ReactNode;
};

export function AboutBlock({ id, spot, layout, marginalia, children }: AboutBlockProps) {
  const cssVars = {
    "--block-spot": SPOT_VAR[spot],
  } as CSSProperties;

  // Column class composition keyed by layout variant.
  const columns =
    layout === "marg-left-content-right"
      ? {
          marginalia: "col-span-12 md:col-span-4",
          content: "col-span-12 md:col-span-8",
          marginaliaOrder: "order-1",
          contentOrder: "order-2",
        }
      : layout === "content-left-marg-right"
        ? {
            marginalia: "col-span-12 md:col-span-3 md:col-start-10",
            content: "col-span-12 md:col-span-6 md:col-start-2",
            // Mobile: marginalia first; desktop reorder by col-start.
            marginaliaOrder: "order-1 md:order-2",
            contentOrder: "order-2 md:order-1",
          }
        : layout === "loud-centered"
          ? {
              marginalia: "hidden",
              content: "col-span-12 md:col-span-10 md:col-start-2",
              marginaliaOrder: "",
              contentOrder: "",
            }
          : {
              // short-centered
              marginalia: "hidden",
              content: "col-span-12 md:col-span-8 md:col-start-3",
              marginaliaOrder: "",
              contentOrder: "",
            };

  return (
    <article
      id={`about-${id}`}
      className="about-block plate-corners relative grid-12 container-page my-16 gap-y-6 md:my-24"
      style={cssVars}
    >
      <PlateCornerMarks />
      {marginalia ? (
        <aside className={`${columns.marginalia} ${columns.marginaliaOrder}`}>{marginalia}</aside>
      ) : null}
      <div className={`${columns.content} ${columns.contentOrder}`}>{children}</div>
    </article>
  );
}
```

- [ ] **Step 4.2: Verify lint catches the `<aside>`-inside-`<section>` trap**

Per `.claude/CLAUDE.md` Phase 6/9/11 deviations, `<aside>` inside `<section>` triggers axe `landmark-complementary-is-top-level`. The wrapping About section will be `<section>`, so this `<aside>` would fail. Replace `<aside>` with `<div>`:

In the JSX, change:
```tsx
<aside className={`${columns.marginalia} ${columns.marginaliaOrder}`}>{marginalia}</aside>
```
to:
```tsx
<div className={`${columns.marginalia} ${columns.marginaliaOrder}`}>{marginalia}</div>
```

- [ ] **Step 4.3: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 4.4: Commit**

```bash
git add src/components/about/AboutBlock.tsx
git commit -m "feat: AboutBlock — generic block container w/ spot-color + layout variants"
```

---

### Task 5: PullQuote primitive

**Files:**
- Create: `src/components/about/PullQuote.tsx`

- [ ] **Step 5.1: Write the component**

The pull-quote takes a string with an optional `{highlight}` placeholder marking the keyword span. Implementation: split the input on the placeholder, render the surrounding text + a highlighted `<span>` carrying `.pull-highlight` (which reads `--block-spot`).

OverprintReveal wraps the visible text. The B9 SVG-underline animation rides on the same IO trigger by listening for the GSAP timeline that OverprintReveal creates — but a simpler, decoupled approach: a separate IntersectionObserver inside this component triggers the underline draw at the same `threshold` as OverprintReveal (both are one-shot, both fire when the pull-quote enters viewport). They settle in the same RAF tick.

Create `src/components/about/PullQuote.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PullQuote — the editorial signature of each storied About block.
 *
 * Takes the quote text with `{}` placeholders marking the keyword
 * span. The keyword inherits the block's `--block-spot` colour via
 * `.pull-highlight` and gets a hand-drawn-stroke SVG underline that
 * animates draw-in on viewport-entry (B9, plan §4).
 *
 * Visual reveal is `<OverprintReveal>` per word — the existing
 * primitive handles per-char misregistration and reduced-motion.
 */

type PullQuoteProps = {
  /** Quote text with `{keyword}` markers around the highlighted span. */
  text: string;
  /** Threshold for the IO that triggers OverprintReveal + underline. */
  threshold?: number;
};

const UNDERLINE_THRESHOLD_DEFAULT = 0.35;

/** Parse `text` into segments. Tokens wrapped in `{...}` become highlight,
 * everything else stays plain. Multiple highlight spans are supported but
 * only the first one gets the SVG underline (B9 spec). */
function parseHighlight(text: string): { plain: string; highlight: string; tail: string } {
  const match = text.match(/^([\s\S]*?)\{([^}]+)\}([\s\S]*)$/);
  if (!match) return { plain: text, highlight: "", tail: "" };
  return { plain: match[1] ?? "", highlight: match[2] ?? "", tail: match[3] ?? "" };
}

export function PullQuote({ text, threshold = UNDERLINE_THRESHOLD_DEFAULT }: PullQuoteProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<SVGPathElement>(null);

  const { plain, highlight, tail } = parseHighlight(text);
  const hasHighlight = highlight !== "";

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const path = underlineRef.current;
    if (!container || !path) return;

    // Initial state: underline drawn 0%.
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    let fired = false;
    let tween: gsap.core.Tween | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          observer.disconnect();
          // Draw-in tied to the OverprintReveal cadence — fires the
          // underline ~600ms in so the ink chars land first.
          tween = gsap.to(path, {
            strokeDashoffset: 0,
            duration: 0.65,
            delay: 0.6,
            ease: "power2.out",
          });
        }
      },
      { threshold },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [reducedMotion, threshold]);

  return (
    <blockquote
      ref={containerRef}
      className="type-display relative not-italic"
      style={{ textAlign: "left" }}
    >
      <OverprintReveal text={plain} className="inline" />
      {hasHighlight ? (
        <span className="relative inline-block">
          {/* Hand-drawn-stroke underline. SVG path is a single curved
              line under the keyword. Width 100% of the keyword via
              the parent's inline-block. */}
          <span className="pull-highlight relative inline">
            <OverprintReveal text={highlight} className="inline" />
          </span>
          {!reducedMotion ? (
            <svg
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-3 w-full"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
            >
              <title>Underline</title>
              <path
                ref={underlineRef}
                d="M2 8 Q 25 4, 50 7 T 98 6"
                stroke="var(--block-spot)"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : null}
        </span>
      ) : null}
      {tail ? <OverprintReveal text={tail} className="inline" /> : null}
    </blockquote>
  );
}
```

- [ ] **Step 5.2: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/about/PullQuote.tsx
git commit -m "feat: PullQuote — XXL-italic w/ OverprintReveal + word-highlight + B9 hand-drawn underline"
```

---

### Task 6: Six inline-SVG stamp components

**Files:**
- Create: `src/components/about/stamps/CameraStamp.tsx`
- Create: `src/components/about/stamps/AudiStamp.tsx`
- Create: `src/components/about/stamps/JoggediballaStamp.tsx`
- Create: `src/components/about/stamps/SchneeStamp.tsx`
- Create: `src/components/about/stamps/TauchenStamp.tsx`
- Create: `src/components/about/stamps/PingPongStamp.tsx`

All six follow the same shape: an 80×80 SVG with a hand-cut riso-stamp feel — `stroke-linecap: round`, `stroke-linejoin: round`, `stroke-width: 2`, slight intentional rotation for "imperfect plate" feel. The accent colour is the per-tile spot.

- [ ] **Step 6.1: Camera stamp**

Create `src/components/about/stamps/CameraStamp.tsx`:

```tsx
/**
 * Camera body silhouette — Sony α7-style mirrorless. The lens centre
 * is filled in spot-color (first accent), the body outline is ink.
 * Hand-cut feel via slight asymmetry and rounded line caps.
 */

type Props = { spotVar: string };

export function CameraStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-2deg)" }}
    >
      <title>Camera</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body */}
        <path d="M 12 26 L 22 26 L 26 20 L 54 20 L 58 26 L 68 26 L 68 60 L 12 60 Z" />
        {/* Top hump (viewfinder) */}
        <path d="M 32 20 L 32 14 L 48 14 L 48 20" />
        {/* Lens ring outer */}
        <circle cx={40} cy={43} r={14} />
        {/* Lens ring inner */}
        <circle cx={40} cy={43} r={9} />
      </g>
      {/* Lens centre — filled spot */}
      <circle cx={40} cy={43} r={5} fill={spotVar} />
      {/* Shutter dot */}
      <circle cx={62} cy={31} r={1.5} fill="var(--color-ink)" />
    </svg>
  );
}
```

- [ ] **Step 6.2: Audi stamp**

Create `src/components/about/stamps/AudiStamp.tsx`:

```tsx
/**
 * Sportscar profile silhouette — sloped roofline, low stance, single
 * wheel-arch detail. Wheels filled in spot-color.
 */

type Props = { spotVar: string };

export function AudiStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(1.5deg)" }}
    >
      <title>Sportscar</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body silhouette */}
        <path d="M 6 52 L 14 52 L 18 38 Q 24 30, 38 28 L 52 28 Q 62 28, 70 36 L 74 44 L 74 52 L 70 52" />
        {/* Roofline + windows */}
        <path d="M 22 38 L 28 32 L 50 32 L 56 38" />
        {/* Window divider */}
        <path d="M 38 32 L 38 38" />
        {/* Bottom line under wheels */}
        <path d="M 22 56 L 30 56 M 50 56 L 58 56" />
      </g>
      {/* Wheels — filled spot */}
      <circle cx={26} cy={56} r={6} fill={spotVar} stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={54} cy={56} r={6} fill={spotVar} stroke="var(--color-ink)" strokeWidth={2} />
    </svg>
  );
}
```

- [ ] **Step 6.3: Joggediballa wordmark stamp**

Create `src/components/about/stamps/JoggediballaStamp.tsx`:

```tsx
/**
 * Joggediballa wordmark stamp — "JdB" monogram in the project's
 * Instrument-Serif Italic style, framed by a Riso-stamp box.
 */

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1deg)" }}
    >
      <title>Joggediballa</title>
      {/* Stamp frame */}
      <rect
        x={10}
        y={18}
        width={60}
        height={44}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Inner soft frame in spot */}
      <rect
        x={14}
        y={22}
        width={52}
        height={36}
        fill="none"
        stroke={spotVar}
        strokeWidth={1}
      />
      {/* Monogram */}
      <text
        x={40}
        y={49}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={22}
        fontStyle="italic"
        fontWeight={400}
        fill="var(--color-ink)"
      >
        JdB
      </text>
    </svg>
  );
}
```

- [ ] **Step 6.4: Schnee (mountain) stamp**

Create `src/components/about/stamps/SchneeStamp.tsx`:

```tsx
/**
 * Mountain stamp — twin-peak triangle with a chevron mark for the
 * carving line. Snow-cap accent in spot-color.
 */

type Props = { spotVar: string };

export function SchneeStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(2deg)" }}
    >
      <title>Mountain</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ground line */}
        <path d="M 8 60 L 72 60" />
        {/* Big peak */}
        <path d="M 12 60 L 32 22 L 52 60" />
        {/* Small peak behind */}
        <path d="M 40 60 L 56 32 L 68 60" />
        {/* Carving chevron line */}
        <path d="M 22 50 L 30 44 L 38 50" />
      </g>
      {/* Snow cap — filled spot */}
      <path
        d="M 27 30 L 32 22 L 37 30 Z"
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 6.5: Tauchen (diving) stamp**

Create `src/components/about/stamps/TauchenStamp.tsx`:

```tsx
/**
 * Diving mask stamp — frame, glass, snorkel-strap detail. Glass
 * filled in spot-color.
 */

type Props = { spotVar: string };

export function TauchenStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1.5deg)" }}
    >
      <title>Diving mask</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Mask frame */}
        <path d="M 14 32 L 14 50 Q 14 56, 20 56 L 60 56 Q 66 56, 66 50 L 66 32 Q 66 26, 60 26 L 20 26 Q 14 26, 14 32 Z" />
        {/* Bridge (between left + right glass) */}
        <path d="M 38 36 L 42 36 M 38 46 L 42 46" />
        {/* Strap left */}
        <path d="M 14 38 L 6 38" />
        {/* Strap right */}
        <path d="M 66 38 L 74 38" />
      </g>
      {/* Glass left — filled spot */}
      <rect x={18} y={30} width={18} height={20} rx={3} fill={spotVar} stroke="var(--color-ink)" strokeWidth={1.5} />
      {/* Glass right — filled spot */}
      <rect x={44} y={30} width={18} height={20} rx={3} fill={spotVar} stroke="var(--color-ink)" strokeWidth={1.5} />
      {/* Bubble */}
      <circle cx={68} cy={20} r={3} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
    </svg>
  );
}
```

- [ ] **Step 6.6: Ping-pong stamp**

Create `src/components/about/stamps/PingPongStamp.tsx`:

```tsx
/**
 * Ping-pong stamp — paddle (with grip) plus ball. Paddle face filled
 * in spot-color.
 */

type Props = { spotVar: string };

export function PingPongStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(1deg)" }}
    >
      <title>Ping-pong</title>
      {/* Paddle face */}
      <ellipse
        cx={36}
        cy={34}
        rx={20}
        ry={22}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      {/* Paddle handle */}
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 30 56 L 22 70 L 32 72 L 38 60" />
        {/* Face contour */}
        <ellipse cx={36} cy={34} rx={14} ry={16} />
      </g>
      {/* Ball — small filled circle */}
      <circle cx={62} cy={56} r={5} fill="var(--color-paper-tint)" stroke="var(--color-ink)" strokeWidth={2} />
    </svg>
  );
}
```

- [ ] **Step 6.7: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6.8: Commit**

```bash
git add src/components/about/stamps/
git commit -m "feat: six inline-SVG riso-stamps for About object-grid (camera/audi/jdb/schnee/tauchen/pingpong)"
```

---

### Task 7: ObjectGrid container with hover effects (B10)

**Files:**
- Create: `src/components/about/ObjectGrid.tsx`

- [ ] **Step 7.1: Write the component**

Create `src/components/about/ObjectGrid.tsx`:

```tsx
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { AudiStamp } from "./stamps/AudiStamp";
import { CameraStamp } from "./stamps/CameraStamp";
import { JoggediballaStamp } from "./stamps/JoggediballaStamp";
import { PingPongStamp } from "./stamps/PingPongStamp";
import { SchneeStamp } from "./stamps/SchneeStamp";
import { TauchenStamp } from "./stamps/TauchenStamp";
import { PlateCornerMarks } from "./PlateCornerMarks";

/**
 * ObjectGrid — Block 06 of the rewritten About. Replaces the old
 * Briefing § 2.5 Currently block + Briefing § 2.2 part 5 prose.
 *
 * Six riso-stamp tiles in a 3×2 grid (desktop) / 2×3 (mobile). Each
 * tile has its own spot-color rotation; on hover the tile rotates
 * ~2°, a soft spot-color flood washes from one corner, and the
 * caption shifts +2px (live Riso-misregistration). Tiles are not
 * interactive — hover effects are decorative.
 *
 * The "Currently learning" residue (the only Currently-line without
 * a physical-object equivalent) survives as a mono sub-band under
 * the grid header.
 */

type StampKey = "camera" | "audi" | "joggediballa" | "schnee" | "tauchen" | "pingpong";

type Tile = {
  key: StampKey;
  spot: "rose" | "amber" | "mint" | "violet";
  i18nKey: StampKey;
};

const TILES: readonly Tile[] = [
  { key: "camera", spot: "rose", i18nKey: "camera" },
  { key: "audi", spot: "amber", i18nKey: "audi" },
  { key: "joggediballa", spot: "mint", i18nKey: "joggediballa" },
  { key: "schnee", spot: "violet", i18nKey: "schnee" },
  { key: "tauchen", spot: "rose", i18nKey: "tauchen" },
  { key: "pingpong", spot: "amber", i18nKey: "pingpong" },
];

const SPOT_VAR: Record<Tile["spot"], string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

function TileStamp({ k, spotVar }: { k: StampKey; spotVar: string }) {
  switch (k) {
    case "camera":
      return <CameraStamp spotVar={spotVar} />;
    case "audi":
      return <AudiStamp spotVar={spotVar} />;
    case "joggediballa":
      return <JoggediballaStamp spotVar={spotVar} />;
    case "schnee":
      return <SchneeStamp spotVar={spotVar} />;
    case "tauchen":
      return <TauchenStamp spotVar={spotVar} />;
    case "pingpong":
      return <PingPongStamp spotVar={spotVar} />;
  }
}

export function ObjectGrid() {
  const t = useTranslations("about.objectGrid");

  return (
    <section
      id="about-objects"
      aria-labelledby="about-objects-heading"
      className="plate-corners relative container-page my-20 md:my-28"
    >
      <PlateCornerMarks />
      <header className="mb-10 md:mb-14">
        <p className="type-label text-ink-muted">{t("sectionLabel")}</p>
        <h3 id="about-objects-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h3>
        <p className="mt-3 type-label-stamp">{t("currentlyBand")}</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {TILES.map((tile) => {
          const cssVars = { "--tile-spot": SPOT_VAR[tile.spot] } as CSSProperties;
          return (
            <li key={tile.key} className="list-none">
              <figure
                className="group relative flex h-full flex-col gap-3 border-[1.5px] border-ink bg-paper-tint p-4 transition-transform duration-[280ms] ease-out hover:rotate-[-1.5deg] md:p-5"
                style={cssVars}
              >
                {/* Hover-flood: spot-color sweeps from top-left corner. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[280ms] ease-out group-hover:opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle at 0% 0%, var(--tile-spot) 0%, transparent 65%)",
                  }}
                />
                <div className="relative flex justify-center pt-2">
                  <TileStamp k={tile.key} spotVar={SPOT_VAR[tile.spot]} />
                </div>
                <figcaption className="relative mt-1 transition-transform duration-[280ms] ease-out group-hover:translate-x-[2px]">
                  <p className="type-label-stamp inline-flex">{t(`tiles.${tile.i18nKey}.name`)}</p>
                  <p className="mt-2 type-body-sm text-ink-soft">
                    {t(`tiles.${tile.i18nKey}.caption`)}
                  </p>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean. The `<figure>` is allowed inside `<section>`, no axe trap.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/about/ObjectGrid.tsx
git commit -m "feat: ObjectGrid — 6-tile riso-stamp grid w/ hover-rotate + spot-flood"
```

---

### Task 8: Messages — DE source for new About + Skills keys, mirror to en/fr/it

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/en.json`
- Modify: `messages/fr.json`
- Modify: `messages/it.json`

The new namespaces under `about` are: `pullQuotes` (one entry per storied block, with `{}` keyword markers), `marginalia` (per storied block, mono-stamp text), `objectGrid` (header + tiles + currently-band). Existing `about.parts[*].body` stays — the prose lives there. Existing `about.portrait` and `about.headline`/`about.subhead`/`about.sectionLabel` also stay.

The old `currently` namespace is no longer consumed by the rewritten `<About />`. **Leave it in place** — the keys cost nothing, removing them risks breaking other consumers that aren't yet refactored. The `<Currently>` block component in About.tsx is what we drop, not the strings.

- [ ] **Step 8.1: Append DE keys to messages/de.json**

In `messages/de.json`, locate the `"about"` namespace. After the existing `"portrait"` key (last entry inside `about`), append the following keys (mind the trailing comma after the previous entry).

The existing structure ends like:
```json
    "portrait": {
      "alt": "Portraitfoto von Manuel Heller",
      "caption": "Basel-Region · MMXXVI"
    }
  },
```

Change to:
```json
    "portrait": {
      "alt": "Portraitfoto von Manuel Heller",
      "caption": "Basel-Region · MMXXVI"
    },
    "pullQuotes": {
      "werIchBin": "Die spannenden Sachen passieren genau {dazwischen}.",
      "anfangen": "Ich will verstehen, {wie das alles unter der Haube} läuft.",
      "aiWorkflow": "AI-generierte Websites sehen heute alle gleich aus, weil die meisten Leute der AI nur sagen was sie wollen, nicht {wie}.",
      "antrieb": "Wer aufhört zu {lernen}, ist innerhalb von 12 Monaten abgehängt."
    },
    "marginalia": {
      "werIchBin": {
        "counter": "01 / 04",
        "label": "Identität",
        "year": "MMXXVI"
      },
      "anfangen": {
        "counter": "02 / 04",
        "stamps": [
          { "label": "Minecraft", "year": "2014" },
          { "label": "Novartis EFZ", "year": "2017–2021" },
          { "label": "zvoove", "year": "2021—" }
        ]
      },
      "aiWorkflow": {
        "counter": "03 / 04",
        "label": "Vibecoded"
      },
      "antrieb": {
        "counter": "04 / 04",
        "label": "Antrieb"
      }
    },
    "objectGrid": {
      "sectionLabel": "Off the screen",
      "headline": "Wenn der Bildschirm aus ist.",
      "currentlyBand": "Currently learning · React 19 · R3F 9 · WebGPU-Shader",
      "tiles": {
        "camera": {
          "name": "Kamera",
          "caption": "shooting · Sony α7 IV · Wildlife"
        },
        "audi": {
          "name": "Audi S5",
          "caption": "driving · B8.5 · Tuning-Projekt"
        },
        "joggediballa": {
          "name": "Joggediballa",
          "caption": "co-running · Verein · Vize-Präsident"
        },
        "schnee": {
          "name": "Schnee",
          "caption": "carving · Ski/Snowboard · Wintersaison"
        },
        "tauchen": {
          "name": "Tiefe",
          "caption": "diving · Wo's geht"
        },
        "pingpong": {
          "name": "Ping-Pong",
          "caption": "chasing · zvoove-Champion-Titel"
        }
      }
    }
  },
```

- [ ] **Step 8.2: Mirror to en.json, fr.json, it.json**

Per Phase 6/7/8/9 deviation pattern, body content is DE-mirrored across en/fr/it until Sprint 5. Copy the exact same JSON block (including DE strings) into each of `messages/en.json`, `messages/fr.json`, `messages/it.json` at the same position (after `about.portrait`, before the closing `}` of `about`).

For each of `en.json`, `fr.json`, `it.json`:
1. Locate the `about` namespace
2. Locate the `portrait` key
3. Apply the exact same diff as Step 8.1 (prepending `,` to the existing `}`, then the three new keys verbatim)

- [ ] **Step 8.3: Verify JSON parses**

Run: `pnpm exec biome format --write messages/`
Expected: 4 files reformatted, no parse errors.

Run: `pnpm typecheck`
Expected: clean (next-intl validates JSON structure at build time, but typecheck won't catch missing keys yet — that lands at build).

- [ ] **Step 8.4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): add about-rework keys (pullQuotes/marginalia/objectGrid), DE-mirror across en/fr/it"
```

---

### Task 9: Rewrite About.tsx using new primitives

**Files:**
- Modify: `src/components/sections/About.tsx`

- [ ] **Step 9.1: Rewrite the file**

Replace the entire contents of `src/components/sections/About.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { AboutBlock } from "@/components/about/AboutBlock";
import { ObjectGrid } from "@/components/about/ObjectGrid";
import { PlateCornerMarks } from "@/components/about/PlateCornerMarks";
import { PullQuote } from "@/components/about/PullQuote";
import { StampDivider } from "@/components/about/StampDivider";
import { FadeIn } from "@/components/motion/FadeIn";
import { VibecodedStamp } from "@/components/skills/VibecodedStamp";
import { AiPinselQuote } from "@/components/ui/AiPinselQuote";
import { Portrait } from "@/components/ui/Portrait";

/**
 * About — Section 01 (Phase 11 visual rework).
 *
 * Spine (see docs/superpowers/specs/2026-05-04-about-skills-visual-
 * rework-design.md § 3):
 *
 *   00 Header  → 01 Wer ich bin (rose)  → 02 Anfangen (mint)
 *   → 03 Portrait  → 04 AI-Workflow (amber)  → 05 Antrieb (violet)
 *   → 06 Object-Grid  → 07 AI-Pinsel-Closer
 *
 * Briefing § 2.2 prose stays verbatim — only structure + theatrics
 * change. Pull-quotes are pulled FROM that prose, not new text.
 *
 * Currently-block (Briefing § 2.5) is dropped from About; the
 * "Currently learning" residue lives as a sub-band under the
 * Object-Grid header.
 */

type AboutPart = {
  id: string;
  heading: string;
  body: string[];
};

type StampMargItem = { label: string; year: string };

/**
 * BodyProse — wraps each paragraph in FadeIn (B2 in spec § 4) so the
 * body-prose trickles in after the pull-quote lands. Stagger 60ms
 * per paragraph, baseline delay 400ms (≈ pull-quote reveal duration
 * `dur.medium` 0.56s; we kick in just slightly before completion so
 * the body feels coupled to the quote).
 *
 * Drop-cap (B4) is CSS via `.about-block-body > p:first-of-type::
 * first-letter` and works through the FadeIn span because
 * `:first-letter` styles the first formatted character inside the
 * `<p>` regardless of intermediate inline elements.
 */
function BodyProse({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="about-block-body mt-8 flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p
          key={`p-${
            // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable
            i
          }`}
          className="type-body text-ink"
        >
          <FadeIn delay={i * 0.06 + 0.4}>{p}</FadeIn>
        </p>
      ))}
    </div>
  );
}

export function About() {
  const t = useTranslations("about");
  const parts = t.raw("parts") as AboutPart[];
  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));

  // Helpers — body prose lookup (stays verbatim from briefing).
  const bodyOf = (id: string) => partsById[id]?.body ?? [];

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="plate-corners relative py-20 md:py-28"
    >
      <PlateCornerMarks />

      {/* 00 Header */}
      <header className="container-page grid-12 mb-12 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">
          {t("sectionLabel")}
        </p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="about-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      {/* 01 Wer ich bin */}
      <AboutBlock
        id="wer-ich-bin"
        spot="rose"
        layout="marg-left-content-right"
        marginalia={
          <div className="flex flex-col gap-2">
            <span className="type-label-stamp">{t("marginalia.werIchBin.counter")}</span>
            <span className="type-label text-ink-muted">{t("marginalia.werIchBin.label")}</span>
            <span className="type-label text-ink-muted">{t("marginalia.werIchBin.year")}</span>
          </div>
        }
      >
        <PullQuote text={t("pullQuotes.werIchBin")} />
        <BodyProse paragraphs={bodyOf("wer-ich-bin")} />
      </AboutBlock>

      <StampDivider />

      {/* 02 Anfangen */}
      <AboutBlock
        id="wie-angefangen"
        spot="mint"
        layout="content-left-marg-right"
        marginalia={
          <div className="flex flex-col gap-3">
            <span className="type-label-stamp">{t("marginalia.anfangen.counter")}</span>
            {(t.raw("marginalia.anfangen.stamps") as StampMargItem[]).map((s) => (
              <span key={s.label} className="type-label-stamp">
                {s.label} · {s.year}
              </span>
            ))}
          </div>
        }
      >
        <PullQuote text={t("pullQuotes.anfangen")} />
        <BodyProse paragraphs={bodyOf("wie-angefangen")} />
      </AboutBlock>

      <StampDivider />

      {/* 03 Portrait-Anchor */}
      <div className="container-page grid-12 my-16 md:my-24">
        <div className="col-span-12 md:col-span-5 md:col-start-4">
          <Portrait alt={t("portrait.alt")} caption={t("portrait.caption")} />
        </div>
      </div>

      <StampDivider />

      {/* 04 AI-Workflow (loud-centered) — B7: VibecodedStamp as
          eyepoint above the pull-quote, animates in on viewport-
          entry via the stamp's own IO. */}
      <AboutBlock id="ai-workflow" spot="amber" layout="loud-centered">
        <div className="mb-4 flex justify-end">
          <VibecodedStamp>{t("vibecodedMarker")}</VibecodedStamp>
        </div>
        <PullQuote text={t("pullQuotes.aiWorkflow")} />
        <BodyProse paragraphs={bodyOf("ai-workflow")} />
      </AboutBlock>

      <StampDivider />

      {/* 05 Antrieb (short-centered) */}
      <AboutBlock id="antrieb" spot="violet" layout="short-centered">
        <PullQuote text={t("pullQuotes.antrieb")} />
        <BodyProse paragraphs={bodyOf("antrieb")} />
      </AboutBlock>

      <StampDivider />

      {/* 06 Object-Grid (replaces part 5 + Currently) */}
      <ObjectGrid />

      <StampDivider />

      {/* 07 AI-Pinsel-Closer */}
      <AiPinselQuote />
    </section>
  );
}
```

- [ ] **Step 9.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: clean (the new message keys are resolved at build time; missing key would surface here).

- [ ] **Step 9.3: Manual visual review (dev server)**

Run: `pnpm dev` (Windows: `dev.cmd`).

Open `http://localhost:3000/de` in a browser. Scroll through the About section.

Verify:
- All 8 spine items render (header → block 01 → divider → block 02 → divider → portrait → divider → block 04 → divider → block 05 → divider → object-grid → divider → AI-pinsel-closer)
- Each storied block shows: Pull-quote with OverprintReveal misregistration → drop-cap on first body paragraph → block-keyed spot-color (rose, mint, amber, violet)
- Marginalia renders correctly per layout variant (block 01 has counter+label+year on left; block 02 has counter+3 stamps on right; blocks 04+05 have no marginalia)
- Object-grid renders 6 stamps with hover-rotate + spot-flood + caption-shift
- Plate-corner marks visible at section + grid corners
- Stamp-dividers between blocks tint to outgoing block's spot

Stop the dev server.

- [ ] **Step 9.4: Run a11y suite**

Run: `pnpm build && E2E_TARGET=prod pnpm test:a11y`
Expected: all 16 tests green (4 locales × 2 motion preferences × 2 routes).

If `landmark-complementary-is-top-level` violations appear: any `<aside>` inside `<section>` needs to be `<div>`. Check `AboutBlock.tsx` step 4.2 was applied; check the storied blocks in About.tsx don't accidentally use `<aside>`.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/sections/About.tsx
git commit -m "feat: rewrite About section per visual rework spec (8-block spine, pullquotes, object-grid)"
```

---

### Task 10: VibecodedStamp animated marker (C1)

**Files:**
- Create: `src/components/skills/VibecodedStamp.tsx`

- [ ] **Step 10.1: Write the component**

Create `src/components/skills/VibecodedStamp.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dur, ease } from "@/lib/motion/tokens";

/**
 * VibecodedStamp — wraps the [vibecoded] marker text and animates it
 * into place like a real Riso-stamp landing on the skill word.
 *
 * Mechanic: starts scaled 1.6, rotated -8°, opacity 0. On viewport-
 * entry of the parent skill-tier container (one-shot via IO), tweens
 * to scale 1, rotate 0°, opacity 1 with ease `riso`. A brief shadow-
 * burst pulses behind the stamp at impact (rose halo, 200ms fade).
 *
 * Stagger between sibling stamps in the same tier is handled by the
 * parent — VibecodedStamp doesn't know about its siblings. The parent
 * passes a `delay` (seconds) per stamp.
 */

type Props = {
  /** Text to render inside the stamp (typically "vibecoded"). */
  children: ReactNode;
  /** Stagger delay applied to the GSAP tween, in seconds. */
  delay?: number;
};

export function VibecodedStamp({ children, delay = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const halo = haloRef.current;
    if (!wrap || !halo) return;

    gsap.set(wrap, { scale: 1.6, rotate: -8, opacity: 0 });
    gsap.set(halo, { opacity: 0, scale: 0.6 });

    let fired = false;
    const easeCurve = `cubic-bezier(${ease.riso.join(",")})`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          observer.disconnect();

          const tl = gsap.timeline({ delay });
          tl.to(wrap, {
            scale: 1,
            rotate: 0,
            opacity: 1,
            duration: dur.short,
            ease: easeCurve,
          });
          tl.to(
            halo,
            { opacity: 0.55, scale: 1.4, duration: dur.micro, ease: "power2.out" },
            "<",
          ).to(
            halo,
            { opacity: 0, scale: 1.8, duration: 0.18, ease: "power1.out" },
          );
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(wrap);

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion, delay]);

  return (
    <span ref={wrapRef} className="relative inline-block px-1.5 align-baseline">
      <span
        ref={haloRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-sm"
        style={{ backgroundColor: "var(--color-spot-rose)", filter: "blur(6px)" }}
      />
      <span className="type-label inline-block border-[1.5px] border-ink bg-paper px-1 py-0.5 text-ink">
        {children}
      </span>
    </span>
  );
}
```

- [ ] **Step 10.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 10.3: Commit**

```bash
git add src/components/skills/VibecodedStamp.tsx
git commit -m "feat: VibecodedStamp — animated [vibecoded] marker (C1)"
```

---

### Task 11: HeroSkillPulse ambient halo (C3)

**Files:**
- Create: `src/components/skills/HeroSkillPulse.tsx`

- [ ] **Step 11.1: Write the component**

Create `src/components/skills/HeroSkillPulse.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * HeroSkillPulse — ambient peripheral-vision marker behind the Skills
 * section's XXL "AI-Workflow & Vibecoding" hero block. A blurred
 * spot-color halo loops through the four Riso inks, rising and
 * fading every ~4 seconds. Subtle — the visitor barely registers it
 * consciously, but the section reads as "alive" rather than static.
 *
 * Mechanic: position absolute behind the hero text (parent provides
 * `position: relative`). Width/height ~120% / 80% of parent. GSAP
 * timeline ramps opacity 0 → 0.4 → 0 over 2.8s, holds at 0 for 1.2s,
 * then advances colour. Loops indefinitely.
 *
 * Reduced-motion: timeline killed at mount, halo stays at opacity 0.
 *
 * Place inside the hero-skill container; the timeline cleans up on
 * unmount.
 */

const COLORS = [
  "var(--color-spot-rose)",
  "var(--color-spot-amber)",
  "var(--color-spot-mint)",
  "var(--color-spot-violet)",
] as const;

export function HeroSkillPulse() {
  const reducedMotion = useReducedMotion();
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const halo = haloRef.current;
    if (!halo) return;

    gsap.set(halo, { opacity: 0 });
    let i = 0;
    let killed = false;

    const cycle = () => {
      if (killed) return;
      halo.style.backgroundColor = COLORS[i % COLORS.length] ?? COLORS[0];
      i++;
      const tl = gsap.timeline({ onComplete: cycle });
      tl.to(halo, { opacity: 0.4, duration: 1.4, ease: "sine.inOut" })
        .to(halo, { opacity: 0, duration: 1.4, ease: "sine.inOut" })
        .to({}, { duration: 1.2 });
    };
    cycle();

    return () => {
      killed = true;
      gsap.killTweensOf(halo);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={haloRef}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10"
      style={{
        top: "10%",
        left: "-10%",
        width: "120%",
        height: "80%",
        filter: "blur(40px)",
        mixBlendMode: "multiply",
        opacity: 0,
      }}
    />
  );
}
```

- [ ] **Step 11.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 11.3: Commit**

```bash
git add src/components/skills/HeroSkillPulse.tsx
git commit -m "feat: HeroSkillPulse — ambient spot-color halo behind hero skill (C3)"
```

---

### Task 12: Wire C1+C2+C3 into Skills.tsx

**Files:**
- Modify: `src/components/sections/Skills.tsx`

- [ ] **Step 12.1: Read current Skills.tsx**

Run: `cat src/components/sections/Skills.tsx | head -200` to refresh context. Skills currently renders a hero-skill block + tier groups. We need to:

1. Wrap the hero-skill name in a `position: relative` container that hosts `<HeroSkillPulse />`.
2. Replace any `[vibecoded]`-marker rendering with `<VibecodedStamp delay={i * 0.08}>{markerText}</VibecodedStamp>` (per item index).
3. Wrap each skill name (in every tier) with a `<span className="misreg-hover" data-text={skillName}>{skillName}</span>` for C2.

The exact diff depends on the current structure. The principle:

- Hero-skill section gets `relative` + `<HeroSkillPulse />` mounted as first child
- For each `[vibecoded]` item: replace plain text with `<VibecodedStamp>` carrying the marker text and a `delay` prop based on the item's index in the vibecoded tier
- For every skill name (in every tier): wrap the `{name}` text in a span with `className="misreg-hover"` and `data-text={name}` (so the pseudo-elements can render the same text via `attr(data-text)`)

- [ ] **Step 12.2: Apply the edit**

Open `src/components/sections/Skills.tsx`. The exact locations to edit depend on the current implementation (Phase 6). Apply this transformation pattern:

**A. Imports (top of file):**

Add:
```tsx
import { HeroSkillPulse } from "@/components/skills/HeroSkillPulse";
import { VibecodedStamp } from "@/components/skills/VibecodedStamp";
```

**B. Hero-skill block:**

Locate the JSX that renders the XXL hero-skill block (named "AI-Workflow & Vibecoding" or driven by `t("heroSkill.name")`). Wrap that block in a relative positioned container and add `<HeroSkillPulse />` as the first child:

```tsx
{/* before */}
<div className="hero-skill-block">
  <h3>{t("heroSkill.name")}</h3>
  ...
</div>

{/* after */}
<div className="hero-skill-block relative">
  <HeroSkillPulse />
  <h3>{t("heroSkill.name")}</h3>
  ...
</div>
```

(Adapt class names to whatever the current implementation uses; the key change is `position: relative` on the container and `<HeroSkillPulse />` as the first child so the halo sits behind everything.)

**C. Skill names — wrap in misreg-hover:**

Locate the JSX that renders skill items (typically a `.map(item => …)` over the tier's `items` array). For each item's name, wrap the rendered name string:

```tsx
{/* before */}
<span>{item.name}</span>

{/* after */}
<span className="misreg-hover" data-text={item.name} tabIndex={0}>
  {item.name}
</span>
```

`tabIndex={0}` makes the span keyboard-focusable so `:focus-visible` triggers the misreg effect for keyboard users. Without it, the effect is hover-only.

**D. Vibecoded marker — replace with VibecodedStamp:**

Locate the JSX that renders the `[vibecoded]` marker (per-item, conditional on `item.vibecoded`). Replace:

```tsx
{/* before */}
{item.vibecoded ? <span className="vibecoded-marker">{t("vibecodedMarker")}</span> : null}

{/* after */}
{item.vibecoded ? (
  <VibecodedStamp delay={i * 0.08}>{t("vibecodedMarker")}</VibecodedStamp>
) : null}
```

The `i` is the item's index inside its tier's `items` array (already in scope inside the `.map`). The 80ms-stagger between vibecoded items in the same tier is what gives the "stamps landing in sequence" feel.

- [ ] **Step 12.3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: clean.

- [ ] **Step 12.4: Manual visual review**

Run: `pnpm dev` (Windows: `dev.cmd`).

Open `http://localhost:3000/de`, scroll to Skills section.

Verify:
- Hero-skill "AI-Workflow & Vibecoding" has subtle ambient halo cycling through 4 spot-colors (slow, peripheral)
- Hovering over any skill name (e.g. "PHP", "Vue", "tRPC") triggers the rose+mint ghost split for ~150ms, snaps back when cursor leaves
- Tab-focusing a skill name (keyboard) triggers the same effect via `:focus-visible`
- Scrolling the Vibecoded tier into view triggers the stamps to land sequentially with rotation snap + halo flash
- Reduced-motion (DevTools "Emulate reduced motion") disables: halo (no animation), hover-misreg (pseudo-elements hidden), vibecoded stamps (render statically without scale/rotate animation)

Stop dev server.

- [ ] **Step 12.5: Run a11y suite**

Run: `pnpm build && E2E_TARGET=prod pnpm test:a11y`
Expected: all 16 tests green.

- [ ] **Step 12.6: Commit**

```bash
git add src/components/sections/Skills.tsx
git commit -m "feat: Skills C-touch — vibecoded stamps animate, skill words misreg on hover, hero-skill ambient pulse"
```

---

### Task 13: Full ci:local run + iris-Xe sanity check

**Files:** none (verification only)

- [ ] **Step 13.1: Full ci:local pipeline**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright tests show 49 passing (or thereabouts) and only the 2 pre-existing failures (overprint reduced-motion, playground trailing-slash) — both documented as pre-existing in `.claude/CLAUDE.md`.

If new failures appear:
- Axe `landmark-complementary-is-top-level`: check no `<aside>` was added inside `<section>` accidentally.
- Other new axe violations: investigate per the rule, fix, re-run.

- [ ] **Step 13.2: Iris-Xe sanity (manual, on Manuel's work laptop)**

This step is for Manuel to perform on his Iris-Xe machine. The acceptance bar is no regression below 40fps on the home page.

Run: `pnpm dev` on the Iris-Xe machine.

Open `http://localhost:3000/de`. Scroll the full home page. Open DevTools → Performance → record 5s of scroll across About + Skills.

Acceptance: continuous frametime < 25ms (≥ 40fps) during About + Skills scroll. The new effects should have negligible GPU/CPU impact (CSS-only hover, GSAP-driven stamp + pulse, no new WebGL).

If the frametime drops:
- Inspect: is HeroSkillPulse running 60fps even off-screen? It shouldn't (the halo is opacity 0 most of the time, but the timeline itself runs continuously). If this is a hot path, gate the timeline on an IO that tracks the hero-skill container's visibility.

- [ ] **Step 13.3: No commit (verification only).**

---

### Task 14: CLAUDE.md — Phase 11 polish-rework deviation entry

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 14.1: Append a "Phase 11 polish-rework deviations" subsection**

Open `.claude/CLAUDE.md`. Locate the existing `## Phase 11 deviations` section (near the bottom). At the end of that section (before the file ends), append:

```markdown

### Phase 11 polish-rework — About + Skills visual rework

Driven by `docs/superpowers/specs/2026-05-04-about-skills-visual-
rework-design.md`. Implementation plan at
`docs/superpowers/plans/2026-05-04-about-skills-visual-rework.md`.

- **About spine restructured**: the 5 equal-rectangle parts of the
  Phase 6 implementation are now an 8-spine-item flow (header → 4
  storied quote-blocks varying in column width → portrait anchor →
  object-grid → AI-Pinsel-Closer). Briefing § 2.2 prose stays
  verbatim; only structure + theatrics change.
- **Currently block dropped from About**. Briefing § 2.5's data
  ("shooting/driving/co-running/diving/chasing") is folded into the
  six tile-captions of the Object-Grid as verb-prefixed strings; the
  one Currently-line without a physical-object equivalent ("learning
  → R3F 9 / WebGPU") survives as a mono sub-band under the grid's
  header. The `currently` namespace in `messages/*.json` is left in
  place (cheap, avoids breaking other consumers if any reappear).
- **Per-block spot-color via `--block-spot` CSS variable**. Drop-cap
  (CSS `:first-letter`) and word-highlight inside pull-quotes both
  read this variable, so each block has its own "Riso plate"
  identity (rose / mint / amber / violet for the four storied blocks).
- **PullQuote text uses `{}` keyword markers**. The text of each
  pull-quote in `messages/*.json` wraps the highlighted span in
  curly braces (e.g. `"Die spannenden Sachen passieren genau
  {dazwischen}."`). The component parses + splits on the marker
  and only the first highlight gets the B9 SVG-underline animation
  (multi-highlight pull-quotes are out of scope for now).
- **Hover-misregistration is pure CSS** (`globals.css`
  `.misreg-hover` + `data-text` attribute pattern). Pseudo-elements
  `::before` (mint, -2px) and `::after` (rose, +2px) borrow the
  host's text via `attr(data-text)`. Triggered by `:hover` and
  `:focus-visible`. `prefers-reduced-motion` hides the pseudos.
- **DropCap is pure CSS via `:first-letter`** — no `<DropCap>`
  component. Targets `.about-block-body > p:first-of-type::first-
  letter`. Block-keyed colour from `--block-spot`.
- **StampDivider is pure markup** (Flexbox row with five spans —
  two dots / asterism / two dots — coloured via inherited
  `--block-spot`). No SVG, no JS.
- **Plate-corner-marks are absolutely-positioned inline SVG
  components** anchored to the parent's 4 corners with a 6px
  outset. Section + Object-Grid containers use
  `className="plate-corners relative"` to opt-in.
- **Six riso-stamps in `src/components/about/stamps/`**. Inline SVG,
  hand-cut feel via slight per-icon rotation (-2° to +2°). No icon
  library dep — Lucide / Phosphor would have looked too "product-
  glat" for the Riso aesthetic, this is intentional. ~150 LOC total
  across the six files.
- **C1 VibecodedStamp** uses an IO at `threshold: 0.4` keyed on the
  stamp's own viewport-entry. Stagger between siblings is the parent
  `Skills.tsx`'s job — it passes `delay={i * 0.08}` per stamp. Each
  stamp has a brief rose-halo burst at impact (200ms blur+fade)
  layered behind the stamp via a sibling absolutely-positioned
  `<span>`.
- **C2 hover-misreg works for keyboard too** because `tabIndex={0}`
  on the wrapping span + `:focus-visible` in the CSS. Skill names
  thus get the misreg both on mouse-hover and tab-focus, no
  separate keyboard-equivalent code needed.
- **C3 HeroSkillPulse loops continuously** without an IO gate. The
  cost is negligible (one GSAP timeline animating an `opacity` on a
  blurred div), and adding an IO gate would introduce a re-mount
  bug if the user scrolls past then back — the colour-cycle would
  restart from rose every time. Continuous loop is the simpler
  contract.
```

- [ ] **Step 14.2: Verify**

Run: `pnpm lint`
Expected: clean (CLAUDE.md isn't part of the lint pipeline, but checking everything stays consistent).

- [ ] **Step 14.3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: CLAUDE.md — phase 11 polish-rework deviations (about + skills visual rework)"
```

---

### Task 15: Final review + push readiness

**Files:** none (verification only)

- [ ] **Step 15.1: Re-run ci:local one last time**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright tests show ≥49 passing with only the 2 pre-existing failures.

- [ ] **Step 15.2: Verify the visual delta on Manuel's review**

Manual review by Manuel:
1. Open `http://localhost:3000/de` (after `pnpm dev`)
2. Scroll through About — should feel editorial, varied per block, lively in Riso theatrics, NOT 5-equal-rectangles
3. Scroll through Skills — vibecoded stamps animate in sequence on tier reveal, hovering any skill word triggers misreg flicker, hero-skill has subtle peripheral pulse
4. Locale-switch (DE → EN → FR → IT) — no loader re-runs (Phase 11 quick-fix), all four locales render the new structure (currently DE-mirror per § 8 deviation; proper translation is Sprint 5)
5. Reduced-motion (`prefers-reduced-motion: reduce` in DevTools) — all animations off, content fully readable

If Manuel finds visual issues that don't match the spec — open a follow-up task, do not amend this plan.

- [ ] **Step 15.3: No commit (verification only).**

---

## Summary of commits

When the plan is complete, the git log should show this sequence (one commit per task):

```
feat: about-rework CSS primitives — block-spot, drop-cap, misreg-hover, plate-corners
feat: PlateCornerMarks — 4-corner Riso registration cross marks
feat: StampDivider — dotted asterism row in outgoing-block spot-color
feat: AboutBlock — generic block container w/ spot-color + layout variants
feat: PullQuote — XXL-italic w/ OverprintReveal + word-highlight + B9 hand-drawn underline
feat: six inline-SVG riso-stamps for About object-grid (camera/audi/jdb/schnee/tauchen/pingpong)
feat: ObjectGrid — 6-tile riso-stamp grid w/ hover-rotate + spot-flood
feat(i18n): add about-rework keys (pullQuotes/marginalia/objectGrid), DE-mirror across en/fr/it
feat: rewrite About section per visual rework spec (8-block spine, pullquotes, object-grid)
feat: VibecodedStamp — animated [vibecoded] marker (C1)
feat: HeroSkillPulse — ambient spot-color halo behind hero skill (C3)
feat: Skills C-touch — vibecoded stamps animate, skill words misreg on hover, hero-skill ambient pulse
docs: CLAUDE.md — phase 11 polish-rework deviations (about + skills visual rework)
```

13 commits, ~12-16 hours of focused implementation work.
