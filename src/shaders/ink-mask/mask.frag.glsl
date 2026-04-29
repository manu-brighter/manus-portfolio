#version 300 es
precision highp float;

// Ink-mask · final compositing pass.
// Reads the local density field and renders the per-photo paper-color
// mask with alpha proportional to (1 - density). At density = 0 the
// mask is fully opaque paper; at density >= 1 it is fully transparent
// and the photo behind shows through.
//
// Two stylistic touches keep it from looking like a flat alpha-fade:
//   1. Halftone-dot fringe at the ink/paper boundary — small dots in
//      spot color along the gradient, gives a Riso bleed feel.
//   2. Subtle paper grain on the still-opaque region.

uniform sampler2D uDensity;
uniform vec2 uResolution;
uniform vec3 uPaperColor;
uniform vec3 uSpotColor;
uniform float uTime;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float d = texture(uDensity, vUv).a;

  // Mask alpha: opaque paper at d=0, fully transparent at d>=0.85.
  // The 0.85 cap means the splat doesn't have to fully saturate to
  // reveal the photo — feels organic, like paper actually dissolving.
  float maskAlpha = 1.0 - smoothstep(0.05, 0.85, d);

  // Halftone fringe: where density is in transition (~0.3..0.7),
  // emit small spot-color dots so the boundary has a Riso bleed.
  vec2 px = vUv * uResolution;
  vec2 cell = px / 9.0;
  vec2 frac = fract(cell) - 0.5;
  float dotMask = 1.0 - smoothstep(0.18, 0.32, length(frac));
  float fringe = smoothstep(0.25, 0.55, d) * (1.0 - smoothstep(0.6, 0.8, d));
  float spotInk = dotMask * fringe;

  // Paper grain — pinned to a coarse pixel grid, slow time animation
  // so it reads like fibre, not noise.
  float grain = (hash(floor(px * 0.5) + floor(uTime * 6.0)) - 0.5) * 0.04;
  vec3 paper = uPaperColor + grain;

  // Composite: paper base + spot fringe at the bleed zone.
  vec3 color = mix(paper, uSpotColor, spotInk);

  fragColor = vec4(color, maskAlpha);
}
