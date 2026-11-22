uniform vec2 R; uniform float T, P, BURST, SHOCK; uniform vec2 SHOCKPOS, M;
uniform vec4 RECT; uniform sampler2D PT, BG, DEP; uniform float HASBG, HASDEP; uniform vec2 BGSIZE;
uniform vec3 C_DEEP, C_AURA, C_HOT, C_ALT; uniform float INK;
uniform vec4 EYES; uniform float GLOW;   // both pupils in portrait uv (xy, zw); how lit the eyes and rim are

float A(vec2 u, float l){ return textureLod(PT, u, l).a; }

void main(){
  vec2 fc = gl_FragCoord.xy, uv = fc/R;
  float S = RECT.z;
  vec2 c  = RECT.xy + RECT.zw*vec2(.5,.47);
  vec2 q  = (fc - c)/S;
  float t = T, p = P;
  float fx = 0.;   // where the drawn effects are, so ink mode leaves the background alone
  float noInk = 0.; // the eye glow: ink mode would outline it in black, so it is kept out

  /* shockwave */
  vec2 sq = (fc - SHOCKPOS)/S; float sr = length(sq);
  float wave = (SHOCK > 0. && SHOCK < 1.) ? exp(-pow((sr - SHOCK*2.4)*7., 2.)) * (1.-SHOCK) : 0.;
  vec2 dist = normalize(sq + 1e-5) * wave * .05;
  vec2 qd = q - dist;
  vec2 uvp = (fc - RECT.xy)/RECT.zw - dist*S/RECT.zw;

  /* ---------- background ---------- */
  vec3 col;
  if (HASBG > .5) {
    /* 4K world reveal: dark + blurred while idle, your aura burns it open on hover */
    float ra = R.x/R.y, ia = BGSIZE.x/BGSIZE.y;
    float pc1 = min(p, 1.2);
    vec2 bu = uv - dist*S/R;
    vec2 sc = ra > ia ? vec2(1., ia/ra) : vec2(ra/ia, 1.);
    vec2 fcuv = c/R;
    bu = (bu - fcuv)*(1. - .035*pc1) + fcuv;                   // camera push-in toward you
    bu = (bu - .5)*sc*.975 + .5;
    // 2.5D parallax: near things (bright in the depth map) move more than far ones
    float dz = HASDEP > .5 ? textureLod(DEP, bu, 0.).r : .4;
    bu += ((M/R - .5) * -(.004 + .03*dz) + vec2(sin(t*.23), cos(t*.19)) * .0025 * dz) * sc;
    vec3 sharp = textureLod(BG, bu, 0.).rgb;
    vec3 blur  = textureLod(BG, bu, 4.5).rgb;
    float lb = dot(blur, vec3(.299,.587,.114));
    vec3 asleep = C_DEEP*.45 + vec3(lb)*.22;                   // dark, grey, blurry world
    float ls = dot(sharp, vec3(.299,.587,.114));
    vec3 awake = mix(sharp, sharp*sharp*1.5, .35) * .85;      // punchier contrast
    awake += C_AURA*pow(ls, 2.)*.35 + C_HOT*pow(ls, 5.)*.3;   // aura tints the highlights
    awake = mix(awake, awake*vec3(.85,.85,1.)*C_DEEP*6., .12);
    // burning reveal front, spreading out from you
    float rad = pc1*2.4 + BURST*1.2;
    float dR = length(qd*vec2(1., .8)) + (fbm(qd*3. + vec2(0., -t*.6)) - .5)*.5;
    float rv = 1. - smoothstep(rad - .3, rad, dR);
    col = mix(asleep, awake, rv);
    float front = smoothstep(.1, 0., abs(dR - rad + .05)) * step(.02, pc1) * step(dR, rad + .2);
    col += (C_AURA*1.1 + C_HOT*.25) * front * (1. - smoothstep(1.8, 2.6, rad)*.6);
    col *= mix(.5, 1., smoothstep(.05, .5, uv.x));             // keep the text side readable
  } else {
    float n  = fbm(qd*1.1 + vec2(t*.02, -t*.03));
    float n2 = fbm(qd*2.4 - vec2(0., t*.05) + n*1.5);
    col = C_DEEP*(.3 + 1.1*n2);
    col = mix(col, C_ALT*.22, smoothstep(.55,.85,n)*.7);
    // distant cel-shaded rock/ruin silhouettes on the horizon
    float hz = fbm3(vec2(uv.x*4. + 1.3, 2.))*.22 + .08;
    col = mix(col, C_DEEP*.12, smoothstep(hz+.004, hz, uv.y)*.9);
  }
  col *= .55 + .45*smoothstep(1.1, .0, abs(uv.y - .5)*2.);

  /* ---------- core glow, god rays, light pillar ---------- */
  float r = length(qd*vec2(1.,.8)), ang = atan(qd.y, qd.x);
  col += C_AURA*exp(-r*2.4)*(.06 + .55*min(p,1.));
  float rays = pow(noise(vec2(ang*9., t*.4)), 3.) * noise(vec2(ang*23., -t*.3)) * exp(-r*1.) * p * .8;
  col += mix(C_AURA, C_HOT, .4)*rays;
  col += C_AURA*exp(-abs(qd.x)*5.)*smoothstep(-.9, 1.4, qd.y)*.16*p;

  /* ---------- magic seal behind you ---------- */
  {
    float vis = smoothstep(.15, .7, p);
    vec2 sv = (qd - vec2(0., .1)) / (.62 + .1*min(p,1.) + .25*BURST);
    float sr2 = length(sv), sa = atan(sv.y, sv.x);
    float lw = .0045, seal = 0.;
    seal += smoothstep(lw*1.6, 0., abs(sr2 - .64));
    seal += smoothstep(lw, 0., abs(sr2 - .58));
    float tk = fract((sa + t*.12)/6.2831*96.);
    seal += step(tk, .3) * step(.585, sr2) * step(sr2, .635) * .6;
    float rs = (sa - t*.07)/6.2831*22., rid = floor(rs), rf = fract(rs);
    float cell = floor((sr2 - .44)/.022);
    float glyph = step(.12, rf)*step(rf, .88)*step(.45, hash(vec2(rid, cell)));
    seal += glyph * step(.44, sr2) * step(sr2, .53) * .55;
    seal += smoothstep(lw, 0., abs(sr2 - .43)) + smoothstep(lw, 0., abs(sr2 - .54));
    for (int k = 0; k < 2; k++) {
      float rot = t*.05*(k==0?1.:-1.) + float(k)*1.0472;
      float an = mod(sa + rot, 2.0944) - 1.0472;
      float dp = sr2*cos(an) - .205;
      seal += smoothstep(lw, 0., abs(dp)) * step(sr2, .42);
    }
    seal += smoothstep(lw, 0., abs(sr2 - .2));
    col += (C_AURA*.9 + C_HOT*.2) * seal * vis * (.6 + .4*sin(t*2.2));
    fx = max(fx, clamp(seal*vis, 0., 1.));
  }

  /* ---------- aura flames grown from your silhouette ---------- */
  vec2 lean = clamp((M - c)/S, -1., 1.) * .05 * p;
  vec2 fw = vec2(fbm(uvp*vec2(5., 2.4) + vec2(0., -t*1.6)), fbm(uvp*vec2(4., 2.) + vec2(7.3, -t*2.1)));
  float up = .12 + .28*min(p,1.) + .12*BURST;
  float F = A(uvp + vec2((fw.x - .5)*.10 - lean.x, -fw.y*up - lean.y*.5), 4.)
          + A(uvp + vec2((fw.y - .5)*.24 - lean.x*1.6, -fw.x*up*1.8), 5.5)*.9;
  float below = smoothstep(-.04, .12, uvp.y);                      // nothing grows below the portrait
  float body1 = A(uvp, 1.5);
  float Fc = clamp(clamp(F - body1*1.15, 0., 2.) * min(p, 1.) * 1.05, 0., 1.1) * below;   // hollow: strongest at your outline
  Fc = mix(Fc, floor(Fc*5.)/5., .45);                       // manhwa cel banding
  Fc = mix(Fc, floor(Fc*3. + .4)/3., INK);                  // ink mode: hard 3-step flames
  fx = max(fx, smoothstep(.05, .3, Fc));
  vec3 fcol = mix(C_ALT, C_AURA, smoothstep(.1, .5, Fc + fw.x*.2));
  fcol = mix(fcol, C_HOT, smoothstep(.8, 1.3, Fc));
  col += fcol * Fc * 1.25;

  /* ---------- cel-shaded ink smoke with glowing rims ---------- */
  float halo = (A(uvp, 6.5)*1.3 + A(uvp - vec2(0., .16), 7.)*1.1) * smoothstep(-.1, .15, uvp.y);
  {
    vec2 s2 = qd*1.8; float rise = t*.35;
    float column = exp(-abs(qd.x)*1.5) * smoothstep(-1., .1, qd.y) * smoothstep(1.7, .3, qd.y);
    float kS = (.55 + halo*.55) * (.35 + column*.95);
    float th = mix(.74, .42, min(p, 1.));
    float sm = 0.;
    if (kS*.97 > th - .045) {            // fbm tops out at .96875, so below this nothing in this block can show
      vec2 w = vec2(fbm(s2*1.2 + vec2(0., -rise)), fbm(s2*1.2 + vec2(3.1, -rise*1.3)));
      sm = fbm(s2 + 2.2*w - vec2(0., rise*1.5));
    }
    float d = sm * kS;
    float ink = smoothstep(th, th + .012, d);
    float rim = smoothstep(th - .045, th, d) * (1. - ink);
    float inner = smoothstep(th + .07, th + .082, d);
    vec3 inkCol = mix(C_DEEP*.16, C_DEEP*.04, inner);
    float keep = 1. - smoothstep(.15, .6, Fc);   // don't cover the flames hugging your outline
    col = mix(col, inkCol, ink*.93*keep);
    fx = max(fx, max(ink*keep*min(p*2., 1.), rim*keep));
    col += (C_HOT*.6 + C_AURA*1.3) * rim * 1.3 * min(p,1.) * keep;
    col += C_AURA * smoothstep(th + .065, th + .07, d) * (1. - inner) * .5 * p; // inner cel line
  }

  /* ---------- lightning ---------- */
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float sd = floor(t*6. + fi*2.2) + fi*17.;
    float on = step(.6, hash(vec2(sd, fi))) * smoothstep(.35, .75, p) + BURST*step(fi, 2.);
    if (on < .01) continue;
    float a = hash(vec2(sd, 3.))*6.2831;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 lq = qd - dir*(.16 + .1*hash(vec2(sd, 5.)));
    float x = dot(lq, dir), y = dot(lq, vec2(-dir.y, dir.x));
    float len = .3 + .5*hash(vec2(sd, 9.)) + BURST*.4;
    float off = (fbm3(vec2(x*5., sd)) - .5)*.24*x + (noise(vec2(x*30., sd)) - .5)*.03;
    float dd = abs(y - off) + .0015;
    float m = step(0., x) * smoothstep(len, len*.5, x);
    col += (C_HOT*.0022/dd + C_AURA*.011/dd) * m * min(on, 1.) * .65;
  }

  /* ---------- you ---------- */
  vec4 pc = texture(PT, uvp);
  float inside = step(0., uvp.x)*step(uvp.x, 1.)*step(0., uvp.y)*step(uvp.y, 1.);
  float a = pc.a * smoothstep(0., .13, uvp.y) * inside;
  vec3 pr = pc.rgb;
  float lum = dot(pr, vec3(.3,.59,.11));
  pr = mix(pr, vec3(lum), .2*p);
  pr = pr*mix(1., .62, min(p,1.)) + C_DEEP*.1*p;
  pr = mix(pr, pr*pr*1.7, .25);
  float edge = clamp((pc.a - A(uvp, 3.5))*3.2, 0., 1.);
  pr += (C_AURA*1.6 + C_HOT*.7) * edge * smoothstep(.04, .2, uvp.y) * p * 1.2;                       // rim light
  float vein = 0.;
  if (a > 0. && uvp.y < .6) { float vn = fbm(uvp*vec2(7., 9.) + vec2(0., -t*.08)); vein = 1. - smoothstep(0., .022, abs(vn - .5)); }
  pr += C_AURA*1.6 * vein * smoothstep(.6, .25, uvp.y) * p*p * .45;      // energy veins on the body
  col = mix(col, pr, a);
  fx = max(fx, a);

  /* ---------- awakening: the purple rim light swells and the eyes ignite as the charge builds ---------- */
  if (GLOW > .001) {
    float purple = smoothstep(.04, .2, pc.b - max(pc.r*.8, pc.g)) * a;         // the rim light already painted in the art
    col += (C_AURA*1.5 + C_HOT*.4) * purple * GLOW * 1.3;
    col += (C_AURA*1.4 + C_HOT*.8) * edge * smoothstep(.04, .2, uvp.y) * GLOW * 1.1;
    vec2 k = vec2(6./7., 1.);
    float fl = .9 + .1*sin(T*31.)*sin(T*17.);
    for (int i = 0; i < 2; i++) {
      vec2 e = (uvp - (i == 0 ? EYES.xy : EYES.zw)) * k;
      float core = exp(-dot(e*vec2(1., 2.4), e*vec2(1., 2.4)) * 52000.);     // the pupil itself
      float halo = exp(-dot(e*vec2(1., 1.6), e*vec2(1., 1.6)) * 2600.);
      float streak = exp(-abs(e.y)*900.) * exp(-abs(e.x)*38.);               // thin horizontal flare
      float g = (core*2.2 + halo*.55 + streak*.9) * GLOW * fl;
      col += (C_HOT*1.2 + vec3(.25)) * core * GLOW * 2. + C_AURA * g;
      noInk = max(noInk, smoothstep(.0, .25, (halo*.55 + streak*.9) * GLOW));
    }
  }

  col += fcol * clamp(F*p*.6, 0., 1.) * smoothstep(.35, .0, uvp.y) * below * .35;                  // flames licking in front
  col += C_AURA * exp(-abs(uvp.y - .02)*16.) * exp(-abs(qd.x)*2.2) * p * .5; // ground glow

  /* ---------- embers ---------- */
  float sp = 0.;
  for (int L = 0; L < 3; L++) {
    float fl = float(L), sc = 6. + fl*5.;
    vec2 g = qd*sc; g.y -= t*(.6 + fl*.35)*(1. + p*1.8);
    vec2 id = floor(g), f = fract(g) - .5;
    vec2 h = vec2(hash(id + fl*13.), hash(id*1.7 + fl*7.));
    vec2 pp = (h - .5)*.7 + vec2(sin(t*2. + h.x*6.)*.12, 0.);
    float tw = .5 + .5*sin(t*5. + h.y*20.);
    sp += smoothstep(.075 - fl*.018, 0., length(f - pp)) * step(.55, h.y) * tw;
  }
  col += mix(C_HOT, C_AURA, .35) * sp * (.2 + p*1.3) * exp(-length(qd)*.55);

  /* ---------- shock ring + impact speed lines ---------- */
  col += (C_HOT + C_AURA) * wave * .9;
  float sl = step(.962, noise(vec2(ang*60., floor(t*24.)))) * smoothstep(.3, 1., r);
  col = mix(col, C_HOT*1.6, sl * BURST * .85);

  col = col / (1. + max(col - 1., 0.)*.6);   // soft highlight rolloff
  o = vec4(max(col, 0.), fx * (1. - noInk));
}
