#version 300 es
// highp: the sheet clock and the relaxed density accumulate across
// thousands of frames; fp16 would quantize the slow drift into steps.
precision highp float;

// #include <ink-sheet>

in vec2 vUv;

uniform sampler2D uDye;
uniform float uAspect;
uniform float uSheetTime;
uniform float uScroll;
uniform int uStyle;
// Fraction of the way the advected sheet moves back toward the analytic
// target this sim step (0 = pure physics, 1 = snap to the Light field).
uniform float uRelax;
// The dye advect that follows this pass multiplies every channel by this.
// The sheet pre-divides the relaxed value by it, so the advected alpha the
// render pass reads settles on exactly the target (not dissipation x
// target, which under-inked Full vs Light, worse on half-rate tiers where
// the dissipation is squared). 1.0 when no advect follows (priming).
uniform float uDissipation;
// Vertical UV shift for this step, matched to the target's parallax
// drift so the advected sheet and splat dye stay registered with it.
// Positive = down: like Light, the ink drifts AGAINST the page scroll.
uniform float uCarry;
// 1 = shift the dye with the scroll and leave rgb untouched.
// 0 = also relax alpha toward the analytic Light sheet.
uniform float uCarryOnly;

out vec4 fragColor;

// Full-mode ink sheet: rgb = splat dye (untouched apart from the scroll
// carry), alpha = the theme's printed sheet. The sheet is advected by the
// real velocity field together with the dye, then pulled back toward the
// Light renderer's analytic field here. Physics bends, rolls and chops
// the bands; the target keeps the theme's composition legible.
void main() {
  vec2 source = vUv + vec2(0.0, uCarry);
  vec4 dye = texture(uDye, source);
  float inside = step(0.0, source.y) * step(source.y, 1.0);
  if (uCarryOnly > 0.5) {
    fragColor = vec4(dye.rgb, dye.a) * inside;
    return;
  }
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  // Light's parallax offset (ink-lite/render.frag.glsl), same sign.
  p.y += uScroll * INK_PARALLAX;
  vec2 q;
  float target = inkSheet(p, uSheetTime * 0.12, uStyle, 0.0, q);
  // Carried in from beyond the canvas edge: splat ink is blank paper and
  // the sheet starts on its target instead of a stretched edge row.
  float carried = mix(target, dye.a, inside);
  // advect(mix(a, T, r) / d) = mix(a, T, r): steady state is exactly T,
  // and only the relaxation decides how long a physical distortion lives.
  float sheet = mix(carried, target, uRelax) / max(uDissipation, 0.5);
  fragColor = vec4(dye.rgb * inside, sheet);
}
