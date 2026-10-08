#version 300 es
// Full precision keeps the stationary grain hash stable on mobile GPUs.
precision highp float;


in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uOutlineThreshold;
uniform float uGrainStrength;
uniform float uEdgeStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// The real advected dye field supplies every contour. Restrained plate
// opacity and narrow edges match Lite Riso's print character without
// replacing fluid dynamics with procedural shapes.

vec3 mapToSpotColor(float density) {
  float d = clamp(density, 0.0, 1.0);
  vec3 c = uPaperColor;
  // Screen derivatives keep thin plate edges stable on low-resolution tiers.
  float softness = max(0.016, fwidth(d) * 0.8);
  c = mix(c, uSpotMint,   smoothstep(0.12 - softness, 0.12 + softness, d) * 0.55);
  c = mix(c, uSpotAmber,  smoothstep(0.27 - softness, 0.27 + softness, d) * 0.55);
  c = mix(c, uSpotRose,   smoothstep(0.42 - softness, 0.42 + softness, d) * 0.55);
  c = mix(c, uSpotViolet, smoothstep(0.57 - softness, 0.57 + softness, d) * 0.55);
  float nearestPlate = min(min(abs(d - 0.12), abs(d - 0.27)),
    min(abs(d - 0.42), abs(d - 0.57)));
  float rim = 1.0 - smoothstep(softness * 0.3, softness * 1.4, nearestPlate);
  // Preserve the shared edge-intensity control; 0.35 is the Riso default.
  c *= 1.0 - rim * clamp(uEdgeStrength, 0.0, 1.0) * (0.045 / 0.35);
  return c;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  vec3 dyeClamped = clamp(dye.rgb, vec3(0.0), vec3(1.0));
  float density = length(dyeClamped) * 0.62;
  // A narrow paper seam follows an advected iso-contour. Its strength varies
  // with the transported color mix, so it opens and fades as currents meet.
  float channel = 1.0 - smoothstep(0.012, 0.055, abs(density - 0.36));
  float separation = smoothstep(0.015, 0.20, abs(dyeClamped.r - dyeClamped.g));
  density -= channel * separation * 0.23;

  vec3 color = mapToSpotColor(density);

  // Blend to paper at low density
  color = mix(uPaperColor, color, smoothstep(0.0, 0.08, density));

  // Stationary fine grain only in printed areas, matching Lite's quiet paper.
  vec2 pixel = floor(gl_FragCoord.xy);
  float grain = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += grain * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);

  fragColor = vec4(color, 1.0);
}
