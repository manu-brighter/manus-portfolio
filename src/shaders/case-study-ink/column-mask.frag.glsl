#version 300 es
precision highp float;

// Column-mask · case-study compositing pass.
// Inverse of ink-mask/mask.frag: draws dark ink where density is high,
// transparent elsewhere. Used by InkColumnFluidSim for the dark-ink
// columns at viewport edges.
//
// ASCII-only per Phase 9 .glsl rule.

uniform sampler2D uDensity;
uniform vec3 uInkColor;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float d = texture(uDensity, vUv).a;
  // Alpha ramps from 0 at d=0.05 to ~1 at d=0.85. Below 0.05 nothing
  // shows; above 0.85 fully opaque. Matches the curve in the original
  // mask shader so column saturation reads similarly given the same
  // density distribution.
  float alpha = smoothstep(0.05, 0.85, d);
  fragColor = vec4(uInkColor, alpha);
}
