# Phase 4 — Fluid-Sim Hero: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fullscreen Navier-Stokes GPU fluid simulation with Riso toon-shading, 5 quality tiers, static fallback, cursor as force source.

**Architecture:** Raw WebGL2 FBO ping-pong sim on R3F's GL context. FluidOrchestrator (pure TS class) ticks at priority 15 in the shared RAF, R3F advance() at priority 20 renders a fullscreen quad with the sim output texture. SceneProvider gates rendering: Canvas+FluidSim when GPU capable, CSS gradient fallback otherwise.

**Tech Stack:** WebGL2, GLSL ES 3.0, Three.js r183, @react-three/fiber 9, shared RAF from `src/lib/raf.ts`

**Spec:** `docs/superpowers/specs/2026-04-17-phase4-fluid-sim-hero-design.md`

---

## Task 1: GLSL Loader Config

**Files:**
- Modify: `next.config.ts`
- Create: `src/types/glsl.d.ts`

- [ ] **Step 1: Add webpack rule for .glsl imports**

```ts
// next.config.ts — add webpack customization to nextConfig
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
      "gsap",
      "@gsap/react",
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$/,
      type: "asset/source",
    });
    return config;
  },
};
```

- [ ] **Step 2: Add TypeScript declaration for .glsl modules**

```ts
// src/types/glsl.d.ts
declare module "*.glsl" {
  const value: string;
  export default value;
}
```

- [ ] **Step 3: Verify config compiles**

Run: `pnpm typecheck`
Expected: PASS (no errors related to glsl imports)

- [ ] **Step 4: Commit**

```bash
git add next.config.ts src/types/glsl.d.ts
git commit -m "chore: add GLSL asset/source webpack loader + type declaration"
```

---

## Task 2: Common GLSL Shaders

**Files:**
- Create: `src/shaders/common/quad.vert.glsl`
- Create: `src/shaders/common/noise.glsl`
- Create: `src/shaders/common/posterize.glsl`
- Create: `src/shaders/common/sobel.glsl`

- [ ] **Step 1: Create fullscreen triangle vertex shader**

```glsl
// src/shaders/common/quad.vert.glsl
#version 300 es

out vec2 vUv;

void main() {
  vUv = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
}
```

No vertex buffer needed — draws with `gl.drawArrays(gl.TRIANGLES, 0, 3)`.

- [ ] **Step 2: Create noise library (simplex + curl)**

This is a function library — no `#version`, no `main()`. Gets prepended to shaders that need it.

```glsl
// src/shaders/common/noise.glsl
//
// Simplex 2D noise — Ashima Arts (MIT)
// https://github.com/ashima/webgl-noise

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,   // (3.0 - sqrt(3.0)) / 6.0
    0.366025403784439,   // 0.5 * (sqrt(3.0) - 1.0)
   -0.577350269189626,   // -1.0 + 2.0 * C.x
    0.024390243902439    // 1.0 / 41.0
  );

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}

vec2 curlNoise(vec2 p) {
  const float e = 0.1;
  float n1 = snoise(vec2(p.x, p.y + e));
  float n2 = snoise(vec2(p.x, p.y - e));
  float n3 = snoise(vec2(p.x + e, p.y));
  float n4 = snoise(vec2(p.x - e, p.y));
  float dx = (n1 - n2) / (2.0 * e);
  float dy = (n3 - n4) / (2.0 * e);
  return vec2(dx, -dy);
}
```

- [ ] **Step 3: Create posterize function**

```glsl
// src/shaders/common/posterize.glsl

vec3 posterize(vec3 color, float levels) {
  return floor(color * levels + 0.5) / levels;
}

float posterize(float value, float levels) {
  return floor(value * levels + 0.5) / levels;
}
```

- [ ] **Step 4: Create Sobel edge detection**

```glsl
// src/shaders/common/sobel.glsl

float sobelEdge(sampler2D tex, vec2 uv, vec2 texel) {
  float tl = length(texture(tex, uv + vec2(-texel.x,  texel.y)).rgb);
  float t  = length(texture(tex, uv + vec2(     0.0,  texel.y)).rgb);
  float tr = length(texture(tex, uv + vec2( texel.x,  texel.y)).rgb);
  float l  = length(texture(tex, uv + vec2(-texel.x,      0.0)).rgb);
  float r  = length(texture(tex, uv + vec2( texel.x,      0.0)).rgb);
  float bl = length(texture(tex, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = length(texture(tex, uv + vec2(     0.0, -texel.y)).rgb);
  float br = length(texture(tex, uv + vec2( texel.x, -texel.y)).rgb);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;

  return sqrt(gx * gx + gy * gy);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/shaders/common/
git commit -m "feat(shaders): common GLSL library — fullscreen quad, noise, posterize, sobel"
```

---

## Task 3: Fluid Simulation Shaders

