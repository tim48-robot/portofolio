uniform sampler2D SRC; uniform vec2 TEXEL; uniform float TH;
void main(){
  vec2 uv = gl_FragCoord.xy * TEXEL;   // TEXEL = 1/destination size
  vec3 c = vec3(0.);
  c += texture(SRC, uv + TEXEL*vec2(-.25,-.25)).rgb; c += texture(SRC, uv + TEXEL*vec2(.25,-.25)).rgb;
  c += texture(SRC, uv + TEXEL*vec2(-.25,.25)).rgb;  c += texture(SRC, uv + TEXEL*vec2(.25,.25)).rgb;
  c *= .25;
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(TH, TH + .5, l), 1.);
}
