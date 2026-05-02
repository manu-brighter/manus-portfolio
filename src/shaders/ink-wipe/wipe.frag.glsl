#version 300 es
precision highp float;

// Procedural Fluid-Ink-Wipe — fullscreen ink-coverage shader.
//
// We don't run a real fluid sim for the page transition; over a 1s
// window the visual difference between true Navier-Stokes and a
// procedural radial ink-front with multi-octave noise is invisible
// (and the procedural path is dramatically simpler to time precisely
// + control the reduced-motion branch).
//
// The shader computes a per-pixel ink coverage value from:
//   - distance from the click point (aspect-corrected so the front
//     looks circular regardless of viewport ratio)
//   - phase-driven advancing radius (grow = 0..maxR; retract = maxR..0)
//   - multi-octave value-noise displacing the radius along the angle
//     so the boundary reads as a wavering ink edge, not a clean disc
//   - smoothstep softening at the boundary for an anti-aliased edge
//   - a halftone fringe at the bleed zone for Riso flavour
//
// Output is the Riso ink colour multiplied by the coverage alpha.
// Caller composes the result over the page via the canvas's own alpha
// blending — no manual paper-color blending here.

uniform float uPhase;       // 0..1 progress within the current phase
uniform float uDirection;   // +1 growing, -1 retracting
uniform vec2 uClickPos;     // 0..1, origin at viewport bottom-left
                            //  (caller flips Y from clientY)
uniform float uAspect;      // viewport width / viewport height
uniform vec3 uColor;        // Riso spot for the ink front
uniform float uTime;        // seconds — drives the noise animation

in vec2 vUv;
out vec4 fragColor;

// Cheap value-noise. Self-contained so we don't have to wire the
// shared common/noise.glsl include path through this small shader.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  // Aspect-correct displacement from the click point. Multiplying x by
  // aspect makes radius equal-units in both axes; the front then reads
  // as a circle on screen rather than an ellipse.
  vec2 d = vUv - uClickPos;
  d.x *= uAspect;
  float r = length(d);

  // Worst-case distance: the corner farthest from the click point. We
  // pick the larger of the two horizontal half-widths and likewise
  // vertical, then magnitude. This guarantees the front reaches every
  // corner at phase=1 even if click is near an edge.
  float farX = max(uClickPos.x, 1.0 - uClickPos.x) * uAspect;
  float farY = max(uClickPos.y, 1.0 - uClickPos.y);
  float maxR = sqrt(farX * farX + farY * farY);

  // Phase-driven advancing/retreating front radius. Direction +1 grows
  // 0→maxR, -1 retracts maxR→0. The 1.04 multiplier overshoots a touch
  // so the soft smoothstep boundary fully clears the screen at phase=1.
  float front = (uDirection > 0.0 ? uPhase : 1.0 - uPhase) * maxR * 1.04;

  // Multi-octave noise on the angle (around the click point) modulates
  // the front so the boundary wavers like an ink edge bleeding into
  // paper. Two octaves: a slow large-amplitude wobble + a faster small
  // jitter.
  float angle = atan(d.y, d.x);
  float n1 = vnoise(vec2(angle * 2.5 + uTime * 0.6, uTime * 0.3)) - 0.5;
  float n2 = vnoise(vec2(angle * 6.0 - uTime * 1.1, uTime * 0.5)) - 0.5;
  float wobble = (n1 * 0.18 + n2 * 0.06) * maxR;
  float bumpedFront = front + wobble;

  // Coverage: 1.0 inside the front, 0.0 outside, soft transition at
  // the boundary. The 0.06 * maxR softness scales with viewport so the
  // edge stays visually consistent across breakpoints.
  float softness = 0.05 * maxR;
  float ink = 1.0 - smoothstep(bumpedFront - softness, bumpedFront, r);

  // Halftone fringe at the bleed zone — small dots in slightly darker
  // ink right where the front is currently feathering. Adds the Riso
  // print-edge feel for free.
  vec2 px = vUv * vec2(uAspect, 1.0) * 220.0;
  vec2 cell = px / 8.0;
  vec2 fc = fract(cell) - 0.5;
  float dotMask = 1.0 - smoothstep(0.18, 0.32, length(fc));
  float fringeBand = smoothstep(0.0, softness, abs(r - bumpedFront));
  float fringe = dotMask * (1.0 - fringeBand) * 0.35 * ink;

  vec3 color = uColor * (1.0 - fringe * 0.4);
  fragColor = vec4(color, ink);
}