**Files:**
- Create: `src/shaders/fluid/splat.frag.glsl`
- Create: `src/shaders/fluid/curl.frag.glsl`
- Create: `src/shaders/fluid/vorticity.frag.glsl`
- Create: `src/shaders/fluid/advect.frag.glsl`
- Create: `src/shaders/fluid/divergence.frag.glsl`
- Create: `src/shaders/fluid/pressure.frag.glsl`
- Create: `src/shaders/fluid/gradient-subtract.frag.glsl`
- Create: `src/shaders/fluid/render-toon.frag.glsl`

All shaders are `#version 300 es`. They receive `vUv` from `quad.vert.glsl`.

- [ ] **Step 1: Splat shader — force + dye injection**

```glsl
// src/shaders/fluid/splat.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

out vec4 fragColor;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}
```

- [ ] **Step 2: Curl shader — vorticity field computation**

```glsl
// src/shaders/fluid/curl.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

out vec4 fragColor;

void main() {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  fragColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
}
```

- [ ] **Step 3: Vorticity confinement shader**

```glsl
// src/shaders/fluid/vorticity.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uConfinement;
uniform float uDt;

out vec4 fragColor;

void main() {
  float L = texture(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 1e-5;
  force *= uConfinement * C;
  force = vec2(force.y, -force.x);

  vec2 vel = texture(uVelocity, vUv).xy;
  fragColor = vec4(vel + force * uDt, 0.0, 1.0);
}
```

- [ ] **Step 4: Advection shader (semi-Lagrangian)**

```glsl
// src/shaders/fluid/advect.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

out vec4 fragColor;

void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  fragColor = uDissipation * texture(uSource, coord);
}
```

- [ ] **Step 5: Divergence shader**

```glsl
// src/shaders/fluid/divergence.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

out vec4 fragColor;

void main() {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
```

- [ ] **Step 6: Pressure solver (single Jacobi iteration)**

```glsl
// src/shaders/fluid/pressure.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

out vec4 fragColor;

void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float div = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
```

- [ ] **Step 7: Gradient subtraction shader**

```glsl
// src/shaders/fluid/gradient-subtract.frag.glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

out vec4 fragColor;

void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  fragColor = vec4(vel - 0.5 * vec2(R - L, T - B), 0.0, 1.0);
}
```

- [ ] **Step 8: Toon render pass**

This shader includes common function libraries (`noise.glsl`, `posterize.glsl`, `sobel.glsl`) via string concatenation at compile time. Markers `// #include <name>` are replaced by the FluidOrchestrator.

```glsl
// src/shaders/fluid/render-toon.frag.glsl
#version 300 es
precision mediump float;

// #include <noise>
// #include <posterize>
// #include <sobel>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uLevels;
uniform float uOutlineThreshold;
uniform float uGrainStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uInkColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

vec3 mapToSpotColor(float density) {
  float d = clamp(density, 0.0, 1.0);
  float step = posterize(d, uLevels);

  if (step < 0.2) return uPaperColor;
  if (step < 0.4) return mix(uPaperColor, uSpotMint, (step - 0.2) * 5.0);
  if (step < 0.6) return mix(uSpotMint, uSpotAmber, (step - 0.4) * 5.0);
  if (step < 0.8) return mix(uSpotAmber, uSpotRose, (step - 0.6) * 5.0);
  return mix(uSpotRose, uSpotViolet, (step - 0.8) * 5.0);
}

void main() {
  vec4 dye = texture(uDye, vUv);
  float density = length(dye.rgb);

  vec3 color = mapToSpotColor(density);

  // Sobel edge detection — retina-aware via dFdx/dFdy scaling
  vec2 edgeTexel = uTexelSize * (1.0 + length(vec2(dFdx(vUv.x), dFdy(vUv.y))) * 100.0);
  float edge = sobelEdge(uDye, vUv, edgeTexel);
  color = mix(color, uInkColor, smoothstep(uOutlineThreshold * 0.5, uOutlineThreshold, edge));

  // Paper grain — procedural noise
  float grain = snoise(vUv * 400.0 + uTime * 0.05);
  color += grain * uGrainStrength;

  // Mix towards paper on low density
  color = mix(uPaperColor, color, smoothstep(0.0, 0.15, density));

  fragColor = vec4(color, 1.0);
}
```

- [ ] **Step 9: Commit**

```bash
git add src/shaders/fluid/
git commit -m "feat(shaders): Navier-Stokes fluid sim passes + toon render shader"
```

---

## Task 4: GPU Probe Module

**Files:**
- Create: `src/lib/gpu.ts`

- [ ] **Step 1: Define types and tier configs**

