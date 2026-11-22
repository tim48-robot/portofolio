uniform sampler2D SRC; uniform vec2 TEXEL, DIR;
void main(){
  vec2 uv = gl_FragCoord.xy * TEXEL;
  float w[5] = float[](.227027, .1945946, .1216216, .054054, .016216);
  vec3 c = texture(SRC, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o2 = DIR * TEXEL * float(i) * 2.;
    c += texture(SRC, uv + o2).rgb * w[i] + texture(SRC, uv - o2).rgb * w[i];
  }
  o = vec4(c, 1.);
}
