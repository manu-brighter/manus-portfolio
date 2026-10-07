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

// Analytic folded ink sheets: one draw, no simulation textures or feedback.
// The sheet field itself lives in common/ink-sheet.glsl, shared with the
// Full renderer so both modes print the same composition per theme.
void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.y += uScroll * 0.075;
  float t = uTime * 0.12;
  float wake = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 d = (vUv - uTrail[i].xy) * vec2(aspect, 1.0);
    float influence = exp(-dot(d, d) * 24.0) * uTrail[i].z;
    p += vec2(-d.y, d.x) * influence * 0.32;
    wake += influence * 0.04;
  }
  vec2 q;
  float density = inkSheet(p, t, uStyle, 1.0, q) + wake;
  // A quiet right edge leaves room for typography (riso and night only;
  // the other plates keep their full rhythm across the page).
  if (uStyle == 0 || uStyle == 4) density -= smoothstep(0.45, 1.0, vUv.x) * 0.12;
  float softness = uStyle == 3 ? 0.095 : (uStyle == 0 ? 0.016 : (uStyle == 2 ? 0.014 : 0.045));
  vec3 color = uPaper;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    // Slight registration drift gives layered plates an imperfect printed edge.
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    if (uStyle == 3) plate += sin(q.x * 17.0 + q.y * 11.0 + float(i)) * 0.012;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    float opacity = uStyle == 4 ? 0.66 : (uStyle == 3 ? 0.66 : 0.55);
    if (uStyle == 4) {
      float distanceToEdge = abs(plate - threshold);
      float filament = 1.0 - smoothstep(0.003, 0.012, distanceToEdge);
      float halo = 1.0 - smoothstep(0.01, 0.065, distanceToEdge);
      color = mix(color, uLadder[i], filament * 0.72 + halo * 0.10);
    } else {
      color = mix(color, uLadder[i], coverage * opacity);
    }
    float rim = 1.0 - smoothstep(0.005, 0.023, abs(plate - threshold));
    if (uStyle == 0) color *= 1.0 - rim * coverage * 0.045;
    if (uStyle == 2) color *= 1.0 - rim * coverage * uEdge * 0.10;
    if (uStyle == 3) color = mix(color, uLadder[i], rim * uEdge * 0.40);
    if (uStyle == 4) color += uLadder[i] * rim * uEdge * 0.055;
  }
  // Stationary paper grain does not shimmer between frames.
  color += inkGrain(gl_FragCoord.xy) * uGrain * 0.22 * smoothstep(0.05, 0.3, density);
  if (uStyle == 1) {
    vec2 pixel = floor(gl_FragCoord.xy);
    float screen = step(0.87, fract(pixel.x * 0.25 + pixel.y * 0.25));
    color *= 1.0 - screen * 0.025 * smoothstep(0.1, 0.4, density);
  }
  // Reading sections keep the original field at the edges, opening a broad
  // paper interval for copy and photography. Hero remains mathematically intact.
  fragColor = vec4(inkQuiet(color, uPaper, vUv, uSection), 1.0);
}
