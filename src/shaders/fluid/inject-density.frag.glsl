#version 300 es
precision highp float;

// Density-texture injection — reads a normalized alpha mask from
// uStamp and additively writes (uColor × stampValue × uStrength) on
// top of the current dye field. Used by TextStamper to write text-
// shaped ink into the existing fluid sim.
//
// Sampling note: dye and stamp are typically the same dimensions
// (sim resolution, e.g. 256² or 512²) so a straight texture() pickup
// is correct. If the stamp is a different size we still read in
// normalized UV (0..1) — bilinear filter is set in the FBO factory.

uniform sampler2D uDye;     // current dye field (RGBA16F)
uniform sampler2D uStamp;   // density mask (R or A channel; we read .r)
uniform vec3 uColor;        // ink colour to bake into dye, normalized RGB
uniform float uStrength;    // how strongly the stamp adds (0..1+)

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 dye = texture(uDye, vUv);
  float a = texture(uStamp, vUv).r;
  vec3 added = uColor * a * uStrength;
  fragColor = vec4(dye.rgb + added, dye.a + a * uStrength);
}