```ts
// src/lib/gpu.ts

export type GPUTier = "high" | "medium" | "low" | "minimal" | "static";

export type TierConfig = {
  tier: GPUTier;
  gridSize: number;
  pressureIterations: number;
  halfRate: boolean;
  velocityDissipation: number;
  dyeDissipation: number;
  splatRadius: number;
  confinement: number;
};

const TIER_CONFIGS: Record<Exclude<GPUTier, "static">, TierConfig> = {
  high: {
    tier: "high",
    gridSize: 512,
    pressureIterations: 40,
    halfRate: false,
    velocityDissipation: 0.98,
    dyeDissipation: 0.97,
    splatRadius: 0.003,
    confinement: 15.0,
  },
  medium: {
    tier: "medium",
    gridSize: 256,
    pressureIterations: 30,
    halfRate: false,
    velocityDissipation: 0.98,
    dyeDissipation: 0.97,
    splatRadius: 0.004,
    confinement: 12.0,
  },
  low: {
    tier: "low",
    gridSize: 128,
    pressureIterations: 20,
    halfRate: true,
    velocityDissipation: 0.97,
    dyeDissipation: 0.96,
    splatRadius: 0.005,
    confinement: 10.0,
  },
  minimal: {
    tier: "minimal",
    gridSize: 96,
    pressureIterations: 15,
    halfRate: true,
    velocityDissipation: 0.96,
    dyeDissipation: 0.95,
    splatRadius: 0.006,
    confinement: 8.0,
  },
};

export function getTierConfig(tier: Exclude<GPUTier, "static">): TierConfig {
  return TIER_CONFIGS[tier];
}
```

- [ ] **Step 2: Add renderer string lookup**

Append to `src/lib/gpu.ts`:

```ts
type RendererPattern = { pattern: string; tier: Exclude<GPUTier, "static"> };

const RENDERER_PATTERNS: RendererPattern[] = [
  // High
  { pattern: "rtx", tier: "high" },
  { pattern: "rx 7", tier: "high" },
  { pattern: "apple m2", tier: "high" },
  { pattern: "apple m3", tier: "high" },
  { pattern: "apple m4", tier: "high" },
  { pattern: "radeon pro", tier: "high" },
  // Low
  { pattern: "iris xe", tier: "low" },
  { pattern: "iris plus", tier: "low" },
  { pattern: "uhd 6", tier: "low" },
  { pattern: "uhd 7", tier: "low" },
  // Minimal
  { pattern: "mali-g", tier: "minimal" },
  { pattern: "adreno 6", tier: "minimal" },
  { pattern: "adreno 5", tier: "minimal" },
  { pattern: "powervr", tier: "minimal" },
];

function matchRenderer(renderer: string): GPUTier | null {
  const lower = renderer.toLowerCase();
  for (const { pattern, tier } of RENDERER_PATTERNS) {
    if (lower.includes(pattern)) return tier;
  }
  return null;
}
```

- [ ] **Step 3: Add probeGPU function**

Append to `src/lib/gpu.ts`:

```ts
const CACHE_KEY = "manus-gpu-tier";
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedTier(): GPUTier | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { tier, ts } = JSON.parse(raw) as { tier: GPUTier; ts: number };
    if (Date.now() - ts > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return tier;
  } catch {
    return null;
  }
}

export function cacheTier(tier: GPUTier): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ tier, ts: Date.now() }));
  } catch {
    // localStorage unavailable — no-op
  }
}

export function probeGPU(gl: WebGL2RenderingContext): {
  tier: GPUTier;
  renderer: string;
  fromCache: boolean;
} {
  // Check cache first
  const cached = getCachedTier();
  if (cached) {
    return { tier: cached, renderer: "(cached)", fromCache: true };
  }

  // Try renderer string
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = ext
    ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
    : "unknown";

  const matched = matchRenderer(renderer);
  if (matched) {
    return { tier: matched, renderer, fromCache: false };
  }

  // No match — start at medium, let adaptive measurement adjust
  return { tier: "medium", renderer, fromCache: false };
}

export function tierFromFrametime(medianMs: number): Exclude<GPUTier, "static"> {
  if (medianMs < 8) return "high";
  if (medianMs < 14) return "medium";
  if (medianMs < 22) return "low";
  return "minimal";
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gpu.ts
git commit -m "feat(gpu): GPU capability probe with renderer lookup + tier configs"
```

---

## Task 5: FluidOrchestrator — WebGL2 Pipeline

**Files:**
- Create: `src/components/scene/FluidOrchestrator.ts`

This is the core class. Pure TypeScript, no React. Owns all WebGL2 resources.

- [ ] **Step 1: Create WebGL helper types and FBO utility**

```ts
// src/components/scene/FluidOrchestrator.ts

import type { TierConfig } from "@/lib/gpu";

import quadVert from "@/shaders/common/quad.vert.glsl";
import noiseSrc from "@/shaders/common/noise.glsl";
import posterizeSrc from "@/shaders/common/posterize.glsl";
import sobelSrc from "@/shaders/common/sobel.glsl";

import splatFrag from "@/shaders/fluid/splat.frag.glsl";
import curlFrag from "@/shaders/fluid/curl.frag.glsl";
import vorticityFrag from "@/shaders/fluid/vorticity.frag.glsl";
import advectFrag from "@/shaders/fluid/advect.frag.glsl";
import divergenceFrag from "@/shaders/fluid/divergence.frag.glsl";
import pressureFrag from "@/shaders/fluid/pressure.frag.glsl";
import gradientSubFrag from "@/shaders/fluid/gradient-subtract.frag.glsl";
import renderToonFrag from "@/shaders/fluid/render-toon.frag.glsl";

export type PointerState = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  down: boolean;
  moved: boolean;
};

type FBO = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
};

type DoubleFBO = {
  read: FBO;
  write: FBO;
  swap: () => void;
};

type Programs = {
  splat: WebGLProgram;
  curl: WebGLProgram;
  vorticity: WebGLProgram;
  advect: WebGLProgram;
  divergence: WebGLProgram;
  pressure: WebGLProgram;
  gradientSub: WebGLProgram;
  renderToon: WebGLProgram;
};

// Spot colors as normalized RGB (from CSS hex values)
const SPOT_COLORS = {
  rose: [1.0, 0.42, 0.627],
  amber: [1.0, 0.769, 0.455],
  mint: [0.486, 0.91, 0.769],
  violet: [0.722, 0.604, 1.0],
} as const;

const PAPER_COLOR = [0.941, 0.91, 0.863] as const; // #f0e8dc
const INK_COLOR = [0.039, 0.024, 0.031] as const;   // #0a0608
```

