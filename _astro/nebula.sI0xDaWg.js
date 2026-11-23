import{t as e}from"./effects.astro_astro_type_script_index_0_lang.BdMFSoGS.js";import{i as t,n,r,t as i}from"./build.ZQ8Ua7nb.js";import{t as a}from"./glitter.WdC__lWR.js";var o=`uniform mat3 uCardRot, uPrevCardRot;
uniform int  uDebugLight;
uniform vec3 uBaseColor;
varying vec3 vWorldPos; varying vec3 vPrevWorldPos; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB;
const float NEBULA_FBAR = 0.092;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
vec4 nebulaLobe1(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec4(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho = length(vec2(qg, qt));
  float iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  float sgg = max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 1e-10);
  float stt = max(Sx[1][1] + iso2 + sq(rho * e.sigTheta) + sq(e.fanQ), 1e-10);
  float sgt = Sx[0][1], d = 1.0 / max(e.invD, 1e-6);
  float lam = d * abs(qg - (sgt / stt) * qt);
  float sigL = clamp(d * sqrt(max(sgg - sgt * sgt / stt, 1e-10)), 0.5, 512.0);
  if (lam + 3.0 * sigL < 360.0 || lam - 3.0 * sigL > 830.0) return vec4(0.0);
  return vec4(lam, exp(-0.5 * qt * qt / stt), sigL, sqrt(stt));
}
#endif
void main() {
  vec3 X = vWorldPos, V = normalize(cameraPosition - X);
  vec3 T = normalize(vT), B = normalize(vB), N = normalize(vN);
  vec2 p = vUv * uCardSizeMm;
  Footprint F = footprintOf(p);
  vec4 dUv = printUvDerivs(p);
  vec2 sB, sC; mat2 SgB, SgC;
  wavesSlope(uWaveBoard, p, F, sB, SgB);
  wavesSlope(uWaveCoat, p, F, sC, SgC);
  vec2 sM; mat2 SgM;
  bumpSlope(p, F, sM, SgM);
  if (uBumpMode == 2) { sC += sM; SgC += SgM; } else { sB += sM; SgB += SgM; }
  sB += bowSlope(p);
  float snK = keySn(X, V, N);
  mat3 fF = frameFromSlope(T, B, N, sB - (1.0 / snK) * sC);
  mat3 fC = frameFromSlope(T, B, N, sB + sC);
  bool hasKey = uKeyLight >= 0 && uKeyLight < MAX_LIGHTS;
  int  ik = clamp(uKeyLight, 0, MAX_LIGHTS - 1);
  vec3 Hk = (hasKey ? normalize(uLightPos[ik] - X) : reflect(-V, fF[2])) + V;
  vec2 qK = vec2(dot(Hk, fF[0]), dot(Hk, fF[1]));
  vec2 fw = fwidth(qK);
  float snF = max(dot(Hk, fF[2]), 1e-3);
  vec2 s2px = min(0.15915494 * fw * fw, vec2(0.09 * snF * snF));
  mat3 Rrel = uPrevCardRot * transpose(uCardRot);
  vec3 Xq = vPrevWorldPos, Vq = normalize(cameraPosition - Xq);
  vec3 Hq = (hasKey ? normalize(uPrevLightPos[ik] - Xq) : reflect(-Vq, Rrel * fF[2])) + Vq;
  vec2 dq = qK - vec2(dot(Hq, Rrel * fF[0]), dot(Hq, Rrel * fF[1]));
  float dqn = length(dq);
  if (dqn > 0.2) dq *= 0.2 / dqn;
  mat2 ScCard = mat2(s2px.x, 0.0, 0.0, s2px.y) + outerProduct(dq, dq) * (1.0 / 12.0) + snK * snK * SgB + SgC;
  float sig2Coat = SgB[0][0] + SgB[1][1] + SgC[0][0] + SgC[1][1];
  Print pr = printLayer(p, dUv);
  Wear wr = wearAt(p, F);
#if DEBUG_VIEW == 14
  pr.W = 0.0; pr.T2 = vec3(1.0); pr.onWhite = vec3(0.85); pr.silver = 0.0;
  wr.alphaAdd = 0.0; wr.gloss = 1.0; wr.mottle = 1.0; wr.dust = 0.0;
#endif
  float w   = uCoverage * wr.mottle;
  float Lf  = float(uLayers);
  float c1  = uFlakeArea / (uCell * uCell);
  float cF  = 1.0 - pow(max(1.0 - c1, 0.0), Lf);
  float Nfp = Lf / (uCell * uCell) * F.area;
  float wB  = smoothstep(2.0, 8.0, Nfp), wC = smoothstep(128.0, 256.0, Nfp);
#ifdef NEBULA_TEST_REGIME
  wB = NEBULA_TEST_REGIME >= 1 ? 1.0 : 0.0;
  wC = NEBULA_TEST_REGIME >= 2 ? 1.0 : 0.0;
#endif
  vec3 Vp = refractIn(V, fF[2], uNc);
  float coIn = dot(fF[2], Vp);
#if DEBUG_VIEW == 1
  gl_FragColor = vec4(vec3(dot(fF[2], T), dot(fF[2], B), dot(fF[2], N)) * 0.5 + 0.5, 1.0); return;
#elif DEBUG_VIEW == 2
  gl_FragColor = vec4(clamp((vec2(dot(Hk, T), dot(Hk, B)) + 1.0) * 0.5, 0.0, 1.0), 0.0, 1.0); return;
#elif DEBUG_VIEW == 4
  gl_FragColor = vec4(1.0 - wB, wB * (1.0 - wC), wC, 1.0); return;
#elif DEBUG_VIEW == 5
  gl_FragColor = vec4(vec3(clamp(log2(max(Nfp, 1e-6)) / 8.0 + 0.5, 0.0, 1.0)), 1.0); return;
#elif DEBUG_VIEW == 6
  gl_FragColor = vec4(pr.W, (pr.T2.r + pr.T2.g + pr.T2.b) / 3.0, pr.silver, 1.0); return;
#endif
  FLight fl[DISCRETE_LIGHTS];
  for (int k = 0; k < DISCRETE_LIGHTS; ++k) fl[k] = flightNone();
  vec3 Lcoat = vec3(0.0), Lpaper = vec3(0.0);
  vec3 Eb = vec3(0.0);
  vec3 Ed = vec3(0.0);
  vec3 mfOA = vec3(0.0), mfMA = vec3(0.0);
  vec3 mfOB = vec3(0.0);
  vec3 mfOall = vec3(0.0), mfMall = vec3(0.0);
#if DEBUG_VIEW != 14
  for (int k = 0; k < MAX_LIGHTS; ++k) {
    int i = uLightOrder[k];
    if (i < 0) break;
    GLight g = lightSummary(i, X, V, fF[0], fF[1], fF[2]);
    if (g.A <= 0.0) continue;
    float Ti = coatT(fC[2], g.L, V);
    vec3  Lp = refractIn(g.L, fF[2], uNc);
    vec3  diff = (g.rad * g.A / PI) * g.rgb;
    Lcoat += coatDirect(g, X, V, fC[2], uCoatAlpha + wr.alphaAdd, wr.gloss, sig2Coat);
    if (k < DISCRETE_LIGHTS) Lcoat += scratchLobe(g, V, fC, p, F, ScCard);
    Lpaper += pr.W * pr.onWhite * diff;
    Eb += Ti * diff;
    Ed += g.rad * g.A * g.rgb;
    vec3 P0 = specProject(vec4(1.0), g.spd);
    vec3 P1 = specProject(mirrorF1(uDepthNm, uNc, dot(fF[2], Lp), coIn, uEtaMir[i]), g.spd);
    FLight l = flightMake(i, g, Lp, Ti, mix(P0, P1, w), ScCard);
    if (wB > 0.0 || k >= DISCRETE_LIGHTS) {
      vec3 mo, mm;
      glitterMeanField(l, Vp, fF, ScCard, w, mo, mm);
      l.ring = mo;
      if (k >= DISCRETE_LIGHTS) { mfOA += mo; mfMA += mm; }
      if (k >= DISCRETE_LIGHTS_B) mfOB += mo;
      mfOall += mo; mfMall += mm;
    }
    if (k < DISCRETE_LIGHTS) fl[min(k, DISCRETE_LIGHTS - 1)] = l;
  }
#endif
  vec3 mirEnv = mix(specProject(vec4(1.0), 0), specProject(mirrorF1(uDepthNm, uNc, coIn, coIn, uEtaEnv), 0), w);
  GlitterA ga = glitterA(p, F, fF, V, Vp, ScCard, fl, 1.0 - wB, w, mirEnv);
  float below = 1.0 - ga.coverS;
  float bw = wB * below;
  vec3 fOrd = ga.ord + ga.kept * mfOA;
  vec3 fMir = ga.mir + ga.kept * mfMA;
  if (bw > 0.0) {
    vec3 bOrd = vec3(0.0);
    if (wC < 1.0) {
      for (int k = 0; k < DISCRETE_LIGHTS_B; ++k) bOrd += glitterB(fl[k], Vp, fF, p, F, ScCard, wB, w, cF);
      bOrd = below * bOrd + bw * cF * mfOB;
    }
    fOrd += mix(bOrd, below * cF * mfOall, wC);
    fMir += bw * cF * mfMall;
  }
  float baseW = (1.0 - wB) * (1.0 - ga.cover) + bw * (1.0 - cF);
  vec3 fBase = baseW * uBaseColor * Eb;
  vec3 envIrrC = envIrradiance(fC[2]);
  vec3 envMean = (bw > 0.0 || FLAKE_ENV == 0) ? glitterEnvMean(V, Vp, fF, ScCard, mirEnv, w) : vec3(0.0);
#if FLAKE_ENV
  vec3 fEnv = ga.env + bw * cF * envMean;
#else
  vec3 fEnv = (ga.kept + bw * cF) * envMean;
#endif
  vec3 fBaseEnv = (1.0 - NEBULA_FBAR) * (1.0 - fresnelDiel(max(dot(fC[2], V), 0.0), 1.5)) * baseW * uBaseColor * envIrrC / PI;
  vec3 Lce = coatEnv(V, fC[2], sqrt(sq(uCoatAlpha + wr.alphaAdd) + sig2Coat), wr.gloss);
  vec3 Lpe = pr.W * pr.onWhite * envIrrC / PI;
  vec3 tint = (1.0 - pr.W) * pr.T2;
  vec3 foil = fOrd + fMir + fBase + fEnv + fBaseEnv;
  vec3 L = Lcoat + Lce + Lpaper + Lpe + tint * foil;
  L = mix(L, dustRadiance(Ed + envIrrC, V, fC[2]), wr.dust);
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
  vec4 lob = vec4(0.0);
  if (ga.domW > 0.0) {
    GLight gd = lightSummary(clamp(uDebugLight, 0, MAX_LIGHTS - 1), X, V, fF[0], fF[1], fF[2]);
    lob = nebulaLobe1(gd, refractIn(gd.L, fF[2], uNc), Vp, ga.dom, ScCard, fF[0], fF[1]);
  }
#if DEBUG_VIEW == 3
  gl_FragColor = lob.x > 0.0 ? vec4(clamp((lob.x - 350.0) / 500.0, 0.0, 1.0), lob.y, 0.25, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
#else
  gl_FragColor = vec4(clamp(lob.z / 100.0, 0.0, 1.0), clamp(lob.w / 0.2, 0.0, 1.0), 0.0, 1.0);
#endif
  return;
#elif DEBUG_VIEW == 11
  gl_FragColor = vec4(ga.domW > 0.0 ? ga.domId : vec3(0.0), 1.0);
  return;
#elif DEBUG_VIEW == 7
  L = (1.0 - wr.dust) * (Lcoat + Lce);
#elif DEBUG_VIEW == 8
  L = (1.0 - wr.dust) * (Lpaper + Lpe + tint * foil);
#elif DEBUG_VIEW == 9
  L = (1.0 - wr.dust) * tint * (fMir + fEnv);
#elif DEBUG_VIEW == 10
  L = (1.0 - wr.dust) * tint * fOrd;
#endif
#ifdef HOLO_LDR
  L = gamutMapLuma(L, LUMA_SRGB);
#endif
  gl_FragColor = encodeCard(L);
}
`,s={type:`shortpass`,edgeNm:525,widthNm:30,floor:.15},c=[`hex`,`square`,`round`],l={hex:Math.sqrt(3)/2,square:1,round:Math.PI/4},u=1.25,d=`#0c0a24`,f=(e,t,n)=>Math.min(Math.max(e,t),n),p=e=>r(e,`nebula.shape`,c,`hex`);function m(e){let t=Math.max(n(e,`nebula.pitchMin`,665),1),r=Math.max(n(e,`nebula.pitchMax`,740),1);return[Math.min(t,r),Math.max(t,r)]}var h=e=>f(n(e,`nebula.nc`,1.5),1.0001,3),g=e=>Math.max(n(e,`nebula.depth`,100),0),_=e=>Math.max(Math.round(n(e,`nebula.seed`,3)),0);function v(e,t){let n=f(e,1e-6,1),r=Math.max(t,1);return(1-(1-n)**r)/(r*n)}var y={id:`nebula`,fragmentMain:o,extraChunks:[a],uniforms(t){let r=Math.max(n(t,`nebula.size`,200),1)*.001,a=p(t),o=Math.round(f(n(t,`nebula.layers`,2),1,3)),[s,y]=m(t),b=t[`nebula.baseColor`],x=e(typeof b==`string`&&/^#?[0-9a-f]{6}$/i.test(b.trim())?b:d).map(e=>f(e,0,1));return{uFlakeD:r,uCell:u*r,uFlakeArea:l[a]*r*r,uShape:c.indexOf(a),uLayers:o,uVisFrac:v(l[a]/(u*u),o),uTiltRMS:Math.tan(f(n(t,`nebula.tilt`,4.6),0,80)*i),uTauF:Math.max(n(t,`nebula.curv`,.4),0)*i,uCoverage:f(n(t,`nebula.coverage`,.65),0,1),uInvDRange:[1/y,1/s],uDepthNm:g(t),uStarD:Math.max(n(t,`nebula.starSize`,600),1)*.001,uStarOcc:f(n(t,`nebula.starDensity`,3)/100,0,1),uBaseColor:[x[0],x[1],x[2]],uNc:h(t),uCoatAlpha:f(n(t,`nebula.coatAlpha`,.06),.001,1),uSeed:_(t)>>>0}},defines(){return{}},gratingSummary(e){let[n,r]=m(e);return{pitchesNm:[n,2/(1/n+1/r),r],depthNm:g(e),nc:h(e),gAzimuthRad:null,recycle:!1,tint:t(e,`nebula`,s)}},relief(e){return{seed:_(e),wavinessDeg:Math.max(n(e,`nebula.waviness`,.3),0),orangePeelUm:Math.max(n(e,`nebula.orangePeel`,.6),0)}}};export{y as nebula};