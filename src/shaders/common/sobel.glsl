float sobelEdge(sampler2D tex, vec2 uv, vec2 texel) {
  vec3 c;
  float tl, t, tr, l, r, bl, b, br;

  c = texture(tex, uv + vec2(-texel.x,  texel.y)).rgb; tl = dot(c, c);
  c = texture(tex, uv + vec2(     0.0,  texel.y)).rgb; t  = dot(c, c);
  c = texture(tex, uv + vec2( texel.x,  texel.y)).rgb; tr = dot(c, c);
  c = texture(tex, uv + vec2(-texel.x,      0.0)).rgb; l  = dot(c, c);
  c = texture(tex, uv + vec2( texel.x,      0.0)).rgb; r  = dot(c, c);
  c = texture(tex, uv + vec2(-texel.x, -texel.y)).rgb; bl = dot(c, c);
  c = texture(tex, uv + vec2(     0.0, -texel.y)).rgb; b  = dot(c, c);
  c = texture(tex, uv + vec2( texel.x, -texel.y)).rgb; br = dot(c, c);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;

  return sqrt(gx * gx + gy * gy);
}