- [ ] **Step 2: Add GL utility functions**

Append to same file:

```ts
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

function injectIncludes(source: string, includes: Record<string, string>): string {
  let result = source;
  for (const [name, code] of Object.entries(includes)) {
    result = result.replace(`// #include <${name}>`, code);
  }
  return result;
}

function createFBO(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
): FBO {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { framebuffer, texture, width, height };
}

function createDoubleFBO(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
): DoubleFBO {
  let read = createFBO(gl, width, height, internalFormat, format, type);
  let write = createFBO(gl, width, height, internalFormat, format, type);
  return {
    get read() { return read; },
    get write() { return write; },
    swap() { [read, write] = [write, read]; },
  };
}

function destroyFBO(gl: WebGL2RenderingContext, fbo: FBO): void {
  gl.deleteFramebuffer(fbo.framebuffer);
  gl.deleteTexture(fbo.texture);
}

function destroyDoubleFBO(gl: WebGL2RenderingContext, dfbo: DoubleFBO): void {
  destroyFBO(gl, dfbo.read);
  destroyFBO(gl, dfbo.write);
}
```

- [ ] **Step 3: Create the FluidOrchestrator class — init and dispose**

Append to same file:

```ts
export class FluidOrchestrator {
  private gl!: WebGL2RenderingContext;
  private config!: TierConfig;
  private programs!: Programs;

  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private divergenceFBO!: FBO;
  private curlFBO!: FBO;
  private outputFBO!: FBO;

  private simWidth = 0;
  private simHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private frameCount = 0;
  private paused = false;
  private lastPointerTime = 0;
  private ambientStrength = 0;
  private splatColorIndex = 0;

  private uniformCache = new Map<string, WebGLUniformLocation | null>();

  init(gl: WebGL2RenderingContext, config: TierConfig): void {
    this.gl = gl;
    this.config = config;
    this.lastPointerTime = performance.now();

    // Check float texture support
    const halfFloat = gl.getExtension("EXT_color_buffer_half_float");
    const floatLinear = gl.getExtension("OES_texture_half_float_linear");
    if (!halfFloat || !floatLinear) {
      throw new Error("Required WebGL2 extensions not available");
    }

    // Compile all programs
    const toonFrag = injectIncludes(renderToonFrag, {
      noise: noiseSrc,
      posterize: posterizeSrc,
      sobel: sobelSrc,
    });

    this.programs = {
      splat: createProgram(gl, quadVert, splatFrag),
      curl: createProgram(gl, quadVert, curlFrag),
      vorticity: createProgram(gl, quadVert, vorticityFrag),
      advect: createProgram(gl, quadVert, advectFrag),
      divergence: createProgram(gl, quadVert, divergenceFrag),
      pressure: createProgram(gl, quadVert, pressureFrag),
      gradientSub: createProgram(gl, quadVert, gradientSubFrag),
      renderToon: createProgram(gl, quadVert, toonFrag),
    };

    // Create FBOs at initial size
    this.canvasWidth = gl.drawingBufferWidth;
    this.canvasHeight = gl.drawingBufferHeight;
    this.createSimFBOs();
    this.createOutputFBO();
  }

