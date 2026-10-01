#version 300 es
precision highp float;

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
  vec2 fold = vec2(
    sin(p.y * 3.6 + sin(p.x * 2.4 + t) + t * 0.7),
    cos(p.x * 3.1 - sin(p.y * 2.7 - t * 0.8))
  );
  vec2 q = p + fold * 0.48;
  float field;
  // Riso math stays untouched. Each other plate has its own spatial rhythm,
  // while retaining the pointer deformation and a single analytic draw.
  if (uStyle == 0) {
    field = sin(q.x * 3.3 + q.y * 2.0 + t)
      + 0.58 * sin(q.y * 6.0 - q.x * 2.4 - t * 0.6)
      + 0.24 * sin(q.x * 9.0 + q.y * 4.0 + t * 0.3);
  } else if (uStyle == 1) {
    // Long rolling sheets: a shallow horizontal swell folds a vertical stack
    // of bands. Sparse cross-ripples keep the print from becoming a sine chart.
    q = vec2(p.x * 0.62, p.y * 1.45);
    q.y += sin(p.x * 2.1 - t * 0.65) * 0.19;
    field = sin(q.y * 8.0 + q.x * 0.7 + t)
      + 0.28 * sin(q.y * 13.0 - q.x * 2.0 - t * 0.5);
  } else if (uStyle == 2) {
    // Intersecting folded currents break the ink into smaller angular islands.
    q = p * 1.85 + fold * 0.32;
    field = sin(q.x * 5.2 + q.y * 3.1 + t)
      * cos(q.y * 4.8 - q.x * 2.2 - t * 0.7)
      + 0.36 * sin(q.x * 9.0 - q.y * 7.0 + t * 0.4);
  } else if (uStyle == 3) {
    // Broad wet washes drift slowly, with broken pigment deposits at the rim.
    q = p * 0.78 + vec2(sin(p.y * 3.1 + t * 0.3),
      cos(p.x * 2.6 - t * 0.25)) * 0.26;
    field = sin(q.x * 3.8 + q.y * 2.5 + t * 0.35)
      + 0.38 * sin(q.y * 5.5 - q.x * 2.2 - t * 0.2);
  } else {
    // Slender folded paths will be printed as luminous contours, leaving the
    // inside of each shape mostly dark instead of filling it with neon dye.
    q = p + fold * 0.58;
    field = sin(q.x * 4.3 + q.y * 3.7 + t * 0.7)
      + 0.42 * sin(q.y * 7.0 - q.x * 3.0 - t * 0.5);
  }
  // Fold a narrow paper channel through the broad sheets, like separate
  // ink streams meeting. Reuse the field rather than adding a noise octave.
  float channel = 1.0 - smoothstep(0.035, 0.16, abs(field - 0.72));
  // A generous paper interval and quiet right edge leave room for typography.
  float density = field * 0.34 + 0.12 + wake;
  density -= channel * (uStyle == 3 ? 0.16 : 0.31);
  density -= smoothstep(0.45, 1.0, vUv.x) * 0.12;
  if (uStyle == 1) density = field * 0.39 + 0.08 + wake;
  if (uStyle == 2) density = field * 0.52 + 0.05 + wake;
  if (uStyle == 3) density = field * 0.35 + 0.08 + wake;
  float softness = uStyle == 3 ? 0.13 : (uStyle == 0 ? 0.016 : (uStyle == 2 ? 0.014 : 0.045));
  vec3 color = uPaper;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.15;
    // Slight registration drift gives layered plates an imperfect printed edge.
    float plate = density + sin(q.y * 7.0 + float(i) * 1.7) * 0.025;
    if (uStyle == 3) plate += sin(q.x * 17.0 + q.y * 11.0 + float(i)) * 0.012;
    float coverage = smoothstep(threshold - softness, threshold + softness, plate);
    float opacity = uStyle == 4 ? 0.66 : (uStyle == 3 ? 0.42 : 0.55);
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
    if (uStyle == 3) color = mix(color, uLadder[i], rim * uEdge * 0.25);
    if (uStyle == 4) color += uLadder[i] * rim * uEdge * 0.055;
  }
  // Stationary paper grain does not shimmer between frames.
  vec2 pixel = floor(gl_FragCoord.xy);
  float grain = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += grain * uGrain * 0.22 * smoothstep(0.05, 0.3, density);
  if (uStyle == 1) {
    float screen = step(0.87, fract(pixel.x * 0.25 + pixel.y * 0.25));
    color *= 1.0 - screen * 0.025 * smoothstep(0.1, 0.4, density);
  }
  // Reading sections keep the original field at the edges, opening a broad
  // paper interval for copy and photography. Hero remains mathematically intact.
  float edgeSpace = smoothstep(0.20, 0.49, abs(vUv.x - 0.5));
  color = mix(uPaper, color, 1.0 - uSection * (0.94 - edgeSpace * 0.65));
  fragColor = vec4(color, 1.0);
}
