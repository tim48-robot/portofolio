uniform sampler2D SC, BL, BL2; uniform vec2 R; uniform float T, BURST, IMPACT; uniform vec3 C_AURA; uniform float INK;
vec3 aces(vec3 x){ return clamp((x*(2.51*x + .03))/(x*(2.43*x + .59) + .14), 0., 1.); }
void main(){
  vec2 uv = gl_FragCoord.xy / R, dc = uv - .5;
  float ca = .0015 + .012*BURST;
  vec3 c = vec3(texture(SC, uv - dc*ca).r, texture(SC, uv).g, texture(SC, uv + dc*ca).b);
  c += texture(BL, uv).rgb * .55 + texture(BL2, uv).rgb * .45;
  c = aces(c * 1.05);
  if (INK > 0.) {
    // ink mode: hard tone steps, ink contours and screentone, only where the aura, seal and you are
    vec2 tx = 1. / R;
    vec3 LW = vec3(.3, .59, .11);
    vec4 s00 = texture(SC, uv + tx*vec2(-1., -1.)), s10 = texture(SC, uv + tx*vec2(0., -1.)), s20 = texture(SC, uv + tx*vec2(1., -1.));
    vec4 s01 = texture(SC, uv + tx*vec2(-1.,  0.)),                                         s21 = texture(SC, uv + tx*vec2(1.,  0.));
    vec4 s02 = texture(SC, uv + tx*vec2(-1.,  1.)), s12 = texture(SC, uv + tx*vec2(0.,  1.)), s22 = texture(SC, uv + tx*vec2(1.,  1.));
    #define LL(v) clamp(dot(v.rgb, LW), 0., 1.5)
    float gx = (LL(s20) + 2.*LL(s21) + LL(s22)) - (LL(s00) + 2.*LL(s01) + LL(s02));
    float gy = (LL(s02) + 2.*LL(s12) + LL(s22)) - (LL(s00) + 2.*LL(s10) + LL(s20));
    float m = max(texture(SC, uv).a, max(max(max(s00.a, s20.a), max(s02.a, s22.a)), max(max(s10.a, s12.a), max(s01.a, s21.a))));
    m = smoothstep(.05, .5, m);
    float edge = smoothstep(.32, .75, length(vec2(gx, gy))) * m;
    float lc = dot(c, LW);
    float lq = floor(lc * 4. + .35) / 4.;
    vec3 cq = c * (lq + .03) / (lc + .03);
    float an = .785398;
    vec2 g = mat2(cos(an), -sin(an), sin(an), cos(an)) * gl_FragCoord.xy / 5.;
    float rad = .6 * sqrt(clamp((.8 - lc) / .6, 0., 1.)) * step(.12, lc);
    float dotm = 1. - smoothstep(rad - .1, rad + .1, length(fract(g) - .5));
    cq *= 1. - dotm * .5;
    cq = mix(cq, vec3(.012, .006, .02), edge * .8);
    c = mix(c, cq, INK * m);
  }
  float l = dot(c, vec3(.3,.59,.11));
  vec3 imp = mix(vec3(.96,.94,.9), vec3(.02), smoothstep(.18, .24, l));   // inverted manga impact frame
  imp = mix(imp, C_AURA*.9, smoothstep(.5, .9, l)*.0);
  c = mix(c, imp, step(.5, IMPACT));
  c *= 1. - .6*pow(length(dc*vec2(1.1, 1.)) * 1.25, 2.6);
  c += (hash(gl_FragCoord.xy + fract(T)*100.) - .5) * .03;
  o = vec4(c, 1.);
}
