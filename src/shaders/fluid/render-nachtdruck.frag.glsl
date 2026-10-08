#version 300 es
precision highp float;

// #include <noise>

in vec2 vUv;
uniform sampler2D uDye;
uniform float uGrainStrength;
uniform float uEdgeStrength;
uniform float uTime;
uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;
out vec4 fragColor;

// Physical dye still advects and curls, but prints as hollow luminous
// contours like Light Night. No extra pass or bloom buffer: three dye
// samples replace the old eleven-sample filled-band and wide-bloom look.
float densityAt(vec2 uv) {
  return min(length(clamp(texture(uDye, uv).rgb, vec3(0.0), vec3(1.0))), 1.0);
}

vec3 plateColor(int index) {
  if (index == 0) return uSpotMint;
  if (index == 1) return uSpotAmber;
  if (index == 2) return uSpotRose;
  return uSpotViolet;
}

void main() {
  float density = densityAt(vUv);
  vec2 fringe = vec2(0.002, 0.0008);
  float densityA = densityAt(vUv + fringe);
  float densityB = densityAt(vUv - fringe);
  // Derivatives keep fine contours legible as the output resolution changes.
  float width = max(0.003, min(fwidth(density) * 1.2, 0.022));
  vec3 color = uPaperColor;
  for (int i = 0; i < 4; i++) {
    float threshold = 0.12 + float(i) * 0.22;
    float edge = abs(density - threshold);
    float filament = 1.0 - smoothstep(width, width * 2.2, edge);
    float halo = 1.0 - smoothstep(width * 2.0, width * 2.0 + 0.045, edge);
    vec3 ink = plateColor(i);
    color = mix(color, ink, filament * 0.78 + halo * 0.10);
    // Restrict registration colour to the same contour, leaving interiors dark.
    float fringeA = 1.0 - smoothstep(width, width * 2.2, abs(densityA - threshold));
    float fringeB = 1.0 - smoothstep(width, width * 2.2, abs(densityB - threshold));
    color += (uSpotRose * max(0.0, fringeA - filament)
      + uSpotViolet * max(0.0, fringeB - filament)) * uEdgeStrength * 0.16;
  }
  // Stationary stock grain avoids shimmer in the slender lines.
  float grain = snoise(vUv * 340.0);
  color *= 1.0 + grain * uGrainStrength;
  fragColor = vec4(clamp(color, vec3(0.0), vec3(1.0)), 1.0);
}
