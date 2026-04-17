#version 300 es
precision mediump float;

// #include <noise>
// #include <posterize>
// #include <sobel>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uLevels;
uniform float uOutlineThreshold;
uniform float uGrainStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uInkColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

vec3 mapToSpotColor(float density) {
  float d = clamp(density, 0.0, 1.0);
  float q = posterize(d, uLevels);
  float band = 1.0 / uLevels;

  if (q < band)       return uPaperColor;
  if (q < band * 2.0) return uSpotMint;
  if (q < band * 3.0) return uSpotAmber;
  if (q < band * 4.0) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  float density = length(dye.rgb);

  vec3 color = mapToSpotColor(density);

  // Sobel edge detection — retina-aware via dFdx/dFdy scaling
  vec2 edgeTexel = uTexelSize * (1.0 + length(vec2(dFdx(vUv.x), dFdy(vUv.y))) * 100.0);
  float edge = sobelEdge(uDye, vUv, edgeTexel);
  color = mix(color, uInkColor, smoothstep(uOutlineThreshold * 0.5, uOutlineThreshold, edge));

  // Paper grain — multiplicative (simulates ink-on-paper texture)
  float grain = snoise(vUv * 400.0 + uTime * 0.05);
  color *= 1.0 + grain * uGrainStrength;

  // Hard cutoff to paper at very low density
  if (density < 0.05) color = uPaperColor;

  fragColor = vec4(color, 1.0);
}
