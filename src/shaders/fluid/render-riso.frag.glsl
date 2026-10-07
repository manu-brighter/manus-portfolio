#version 300 es
// Full precision keeps the stationary grain hash stable on mobile GPUs.
precision highp float;

// #include <ink-sheet>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uGrainStrength;
uniform float uEdgeStrength;
// 1 on the hero renderers: dye alpha carries the advected Light sheet.
uniform float uSheet;
uniform float uSheetTime;
uniform float uScroll;
uniform float uSection;

uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// Riso -- Light Riso's translucent plates printed from the real fluid:
// the advected sheet (dye alpha) supplies the composition, splat dye
// adds the pointer/ambient ink on top. Same thresholds, opacity, rims
// and grain as ink-lite/render.frag.glsl, style 0.

// Splat dye weight with and without the sheet underneath.
const float SPLAT_SOLO = 0.62;
const float SPLAT_ON_SHEET = 0.35;

vec3 plateColor(int index) {
  if (index == 0) return uSpotMint;
  if (index == 1) return uSpotAmber;
  if (index == 2) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  vec3 dyeClamped = clamp(dye.rgb, vec3(0.0), vec3(1.0));
  float splat = length(dyeClamped) * mix(SPLAT_SOLO, SPLAT_ON_SHEET, uSheet);
  // Without a sheet, a narrow paper seam follows an advected splat
  // iso-contour where differently colored currents meet. The sheet
  // carries Light's own channel, so the seam would double up there.
  float channel = 1.0 - smoothstep(0.012, 0.055, abs(splat - 0.36));
  float separation = smoothstep(0.015, 0.20, abs(dyeClamped.r - dyeClamped.g));
  splat -= channel * separation * 0.23 * (1.0 - uSheet);
  float density = dye.a * uSheet + splat;
  // Quiet right edge, as in Light Riso.
  density -= smoothstep(0.45, 1.0, vUv.x) * 0.12 * uSheet;

  // Plate drift reads Light's folded domain on the same clock.
  float aspect = uTexelSize.y / uTexelSize.x;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * 0.075;
  vec2 q = p + inkFold(p, uSheetTime * 0.12) * 0.48;

  // Screen derivatives keep thin plate edges stable on low-resolution tiers.
  float softness = max(0.016, fwidth(density) * 0.8);
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    color = mix(color, plateColor(i), coverage * 0.55);
    float rim = 1.0 - smoothstep(0.005, max(0.023, softness * 1.4), abs(plate - threshold));
    // Shared edge-intensity control; 0.35 is the Riso default (= Light 0.045).
    color *= 1.0 - rim * coverage * clamp(uEdgeStrength, 0.0, 1.0) * (0.045 / 0.35);
  }

  color += inkGrain(gl_FragCoord.xy) * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);
  fragColor = vec4(inkQuiet(color, uPaperColor, vUv, uSection), 1.0);
}
