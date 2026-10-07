#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

out vec4 fragColor;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec4 base = texture(uTarget, vUv);
  // Alpha passes through: on the dye target it carries the hero ink
  // sheet (fluid/ink-sheet.frag.glsl), which splats must not overwrite.
  fragColor = vec4(base.xyz + splat, base.w);
}