  private createSimFBOs(): void {
    const gl = this.gl;
    const aspectRatio = this.canvasWidth / this.canvasHeight;
    this.simWidth = this.config.gridSize;
    this.simHeight = Math.round(this.config.gridSize / aspectRatio);

    const w = this.simWidth;
    const h = this.simHeight;

    this.velocity = createDoubleFBO(gl, w, h, gl.RG16F, gl.RG, gl.HALF_FLOAT);
    this.dye = createDoubleFBO(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    this.pressure = createDoubleFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    this.divergenceFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    this.curlFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
  }

  private createOutputFBO(): void {
    this.outputFBO = createFBO(
      this.gl,
      this.canvasWidth,
      this.canvasHeight,
      this.gl.RGBA8,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
    );
  }

  resize(width: number, height: number): void {
    if (width === this.canvasWidth && height === this.canvasHeight) return;

    this.canvasWidth = width;
    this.canvasHeight = height;

    // Destroy and recreate sim FBOs (aspect ratio may have changed)
    this.destroyFBOs();
    this.createSimFBOs();
    this.createOutputFBO();
  }

  private destroyFBOs(): void {
    const gl = this.gl;
    if (this.velocity) destroyDoubleFBO(gl, this.velocity);
    if (this.dye) destroyDoubleFBO(gl, this.dye);
    if (this.pressure) destroyDoubleFBO(gl, this.pressure);
    if (this.divergenceFBO) destroyFBO(gl, this.divergenceFBO);
    if (this.curlFBO) destroyFBO(gl, this.curlFBO);
    if (this.outputFBO) destroyFBO(gl, this.outputFBO);
  }

  dispose(): void {
    const gl = this.gl;
    this.destroyFBOs();
    for (const program of Object.values(this.programs)) {
      gl.deleteProgram(program);
    }
    this.uniformCache.clear();
  }

  getOutputTexture(): WebGLTexture {
    return this.outputFBO.texture;
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  isPaused(): boolean { return this.paused; }
```

- [ ] **Step 4: Add draw helpers and uniform cache**

Append inside the class:

```ts
  private getUniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    const key = `${program}:${name}`;
    if (!this.uniformCache.has(key)) {
      this.uniformCache.set(key, this.gl.getUniformLocation(program, name));
    }
    return this.uniformCache.get(key)!;
  }

  private useProgram(program: WebGLProgram): void {
    this.gl.useProgram(program);
  }

  private setFloat(program: WebGLProgram, name: string, value: number): void {
    this.gl.uniform1f(this.getUniform(program, name), value);
  }

  private setVec2(program: WebGLProgram, name: string, x: number, y: number): void {
    this.gl.uniform2f(this.getUniform(program, name), x, y);
  }

  private setVec3(program: WebGLProgram, name: string, r: number, g: number, b: number): void {
    this.gl.uniform3f(this.getUniform(program, name), r, g, b);
  }

  private bindTexture(program: WebGLProgram, name: string, texture: WebGLTexture, unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.getUniform(program, name), unit);
  }

