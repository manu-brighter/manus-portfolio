#version 300 es
// highp: the noise include exceeds fp16 range -- see
// render-riso.frag.glsl.
precision highp float;

// #include <noise>

in vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uTexelSize;
uniform float uGrainStrength;
uniform float uEdgeStrength;
uniform float uTime;

uniform vec3 uPaperColor;
uniform vec3 uSpotRose;
uniform vec3 uSpotAmber;
uniform vec3 uSpotMint;
uniform vec3 uSpotViolet;

out vec4 fragColor;

// Watercolor: the dye field is read through a wide soft blur (wet
// paper diffusion), pigment granulates into the paper tooth, and
// washes rim-darken where the water front dried (uEdgeStrength). No
// contours, no quantization -- the soft pole of the four styles.

// Blur radius in UV -- deliberately huge relative to a sim texel so
// washes lose any hard silhouette.
const float BLUR_UV = 0.009;

float densityAt(vec2 uv) {
  vec3 dye = clamp(texture(uDye, uv).rgb, vec3(0.0), vec3(1.0));
  return min(length(dye), 1.0);
}

float ringDensity(vec2 uv, vec2 radius) {
  // 8-tap ring (center is shared by both blur radii in main). The dye
  // texture is sim-resolution and LINEAR-filtered, so the sparse taps
  // read as a smooth bloom.
  float sum = densityAt(uv + vec2( radius.x, 0.0));
  sum += densityAt(uv + vec2(-radius.x, 0.0));
  sum += densityAt(uv + vec2(0.0,  radius.y));
  sum += densityAt(uv + vec2(0.0, -radius.y));
  vec2 diag = radius * 0.7071;
  sum += densityAt(uv + vec2( diag.x,  diag.y));
  sum += densityAt(uv + vec2( diag.x, -diag.y));
  sum += densityAt(uv + vec2(-diag.x,  diag.y));
  sum += densityAt(uv + vec2(-diag.x, -diag.y));
  return sum;
}

void main() {
  // Aspect-corrected radius: equal VISUAL extent in x and y (a raw UV
  // offset would stretch the bloom into an ellipse on 16:9).
  vec2 radius = vec2(uTexelSize.x / uTexelSize.y, 1.0) * BLUR_UV;
  float center = densityAt(vUv);
  float inner = (center * 2.0 + ringDensity(vUv, radius * 0.5)) * 0.1;
  float outer = (center * 2.0 + ringDensity(vUv, radius * 1.6)) * 0.1;

  // Granulation: pigment settles into the paper tooth at two scales.
  // Kept coarse and gentle -- at 320/0.22 the band transitions
  // speckled like TV static (screenshot-verified).
  float tooth = snoise(vUv * 180.0) * 0.6 + snoise(vUv * 70.0 + 7.0) * 0.4;
  float density = clamp(inner * (1.0 + tooth * 0.12), 0.0, 1.0);

  // Extra-wide soft ladder: washes bleed into each other wet-in-wet.
  vec3 color = uPaperColor;
  color = mix(color, uSpotMint,   smoothstep(0.02, 0.34, density));
  color = mix(color, uSpotAmber,  smoothstep(0.22, 0.58, density));
  color = mix(color, uSpotRose,   smoothstep(0.42, 0.78, density));
  color = mix(color, uSpotViolet, smoothstep(0.62, 1.00, density));

  // Wet edge: where the narrow blur exceeds the wide blur we sit on a
  // wash rim -- dried pigment accumulates and darkens the color.
  float rim = smoothstep(0.01, 0.10, inner - outer);
  color *= 1.0 - rim * uEdgeStrength;

  // Fine grain only -- watercolor paper is smoother than riso stock.
  float grain = snoise(vUv * 420.0 + uTime * 0.05);
  color *= 1.0 + grain * uGrainStrength;

  fragColor = vec4(color, 1.0);
}
