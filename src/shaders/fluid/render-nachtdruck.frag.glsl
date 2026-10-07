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

// Nachtdruck -- Light Night's hollow luminous contours printed from the
// real fluid: the advected sheet (dye alpha) carries the slender folded
// paths, splat ink adds its own contour rings, interiors stay dark.
// Filament + halo + glow rim (uEdgeStrength = glow gain) match
// ink-lite/render.frag.glsl, style 4.

const float SPLAT_SOLO = 1.0;
const float SPLAT_ON_SHEET = 0.3;

vec3 plateColor(int index) {
  if (index == 0) return uSpotMint;
  if (index == 1) return uSpotAmber;
  if (index == 2) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  float splat = min(length(clamp(dye.rgb, vec3(0.0), vec3(1.0))), 1.0);
  float density = dye.a * uSheet + splat * mix(SPLAT_SOLO, SPLAT_ON_SHEET, uSheet);
  // Quiet right edge, as in Light Night.
  density -= smoothstep(0.45, 1.0, vUv.x) * 0.12 * uSheet;

  float aspect = uTexelSize.y / uTexelSize.x;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y -= uScroll * 0.075;
  vec2 q = p + inkFold(p, uSheetTime * 0.12) * 0.58;

  // Derivatives keep the slender filaments from breaking up where the
  // sim-resolution field steepens (low tiers, fast currents).
  float width = max(0.012, fwidth(density) * 1.2);
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    float distanceToEdge = abs(plate - threshold);
    float filament = 1.0 - smoothstep(width * 0.25, width, distanceToEdge);
    float halo = 1.0 - smoothstep(width * 0.85, width * 0.85 + 0.053, distanceToEdge);
    color = mix(color, plateColor(i), filament * 0.72 + halo * 0.10);
    float rim = 1.0 - smoothstep(0.005, 0.023, distanceToEdge);
    color += plateColor(i) * rim * uEdgeStrength * 0.055;
  }

  color += inkGrain(gl_FragCoord.xy) * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);
  color = clamp(color, vec3(0.0), vec3(1.0));
  fragColor = vec4(inkQuiet(color, uPaperColor, vUv, uSection), 1.0);
}
