#version 300 es
// highp: pixel-space screen-line coords and the sheet clock exceed fp16.
precision highp float;

// #include <ink-sheet>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uGrainStrength;
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

// Wave -- Light Wave's long rolling swells printed from the real fluid.
// The advected sheet (dye alpha) holds the stacked horizontal bands, the
// velocity field bends and rolls them, and splat ink lands as a quieter
// second layer so the swells stay the composition. Soft translucent
// plates, registration drift and the fine diagonal screen match
// ink-lite/render.frag.glsl, style 1.

// Without a sheet (playground sims) splat dye prints 1:1: the old overprint
// shader's top plate also sat at dye length ~0.6, matching 0.57 here.
const float SPLAT_SOLO = 1.0;
const float SPLAT_ON_SHEET = 0.12;

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

  // Registration drift follows Light Wave's swell coordinate.
  float aspect = uTexelSize.y / uTexelSize.x;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * INK_PARALLAX;
  float qy = p.y * 1.45 + sin(p.x * 2.1 - uSheetTime * 0.12 * 0.65) * 0.19;

  float softness = max(0.045, fwidth(density) * 0.8);
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    float plate = density + sin(qy * 7.0 + float(i) * 1.7) * 0.025;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    color = mix(color, plateColor(i), coverage * 0.55);
  }

  color += inkGrain(gl_FragCoord.xy) * uGrainStrength * 0.22 * smoothstep(0.05, 0.3, density);
  // Fine diagonal screen inside the printed areas.
  vec2 pixel = floor(gl_FragCoord.xy);
  float screen = step(0.87, fract(pixel.x * 0.25 + pixel.y * 0.25));
  color *= 1.0 - screen * 0.025 * smoothstep(0.1, 0.4, density);
  fragColor = vec4(inkQuiet(color, uPaperColor, vUv, uSection), 1.0);
}