  private drawQuad(): void {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private renderToFBO(fbo: FBO): void {
    const gl = this.gl;
    gl.viewport(0, 0, fbo.width, fbo.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
  }

  private renderToScreen(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
```

- [ ] **Step 5: Add individual pass methods**

Append inside the class:

```ts
  private runSplat(x: number, y: number, dx: number, dy: number, color: readonly number[]): void {
    const p = this.programs.splat;
    this.useProgram(p);

    // Velocity splat
    this.bindTexture(p, "uTarget", this.velocity.read.texture, 0);
    this.setFloat(p, "uAspectRatio", this.canvasWidth / this.canvasHeight);
    this.setVec2(p, "uPoint", x, y);
    this.setFloat(p, "uRadius", this.config.splatRadius);
    this.setVec3(p, "uColor", dx * 10.0, dy * 10.0, 0.0);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();

    // Dye splat
    this.bindTexture(p, "uTarget", this.dye.read.texture, 0);
    this.setVec3(p, "uColor", color[0], color[1], color[2]);
    this.renderToFBO(this.dye.write);
    this.drawQuad();
    this.dye.swap();
  }

  private runCurl(): void {
    const p = this.programs.curl;
    this.useProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.curlFBO);
    this.drawQuad();
  }

  private runVorticity(dt: number): void {
    const p = this.programs.vorticity;
    this.useProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.bindTexture(p, "uCurl", this.curlFBO.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uConfinement", this.config.confinement);
    this.setFloat(p, "uDt", dt);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();
  }

  private runAdvect(target: DoubleFBO, dissipation: number, dt: number): void {
    const p = this.programs.advect;
    this.useProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.bindTexture(p, "uSource", target.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uDt", dt);
    this.setFloat(p, "uDissipation", dissipation);
    this.renderToFBO(target.write);
    this.drawQuad();
    target.swap();
  }

  private runDivergence(): void {
    const p = this.programs.divergence;
    this.useProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.divergenceFBO);
    this.drawQuad();
  }

  private runPressure(): void {
    const p = this.programs.pressure;
    this.useProgram(p);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.bindTexture(p, "uDivergence", this.divergenceFBO.texture, 1);

    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.bindTexture(p, "uPressure", this.pressure.read.texture, 0);
      this.renderToFBO(this.pressure.write);
      this.drawQuad();
      this.pressure.swap();
    }
  }

  private runGradientSubtract(): void {
    const p = this.programs.gradientSub;
    this.useProgram(p);
    this.bindTexture(p, "uPressure", this.pressure.read.texture, 0);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();
  }

  private runRenderToon(elapsed: number): void {
    const p = this.programs.renderToon;
    this.useProgram(p);
    this.bindTexture(p, "uDye", this.dye.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.canvasWidth, 1.0 / this.canvasHeight);
    this.setFloat(p, "uLevels", 4.0);
    this.setFloat(p, "uOutlineThreshold", 0.15);
    this.setFloat(p, "uGrainStrength", 0.04);
    this.setFloat(p, "uTime", elapsed * 0.001);

    this.setVec3(p, "uPaperColor", ...PAPER_COLOR);
    this.setVec3(p, "uInkColor", ...INK_COLOR);
    this.setVec3(p, "uSpotRose", ...SPOT_COLORS.rose);
    this.setVec3(p, "uSpotAmber", ...SPOT_COLORS.amber);
    this.setVec3(p, "uSpotMint", ...SPOT_COLORS.mint);
    this.setVec3(p, "uSpotViolet", ...SPOT_COLORS.violet);

    this.renderToFBO(this.outputFBO);
    this.drawQuad();
  }
```

- [ ] **Step 6: Add the main step() method with half-rate + ambient**

Append inside the class:

```ts
  private nextSplatColor(): readonly number[] {
    const colors = [SPOT_COLORS.rose, SPOT_COLORS.amber, SPOT_COLORS.mint, SPOT_COLORS.violet];
    const color = colors[this.splatColorIndex % colors.length];
    this.splatColorIndex++;
    return color;
  }

  step(dt: number, elapsed: number, pointer: PointerState): void {
    if (this.paused) return;

    const gl = this.gl;
    this.frameCount++;

    // Update ambient timer
    if (pointer.moved) {
      this.lastPointerTime = performance.now();
      this.ambientStrength = Math.max(0, this.ambientStrength - dt / 0.5);
    } else if (performance.now() - this.lastPointerTime > 10000) {
      this.ambientStrength = Math.min(1, this.ambientStrength + dt / 2.0);
    }

    // Disable blending for all sim passes
    gl.disable(gl.BLEND);

    // Sim-step: skipped on odd frames at half-rate
    const runSim = !this.config.halfRate || this.frameCount % 2 === 0;

    if (runSim) {
      // Splat from pointer
      if (pointer.moved || pointer.down) {
        this.runSplat(pointer.x, pointer.y, pointer.dx, pointer.dy, this.nextSplatColor());
      }

      // Ambient curl noise when idle
      if (this.ambientStrength > 0.01) {
        const t = elapsed * 0.0003;
        const ax = 0.5 + 0.3 * Math.sin(t * 1.7);
        const ay = 0.5 + 0.3 * Math.cos(t * 2.3);
        const adx = Math.cos(t) * this.ambientStrength * 0.3;
        const ady = Math.sin(t * 1.3) * this.ambientStrength * 0.3;
        this.runSplat(ax, ay, adx, ady, this.nextSplatColor());
      }

      // Clear pressure field before solve
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.read.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.runCurl();
      this.runVorticity(dt);
      this.runAdvect(this.velocity, this.config.velocityDissipation, dt);
      this.runDivergence();
      this.runPressure();
      this.runGradientSubtract();
      this.runAdvect(this.dye, this.config.dyeDissipation, dt);
    }

    // Render-toon always runs (even at half-rate)
    this.runRenderToon(elapsed);

    // Unbind framebuffer so R3F can render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
```

Close the class with `}`.

- [ ] **Step 7: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/scene/FluidOrchestrator.ts
git commit -m "feat(fluid): FluidOrchestrator — WebGL2 Navier-Stokes pipeline with toon render"
```

---

## Task 6: Persistent R3F Canvas

**Files:**
- Create: `src/components/scene/Canvas.tsx`

- [ ] **Step 1: Create the Canvas component**

```tsx
// src/components/scene/Canvas.tsx
"use client";

import { Canvas as R3FCanvas, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect } from "react";
import { subscribe } from "@/lib/raf";

function RafBridge() {
  const { advance } = useThree();

  useEffect(() => {
    return subscribe(() => {
      advance();
    }, 20);
  }, [advance]);

  return null;
}

type SceneCanvasProps = {
  children: ReactNode;
};

export function SceneCanvas({ children }: SceneCanvasProps) {
  return (
    <R3FCanvas
      frameloop="never"
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        touchAction: "none",
      }}
      aria-hidden="true"
    >
      <RafBridge />
      {children}
    </R3FCanvas>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/Canvas.tsx
git commit -m "feat(scene): persistent R3F Canvas with shared RAF bridge at priority 20"
```

---

## Task 7: useGPUCapability Hook

**Files:**
- Create: `src/hooks/useGPUCapability.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useGPUCapability.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { type GPUTier, type TierConfig, cacheTier, getTierConfig, probeGPU, tierFromFrametime } from "@/lib/gpu";

type GPUCapability = {
  tier: GPUTier;
  config: TierConfig | null;
  renderer: string;
  measuring: boolean;
};

export function useGPUCapability() {
  const [capability, setCapability] = useState<GPUCapability>({
    tier: "medium",
    config: getTierConfig("medium"),
    renderer: "",
    measuring: false,
  });

  const frametimesRef = useRef<number[]>([]);
  const adaptiveDoneRef = useRef(false);

  const initProbe = useCallback((gl: WebGL2RenderingContext) => {
    const { tier, renderer, fromCache } = probeGPU(gl);

    if (tier === "static") {
      setCapability({ tier: "static", config: null, renderer, measuring: false });
      return;
    }

    const config = getTierConfig(tier);
    const needsAdaptive = !fromCache && renderer !== "(cached)";

    setCapability({
      tier,
      config,
      renderer,
      measuring: needsAdaptive,
    });

    if (fromCache) {
      adaptiveDoneRef.current = true;
    }
  }, []);

  const recordFrametime = useCallback((ms: number) => {
    if (adaptiveDoneRef.current) return;

    frametimesRef.current.push(ms);

    if (frametimesRef.current.length >= 30) {
      adaptiveDoneRef.current = true;
      const sorted = [...frametimesRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const newTier = tierFromFrametime(median);
      const newConfig = getTierConfig(newTier);

      cacheTier(newTier);

      setCapability((prev) => ({
        ...prev,
        tier: newTier,
        config: newConfig,
        measuring: false,
      }));
    }
  }, []);

  return { capability, initProbe, recordFrametime };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGPUCapability.ts
git commit -m "feat(hooks): useGPUCapability with adaptive frametime measurement"
```

---

## Task 8: SceneProvider + Static Fallback

**Files:**
- Create: `src/components/scene/SceneProvider.tsx`
- Create: `src/components/scene/StaticFallback.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create StaticFallback component**

```tsx
// src/components/scene/StaticFallback.tsx
"use client";

export function StaticFallback() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(135deg, var(--color-spot-rose) 0%, var(--color-spot-amber) 35%, var(--color-spot-mint) 65%, var(--color-spot-violet) 100%)",
        opacity: 0.15,
        mixBlendMode: "multiply",
      }}
    />
  );
}
```

- [ ] **Step 2: Create SceneProvider**

```tsx
// src/components/scene/SceneProvider.tsx
"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import type { GPUTier, TierConfig } from "@/lib/gpu";
import { SceneCanvas } from "./Canvas";
import { FluidSim } from "./FluidSim";
import { StaticFallback } from "./StaticFallback";

