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

// Aquarell -- Light Aquarell's broad wet washes printed from the real
// fluid: the advected sheet (dye alpha) drifts as wide washes, the huge
// splat blooms soak in on top. The softest plate edges of all styles,
// broken pigment deposits and coloured wet-edge rims (uEdgeStrength)
// match ink-lite/render.frag.glsl, style 3. Softness comes from the
// plate ramp, not a blur: the field is already sim-resolution smooth.

// Splat dye weight with and without the sheet underneath. Without a sheet
// (playground sims) the scale keeps the old wash shader's ramp: its plates
// centred near dye length 0.18/0.40/0.60/0.81, these at 0.12..0.57, so at
// 1.0 cursor blooms and stamped words flattened into the top plate.
const float SPLAT_SOLO = 0.7;
const float SPLAT_ON_SHEET = 0.3;

vec3 plateColor(int index) {
  if (index == 0) return uSpotMint;
  if (index == 1) return uSpotAmber;
  if (index == 2) return uSpotRose;
  return uSpotViolet;
}

void main() {
  vec4 dye = texture(uDye, vUv);
  float splat = length(clamp(dye.rgb, vec3(0.0), vec3(1.0)));
  float density = dye.a * uSheet + splat * mix(SPLAT_SOLO, SPLAT_ON_SHEET, uSheet);

  // Pigment deposits read Light Aquarell's wash coordinate.
  float t = uSheetTime * 0.12;
  float aspect = uTexelSize.y / uTexelSize.x;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * 0.075;
  vec2 q = p * 0.78 + vec2(sin(p.y * 3.1 + t * 0.3), cos(p.x * 2.6 - t * 0.25)) * 0.26;

  float softness = max(0.095, fwidth(density) * 0.8);
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    plate += sin(q.x * 17.0 + q.y * 11.0 + float(i)) * 0.012;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    color = mix(color, plateColor(i), coverage * 0.66);
    // Wet edge: pigment collects where the wash front dried.
    float rim = 1.0 - smoothstep(0.005, 0.023, abs(plate - threshold));
    color = mix(color, plateColor(i), rim * uEdgeStrength * 0.40);
  }

  color += inkGrain(gl_FragCoord.xy) * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);
  fragColor = vec4(inkQuiet(color, uPaperColor, vUv, uSection), 1.0);
}
