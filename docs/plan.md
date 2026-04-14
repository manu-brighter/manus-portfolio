# Manuel Heller — Craft Portfolio "Toon Fluid"

> Plan & Master-Prompt für eine Awwwards-taugliche persönliche Portfolio-Website.
> Ziel: pures Craft-Showcase / "Skill Flex" — kein Corporate-CTA, sondern eine Seite die zeigt was Manuel kann, wenn er ohne Vorgaben und Deadline arbeitet.

---

## 0 · Kontext

Manuel Heller ist **Full-Stack Developer mit Fokus auf Frontend/Webdesign bei zvoove Switzerland AG** (`https://zvoove.ch`), lebt in der Basel-Region, Swiss German. Er ist außerdem *sehr erfahren im Arbeiten mit AI-Tools* (Claude Code, Cursor-like Workflows) — das fließt sowohl in die Selbstdarstellung als auch in den Bau-Prozess dieser Seite ein (AI-Pair-Programming als Teil des Crafts).

Zwei ernst betriebene Hobbies prägen seine Identität:
- **Fotografie** — eigenes Portfolio unter `https://manuelheller.myportfolio.com/portfolio`
- **Event-Verein "Joggediballa"** (`https://joggediballa.ch`) als Vize-Präsident, Social-Media-Manager und Web-Entwickler der Vereinsseite

Diese neue Portfolio-Website ist der öffentliche Beweis seines Craft-Könnens — Web-Development, Fotografie und Interaktionsdesign verschmolzen zu einer Identität. Awwwards-Site-of-the-Day-Niveau ist das Qualitätsziel, **aber keine Kopie** prämierter Seiten: eigene Design-Sprache, moderne 2026-Ästhetik, Fokus auf Performance auch auf mittelmäßiger Hardware (z.B. sein Arbeitslaptop mit Intel Iris Xe).

---

## 1 · Decisions Locked-In (Kurzfassung)

| Bereich | Entscheidung |
|---|---|
| **Purpose** | Craft-Showcase / "Skill Flex" — nicht Freelance-CTA, nicht Recruiter-Tool |
| **Photography-Integration** | Hybrid: 3–8 Foto-Highlights als Scroll-Interstitials, Link zu myportfolio.com für volle Galerie |
| **Sections** | Hero · About · Skills · Work · Joggediballa Case Study · Photography-Teaser · Playground · Contact |
| **Sprachen** | DE / EN / FR / IT — System-Sprache-Detection, Fallback Deutsch |
| **Design-Richtung** | **Toon Fluid Lens** — fullscreen GPU-Fluid-Simulation cel-shaded/posterized im Risograph-Stil, Cream-Paper-Basis, bold ink Outlines, Editorial rechtsbündig-asymmetrisch |
| **Hero-Interaktion** | Cursor IST die Fluid-Quelle (Force-Injection + Splat-on-Click), Scroll-Velocity feedet Vorticity |
| **Titel-Alignment** | **Rechtsbündig** monumental, Editorial-Italic, Risograph-Overprint-Offset beim Reveal. Mobile kollabiert zu rechtsbündig-vollbreit mit kleinerem Clamp |
| **Device-Support** | Vollständig responsive: Desktop/Laptop (primary) UND Mobile/Touch (first-class). Touch-Geräte: Tap/Drag injiziert Fluid-Forces, Pinch-Zoom für Gallery, statt Hover-States Long-Press. Alle 5 Quality-Tiers deviceabhängig (siehe §8) |
| **Hosting** | Static Export (Next.js `output: 'export'`) + Nginx auf Linux Root Server, kein Node-Runtime in Prod |
| **Content** | MDX-Dateien im Repo (git-versioniert, keine externe DB/CMS) |
| **Kontakt-Formular** | Optional via Resend/Formspree (externer Service, kein eigener Server nötig) |

---

## 2 · Kritische Review des ursprünglichen Gemini-Prompts

Gemini hat solide Grundlagen gelegt, aber der Prompt hat mehrere Schwächen die wir korrigieren:

### Was gut war
- Tech-Stack-Entscheidungen (Next.js + R3F + GSAP + Lenis + Tailwind) sind bewährt und passen zum Ziel
- Modulare Architektur-Forderung
- Iteratives Vorgehen (Schritt-für-Schritt statt ein Monster-Prompt)
- Docker/Nginx-Hosting-Planung früh mitgedacht