type SceneContextValue = {
  tier: GPUTier;
  config: TierConfig | null;
};

const SceneContext = createContext<SceneContextValue>({
  tier: "static",
  config: null,
});

export function useScene() {
  return useContext(SceneContext);
}

type SceneProviderProps = {
  children: ReactNode;
};

export function SceneProvider({ children }: SceneProviderProps) {
  const reducedMotion = useReducedMotion();
  const { capability, initProbe, recordFrametime } = useGPUCapability();

  const isStatic = reducedMotion || capability.tier === "static";

  return (
    <SceneContext.Provider value={{ tier: capability.tier, config: capability.config }}>
      {isStatic ? (
        <StaticFallback />
      ) : (
        <SceneCanvas>
          <FluidSim
            config={capability.config!}
            measuring={capability.measuring}
            onGLReady={initProbe}
            onFrametime={recordFrametime}
          />
        </SceneCanvas>
      )}
      {children}
    </SceneContext.Provider>
  );
}
```

- [ ] **Step 3: Wire SceneProvider into locale layout**

Modify `src/app/[locale]/layout.tsx` — add SceneProvider wrapping inside MotionProvider:

```tsx
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SceneProvider } from "@/components/scene/SceneProvider";
import { Footer } from "@/components/ui/Footer";
import { Nav } from "@/components/ui/Nav";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("skipLink");

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <SceneProvider>
              <a className="skip-link" href="#main">
                {t("label")}
              </a>
              <Nav />
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </SceneProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit (typecheck deferred to after Task 9)**

Tasks 8 and 9 form a pair — SceneProvider imports FluidSim, which is created in Task 9. Commit now, run typecheck after Task 9.

```bash
git add src/components/scene/StaticFallback.tsx src/components/scene/SceneProvider.tsx src/app/\[locale\]/layout.tsx
git commit -m "feat(scene): SceneProvider with GPU tier context + static fallback + layout wiring"
```

---

## Task 9: FluidSim Component

**Files:**
- Create: `src/components/scene/FluidSim.tsx`

This is the R3F component that bridges the FluidOrchestrator to the React/Three.js world.

- [ ] **Step 1: Create FluidSim with orchestrator lifecycle**

