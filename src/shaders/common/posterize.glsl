vec3 posterize(vec3 color, float levels) {
  return floor(color * levels + 0.5) / levels;
}

float posterize(float value, float levels) {
  return floor(value * levels + 0.5) / levels;
}
