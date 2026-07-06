#version 300 es
// highp: the shared noise include overflows fp16 internally (permute
// reaches ~3e6) and this pass runs once per canvas pixel -- cheap
// enough for full precision, unlike the mediump sim passes.
precision highp float;

// #include <noise>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uGrainStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// Overprint-plate Riso: each ladder color is its own "drum pass" -- a
// hard-edged coverage mask sampled at a slightly misregistered UV with
// noise-roughened edges (ink bleed on uncoated stock). Plates multiply
// over the paper like translucent riso ink, so overlaps darken
// naturally (true overprint). Distinctly print-like vs the retired
// soft-gradient ladder: visible plate edges, misreg fringes at every
// density step, needle speckle in the coverage.

const float INK_OPACITY = 0.86;
// Gamma-space luma floor for the overprint stack: a 4-plate overlap
// multiplies down to ~2.1:1 against text ink, below the ladder
// contrast rule (DOM text sits on top of the sim). The floor lifts
// dense pools back to the accepted deep-band level (~VIOLET_DEEP
// luma) while preserving hue.
const float LUMA_FLOOR = 0.36;

// Dye density seen by one plate: sampled at that drum's misregistered
// offset, with the sample point wobbled by simplex noise so the print
// edge frays like absorbed ink. All plates share one noise pair
// (sign-flipped per plate) -- 8 snoise calls per fragment bought
// nothing visible over 2.
float plateDensity(vec2 uv, vec2 offsetTexels, vec2 bleed) {
  vec2 misreg = uTexelSize * offsetTexels;
  vec3 dye = clamp(texture(uDye, uv + misreg + bleed).rgb, vec3(0.0), vec3(1.0));
  return length(dye);
}

// One plate prints ONE density band (soft-in, soft-out) instead of
// everything above its threshold: flat single-ink areas like a real
// spot-color separation. Because every plate reads its OWN misreg
// sample, the out-edge of band N and the in-edge of band N+1 do not
// align -- thin overprint seams (darker) and paper gaps (lighter)
// appear exactly where a misregistered riso run shows them. Nested
// all-above masks instead multiplied every band through every lower
// ink and swamped the palette into olive/rust (screenshot-verified).
void main() {
  vec2 bleedN = vec2(
    snoise(vUv * 18.0),
    snoise(vUv * 18.0 + 31.7)
  ) * uTexelSize * 12.0;

  // Fixed misregistration per drum, like a real 4-pass run where every
  // pass lands slightly differently. Offsets in canvas texels.
  float dMint   = plateDensity(vUv, vec2( 6.0,  3.0),  bleedN);
  float dAmber  = plateDensity(vUv, vec2(-5.0,  6.0), -bleedN);
  float dRose   = plateDensity(vUv, vec2( 4.0, -6.0), vec2( bleedN.y, -bleedN.x));
  float dViolet = plateDensity(vUv, vec2(-6.0, -4.0), vec2(-bleedN.y,  bleedN.x));

  float mMint   = smoothstep(0.05, 0.10, dMint)   * (1.0 - smoothstep(0.22, 0.27, dMint));
  float mAmber  = smoothstep(0.22, 0.27, dAmber)  * (1.0 - smoothstep(0.40, 0.45, dAmber));
  float mRose   = smoothstep(0.40, 0.45, dRose)   * (1.0 - smoothstep(0.60, 0.65, dRose));
  float mViolet = smoothstep(0.60, 0.65, dViolet);

  // Riso coverage is never solid: sparse needle speckle where the drum
  // skipped -- classic risograph texture.
  float speckle = smoothstep(0.55, 0.9, snoise(vUv * 260.0));
  float coverage = INK_OPACITY * (1.0 - speckle * 0.35);

  // Overprint: each plate multiplies as translucent ink.
  vec3 color = uPaperColor;
  color *= mix(vec3(1.0), uSpotMint,   mMint   * coverage);
  color *= mix(vec3(1.0), uSpotAmber,  mAmber  * coverage);
  color *= mix(vec3(1.0), uSpotRose,   mRose   * coverage);
  color *= mix(vec3(1.0), uSpotViolet, mViolet * coverage);

  // Contrast floor (see LUMA_FLOOR): hue-preserving lift of pools
  // that multiplied too dark.
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color *= max(LUMA_FLOOR, luma) / max(luma, 1e-4);

  // Paper grain covers the entire surface (site signature).
  float grain = snoise(vUv * 400.0 + uTime * 0.05);
  color *= 1.0 + grain * uGrainStrength;

  fragColor = vec4(color, 1.0);
}
