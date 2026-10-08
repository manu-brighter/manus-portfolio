#version 300 es
// highp: pixel-space halftone coords and the noise include both
// exceed fp16 range -- see render-riso.frag.glsl.
precision highp float;

// #include <noise>
// #include <sobel>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uSimTexel;
uniform float uOutlineThreshold;
uniform float uGrainStrength;
uniform float uEdgeStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uInkColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// Screenprint comic: hard quantized bands, halftone dot ramps inside
// each band transition, and true ink contour lines from a Sobel pass.
// The crisp pole of the four styles -- zero softness anywhere.

const float DOT_PITCH_PX = 9.0;
// 4 ink bands over paper -- matches the 4-slot ladder exactly.
const float BANDS = 4.0;

vec3 bandColor(float idx) {
  // idx 0 = paper, 1..4 = ladder low -> high (slot names are legacy).
  if (idx < 0.5) return uPaperColor;
  if (idx < 1.5) return uSpotMint;
  if (idx < 2.5) return uSpotAmber;
  if (idx < 3.5) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec3 dye = clamp(texture(uDye, vUv).rgb, vec3(0.0), vec3(1.0));
  float density = min(length(dye), 1.0);

  // Continuous band coordinate: 0 = paper, BANDS = fully inked.
  float bandF = density * BANDS;
  float idx = floor(bandF);
  float bandFrac = fract(bandF);

  // Halftone: rotated dot grid in pixel space (gl_FragCoord is
  // spec-guaranteed highp); dots grow with the in-band fraction and
  // reveal the NEXT band -- a screenprint tonal ramp instead of a
  // soft gradient. fwidth-AA keeps the crawling dye field from
  // shimmering the dot edges without softening the look.
  vec2 grid = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / DOT_PITCH_PX;
  float dotDist = length(fract(grid) - 0.5);
  float aa = fwidth(dotDist);
  float dotMask = smoothstep(bandFrac * 0.62 + aa, bandFrac * 0.62 - aa, dotDist);

  vec3 color = mix(bandColor(idx), bandColor(idx + 1.0), dotMask);

  // Ink contour lines: Sobel on the dye field, drawn as actual ink
  // strokes (not just a darkened fill). Stepped in SIM texels so the
  // edge response is viewport-independent (the dye texture is
  // sim-resolution; canvas-texel steps starve at 4K).
  float edge = sobelEdge(uDye, vUv, uSimTexel * 0.75);
  float line = smoothstep(uOutlineThreshold * 0.5, uOutlineThreshold, edge / (density + 1.0));
  color = mix(color, uInkColor, line * uEdgeStrength);

  // Coarse grain -- rougher stock than the riso default.
  float grain = snoise(vUv * 260.0 + uTime * 0.05);
  color *= 1.0 + grain * uGrainStrength;

  fragColor = vec4(color, 1.0);
}
