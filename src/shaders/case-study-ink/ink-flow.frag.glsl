#version 300 es
// Ink-flow advection -- simplified PhotoInkMask (Phase 9) for the
// Case Study mode-switch ink-transition. Density advects along a
// direction-biased velocity field with right-to-left bias on enter,
// reversed on exit. A small swirl term keeps the flow organic.

precision highp float;

uniform sampler2D uDensity;
uniform vec2 uResolution;
uniform float uDt;
uniform float uDirection; // -1.0 = enter (right-to-left), +1.0 = exit (left-to-right)
uniform float uDissipation;

in vec2 vUv;
out vec4 fragColor;

vec2 swirl(vec2 uv, float phase) {
  float a = sin(uv.y * 6.28318 + phase) * 0.05;
  float b = cos(uv.x * 6.28318 + phase) * 0.05;
  return vec2(a, b);
}

void main() {
  vec2 swirlVel = swirl(vUv, uDt);
  vec2 baseVel = vec2(uDirection * 0.4, 0.0);
  vec2 vel = baseVel + swirlVel;
  vec2 prev = vUv - vel * uDt;
  vec4 dens = texture(uDensity, prev);
  fragColor = dens * uDissipation;
}
