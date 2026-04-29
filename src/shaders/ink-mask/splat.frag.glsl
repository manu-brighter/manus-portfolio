#version 300 es
precision highp float;

// Ink-mask · splat step.
// Adds an ink "drop" centred at uPoint with falloff radius uRadius.
// Density is additive (additive blending owned by the consumer or
// applied here via ADD against the previous frame texture).

uniform sampler2D uDensity;
uniform vec2 uPoint;     // 0..1 in texture coords (mind aspect)
uniform float uRadius;   // gaussian sigma in texture units
uniform float uStrength; // peak addition

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 prev = texture(uDensity, vUv);
  vec2 d = vUv - uPoint;
  // Gaussian-ish falloff. Using exp() so the centre is sharp and
  // edges fade smoothly into the existing field.
  float f = exp(-dot(d, d) / (uRadius * uRadius)) * uStrength;
  fragColor = vec4(prev.rgb, clamp(prev.a + f, 0.0, 1.0));
}
