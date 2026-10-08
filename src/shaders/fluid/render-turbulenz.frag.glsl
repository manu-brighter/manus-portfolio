#version 300 es
// highp: the sheet clock and pixel-space grain exceed fp16 range.
precision highp float;

// #include <ink-sheet>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uGrainStrength;
uniform float uEdgeStrength;
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

// Turbulenz -- Light Turbulenz's crisp angular islands in its colours,
// torn up by the real droplet swarm: the advected sheet (dye alpha)
// carries the island field into the high-confinement vortices, the
// swarm's own droplets print on top. Crisp translucent plates and rim
// shading match ink-lite/render.frag.glsl, style 2 (the old halftone +
// black contour look is retired: owner preferred the Light colours).

// Splat dye weight with and without the sheet underneath. Without a sheet
// (playground sims) the scale keeps the old banded shader's saturation
// point: its top band sat at dye length 1.0, the plates here top out at
// 0.57. At 1.0 Type-as-Fluid words and studio pools printed as one solid
// top-band mass (screenshot-verified). On the hero the colored drop is
// drawn on top of the plates, in the spot that was splatted.
const float SPLAT_SOLO = 0.6;

vec3 plateColor(int index) {
  if (index == 0) return uSpotMint;
  if (index == 1) return uSpotAmber;
  if (index == 2) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  vec3 dropColor;
  float dropCover;
  float folded;
  inkCursorSplit(dye.rgb, dropColor, dropCover, folded);
  float raw = length(clamp(dye.rgb, vec3(0.0), vec3(1.0)));
  float density = dye.a * uSheet + folded * 0.86 * uSheet + raw * SPLAT_SOLO * (1.0 - uSheet);

  // Registration drift on Light's island coordinate (without the chop:
  // the physics already tears the plates).
  float aspect = uTexelSize.y / uTexelSize.x;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * INK_PARALLAX;
  vec2 q = p * 1.85 + inkFold(p, uSheetTime * 0.12) * 0.32;

  // Crisp pole of the styles; derivatives only widen the edge where the
  // sim-resolution field would otherwise alias.
  float softness = max(0.014, fwidth(density));
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    color = mix(color, plateColor(i), coverage * 0.55);
    float rim = 1.0 - smoothstep(0.005, max(0.023, softness * 1.4), abs(plate - threshold));
    color *= 1.0 - rim * coverage * uEdgeStrength * 0.10;
  }

  color += inkGrain(gl_FragCoord.xy) * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);
  if (uSheet > 0.5) color = mix(color, dropColor, dropCover);
  fragColor = vec4(inkQuiet(color, uPaperColor, vUv, uSection), 1.0);
}
