// Reading sections keep ink at the edges and open a paper interval
// for copy and photography. Hero (quiet 0) stays intact.
vec3 inkQuiet(vec3 color, vec3 paper, vec2 uv, float quiet) {
  float edgeSpace = smoothstep(0.20, 0.49, abs(uv.x - 0.5));
  return mix(paper, color, 1.0 - quiet * (0.94 - edgeSpace * 0.65));
}
