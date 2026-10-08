// Shared analytic ink sheet -- the folded print field of the Light
// renderer (ink-lite/render.frag.glsl). The Full renderer relaxes its
// advected dye alpha toward the same field (fluid/ink-sheet.frag.glsl),
// so Animation and Simulation print one composition per theme: the
// physics distorts, carries and chops the sheet, the analytic target
// keeps each theme's structure (long Wave swells, Turbulenz islands).
// Styles: 0 riso, 1 wave, 2 turbulenz, 3 aquarell, 4 nachtdruck.
// p is aspect-corrected screen space (height 1), t the slow sheet clock.

// Scroll parallax: the sheet drifts this many viewport heights per
// viewport scrolled, AGAINST the scroll (p.y += uScroll * INK_PARALLAX).
// Mirrored by SHEET_SCROLL_CARRY in src/lib/gl/fluidOrchestrator.ts,
// which carries the Full sheet + splat dye by the same amount.
const float INK_PARALLAX = 0.075;

vec2 inkFold(vec2 p, float t) {
  return vec2(
    sin(p.y * 3.6 + sin(p.x * 2.4 + t) + t * 0.7),
    cos(p.x * 3.1 - sin(p.y * 2.7 - t * 0.8))
  );
}

// Turbulenz chop: wandering point vortices twist the domain in
// alternating directions, then a short fast shear tears the twisted
// islands apart -- the analytic stand-in for the physical droplet swarm.
// Constant loop bound keeps the ANGLE unroll small.
const int INK_CHOP_VORTICES = 6;

vec2 inkChop(vec2 p, float t) {
  // Own fast clock: the islands drift slowly, the vortices race.
  float tc = t * 12.0;
  vec2 w = p;
  for (int k = 0; k < INK_CHOP_VORTICES; k++) {
    float fk = float(k);
    vec2 c = vec2(
      sin(tc * (0.31 + fk * 0.07) + fk * 2.1) * 0.78,
      cos(tc * (0.27 + fk * 0.05) + fk * 1.3) * 0.42
    );
    vec2 d = w - c;
    float spin = (mod(fk, 2.0) * 2.0 - 1.0) * 2.6 * exp(-dot(d, d) * 11.0);
    float s = sin(spin);
    float co = cos(spin);
    w = c + vec2(co * d.x - s * d.y, s * d.x + co * d.y);
  }
  return w + 0.06 * vec2(sin(w.y * 12.0 + tc * 0.9), sin(w.x * 10.0 - tc * 0.8));
}

// Sheet density before pointer wake and the screen-anchored right-edge
// quieting (callers own both). q receives the folded domain coordinate
// the plate-drift wobble reads. chop (0/1) enables the Turbulenz vortex
// chop. Both hero modes pass 0: the fast clock raced the islands.
// Simulation's droplet swarm supplies the small swirling corners instead.
float inkSheet(vec2 p, float t, int style, float chop, out vec2 q) {
  vec2 fold = inkFold(p, t);
  q = p + fold * 0.48;
  float field;
  if (style == 0) {
    field = sin(q.x * 3.3 + q.y * 2.0 + t)
      + 0.58 * sin(q.y * 6.0 - q.x * 2.4 - t * 0.6)
      + 0.24 * sin(q.x * 9.0 + q.y * 4.0 + t * 0.3);
  } else if (style == 1) {
    // Long rolling sheets: a shallow horizontal swell folds a vertical stack
    // of bands. Sparse cross-ripples keep the print from becoming a sine chart.
    q = vec2(p.x * 0.62, p.y * 1.45);
    q.y += sin(p.x * 2.1 - t * 0.65) * 0.19;
    field = sin(q.y * 8.0 + q.x * 0.7 + t)
      + 0.28 * sin(q.y * 13.0 - q.x * 2.0 - t * 0.5);
  } else if (style == 2) {
    // Intersecting folded currents break the ink into smaller angular
    // islands; the chop twists and tears them like the physical swarm.
    vec2 w = chop > 0.5 ? inkChop(p, t) : p;
    q = w * 1.85 + fold * 0.32;
    field = sin(q.x * 5.2 + q.y * 3.1 + t)
      * cos(q.y * 4.8 - q.x * 2.2 - t * 0.7)
      + 0.36 * sin(q.x * 9.0 - q.y * 7.0 + t * 0.4);
  } else if (style == 3) {
    // Broad wet washes drift slowly, with broken pigment deposits at the rim.
    q = p * 0.78 + vec2(sin(p.y * 3.1 + t * 0.3),
      cos(p.x * 2.6 - t * 0.25)) * 0.26;
    field = sin(q.x * 3.8 + q.y * 2.5 + t * 0.35)
      + 0.38 * sin(q.y * 5.5 - q.x * 2.2 - t * 0.2);
  } else {
    // Slender folded paths printed as luminous contours.
    q = p + fold * 0.58;
    field = sin(q.x * 4.3 + q.y * 3.7 + t * 0.7)
      + 0.42 * sin(q.y * 7.0 - q.x * 3.0 - t * 0.5);
  }
  if (style == 1) return field * 0.39 + 0.08;
  if (style == 2) return field * 0.52 + 0.05;
  // More pigment reaches the violet/rose plates; the original pale mint
  // plus low opacity disappeared into wash paper before these could print.
  if (style == 3) return field * 0.40 + 0.13;
  // Fold a narrow paper channel through the broad sheets, like separate
  // ink streams meeting. Reuse the field rather than adding a noise octave.
  float channel = 1.0 - smoothstep(0.035, 0.16, abs(field - 0.72));
  return field * 0.34 + 0.12 - channel * 0.31;
}

// Colored fluid drawn after the sheet plates. Mixing the dye into the
// sheet density painted the lowest, near-paper plate over the drop and
// hid the spot that was actually splatted.
vec3 inkSplatOver(vec3 color, vec3 dyeRgb) {
  vec3 clamped = clamp(dyeRgb, vec3(0.0), vec3(1.0));
  float ink = length(clamped);
  float cover = smoothstep(0.012, 0.08, ink);
  return mix(color, clamped / max(ink, 1e-4), cover);
}

// Stationary paper grain hash (does not shimmer between frames).
float inkGrain(vec2 fragCoord) {
  vec2 pixel = floor(fragCoord);
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
}

// Reading sections keep the field at the edges, opening a broad paper
// interval for copy and photography. Hero (quiet 0) stays intact.
vec3 inkQuiet(vec3 color, vec3 paper, vec2 uv, float quiet) {
  float edgeSpace = smoothstep(0.20, 0.49, abs(uv.x - 0.5));
  return mix(paper, color, 1.0 - quiet * (0.94 - edgeSpace * 0.65));
}