```tsx
// src/components/scene/FluidSim.tsx
"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { subscribe } from "@/lib/raf";
import type { TierConfig } from "@/lib/gpu";
import { FluidOrchestrator, type PointerState } from "./FluidOrchestrator";

type FluidSimProps = {
  config: TierConfig;
  measuring: boolean;
  onGLReady: (gl: WebGL2RenderingContext) => void;
  onFrametime: (ms: number) => void;
};

export function FluidSim({ config, measuring, onGLReady, onFrametime }: FluidSimProps) {
  const { gl, size } = useThree();

  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false,
  });
  const configRef = useRef(config);
  configRef.current = config;

  // Output texture shared with Three.js
  const outputTexture = useMemo(() => {
    const tex = new THREE.Texture();
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  // Initialize orchestrator
  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    if (!context || !(context instanceof WebGL2RenderingContext)) return;

    onGLReady(context);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(context, configRef.current);
    orchestratorRef.current = orchestrator;

    // Patch Three.js texture to use our GL texture
    const props = gl.properties.get(outputTexture);
    props.__webglTexture = orchestrator.getOutputTexture();
    props.__webglInit = true;

    return () => {
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [gl, onGLReady, outputTexture]);

  // Re-init on tier change (adaptive re-tiering)
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    const context = gl.getContext() as WebGL2RenderingContext;
    orchestrator.dispose();
    orchestrator.init(context, config);

    const props = gl.properties.get(outputTexture);
    props.__webglTexture = orchestrator.getOutputTexture();
    props.__webglInit = true;
  }, [config, gl, outputTexture]);

  // Handle resize
  useEffect(() => {
    orchestratorRef.current?.resize(
      gl.domElement.width,
      gl.domElement.height,
    );
  }, [size, gl]);

  // Register sim tick at priority 15
  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;

      const dt = Math.min(deltaMs * 0.001, 0.033); // cap at ~30fps delta

      // Measure frametime if in adaptive phase
      const t0 = performance.now();

      orchestrator.step(dt, elapsedMs, pointerRef.current);

      if (measuring) {
        const gl2 = gl.getContext() as WebGL2RenderingContext;
        gl2.finish();
        onFrametime(performance.now() - t0);
      }

      // Reset per-frame pointer state
      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);
  }, [gl, measuring, onFrametime]);

  // Pointer event handlers
  const onPointerMove = useCallback((e: THREE.Event<PointerEvent>) => {
    const event = e.nativeEvent ?? (e as unknown as PointerEvent);
    const rect = gl.domElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1.0 - (event.clientY - rect.top) / rect.height;

    pointerRef.current.dx = x - pointerRef.current.x;
    pointerRef.current.dy = y - pointerRef.current.y;
    pointerRef.current.x = x;
    pointerRef.current.y = y;
    pointerRef.current.moved = true;
  }, [gl]);

  const onPointerDown = useCallback(() => {
    pointerRef.current.down = true;
  }, []);

  const onPointerUp = useCallback(() => {
    pointerRef.current.down = false;
  }, []);

  // IntersectionObserver for hero visibility
  useEffect(() => {
    const hero = document.getElementById("hero-heading")?.closest("section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          orchestratorRef.current?.resume();
        } else {
          orchestratorRef.current?.pause();
        }
      },
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <mesh
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={outputTexture} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Static export succeeds. Check for WebGL-related SSR errors — all WebGL code should only execute client-side.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/FluidSim.tsx
git commit -m "feat(fluid): FluidSim R3F component — fullscreen quad, pointer input, pause/resume"
```

---

## Task 10: Build Verification + CLAUDE.md Deviations

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Run full CI-local pipeline**

Run: `pnpm ci:local`

Expected: All stages pass (lint, typecheck, build, test). If lint errors appear from Biome on GLSL or new TS files, fix formatting.

- [ ] **Step 2: Start dev server and visually verify**

Run: `pnpm dev`

Open `http://localhost:3000/de/` in browser. Verify:
- Canvas renders (no white/blank screen)
- Fluid simulation produces visible colored output on paper background
- Moving cursor creates visible disturbance in the fluid
- Clicking creates splat bursts
- Colors cycle through rose, amber, mint, violet
- Sobel outlines visible at color boundaries
- Paper grain texture visible
- After 10s idle, ambient motion starts
- Console has no errors
- If on Iris Xe laptop: verify framerate is acceptable (~40+ fps)

- [ ] **Step 3: Verify reduced-motion fallback**

In browser DevTools, toggle `prefers-reduced-motion: reduce`:
- Canvas should disappear
- CSS gradient fallback should be visible
- No console errors

- [ ] **Step 4: Document deviations in CLAUDE.md**

Append to the end of `.claude/CLAUDE.md` (or under a "## Phase 4 deviations" section if one exists):

```markdown
## Phase 4 deviations

- **curl.frag.glsl added**: Plan §5 lists 7 fluid shaders. Added dedicated
  curl pass (8th) for cleaner separation.
- **quad.vert.glsl in common/**: All passes share one fullscreen triangle
  vertex shader rather than per-pass vertex shaders.
- **CSS gradient as static fallback**: Plan §8 says WebP stills. Phase 4
  uses CSS gradient; WebP stills follow once sim is visually polished.
- **Adaptive GPU tiering**: Plan §8 describes fixed tiers. Added runtime
  frametime measurement (30 frames) + localStorage caching for
  unrecognized GPUs.
- **Output FBO uses RGBA8**: Spec says RGBA16F but the toon render pass
  outputs clamped LDR colors. RGBA8 halves memory at canvas resolution.
- **`getContext()` via R3F**: FluidOrchestrator accesses the raw
  `WebGL2RenderingContext` through `renderer.getContext()` rather than
  creating its own.
```

- [ ] **Step 5: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: Phase 4 deviations in CLAUDE.md"
```

- [ ] **Step 6: Run full CI-local one more time**

Run: `pnpm ci:local`
Expected: All green. This confirms the final state is clean.