### Was fehlte oder falsch war
1. **"Dark Glass" als Design-Konzept** — 2022–2024 Ästhetik. 2026 Awwwards-Trends (Lando Norris SOTY, Messenger Dev-SOTY, Samsy's WebGPU-Cyberpunk) zeigen Bewegung zu **bold color, interactive simulations, scroll-driven narrative**. Wir ersetzen durch eine **Toon Fluid Lens**: fullscreen GPU-Fluid-Simulation, cel-shaded/posterized im Risograph-Druckstil. Cream-Paper-Basis + bold Ink-Outlines + 4 Spot-Farben. Cursor ist Force-Quelle, Scroll-Velocity feedet Vorticity. Resultat: wirkt wie ein lebender Risograph-Druck der 2026 geboren wurde — analog-retro-Referenz, aber rein GPU-powered.
2. **Kein i18n-Plan** — Manuel braucht 4 Sprachen, das ist architektur-relevant (Route-Strategie, Content-Fan-out, Build-Pipeline).
3. **Kein Performance-Budget** — Manuel hat explizit gesagt, dass Bruno-Simon-Portfolio auf seinem Arbeitslaptop lagged. Wir brauchen harte Targets (Core Web Vitals, GPU-Budget, Fallback-Strategien).
4. **Keine Accessibility-Erwähnung** — `prefers-reduced-motion`, Keyboard-Navigation, Screen-Reader-Semantik fehlen komplett. Für eine Awwwards-würdige Seite in 2026 nicht-verhandelbar.
5. **WebGPU nicht adressiert** — 2026 ist WebGPU produktiv (siehe Samsy). Wir sollten es als Progressive-Enhancement nutzen, nicht ignorieren.
6. **Versionen waren zu alt / unspezifisch** — inzwischen ist Next.js bei 16.x, neue API-Konventionen (`generateStaticParams`, Caching-Semantik in 15+).
7. **"DOM vs. Canvas perfekt synchronisiert"** wurde postuliert ohne Mechanismus — wir lösen das über **shared RAF loop** (alle Animations-Libs teilen einen Tick, verhindert Jitter).
8. **Shader als "Ladescreen"-Afterthought** — bei Oil-Slick ist der Loader selbst schon ein Signature-Moment. Nicht generisch.
9. **Kein Content-Strategie-Plan** — wo leben Projekte? Wer schreibt die Texte? Wie werden sie gepflegt? → MDX-im-Repo als Antwort.
10. **Kein Claude-Code-Setup erwähnt** — Manuel will das Projekt AI-optimieren. Wir liefern `.claude/`-Struktur als integralen Bestandteil.

Das Ergebnis: Unser Plan behält Geminis gute Architektur-Instinkte, aber ersetzt das Design-Konzept komplett und fügt die fehlenden Dimensionen hinzu.

---

## 3 · Tech Stack (2026-aktuell)

```jsonc
// Runtime & Framework
"next": "^16.2.3",              // App Router, static export ('output: export')
"react": "^19.1.0",
"react-dom": "^19.1.0",
"typescript": "^5.7.0",

// 3D / WebGL / Shader
"three": "^0.172.0",
"@react-three/fiber": "^9.1.0",  // React 19 + R3F 9 stable combo
"@react-three/drei": "^10.0.0",
"@react-three/postprocessing": "^3.0.0",
"leva": "^0.10.0",               // Shader parameter tuning (dev only)

// Animation & Scroll
"gsap": "^3.13.0",               // Timeline, ScrollTrigger, SplitText (now free since 2025 Webflow acquisition)
"@gsap/react": "^2.1.2",         // useGSAP hook
"lenis": "^1.2.3",               // Smooth scroll — now under LightMillo org

// i18n
"next-intl": "^4.0.0",           // Static-export-kompatibel, Route-based locales

// Styling
"tailwindcss": "^4.0.0",         // v4 mit neuem CSS engine, @theme directive
"@fontsource-variable/instrument-serif": "^5.0.0",
"@fontsource-variable/jetbrains-mono": "^5.0.0",
"@fontsource-variable/inter": "^5.0.0",

// Content
"@next/mdx": "^16.2.3",
"contentlayer2": "^0.5.0",       // Typed MDX at build time
"rehype-pretty-code": "^0.14.0", // Für Code-Blocks im Blog/Case-Studies
"shiki": "^1.29.0",

// Utility
"clsx": "^2.1.1",
"zustand": "^5.0.3",             // Global state (lang, theme, audio on/off)

// Dev / Quality
"@biomejs/biome": "^2.0.0",      // Lint + format, ersetzt ESLint + Prettier
"playwright": "^1.49.0",
"@axe-core/playwright": "^4.10.0", // A11y testing
"@lhci/cli": "^0.14.0",          // Lighthouse CI
```

**Entscheidungs-Rationale**:
- **Tailwind v4** statt v3: neue CSS-Engine ist schneller, `@theme` directive spart uns Config-Boilerplate, bessere Shader-Class-Extraction.
- **Biome** statt ESLint+Prettier: ein Tool, 10× schneller, moderne Defaults.
- **Contentlayer2** statt roher MDX: typisierte Frontmatter, automatische Route-Generierung, build-time Validation.
- **next-intl** statt `next-i18next`: App-Router-native, static-export-freundlich.
- **GSAP** ist 2025 komplett free geworden (Webflow-Deal), inkl. SplitText und MorphSVG — wir nutzen es ohne Sorge.

---

## 4 · Design System

### 4.1 Palette — "Riso Ink"

Risograph-inspiriert: Cream-Paper als Bühne, tiefes Ink-Black für Text + Outlines, 4 Spot-Farben für Fluid-Sim + Akzente. Kein "Dark Mode" — wir committen zum Paper-Look, das *ist* die Signature.

```css
/* CSS Custom Properties — live in app/globals.css */
:root {
  /* Paper base (dominant 70%+ der Fläche) */
  --paper:          #f0e8dc;   /* Hauptfläche, sections */
  --paper-tint:     #fef2e2;   /* Elevated surfaces, cards */
  --paper-shade:    #e4dbcd;   /* Sunken, input-bg */
  --paper-line:     #d6cbb8;   /* Hairlines, dividers */

  /* Ink (Text, Outlines, Bold-Akzente) */
  --ink:            #0a0608;   /* All bold outlines, body text */
  --ink-soft:       #1a0e12;   /* Secondary text */
  --ink-muted:      rgba(10, 6, 8, 0.55);
  --ink-faint:      rgba(10, 6, 8, 0.28);

  /* Spot colors — die 4 Riso-Tinten. Posterized-Steps im Fluid-Shader. */
  --spot-rose:      #ff6ba0;   /* Primary spot, CTAs, accents */
  --spot-amber:     #ffc474;   /* Warm accent, highlights */
  --spot-mint:      #7ce8c4;   /* Cool accent, focus ring */
  --spot-violet:    #b89aff;   /* Secondary cool, hover state */

  /* Semantic */
  --fg-primary:     var(--ink);
  --fg-secondary:   var(--ink-soft);
  --fg-tertiary:    var(--ink-muted);

  /* Functional */
  --focus-ring:     var(--spot-mint);
  --selection-bg:   var(--spot-rose);
  --selection-fg:   var(--paper-tint);
}
```

### 4.2 Der Fluid-Shader (GPU-Simulation)

**Das Herzstück der Seite.** Fullscreen Navier-Stokes-GPU-Solver (Stam-style semi-Lagrangian advection + Jacobi pressure solve) läuft per WebGL Framebuffer-Ping-Pong. Render-Pass applied dann:

1. **Posterize**: Density-Feld wird zu 3–4 Ton-Stufen quantisiert (step-function in GLSL).
2. **Color-Mapping**: Jede Stufe wird einer Spot-Farbe zugeordnet (rose → amber → mint → violet je nach Density).
3. **Edge-Detection**: Sobel-Filter auf das quantisierte Feld → schwarze Outlines bei Farb-Übergängen (2px effective, retina-aware).
4. **Paper-Grain-Overlay**: subtile `repeating-linear-gradient` + prozedural Perlin-Noise auf Luminance → Papier-Textur.

GPU-Fluid-Sim-Code landet zentral in `src/shaders/fluid/` als trennbare Module (advection, divergence, pressure, gradient-subtract) + einem `FluidOrchestrator.ts` der den Pipeline-Flow koordiniert.

### 4.3 Typografie

| Rolle | Font | Eigenschaften |
|---|---|---|
| **Display / Hero** | Instrument Serif (Variable) | Italic 400, `letter-spacing: -0.04em`, monumental `clamp(3.5rem, 12vw, 11rem)`, **rechtsbündig** (asymmetrisch, bricht Riso-Grid) |
| **Headlines** | Instrument Serif | Upright 400, mix mit Italic für rhythmische Akzente |
| **Body** | Inter Variable | 400/500, optical sizing, `text-rendering: optimizeLegibility` |
| **Meta / UI / Code** | JetBrains Mono | 400, UPPERCASE + `letter-spacing: 0.22em` für Labels. Oft mit **Risograph-Border** (`1.5px solid var(--ink)`) eingerahmt wie Druckstempel |

**Editorial-Regeln**:
- Hero-Headline **rechtsbündig**, 2–3-zeilig, Italic für ein Wort ("Heller, *Manuel.*") — die rechte Kante wird zur visuellen Anker-Linie, links atmet der Fluid durch
- Linker Rand hält strukturierte Mono-Labels (VP Joggediballa · zvoove · Basel) als Stempel-Columns — kontrastiert mit der rechtsbündigen Serif
- Body-Maximum 65–72ch
- **Overprint-Reveal**: beim Reveal faden 2 farbige Geisterkopien (rose + mint) mit 2–3px Offset ein, snappen dann auf Position — simuliert Risograph-Misregistration
- Alle UI-Labels in Mono-Uppercase, oft im "Druckstempel"-Stil mit Ink-Border

### 4.4 Motion-Tokens

```ts
// src/lib/motion/tokens.ts
export const motion = {
  ease: {
    standard: [0.25, 0.1, 0.25, 1],
    decelerate: [0, 0, 0.2, 1],
    accelerate: [0.4, 0, 1, 1],
    expo: [0.16, 1, 0.3, 1],              // Hero-Reveals, section entrances
    riso: [0.7, 0, 0.2, 1],                // Signature snap-in (Druck-Feel)
    fluidDrag: [0.4, 0.1, 0.2, 0.9],       // Fluid-Reaktionen auf Cursor
  },
  dur: {
    micro: 0.14,    // Hover, focus — snappy riso-print feel
    short: 0.28,
    medium: 0.56,
    long: 1.1,
    epic: 2.2,      // Loader, Hero one-time choreography
  },
} as const;
```

### 4.5 Spacing / Grid

- Base-Unit 4px (Tailwind-kompatibel)
- 12-Column Fluid-Grid via CSS Grid
- Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536
- Desktop-First beim Fluid-Shader (Mobile bekommt reduzierte 128² Sim statt 256²)

### 4.2 Typografie

| Rolle | Font | Eigenschaften |
|---|---|---|
| **Display / Hero** | Instrument Serif (Variable) | Italic 300–400, `letter-spacing: -0.035em`, Gradient-Clip für Iridescence |
| **Headlines** | Instrument Serif | Upright 400, tighter tracking |
| **Body** | Inter Variable | 400/500, optical sizing aktiv, `text-rendering: optimizeLegibility` |
| **Meta / UI / Code** | JetBrains Mono | 400, `letter-spacing: 0.18–0.3em` bei Labels, UPPERCASE für Micro-Copy |

**Editorial-Regeln**:
- Hero-Headlines skalieren fluid: `clamp(3rem, 10vw, 10rem)`
- Body-Maximum 65–72ch für Lesbarkeit
- Meta-Labels in Mono + Uppercase sind die visuelle Klammer zwischen Sektionen
- Character-Splitting via GSAP SplitText für Reveal-Animationen

### 4.3 Motion-Tokens

```ts
// src/lib/motion/tokens.ts
export const motion = {
  ease: {
    standard: [0.25, 0.1, 0.25, 1],      // CSS default
    decelerate: [0, 0, 0.2, 1],
    accelerate: [0.4, 0, 1, 1],
    expo: [0.16, 1, 0.3, 1],              // Für Hero-Reveals
    oilSlick: [0.77, 0, 0.175, 1],        // Signature, für Liquid-Transitions
  },
  dur: {
    micro: 0.18,    // Hover, focus
    short: 0.32,    // Button, small transitions
    medium: 0.64,   // Section transitions
    long: 1.2,      // Hero reveals, page entrance
    epic: 2.4,      // Loader, one-time hero choreography
  },
} as const;
```

### 4.4 Spacing / Grid

- Base-Unit 4px (Tailwind-kompatibel)
- 12-Column Fluid-Grid mit CSS Grid (kein Framework-Grid)
- Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536
- Desktop-First bei Hero/Shader (mobile kriegt reduzierte Shader-Varianten)

---

## 5 · Information Architecture

```
/ (home, single long-scroll)
├─ 00 · Hero / Intro
├─ 01 · About (editorial long-read mit Portrait-Foto)
├─ 02 · Skills (visuelle Tech-Gewichtung, kein langweiliges Icon-Grid)
├─ 03 · Work (Projekte-Carousel, 3–6 Projekte)
├─ 04 · Joggediballa Case Study (einzelner Deep-Dive-Block mit 2–3 Screens + Story)
├─ 05 · Photography Teaser (3–8 Fullscreen-Reveals + Link)
├─ 06 · Playground (shader experiments, no product context)
└─ 07 · Contact (Footer mit Socials + optional Contact-Form)

/en/  /de/  /fr/  /it/   — Locale-prefixed routes
/work/[slug]             — Dedizierte Projekt-Detail-Seiten (MDX)
/playground/[slug]       — Einzelne Shader-Experimente
```

---

## 6 · Signature "Wow"-Momente

Acht bewusst platzierte Spots wo Shader/Motion/Simulation-Craft gezeigt wird. Jedes hat Funktion, keine Deko.

1. **Intro Loader** — Fluid-Sim startet als einzelner Ink-Tropfen der auf Paper fällt, spritzt in alle vier Spot-Farben auseinander, formiert sich zum Wort "MANUEL" in cel-shaded Ink-Outline-Typografie, zerfließt dann in den Hero-Fluid.

2. **Hero Fluid Simulation** *(Herzstück)* — **Fullscreen Navier-Stokes-GPU-Solver**. Ink-Felder in 4 Spot-Farben, posterized zu harten Bändern, schwarze Sobel-Outlines. Cursor ist Force-Source (Drag = Vorticity-Injektion, Klick = Splat). Scroll-Velocity feedet in Advection-Step — schneller Scroll = wilder Fluid. Idle 10s → "atmet" mit sanfter Ambient-Motion (Curl-Noise).
   - **Desktop**: 256² Simulation-Grid, 60fps-Target, WebGL2 FBO-Ping-Pong
   - **Iris Xe / schwache GPU**: 128² Grid, 45fps-Floor
   - **Mobile**: 96² Grid + reduced outline quality, 30fps-Floor
   - **`prefers-reduced-motion`**: statisches pre-rendered Splash-Bild + subtiler Parallax bei Cursor (< 2px)

3. **Editorial Overprint-Reveal** — GSAP SplitText mit Risograph-Misregistration: 2 farbige Char-Kopien (spot-rose + spot-mint) mit 3px Offset faden ein, snappen auf Position (ease `riso`), dann fadet die Ink-Version darauf. Getimed per Lenis-Scroll-Velocity.

4. **Project Gallery** — Cel-shaded 3D-Planes mit dicken schwarzen Outlines (Toon-Shader mit Fresnel-basierter Rim-Line-Detection). Hover → Ink-Splat aus der Plane, morpht in Projekt-Preview. Click → Fluid-Sim "spült" die Übergangs-Transition zur Detail-Seite (Fluid-Reveal als Page-Transition-Primitiv).

5. **Photo Reveals (Risograph-Duotone)** — Jedes Teaser-Foto wird zur Laufzeit als **echter Risograph-Duotone** gerendert: Luminance → 2 Spot-Farben + Paper-Base, mit prozeduralem Halbton-Dot-Pattern (5 Mesh-Sizes basierend auf Viewport). Fotos bleiben erkennbar aber ästhetisch Teil der Riso-Welt. Link unten führt zu myportfolio für Original-Fotos.

6. **Custom Cursor** — Minimaler bold-ink-umrandeter Kreis (14px), weiß gefüllt, 2px Ink-Outline. **IST die Fluid-Force-Quelle** — keine separate Trail-Canvas. Bei klickbaren Elementen skaliert er (1.6×) und zieht umgebenden Fluid magnetisch an. Touch-Devices: Ripple-on-Tap im Fluid statt Cursor.

7. **Magnetic Buttons + Ink-Splat-Hover** — Primary-Buttons ziehen den Cursor an (Distance-based offset, max 12px), beim Hover spritzt ein kleiner Ink-Splash aus dem Button-Rand in Spot-Farbe (Mini-Fluid-Instance ODER SVG-Particle bei Perf-Constraint).

8. **Playground-Sandbox** — Full-Screen GPU-Fluid mit **Leva-Panel**: Spot-Farben tauschen, Viscosity/Vorticity/Dissipation-Slider, "Bomb"-Button (massiver Splat), "Freeze"-Button (Sim pausiert, du kannst mit Cursor durch den eingefrorenen Ink "schneiden"), "Reset-to-Ink-Drop"-Button. Pure Craft-Flex. Jedes Experiment (`/playground/[slug]`) kann eigenen Shader-Preset haben.

---

## 7 · Architektur & Folder-Struktur

```
manus-portfolio/
├─ .claude/                          # Claude-Code-Setup (siehe §12)
│   ├─ CLAUDE.md
│   ├─ agents/
│   ├─ commands/
│   └─ settings.json
├─ .github/
│   └─ workflows/
│       ├─ ci.yml                    # Biome, Playwright, Lighthouse CI
│       └─ deploy.yml                # SSH-rsync to root server on main
├─ public/
│   ├─ fonts/                        # Self-hosted via @fontsource (kein CDN)
│   ├─ photos/                       # Optimierte Teaser-Bilder (AVIF + WebP fallback)
│   └─ og/                           # Open Graph assets pro Locale
├─ content/                          # MDX Source-of-Truth
│   ├─ projects/
│   │   ├─ joggediballa.mdx
│   │   ├─ project-xyz.mdx
│   │   └─ ...
│   ├─ playground/
│   │   └─ noise-experiment-01.mdx
│   └─ about/
│       └─ bio.mdx                   # Pro Locale: bio.de.mdx, bio.en.mdx, bio.fr.mdx, bio.it.mdx
├─ messages/                         # next-intl UI-Strings
│   ├─ de.json
│   ├─ en.json
│   ├─ fr.json
│   └─ it.json
├─ src/
│   ├─ app/
│   │   ├─ [locale]/
│   │   │   ├─ layout.tsx            # Locale-spezifisches Layout, LenisProvider
│   │   │   ├─ page.tsx              # Home-Longscroll
│   │   │   ├─ work/[slug]/page.tsx
│   │   │   └─ playground/[slug]/page.tsx
│   │   ├─ layout.tsx                # Root: Fonts, ThemeProvider, SceneProvider
│   │   └─ globals.css               # Tailwind + design tokens + critical
│   ├─ components/
│   │   ├─ ui/                       # Pure DOM components (Button, Link, Nav)
│   │   ├─ sections/                 # Hero, About, Work, etc.
│   │   ├─ scene/                    # WebGL wrappers, Canvas hosting
│   │   │   ├─ Canvas.tsx            # Single persistent R3F Canvas
│   │   │   ├─ FluidSim.tsx          # Hero Navier-Stokes simulation
│   │   │   ├─ FluidOrchestrator.ts  # Coordinates fluid pipeline + quality-tiers
│   │   │   ├─ ProjectGallery.tsx    # Cel-shaded 3D gallery
│   │   │   ├─ PhotoDuotone.tsx      # Runtime riso-duotone for photos
│   │   │   ├─ PageTransition.tsx    # Ink-wipe between routes
│   │   │   └─ Cursor.tsx            # Minimal cursor + fluid force integration
│   │   └─ motion/                   # GSAP-wrapped primitives (TextReveal, FadeIn)
│   ├─ shaders/                      # GLSL, separate .vert/.frag pairs
│   │   ├─ common/
│   │   │   ├─ noise.glsl            # FBM, simplex, curl — shared
│   │   │   ├─ posterize.glsl        # Step-quantization helpers
│   │   │   └─ sobel.glsl            # Edge-detection for Toon-Outlines
│   │   ├─ fluid/                    # Navier-Stokes GPU-Solver
│   │   │   ├─ advect.frag.glsl
│   │   │   ├─ divergence.frag.glsl
│   │   │   ├─ pressure.frag.glsl
│   │   │   ├─ gradient-subtract.frag.glsl
│   │   │   ├─ vorticity.frag.glsl
│   │   │   ├─ splat.frag.glsl       # Cursor force injection
│   │   │   └─ render-toon.frag.glsl # Posterize + color-map + outline pass
│   │   ├─ toon/                     # Cel-shader for 3D objects (gallery)
│   │   │   ├─ toon.vert.glsl
│   │   │   └─ toon.frag.glsl
│   │   ├─ photo-duotone/            # Runtime Risograph-Duotone für Fotos
│   │   │   └─ duotone.frag.glsl
│   │   └─ page-transition/
│   │       └─ ink-wipe.frag.glsl    # Fluid-based page transition
│   ├─ lib/
│   │   ├─ raf.ts                    # Shared RAF loop (ticker for GSAP + Lenis + R3F)
│   │   ├─ gpu.ts                    # Capability detection, fallback logic
│   │   ├─ i18n/
│   │   │   ├─ config.ts
│   │   │   └─ routing.ts
│   │   ├─ content/
│   │   │   └─ projects.ts           # Contentlayer data access
│   │   └─ motion/
│   │       └─ tokens.ts
│   ├─ hooks/
│   │   ├─ useLenis.ts
│   │   ├─ useReducedMotion.ts
│   │   ├─ useGPUCapability.ts
│   │   └─ useMousePosition.ts
│   └─ styles/
│       └─ tailwind.config.ts
├─ tests/
│   ├─ e2e/
│   │   └─ smoke.spec.ts
│   └─ a11y/
│       └─ axe.spec.ts
├─ scripts/
│   ├─ optimize-photos.ts            # Batch-AVIF/WebP-Pipeline
│   └─ deploy.sh                     # rsync zum Server
├─ docker/
│   └─ build.Dockerfile              # Nur für BUILD, nicht für Runtime
├─ server/                           # Was auf den Root-Server kommt
│   ├─ nginx.conf
│   └─ README.md                     # Server-Setup-Doku
├─ biome.json
├─ contentlayer.config.ts
├─ next.config.ts                    # output: 'export', images unoptimized config
├─ tsconfig.json
└─ package.json
```

---

## 8 · Performance-Budget

Der Fluid-Solver ist der teuerste Block der Seite. Wir commissionieren ihn mit harten Grenzen und expliziten Fallback-Tiers.

| Metrik | Target | Hard Limit |
|---|---|---|
| **Lighthouse Performance** | ≥ 95 | ≥ 90 |
| **Lighthouse A11y** | 100 | ≥ 95 |
| **LCP** | < 1.8s | < 2.5s |
| **INP** | < 150ms | < 200ms |
| **CLS** | < 0.05 | < 0.1 |
| **Initial JS bundle (gzipped)** | < 130kB | < 180kB |
| **Largest image (AVIF)** | < 80kB | < 150kB |
| **Fluid-Sim frame time (RTX-class)** | < 8ms | < 12ms (60fps) |
| **Fluid-Sim frame time (Iris Xe)** | < 18ms | < 22ms (45fps-Floor) |
| **Fluid-Sim frame time (Mobile Mid)** | < 28ms | < 33ms (30fps-Floor) |

**Fluid-Sim Quality-Tiers** (auto-detected via GPU-capability probe):

| Tier | Grid | Iterations | Targets |
|---|---|---|---|
| **High** | 512² | 25 Jacobi, 40 pressure | Desktop RTX 30xx+, M2+ |
| **Medium** | 256² | 20 Jacobi, 30 pressure | Desktop dedicated GPUs, M1 |
| **Low** | 128² | 15 Jacobi, 20 pressure | Intel Iris Xe, älterer Integrated-Graphics |
| **Minimal** | 96² | 10 Jacobi, 15 pressure | Mobile Mid-Range |
| **Static-Fallback** | — | — | `prefers-reduced-motion` ODER WebGL2 nicht verfügbar ODER Quality-Probe failed |

Static-Fallback = pre-rendered, gezipptes WebP-Still der Fluid-Sim (3 Varianten pro Locale-Hero). < 30kB pro Bild.

**Weitere Performance-Strategien**:
- Single R3F `<Canvas>` persistent durch alle Sektionen (kein Re-Mount).
- Fluid-Sim läuft in eigenem `requestAnimationFrame`-Ticker auf 30Hz (Half-Rate) wenn Tier ≤ Low — Render weiter 60Hz aber Sim-Step alle 2 Frames.
- Photos: AVIF-first mit WebP-Fallback, `loading="lazy"` ab Fold 2, `decoding="async"`.
- Fonts: Self-hosted `font-display: swap`, Preload nur für Hero-Weights.
- Code-Splitting pro Section via `dynamic()` Imports.
- Shared RAF-Ticker (GSAP + Lenis + R3F teilen einen Frame) → kein Drift, kein Jitter.
- Fluid-Sim pausiert automatisch wenn Section außerhalb Viewport (`IntersectionObserver`) — kein GPU-Cycle wenn nicht sichtbar.
- **Visibility-Pause**: Wenn Tab im Background (`visibilitychange`), alle Animationen + Sim freezen.

---

## 9 · Accessibility & Reduced-Motion

Nicht-verhandelbar. Eine Shader-heavy Seite in 2026 muss diese Basics haben:

- `prefers-reduced-motion: reduce` → alle GSAP-Timelines auf `duration: 0`, Fluid-Sim wird durch pre-rendered Static-WebP ersetzt (siehe §8 Quality-Tier "Static-Fallback"), Gallery-Planes werden zu CSS-Grid, Cursor wird zu nativem System-Cursor.
- **Keyboard-Navigation**: alle Interaktionen via Tab erreichbar, sichtbarer `:focus-visible` Ring in `--iri-mint`.
- **Semantic HTML**: `<main>`, `<section>`, `<article>`, `<nav>` — nicht nur `<div>`.
- **Skip-Link** zu Main-Content als allererstes Fokus-Ziel.
- **Alt-Texte** für alle Fotos, sinnvoll (nicht "photo.jpg").
- **ARIA-Labels** für alle Icon-Buttons und Shader-Canvases (`aria-hidden="true"` für rein dekorative, `role="img" aria-label=...` für bedeutungstragende).
- **Farbkontrast**: Body-Text mindestens 7:1 (AAA), UI-Elemente 4.5:1 (AA).
- **Axe-Playwright-Tests** in CI, Build bricht bei Violations.

---

## 10 · i18n-Architektur

- **next-intl** mit Route-based Locales (`/de/…`, `/en/…`, `/fr/…`, `/it/…`).
- Root-Middleware: detectiert `Accept-Language`, redirectet auf passende Locale, fallback `/de`.
- Content-Strategy: pro MDX-File 4 Sprach-Varianten (`project.de.mdx`, `project.en.mdx`, …). Contentlayer generiert typisierte Collections pro Locale.
- UI-Strings in `messages/{locale}.json` (nav, buttons, form-labels).
- `<html lang={locale}>` wird dynamisch gesetzt.
- Hreflang-Tags pro Seite + Sitemap.
- **Build-Konsequenz für Static Export**: 4 Locales × N Seiten = N×4 HTML-Dateien. `generateStaticParams` muss sowohl `locale` als auch `slug` iterieren.

---

## 11 · Hosting & Deployment

### Server-Setup (einmalig)

- Linux Root Server (Debian/Ubuntu)
- Nginx installieren, TLS via Let's Encrypt (certbot)
- `/var/www/portfolio/` als Doc-Root
- Nginx-Config-Highlights:
  - HTTP → HTTPS Redirect
  - HTTP/2 aktiviert
  - Brotli + Gzip
  - Cache-Header: `max-age=31536000, immutable` für `/_next/static/*`
  - Cache-Header: `no-cache` für `.html`
  - Security-Header: HSTS, CSP (mit nonce für unserer Scripts), X-Frame-Options, Permissions-Policy
  - `try_files $uri $uri.html $uri/ =404` für static export
- User `deploy` mit SSH-Key für CI/CD
- UFW/iptables: 80, 443, 22 (mit Key-only)

### Deploy-Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml (Skizze)
on: push { branches: [main] }
jobs:
  build-deploy:
    steps:
      - checkout
      - setup node 22
      - bun install  # oder npm ci
      - bun run build           # next build → out/
      - rsync -avz --delete out/ deploy@server:/var/www/portfolio/
      - ssh deploy@server "sudo nginx -s reload"
```

### Alternativer Pfad: Docker nur für lokale Build-Reproduzierbarkeit

Ein `docker/build.Dockerfile` garantiert dass der CI-Build mit dem lokalen Build identisch ist, aber Prod läuft weiter als statische Files hinter Nginx — kein Container in Prod nötig.

---

## 12 · Claude-Code-Setup (`.claude/`)

**Grundsatz**: nur was echten Mehrwert liefert, kein Bloat.

### `.claude/CLAUDE.md`

Kompakte Konventions-Doku: Tech-Stack-Übersicht, wichtigste Commands, Code-Style, Shader-Patterns, Design-Token-Referenz, "never do X" Liste. Wird von Claude bei jeder Session automatisch geladen.

Inhalt-Skizze:
- Was das Projekt ist (1-Absatz-Pitch)
- Dev-Commands (`bun dev`, `bun build`, `bun test`, `bun lint`)
- Folder-Konventionen (wo gehören Shader, Sections, Components hin)
- Design-Tokens als Referenz (Farben, Motion-Durations, Ease-Kurven)
- Performance-Regeln (keine neue R3F-Canvas pro Section, useFrame-Cleanup, etc.)
- i18n-Regeln (nie hartkodierte Strings)
- Git-Commit-Konventionen

### `.claude/agents/`

Zwei fokussierte Custom-Agents (mehr ist Overkill):

1. **`shader-reviewer.md`** — Spezialisiert auf GLSL-Review: Performance (teure Funktionen in Fragment-Shader), Cross-Device-Kompatibilität (Precision-Qualifier, WebGL1 vs 2 vs WebGPU), mathematische Korrektheit, Oil-Slick-Palette-Konformität. Wird aufgerufen nach `Write/Edit` auf `*.glsl*`.

2. **`motion-qa.md`** — Prüft GSAP/Lenis-Code gegen Reduced-Motion-Requirements, Shared-RAF-Discipline, Memory-Leak-Patterns (Timeline-Cleanup, Observer-Unsubscribe).

### `.claude/commands/`

1. `/new-project <slug>` — Scaffold für ein neues MDX-Projekt inkl. aller 4 Locales und Frontmatter-Template.
2. `/perf-check` — Führt lokalen Lighthouse + Bundle-Analyse aus und zeigt Abweichungen zum Budget.
3. `/deploy-dry-run` — Simuliert den Deploy (rsync --dry-run), zeigt was sich verändern würde.

### `.claude/settings.json`

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(bun run *)",
      "Bash(bun install *)",
      "Bash(bun add *)",
      "Bash(bun remove *)",
      "Bash(git *)",
      "Bash(rsync --dry-run *)",
      "Read(**)",
      "Edit(src/**)",
      "Edit(content/**)",
      "Edit(messages/**)",
      "Edit(.claude/**)"
    ],
    "deny": [
      "Bash(rsync * deploy@*)"         // Deploy nur manuell, nie autonom
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": { "tool": "Edit|Write", "file_pattern": "**/*.{ts,tsx}" },
        "command": "bun x biome check --write --unsafe ${file}"
      },
      {
        "matcher": { "tool": "Edit|Write", "file_pattern": "**/*.glsl*" },
        "command": "bun x glslang-validator ${file}"   // optional, falls installiert
      }
    ]
  }
}
```

### MCP-Server

- **Context7** (bereits aktiv): für aktuelle Next.js/R3F/GSAP/Lenis-Docs.
- Ansonsten keine zusätzlichen MCP-Server nötig — Overkill für ein Solo-Portfolio.

---

## 13 · Iterative Build-Phasen

Wir bauen in 11 Phasen. Jede Phase ist ein abgeschlossener PR/Commit mit sichtbarem Ergebnis, nicht nur "plumbing".

| # | Phase | Output | Qualitäts-Gate |
|---|---|---|---|
| 0 | **Scaffold & Tooling** | Next 16 App-Router + Tailwind v4 + Biome + Playwright + Lighthouse-CI, leeres Hello-World läuft | CI grün, Bundle < 80kB |
| 1 | **Design-System + Layout-Shell** | Fonts, Farb-Tokens, Typo-Klassen, Grid, Dark-Base, Nav-Skeleton, Footer-Skeleton | Visual-Snapshot als Baseline |
| 2 | **i18n-Setup** | next-intl integriert, 4 Locales, Route-Middleware, Sprach-Switcher funktional | Axe-Test grün |
| 3 | **Lenis + Shared RAF** | Smooth-Scroll überall, zentraler Ticker für GSAP + Lenis + (vorbereitet) R3F | Motion nie stottert, `prefers-reduced-motion` respektiert |
| 4 | **Fluid-Sim Hero** *(großes Stück)* | Navier-Stokes-Solver, alle Shader-Pässe (advect/divergence/pressure/gradient-subtract/vorticity/splat), Toon-Render-Pass mit Posterize + Sobel-Outlines + Paper-Grain. GPU-Capability-Probe + 5 Quality-Tiers + Static-Fallback. Cursor ist Force-Source. | 60fps RTX, ≥ 45fps Iris Xe, ≥ 30fps Mobile, statisch bei reduced-motion. Lighthouse Perf ≥ 90 trotz Sim. |
| 5 | **Editorial Overprint-Reveal + Hero-Choreografie** | GSAP-SplitText + Risograph-Misregistration (rose/mint-Ghost-Chars + Ink-Snap), synced mit Lenis | Visuelle Konsistenz mit Mockup, Reduced-Motion respektiert |
| 6 | **About + Skills + zvoove-Kontext** | MDX-bio Integration (4 Locales), Portrait-Foto mit Riso-Duotone-Shader, zvoove-Credential prominent, Skills als typografisch-gewichtete Editorial-Liste (kein Icon-Grid), AI-Workflow-Mikro-Case-Study | A11y-Audit grün, alle Locales komplett |
| 7 | **Work-Gallery + Project-Detail-Pages** | 3D cel-shaded Planes mit Toon-Shader, Ink-Splat-Hover, `/work/[slug]` MDX, Fluid-Ink-Wipe-Page-Transition | Performance-Budget gehalten, Transition unter 600ms |
| 8 | **Joggediballa Case Study** | Dedizierter Long-Form-Block, 2–3 Screens mit Riso-Duotone-Treatment, Story, Link | — |
| 9 | **Photography Teaser** | 3–8 Fullscreen-Reveals mit Runtime-Riso-Duotone-Shader, Halbton-Dot-Pattern, Link zu myportfolio.com | AVIF-Pipeline, Lazy-Load, Duotone per Shader (nicht Pre-Render) |
| 10 | **Playground** | Fluid-Sandbox mit Leva-Panel (Spot-Farben, Viscosity, Vorticity, Dissipation, Bomb, Freeze, Reset), 2–3 Preset-Experimente | — |
| 11 | **Polish, Perf-Tuning, SEO, Deploy** | Meta-Tags pro Locale, OG-Images, Sitemap, robots, Nginx-Config + Deploy-Script, A11y-Final-Pass | Lighthouse ≥ 95, Axe 0 Violations, Live auf Server |

**Arbeitsweise innerhalb einer Phase**: Brainstorming → Mini-Spec → Implementation (TDD wo sinnvoll: Utility-Libs ja, Shader nein) → Visual-Review → Commit.

---

## 14 · Der Master-Prompt (für den Kickoff von Phase 0)

Der Prompt unten ist das was du in die nächste Claude-Session pastest um loszubauen. Englisch (bessere Performance bei technischen Tasks, Libs sind Englisch dokumentiert), referenziert diesen Plan.

```text
You are collaborating with Manuel Heller on an Awwwards-grade personal
portfolio website. The full specification lives at:

  C:\Users\ManuelHeller\.claude-private\plans\cuddly-brewing-quiche.md

Read it before touching a single file. Everything below assumes you've
absorbed that plan.

TL;DR:
- Next.js 16 App Router, static export (`output: 'export'`) → Nginx on a
  Linux root server.
- React 19, TypeScript, Tailwind v4, Biome.
- R3F + GSAP + Lenis + next-intl + Contentlayer2 + MDX.
- Design: "Toon Fluid Lens" — fullscreen GPU Navier-Stokes simulation,
  cel-shaded (posterize + Sobel outlines), Risograph aesthetic on
  cream paper. Cursor IS the fluid force source. Editorial **right-aligned**
  Instrument Serif (asymmetric — left margin breathes with fluid,
  right edge anchors typography). 8 signature moments (see §6).
- 4 locales: DE (default), EN, FR, IT.
- Device-support: fully responsive. Desktop/laptop primary, mobile/touch
  first-class. Touch devices: tap/drag inject fluid forces, pinch-zoom
  for gallery, long-press instead of hover. No second-class experience.
- Performance: strict 5-tier quality budget for the fluid sim (see §8).
  Static pre-rendered fallback for reduced-motion / weak GPU /
  WebGL2-unavailable. Single persistent <Canvas>, shared RAF loop.

TODAY — Phase 0: Scaffold & Tooling.

Deliver, in this order, as discrete commits:

1. `package.json` with the exact versions listed in §3. Use Bun as package
   manager (`bun install`, `bun run`). Include all dev scripts:
   `dev`, `build`, `start`, `lint`, `format`, `test`, `test:a11y`,
   `lighthouse`.

2. `next.config.ts` with `output: 'export'`, images unoptimized, MDX
   support via `@next/mdx`, experimental flags as needed for static
   export + i18n compat.

3. `tsconfig.json` — strict, bundler resolution, path aliases
   (`@/` → `src/`, `@content/` → `content/`).

4. `biome.json` — import sorting, 2-space indent, double quotes, trailing
   commas, no-unused-imports as error.

5. Tailwind v4 setup — `src/app/globals.css` with `@import "tailwindcss"`,
   `@theme` block referencing the CSS custom properties from §4.1.

6. `playwright.config.ts` + a first smoke test (home page returns 200,
   <main> element present, html lang attribute is valid).

7. `.github/workflows/ci.yml` — Biome check, typecheck, Playwright
   smoke, Lighthouse CI with the budget from §8 (fails build if
   performance < 90 or a11y < 95).

8. Minimal `src/app/layout.tsx` and `src/app/page.tsx` — just enough to
   render a single <main> with a "Portfolio / Manuel Heller — booting…"
   string in the hero font. No shader yet.

9. README.md at repo root — 10 lines: what this is, how to dev, how to
   build, reference to the plan file for everything else.

10. **`.claude/` scaffolding** — create the full Claude-Code setup as
    described in §12 of the plan:
    - `.claude/CLAUDE.md` (project-conventions doc, compact)
    - `.claude/agents/shader-reviewer.md` (GLSL-review agent)
    - `.claude/agents/motion-qa.md` (motion/a11y-review agent)
    - `.claude/commands/new-project.md` (scaffold new MDX project)
    - `.claude/commands/perf-check.md` (local Lighthouse + bundle analysis)
    - `.claude/commands/deploy-dry-run.md` (rsync --dry-run simulation)
    - `.claude/settings.json` (permissions + PostToolUse hooks for Biome
      and glslang-validator — see §12 for exact JSON)
    Derive each file's content from §12; ask only if a concrete detail
    is missing from the plan.

11. A first commit per numbered deliverable above. Conventional commits
    style (feat:, chore:, ci:, docs:).

Rules of engagement:
- Ask before installing anything not listed in §3.
- Never inline-commit secrets. Use `.env.example` + `.env.local`.
- If any tool/flag you use has changed behavior in 2026, verify via
  Context7 MCP before using it (don't rely on training-data assumptions).
- Report back after each numbered deliverable. Don't batch.

After Phase 0 is green (CI passes, `bun dev` renders the hello-world,
Lighthouse perf ≥ 95 on the empty page), STOP and wait for me to
unblock Phase 1.
```

Alle nachfolgenden Phasen-Prompts folgen demselben Muster: Referenz auf den Plan, TL;DR der Phase, nummerierte Deliverables, Stop-Condition.

---

## 15 · Offene Content-Gaps

Diese Inhalte fehlen noch, können aber *alle später* nachgereicht werden ohne Architektur-Änderung (MDX-Content). Ideal: *vor oder parallel zu* Phase 6+.

- [ ] **Portrait-Foto von Manuel** (für About-Section, mindestens 2000px Längsseite)
- [ ] **About-Text** in DE (Claude übersetzt nach EN/FR/IT mit Review-Schleife)
  - Sollte enthalten: zvoove Switzerland AG als aktuelle Stelle, Fokus Frontend/Webdesign, AI-affinität im Workflow, Beziehung zu Fotografie + Joggediballa
- [ ] **Liste der zu zeigenden Web-Projekte** (3–6): Titel, Jahr, Stack, Rolle, 2–3 Screens, Kurzbeschreibung, Live-URL falls vorhanden
- [ ] **Joggediballa Case-Study-Inhalt**: deine Rolle im Verein (VP, Social-Media, Dev), was die Seite kann, warum besonders, 2–3 Hero-Shots
- [ ] **3–8 Foto-Highlights** aus myportfolio (Original-JPEGs ≥ 3000px, Riso-Duotone generiert unsere Pipeline)
- [ ] **Domain-Name** für die Portfolio-Seite (DNS, Nginx-Server-Name, hreflang, OG)
- [ ] **GitHub / LinkedIn / Instagram / Email** für Footer
- [ ] **Playground-Seed-Content**: 2–3 kurze Captions zu den Shader-Experimenten (können später jederzeit wachsen)
- [ ] *Optional:* **CV / Résumé** — war in Sektions-Wahl nicht drin. Falls du es doch willst, können wir später als separate `/cv` Route hinzufügen — MDX mit Riso-Print-Treatment als Download-PDF wäre konsistent zur Ästhetik.

---

## 16 · Verification — Wann ist es "fertig"?

Nicht-verhandelbare Checks vor Go-Live:

```bash
# Bundle / Build
bun run build              # Success, warnings documented
bun x size-limit            # Bundle within §8 budget

# Quality
bun run test               # All Playwright tests green
bun run test:a11y          # 0 Axe violations
bun run lighthouse         # Perf ≥ 95, A11y ≥ 95, Best-Practices ≥ 95, SEO ≥ 95
bun x next-intl-cli validate # All locales complete, no missing keys

# Manual
- Tested on Chrome (M3 Mac), Firefox (Linux), Safari (iOS 17+), Edge (Windows)
- Tested on 4G throttled + Fast-3G — no jank
- Tested with prefers-reduced-motion: reduce — everything degrades gracefully
- Tested with keyboard only (Tab order, focus visible, all actions reachable)
- Tested with VoiceOver (macOS) — landmarks, headings, link texts make sense
- Tested at 320px width (iPhone SE) — no overflow, all content accessible
- Tested on the user's work laptop (Intel Iris Xe) — ≥ 40fps on hero, no stuttering
```

---

## 17 · Wie wir ab hier weitermachen

1. **Du reviewst diesen Plan** — sag mir wo du abweichen willst, was unklar ist, was fehlt.
2. **Ich passe an** — iterierend, bis du 100% zufrieden bist.
3. **Du approvest den Plan** (via "ExitPlanMode"-Bestätigung).
4. **Ich committe den Plan ins Repo** als `docs/plan.md` (damit ist er für Claude zukünftig referenzierbar).
5. **Wir starten Phase 0** — mit dem Master-Prompt aus §14.
