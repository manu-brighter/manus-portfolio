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
  float step = posterize(d, uLevels);

  if (step < 0.2) return uPaperColor;
  if (step < 0.4) return mix(uPaperColor, uSpotMint, (step - 0.2) * 5.0);
  if (step < 0.6) return mix(uSpotMint, uSpotAmber, (step - 0.4) * 5.0);
  if (step < 0.8) return mix(uSpotAmber, uSpotRose, (step - 0.6) * 5.0);
  return mix(uSpotRose, uSpotViolet, (step - 0.8) * 5.0);
}

void main() {
  vec4 dye = texture(uDye, vUv);
  float density = length(dye.rgb);

  vec3 color = mapToSpotColor(density);

  // Sobel edge detection — retina-aware via dFdx/dFdy scaling
  vec2 edgeTexel = uTexelSize * (1.0 + length(vec2(dFdx(vUv.x), dFdy(vUv.y))) * 100.0);
  float edge = sobelEdge(uDye, vUv, edgeTexel);
  color = mix(color, uInkColor, smoothstep(uOutlineThreshold * 0.5, uOutlineThreshold, edge));

  // Paper grain — procedural noise
  float grain = snoise(vUv * 400.0 + uTime * 0.05);
  color += grain * uGrainStrength;

  // Mix towards paper on low density
  color = mix(uPaperColor, color, smoothstep(0.0, 0.15, density));

  fragColor = vec4(color, 1.0);
}
