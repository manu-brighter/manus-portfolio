#version 300 es
precision highp float;

// Separable 9-tap Gaussian blur. Run twice (uDirection = (1,0) then
// (0,1)) for one full 2D Gaussian; run more iterations to widen the
// effective sigma. Used by TextStamper as the SDF approximation —
// blurring the rasterised text alpha mask gives a soft falloff at the
// edges that visually reads as a signed-distance field for our use
// case (fluid will then advect the result anyway).
//
// Reads .r from uSource so the shader works whether the upstream
// texture is R8 (rasterized text) or a wider format. Writes .r only.

uniform sampler2D uSource;
uniform vec2 uTexelSize;     // 1 / texture dimensions
uniform vec2 uDirection;     // (1,0) horizontal, (0,1) vertical
uniform float uStride;       // tap spacing multiplier — wider = blurrier

in vec2 vUv;
out vec4 fragColor;

void main() {
  // Pre-normalised 9-tap Gaussian weights (sigma ≈ 2.0 in tap-space).
  const float w0 = 0.227027;
  const float w1 = 0.194594;
  const float w2 = 0.121622;
  const float w3 = 0.054054;
  const float w4 = 0.016216;

  vec2 step = uDirection * uTexelSize * uStride;

  float r = texture(uSource, vUv).r * w0;
  r += texture(uSource, vUv + step).r * w1;
  r += texture(uSource, vUv - step).r * w1;
  r += texture(uSource, vUv + step * 2.0).r * w2;
  r += texture(uSource, vUv - step * 2.0).r * w2;
  r += texture(uSource, vUv + step * 3.0).r * w3;
  r += texture(uSource, vUv - step * 3.0).r * w3;
  r += texture(uSource, vUv + step * 4.0).r * w4;
  r += texture(uSource, vUv - step * 4.0).r * w4;

  fragColor = vec4(r, 0.0, 0.0, 1.0);
}
