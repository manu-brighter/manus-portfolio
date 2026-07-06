#version 300 es
// highp: the noise include exceeds fp16 range -- see
// render-riso.frag.glsl.
precision highp float;

// #include <noise>

in vec2 vUv;

uniform sampler2D uDye;
uniform float uGrainStrength;
uniform float uEdgeStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// Neon print: hard posterized bands ascending out of near-black paper,
// an additive glow halo around dense ink (phosphor bloom, uEdgeStrength
// = gain), and chromatic misregistration fringes at the rims -- the
// site's ghost-layer motif rendered as light instead of ink. Crisp
// core plus glow; deliberately the only additive style of the four.

const float FRINGE_UV = 0.004;
const float GLOW_UV = 0.014;
// 4 ink bands over paper -- matches the 4-slot ladder exactly.
const float BANDS = 4.0;

float densityAt(vec2 uv) {
  vec3 dye = clamp(texture(uDye, uv).rgb, vec3(0.0), vec3(1.0));
  return min(length(dye), 1.0);
}

vec3 bandColor(float idx) {
  // idx 0 = paper, 1..4 = ladder low -> high (slot names are legacy;
  // nachtdruck fills them with an ascending-brightness ladder).
  if (idx < 0.5) return uPaperColor;
  if (idx < 1.5) return uSpotMint;
  if (idx < 2.5) return uSpotAmber;
  if (idx < 3.5) return uSpotRose;
  return uSpotViolet;
}

void main() {
  float density = densityAt(vUv);

  // Hard quantized bands -- no soft ladder anywhere. Rounds (+0.5)
  // instead of flooring like turbulenz: neon should IGNITE at low
  // density (first band at d >= 0.125), not wait for a full band.
  vec3 color = bandColor(floor(density * BANDS + 0.5));

  // Glow halo: wide 4-tap bloom OUTSIDE the ink (max(halo - density)
  // keeps dense pools from brightening further -- the light hero text
  // must keep reading over saturated areas).
  float halo = (
    densityAt(vUv + vec2( GLOW_UV, 0.0)) +
    densityAt(vUv + vec2(-GLOW_UV, 0.0)) +
    densityAt(vUv + vec2(0.0,  GLOW_UV)) +
    densityAt(vUv + vec2(0.0, -GLOW_UV))
  ) * 0.25;
  color += uSpotViolet * max(0.0, halo - density) * uEdgeStrength;

  // Chromatic misregistration: offset samples split into a rose fringe
  // on one side and a violet fringe on the other, additive = glowing.
  float dA = densityAt(vUv + vec2(FRINGE_UV, FRINGE_UV * 0.4));
  float dB = densityAt(vUv - vec2(FRINGE_UV, FRINGE_UV * 0.4));
  color += uSpotRose * max(0.0, dA - density) * 0.8;
  color += uSpotViolet * max(0.0, dB - density) * 0.8;

  // Grain shimmers slightly faster here -- phosphor noise, not stock.
  float grain = snoise(vUv * 340.0 + uTime * 0.4);
  color *= 1.0 + grain * uGrainStrength;

  fragColor = vec4(clamp(color, vec3(0.0), vec3(1.0)), 1.0);
}
