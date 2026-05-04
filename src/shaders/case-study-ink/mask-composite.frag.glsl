#version 300 es
// Composes paper-color over the case-study scene with alpha derived
// from (1 - density). When ink density is high, paper covers the
// scene; when density dissipates, the scene shows through. Halftone
// fringe at the boundary for Riso feel.

precision highp float;

uniform sampler2D uDensity;
uniform vec3 uPaperColor;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float d = texture(uDensity, vUv).a;
  float dotX = step(0.5, fract(vUv.x * 100.0));
  float dotY = step(0.5, fract(vUv.y * 100.0));
  float halftone = (dotX + dotY) * 0.5;
  float fringe = smoothstep(0.1, 0.5, d) * (1.0 - smoothstep(0.5, 0.9, d));
  float alpha = clamp(d + fringe * halftone * 0.3, 0.0, 1.0);
  fragColor = vec4(uPaperColor, alpha);
}
