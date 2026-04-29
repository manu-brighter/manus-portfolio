#version 300 es
precision highp float;

// Ink-mask · advect step.
// Bare semi-Lagrangian advection of the density texture by a procedural
// curl-noise velocity field. No pressure solve, no full Navier-Stokes:
// per Phase 9 deviations the reveal-time mask only needs ink to *flow
// outward and dissipate*, not to incompressibly conserve mass.

uniform sampler2D uDensity;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uTime;
uniform float uDissipation;
// Radial outward velocity magnitude. Ramped 0 → peak → 0 in JS over
// the reveal so the ink starts still, accelerates outward, then settles.
// Curl alone is symmetric and doesn't transport density radially —
// without this term a single centre splat just swirls in place.
uniform float uOutwardSpeed;

in vec2 vUv;
out vec4 fragColor;

// Cheap 2D hash → smooth noise pair → curl. Self-contained so the
// ink-mask doesn't pull in src/shaders/common/noise.glsl (avoids the
// include-injection plumbing for one consumer).
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec2 curl(vec2 p) {
  const float e = 0.05;
  float n1 = noise2(p + vec2(0.0, e));
  float n2 = noise2(p - vec2(0.0, e));
  float n3 = noise2(p + vec2(e, 0.0));
  float n4 = noise2(p - vec2(e, 0.0));
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

void main() {
  // Backwards-trace: where did the parcel that is at vUv now come from?
  // Curl term gives soft eddies for organic boundary character;
  // radial term carries the centre splat outward to the edges.
  vec2 curlVel = curl(vUv * 2.5 + vec2(0.0, uTime * 0.05)) * 0.2;
  vec2 toEdge = vUv - 0.5;
  float r = length(toEdge);
  vec2 radial = r > 0.001 ? (toEdge / r) * uOutwardSpeed : vec2(0.0);
  vec2 vel = curlVel + radial;
  vec2 prev = vUv - vel * uDt;

  vec4 prevDensity = texture(uDensity, prev);
  // Slight dissipation so over-saturated pixels relax — keeps the
  // mask from going fully transparent everywhere too quickly.
  fragColor = prevDensity * uDissipation;
}
