#version 300 es
precision highp float;

// #include <ink-sheet>

in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform vec3 uTrail[6];
uniform vec3 uPaper;
uniform vec3 uLadder[4];
uniform int uStyle;
uniform float uGrain;
uniform float uEdge;
uniform float uSection;

// fluidBus impulses (src/lib/gl/inkImpulses.ts), packed at the front:
// uImpulseShape = x (viewport UV), y (sheet-anchored height units),
// age (s), radius (height units); uImpulseDrive = dx, dy, strength,
// ladder slot. Both constants must match inkImpulses.ts.
const int INK_IMPULSES = 16;
const float INK_IMPULSE_LIFE = 2.2;
uniform int uImpulseCount;
uniform vec4 uImpulseShape[INK_IMPULSES];
uniform vec4 uImpulseDrive[INK_IMPULSES];

float plateSoftness() {
  return uStyle == 3 ? 0.095 : (uStyle == 0 ? 0.016 : (uStyle == 2 ? 0.014 : 0.045));
}

// One printed plate: coverage, per-style fill or neon contour, and rim.
// The sheet ladder and the bus-impulse blooms both print through this,
// so a bloom is the same ink as the field around it.
vec3 printPlate(vec3 color, float plate, float threshold, vec3 ink) {
  float softness = plateSoftness();
  float coverage = smoothstep(threshold - softness, threshold + softness, plate);
  float opacity = uStyle == 4 ? 0.66 : (uStyle == 3 ? 0.66 : 0.55);
  if (uStyle == 4) {
    float distanceToEdge = abs(plate - threshold);
    float filament = 1.0 - smoothstep(0.003, 0.012, distanceToEdge);
    float halo = 1.0 - smoothstep(0.01, 0.065, distanceToEdge);
    color = mix(color, ink, filament * 0.72 + halo * 0.10);
  } else {
    color = mix(color, ink, coverage * opacity);
  }
  float rim = 1.0 - smoothstep(0.005, 0.023, abs(plate - threshold));
  if (uStyle == 0) color *= 1.0 - rim * coverage * 0.045;
  if (uStyle == 2) color *= 1.0 - rim * coverage * uEdge * 0.10;
  if (uStyle == 3) color = mix(color, ink, rim * uEdge * 0.40);
  if (uStyle == 4) color += ink * rim * uEdge * 0.055;
  return color;
}

// Analytic folded ink sheets: one draw, no simulation textures or feedback.
// The sheet field itself lives in common/ink-sheet.glsl, shared with the
// Full renderer so both modes print the same composition per theme.
void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * INK_PARALLAX;
  float t = uTime * 0.12;

  // Bus impulses bloom open, slide along their throw and fade. Each one
  // swirls the sheet locally (the field reacts), lifts its density and
  // prints its own plate in the active ladder slot of its spot.
  float bloom = 0.0;
  vec4 slotMask = vec4(0.0);
  vec2 warp = vec2(0.0);
  if (uImpulseCount > 0) {
    // One shared fold, offset per impulse: drops get ragged ink edges
    // that flow with the sheet instead of compass-drawn discs.
    vec2 ragged = inkFold(p * 2.6, t * 3.0);
    for (int i = 0; i < INK_IMPULSES; i++) {
      if (i >= uImpulseCount) break;
      vec4 shape = uImpulseShape[i];
      vec4 drive = uImpulseDrive[i];
      float age = shape.z;
      float rise = 1.0 - exp(-age * 9.0);
      float fall = 1.0 - smoothstep(0.4, INK_IMPULSE_LIFE, age);
      // The drop spreads fast, then creeps, like ink taking to paper.
      float radius = shape.w * (0.45 + 0.8 * (1.0 - exp(-age * 2.4)));
      vec2 center = vec2((shape.x - 0.5) * aspect, shape.y)
        + drive.xy * 0.05 * (1.0 - exp(-age * 2.2));
      vec2 d = p - center;
      vec2 e = d + ragged * radius * 0.38;
      float s = exp(-dot(e, e) / (radius * radius)) * drive.z * rise;
      float m = s * fall;
      // Local swirl plus a push along the throw: the sheet itself reacts.
      warp += (vec2(-d.y, d.x) / radius * 0.10 + drive.xy * 0.03) * m;
      bloom += m;
      int slot = int(drive.w + 0.5);
      // The spot plate holds its edge longer than the density lift, then
      // withdraws, as a printed drop dries back into the sheet.
      slotMask += s * sqrt(fall) * vec4(slot == 0, slot == 1, slot == 2, slot == 3);
    }
    p += warp;
  }

  float wake = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 d = (vUv - uTrail[i].xy) * vec2(aspect, 1.0);
    float influence = exp(-dot(d, d) * 24.0) * uTrail[i].z;
    p += vec2(-d.y, d.x) * influence * 0.32;
    wake += influence * 0.04;
  }
  vec2 q;
  float density = inkSheet(p, t, uStyle, 1.0, q) + wake + bloom * 0.7;
  // A quiet right edge leaves room for typography (riso and night only;
  // the other plates keep their full rhythm across the page).
  if (uStyle == 0 || uStyle == 4) density -= smoothstep(0.45, 1.0, vUv.x) * 0.12;
  vec3 color = uPaper;
  for (int i = 0; i < 4; i++) {
    // Slight registration drift gives layered plates an imperfect printed edge.
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    if (uStyle == 3) plate += sin(q.x * 17.0 + q.y * 11.0 + float(i)) * 0.012;
    color = printPlate(color, plate, 0.12 + float(i) * 0.15, uLadder[i]);
  }
  if (uImpulseCount > 0) {
    // Bloom plates print over the sheet in ladder order, with the same
    // registration drift, so overlapping spots stack like the sheet does.
    for (int i = 0; i < 4; i++) {
      float plate = slotMask[i] * 0.6 + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
      if (uStyle == 3) plate += sin(q.x * 17.0 + q.y * 11.0 + float(i)) * 0.012;
      color = printPlate(color, plate, 0.48, uLadder[i]);
    }
  }
  // Stationary paper grain does not shimmer between frames.
  color += inkGrain(gl_FragCoord.xy) * uGrain * 0.22 * smoothstep(0.05, 0.3, density);
  if (uStyle == 1) {
    vec2 pixel = floor(gl_FragCoord.xy);
    float screen = step(0.87, fract(pixel.x * 0.25 + pixel.y * 0.25));
    color *= 1.0 - screen * 0.025 * smoothstep(0.1, 0.4, density);
  }
  // Reading sections keep the original field at the edges, opening a broad
  // paper interval for copy and photography. Hero remains mathematically
  // intact. A live impulse reopens the ink around itself, quieter than in
  // the hero, so card and tile splats still read in a reading section.
  float quiet = uSection * (1.0 - 0.6 * clamp(bloom, 0.0, 1.0));
  fragColor = vec4(inkQuiet(color, uPaper, vUv, quiet), 1.0);
}
