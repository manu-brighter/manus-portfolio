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
  // Soft overlapping bands — each color fades into the next
  // like layered Riso ink passes bleeding into each other.
  float d = clamp(density, 0.0, 1.0);

  vec3 c = uPaperColor;
  c = mix(c, uSpotMint,   smoothstep(0.04, 0.22, d));
  c = mix(c, uSpotAmber,  smoothstep(0.18, 0.42, d));
  c = mix(c, uSpotRose,   smoothstep(0.38, 0.62, d));
  c = mix(c, uSpotViolet, smoothstep(0.55, 0.85, d));

  return c;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  vec3 dyeClamped = clamp(dye.rgb, vec3(0.0), vec3(1.0));
  float density = length(dyeClamped);

  vec3 color = mapToSpotColor(density);

  // Subtle Sobel edges — just a gentle ink-pooling darkening,
  // not outlines. Edges feel like where Riso ink settles thicker.
  vec2 edgeTexel = uTexelSize * (1.0 + length(vec2(dFdx(vUv.x), dFdy(vUv.y))) * 100.0);
  float edge = sobelEdge(uDye, vUv, edgeTexel);
  float edgeMask = smoothstep(uOutlineThreshold * 0.5, uOutlineThreshold, edge / (density + 1.0));
  vec3 edgeTint = color * 0.85;
  color = mix(color, edgeTint, edgeMask * 0.35);

  // Blend to paper at low density
  color = mix(uPaperColor, color, smoothstep(0.0, 0.08, density));

  // Paper grain covers the ENTIRE surface — fluid and paper alike.
  // Simulates the fibrous texture of Riso-printed uncoated stock.
  float grain = snoise(vUv * 400.0 + uTime * 0.05);
  color *= 1.0 + grain * uGrainStrength;

  fragColor = vec4(color, 1.0);
}
