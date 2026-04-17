float sobelEdge(sampler2D tex, vec2 uv, vec2 texel) {
  float tl = length(texture(tex, uv + vec2(-texel.x,  texel.y)).rgb);
  float t  = length(texture(tex, uv + vec2(     0.0,  texel.y)).rgb);
  float tr = length(texture(tex, uv + vec2( texel.x,  texel.y)).rgb);
  float l  = length(texture(tex, uv + vec2(-texel.x,      0.0)).rgb);
  float r  = length(texture(tex, uv + vec2( texel.x,      0.0)).rgb);
  float bl = length(texture(tex, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = length(texture(tex, uv + vec2(     0.0, -texel.y)).rgb);
  float br = length(texture(tex, uv + vec2( texel.x, -texel.y)).rgb);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;

  return sqrt(gx * gx + gy * gy);
}
