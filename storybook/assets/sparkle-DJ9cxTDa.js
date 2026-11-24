import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./build-CGrXap9d.js";import{n as r,t as i}from"./glitter-C-O18T_v.js";import{a,d as o,f as s,i as c,p as l,r as u,u as d}from"./Holo.stories-CM9brzuL.js";var f;function p(){return(p=e((()=>{f=`uniform mat3 uCardRot, uPrevCardRot;
uniform int  uDebugLight;
varying vec3 vWorldPos; varying vec3 vPrevWorldPos; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
vec4 sparkleLobe1(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B) {
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
  float w   = wr.mottle;
  float Nfp = 2.0 * F.area / (uDotCell * uDotCell);
  float wC  = max(smoothstep(1.5, 6.0, Nfp), smoothstep(0.35, 0.5, F.sMaj / uDotCell)), keepA = 1.0 - wC;
  vec3 Vp = refractIn(V, fF[2], uNc);
  float coIn = dot(fF[2], Vp);
  mat2 SgA; vec3 sandId;
  Elem eS = sparkleSandElem(p, F, fF, SgA, sandId);
  Elem eM = sparkleMatteElem(fF);
  Elem eH = sparkleHazeElem(fF, w);
#if DEBUG_VIEW == 1
  gl_FragColor = vec4(vec3(dot(fF[2], T), dot(fF[2], B), dot(fF[2], N)) * 0.5 + 0.5, 1.0); return;
#elif DEBUG_VIEW == 2
  gl_FragColor = vec4(clamp((vec2(dot(Hk, T), dot(Hk, B)) + 1.0) * 0.5, 0.0, 1.0), 0.0, 1.0); return;
#elif DEBUG_VIEW == 4
  gl_FragColor = vec4(1.0 - wC, 0.0, wC, 1.0); return;
#elif DEBUG_VIEW == 5
  gl_FragColor = vec4(vec3(clamp(log2(max(Nfp, 1e-6)) / 8.0 + 0.5, 0.0, 1.0)), 1.0); return;
#elif DEBUG_VIEW == 6
  gl_FragColor = vec4(pr.W, (pr.T2.r + pr.T2.g + pr.T2.b) / 3.0, pr.silver, 1.0); return;
#elif DEBUG_VIEW == 13
  gl_FragColor = encodeCard(vec3(0.0)); return;
#endif
  FLight fl[DISCRETE_LIGHTS];
  for (int k = 0; k < DISCRETE_LIGHTS; ++k) fl[k] = flightNone();
  vec3 Lcoat = vec3(0.0), Lpaper = vec3(0.0), Ed = vec3(0.0);
  vec3 sandL = vec3(0.0), sandT = vec3(0.0);
  vec3 hazeO = vec3(0.0), hazeM = vec3(0.0);
  vec3 mfOA = vec3(0.0), mfMA = vec3(0.0), mfSA = vec3(0.0), mfZA = vec3(0.0);
  vec3 mfO = vec3(0.0), mfM = vec3(0.0), mfS = vec3(0.0), mfZ = vec3(0.0);
#if DEBUG_VIEW != 14
  for (int k = 0; k < MAX_LIGHTS; ++k) {
    int i = uLightOrder[k];
    if (i < 0) break;
    GLight g = lightSummary(i, X, V, fF[0], fF[1], fF[2]);
    if (g.A <= 0.0) continue;
    float Ti = coatT(fC[2], g.L, V);
    vec3  Lp = refractIn(g.L, fF[2], uNc);
    float ciIn = dot(fF[2], Lp);
    vec3  diff = (g.rad * g.A / PI) * g.rgb;
    Lcoat += coatDirect(g, X, V, fC[2], uCoatAlpha + wr.alphaAdd, wr.gloss, sig2Coat);
    if (k < DISCRETE_LIGHTS) Lcoat += scratchLobe(g, V, fC, p, F, ScCard);
    Lpaper += pr.W * pr.onWhite * diff;
    Ed += g.rad * g.A * g.rgb;
    vec3 P0  = specProject(vec4(1.0), g.spd);
    vec3 P1d = specProject(mirrorF1(uDotDepth, uNc, ciIn, coIn, uEtaMir[i]), g.spd);
    vec4 etaH = etaOrdFor(i, 1.0);
    bool disc = k < DISCRETE_LIGHTS;
    float spS = uNc * dot(Lp + Vp, disc ? eS.n : eM.n);
    mat2 ScS = disc ? ScCard + (spS * spS) * SgA : ScCard;
    vec3 sd;
    if (disc) {
#if RECT_LTC
      if (g.type == 2) sd = elemMirrorRect(g, X, V, eS, ScS, fF[0], fF[1], fF[2], spS / max(dot(fF[2], g.L + V), 1e-3), Ti, P0);
      else
#endif
      sd = elemMirror(g, Lp, Vp, eS, ScS, fF[0], fF[1], Ti, P0);
    } else {
#if RECT_LTC
      if (g.type == 2) sd = elemMirrorRect(g, X, V, eM, ScS, fF[0], fF[1], fF[2], 1.0, Ti, P0);
      else
#endif
      sd = elemMirror(g, Lp, Vp, eM, ScS, fF[0], fF[1], Ti, P0);
    }
    sandL += sd;
    sandT += sd * uSpeckTint[clamp(g.spd, 0, 4)];
    if (uHazeShare > 0.0) {
      vec3 P1h = specProject(mirrorF1(uHazeDepth, uNc, ciIn, coIn, etaH), g.spd);
      vec3 mh = mix(P0, P1h, eH.w);
      if (g.type == 2) {
#if RECT_EXACT
        hazeO += elemOrdersRect(g, V, eH, ScCard, fF[0], fF[1], Ti, etaH);
#else
        hazeO += elemOrders(g, Lp, Vp, eH, ScCard, fF[0], fF[1], Ti, etaH);
#endif
#if RECT_LTC
        hazeM += elemMirrorRect(g, X, V, eH, ScCard, fF[0], fF[1], fF[2], 1.0, Ti, mh);
#else
        hazeM += elemMirror(g, Lp, Vp, eH, ScCard, fF[0], fF[1], Ti, mh);
#endif
      } else {
        hazeO += elemOrders(g, Lp, Vp, eH, ScCard, fF[0], fF[1], Ti, etaH);
        hazeM += elemMirror(g, Lp, Vp, eH, ScCard, fF[0], fF[1], Ti, mh);
      }
    }
    FLight l = flightMake(i, g, Lp, Ti, P1d, ScCard);
    if (wC > 0.0 || !disc) {
      vec3 oAl, mAl, oSp, mSp;
      sparkleMeanField(l, Vp, fF, ScCard, w, oAl, mAl, oSp, mSp);
      if (!disc) { mfOA += oAl; mfMA += mAl; mfSA += oSp; mfZA += mSp; }
      mfO += oAl; mfM += mAl; mfS += oSp; mfZ += mSp;
    }
    if (disc) fl[min(k, DISCRETE_LIGHTS - 1)] = l;
  }
#endif
  vec3 mirEnvDot = specProject(mirrorF1(uDotDepth, uNc, coIn, coIn, uEtaEnv), 0);
  SparkleA sa;
  if (keepA > 0.0) sa = sparkleA(p, F, fF, V, Vp, ScCard, fl, keepA, w, mirEnvDot);
  else {
    sa.ord = vec3(0.0); sa.mir = vec3(0.0); sa.env = vec3(0.0);
    sa.kept = 0.0; sa.keptS = 0.0; sa.cover = 0.0; sa.speckW = 0.0;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
    sa.dom = eH; sa.domW = 0.0; sa.domId = vec3(0.0); sa.idW = 0.0;
#endif
  }
  float Cm = uDotCover, fs = uSpeckArea;
  float aC = wC * Cm * (1.0 - fs), sC2 = wC * Cm * fs;
  vec3 dotO = sa.ord + sa.kept * mfOA + sa.keptS * mfSA + aC * mfO + sC2 * mfS;
  vec3 dotM = sa.mir + sa.kept * mfMA + sa.keptS * mfZA + aC * mfM + sC2 * mfZ;
  float speckEff = uSpeckType == 0 ? (1.0 - wC) * sa.speckW + wC * sparkleSpeckCoverMean() : 0.0;
  float coverEff = (1.0 - wC) * sa.cover + wC * Cm;
  float baseW = 1.0 - coverEff, hz = uHazeShare;
  vec3 envIrrC = envIrradiance(fC[2]);
  vec3 P0e = specProject(vec4(1.0), 0);
  float spE = 2.0 * uNc * max(dot(eS.n, Vp), 0.0);
  vec3 envSand = envMirror(V, Vp, eS, fF[2], ScCard + (spE * spE) * SgA, P0e);
  vec3 envHazeM = vec3(0.0), envHazeO = vec3(0.0);
  if (hz > 0.0) {
    envHazeM = envMirror(V, Vp, eH, fF[2], ScCard, mix(P0e, specProject(mirrorF1(uHazeDepth, uNc, coIn, coIn, uEtaEnv), 0), eH.w));
#if NB > 0
    envHazeO = envDiffraction(V, eH, ScCard, fF[0], fF[1]);
#endif
  }
  vec3 envMean = (wC > 0.0 || FLAKE_ENV == 0) ? sparkleEnvMean(V, Vp, fF, ScCard, mirEnvDot, w) : vec3(0.0);
  float litC = wC * Cm * (uSpeckType == 1 ? 1.0 : 1.0 - fs);
#if FLAKE_ENV
  vec3 envDots = sa.env + litC * envMean;
#else
  vec3 envDots = (sa.kept + sa.keptS + litC) * envMean;
#endif
  vec3 envDotsO = vec3(0.0);
#if NB > 0
  envDotsO = (sa.kept + wC * Cm * (1.0 - fs)) * envDiffraction(V, sparkleDotMeanElem(fF, w), ScCard, fF[0], fF[1]);
#endif
  vec3 envSpeck = speckEff * envSand * uSpeckTint[0];
  vec3 Lce = coatEnv(V, fC[2], sqrt(sq(uCoatAlpha + wr.alphaAdd) + sig2Coat), wr.gloss);
  vec3 Lpe = pr.W * pr.onWhite * envIrrC / PI;
  vec3 foilO = dotO + envDotsO + baseW * hz * (hazeO + envHazeO);
  vec3 foilZ = dotM + speckEff * sandT + baseW * ((1.0 - hz) * sandL + hz * hazeM)
             + envDots + envSpeck + baseW * ((1.0 - hz) * envSand + hz * envHazeM);
  vec3 tint = (1.0 - pr.W) * pr.T2;
  vec3 L = Lcoat + Lce + Lpaper + Lpe + tint * (foilO + foilZ);
  L = mix(L, dustRadiance(Ed + envIrrC, V, fC[2]), wr.dust);
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
  GLight gd = lightSummary(clamp(uDebugLight, 0, MAX_LIGHTS - 1), X, V, fF[0], fF[1], fF[2]);
  vec3 Lpd = refractIn(gd.L, fF[2], uNc);
  vec4 lob = sa.domW > 0.0 ? sparkleLobe1(gd, Lpd, Vp, sa.dom, ScCard, fF[0], fF[1])
                           : sparkleLobe1(gd, Lpd, Vp, eH, ScCard, fF[0], fF[1]);
#if DEBUG_VIEW == 3
  gl_FragColor = lob.x > 0.0 ? vec4(clamp((lob.x - 350.0) / 500.0, 0.0, 1.0), lob.y, 0.25, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
#else
  gl_FragColor = vec4(clamp(lob.z / 100.0, 0.0, 1.0), clamp(lob.w / 0.2, 0.0, 1.0), 0.0, 1.0);
#endif
  return;
#elif DEBUG_VIEW == 11
  gl_FragColor = vec4(sa.idW > 0.0 ? sa.domId : sandId, 1.0);
  return;
#elif DEBUG_VIEW == 7
  L = (1.0 - wr.dust) * (Lcoat + Lce);
#elif DEBUG_VIEW == 8
  L = (1.0 - wr.dust) * (Lpaper + Lpe + tint * (foilO + foilZ));
#elif DEBUG_VIEW == 9
  L = (1.0 - wr.dust) * tint * foilZ;
#elif DEBUG_VIEW == 10
  L = (1.0 - wr.dust) * tint * foilO;
#endif
#ifdef HOLO_LDR
  L = gamutMapLuma(L, LUMA_SRGB);
#endif
  gl_FragColor = encodeCard(L);
}
`})))()}var m;function h(){return(h=e((()=>{m=`uniform float uDotD, uDotCell, uDotIrr, uDotTilt, uDotTauF, uDotSigTh, uDotSigF, uDotFanQ, uDotDepth, uDotInvD;
uniform vec2  uDotGDir;
uniform float uDotAreaMean, uSpeckAreaMean, uDotCover, uSpeckArea;
uniform float uSpeckShare, uSpeckInvD, uSpeckScale;
uniform int   uSpeckType;
uniform vec3  uSpeckTint[5];
uniform float uMatteSigS, uSandCell, uSandTilt, uSandSigS;
uniform float uHazeShare, uHazeDepth, uHazeSigS, uHazeFanQ;
#define SPARKLE_LAYERS 2
#define SPARKLE_JITTER 0.8
#define SAND_JITTER 1.0
#define SAND_SOFT 0.22
const uint SPARKLE_SALT = 0x51A2C3E0u;
const uint SAND_SALT    = 0x5A9D11C7u;
const uint SPARKLE_SALT_LOBE = 0x9E3779B9u, SPARKLE_SALT_ERR = 0x85EBCA6Bu, SPARKLE_SALT_TILT = 0xC2B2AE35u;
const uint SAND_SALT_TILT = 0x27D4EB2Fu;
const float SPARKLE_DOT_SIGS = 0.0026;
const float SPARKLE_REJECT = 4.5;
const float SPARKLE_WIDE = 0.25;
const float SPARKLE_HAZE_SIGTH = 0.0052359878;
const float SPARKLE_HAZE_SIGF = 0.005;
const float SAND_TILT_CLAMP = 2.5, SAND_TILT_NORM = 1.0227200;
vec2 sandTiltAt(ivec2 hc, uint salt) {
  vec2 g = gauss2(rnd3(hc, salt ^ SAND_SALT_TILT).xy);
  return (uSandTilt * SAND_TILT_NORM * min(1.0, SAND_TILT_CLAMP / max(length(g), 1e-6))) * g;
}
struct DotCore { vec2 c; float sz; float sS; float reach; };
struct Dot { vec2 c; float R; vec4 lobe; vec2 s; vec2 gCard; float invD; float speck; float rr; };
DotCore dotCore(ivec2 cell, ivec2 hc, uint salt, mat2 G, vec2 o) {
  vec3 a = rnd3(hc, salt);
  DotCore k;
  k.c = G * (vec2(cell) + 0.5 + SPARKLE_JITTER * (a.xy - 0.5) - o);
  k.sz = 1.0 + 0.4 * uDotIrr * (2.0 * a.z - 1.0);
  k.sS = uSpeckScale * (0.9 + 0.2 * a.z);
  k.reach = 0.5 * uDotD * max(k.sz, k.sS) * (1.0 + 0.3 * uDotIrr);
  return k;
}
Dot dotFull(DotCore k, ivec2 hc, uint salt) {
  vec3 b = rnd3(hc, salt ^ SPARKLE_SALT_LOBE), e = rnd3(hc, salt ^ SPARKLE_SALT_ERR), t = rnd3(hc, salt ^ SPARKLE_SALT_TILT);
  Dot d;
  d.c = k.c;
  bool speck = t.z < uSpeckShare;
  d.speck = speck ? 1.0 : 0.0;
  d.rr = speck ? t.z / max(uSpeckShare, 1e-6) : (t.z - uSpeckShare) / max(1.0 - uSpeckShare, 1e-6);
  float a2 = 0.15 * uDotIrr * b.x, p2 = TAU * b.y, a3 = 0.15 * uDotIrr * b.z, p3 = TAU * e.x;
  d.lobe = vec4(a2 * cos(2.0 * p2), a2 * sin(2.0 * p2), a3 * cos(3.0 * p3), a3 * sin(3.0 * p3));
  d.s = uDotTilt * gauss2(t.xy);
  if (speck && uSpeckType == 1) {
    float th = PI * e.y;
    d.gCard = vec2(cos(th), sin(th));
    d.invD = uSpeckInvD;
  } else {
    vec2 n = gauss2(e.yz);
    float dt = uDotSigTh * n.x, c = cos(dt), s = sin(dt);
    d.gCard = vec2(c * uDotGDir.x - s * uDotGDir.y, s * uDotGDir.x + c * uDotGDir.y);
    d.invD = uDotInvD / max(1.0 + uDotSigF * n.y, 0.5);
  }
  d.R = 0.5 * uDotD * (speck ? k.sS : k.sz);
  return d;
}
float sdDot(vec2 dl, Dot d) {
  float l = length(dl);
  vec2 u = l > 1e-9 ? dl / l : vec2(1.0, 0.0);
  float c2 = u.x * u.x - u.y * u.y, s2 = 2.0 * u.x * u.y;
  return l - d.R * (1.0 + dot(d.lobe, vec4(c2, s2, u.x * c2 - u.y * s2, u.y * c2 + u.x * s2)));
}
float dotArea(Dot d) { return PI * d.R * d.R * (1.0 + 0.5 * dot(d.lobe, d.lobe)); }
Elem dotElem(Dot d, mat3 fF, float w) {
  Elem e;
  e.n = normalize(fF[2] - d.s.x * fF[0] - d.s.y * fF[1]);
  vec3 g0 = d.gCard.x * fF[0] + d.gCard.y * fF[1];
  e.g = normalize(g0 - e.n * dot(g0, e.n));
  e.invD = d.invD; e.hNm = uDotDepth; e.nc = uNc;
  e.sigS = SPARKLE_DOT_SIGS; e.tauF = uDotTauF;
  bool gs = d.speck > 0.5;
  e.fanQ = gs ? 0.0 : uDotFanQ;
  e.sigTheta = 0.0; e.sigFrel = 0.0;
  e.iso2 = glitterIso2(2.0 * d.R);
  e.w = w;
  e.fam = gs ? 2.0 : 0.0;
  return e;
}
Elem sparkleHazeElem(mat3 fF, float w) {
  Elem e;
  e.n = fF[2];
  e.g = normalize(uDotGDir.x * fF[0] + uDotGDir.y * fF[1]);
  e.invD = uDotInvD; e.hNm = uHazeDepth; e.nc = uNc;
  e.sigS = uHazeSigS; e.tauF = 0.0; e.fanQ = uHazeFanQ;
  e.sigTheta = SPARKLE_HAZE_SIGTH; e.sigFrel = SPARKLE_HAZE_SIGF; e.iso2 = 0.0;
  e.w = w; e.fam = 1.0;
  return e;
}
Elem sparkleDotMeanElem(mat3 fF, float w) {
  Elem e = sparkleHazeElem(fF, w);
  e.hNm = uDotDepth; e.sigS = SPARKLE_DOT_SIGS; e.tauF = sqrt(sq(uDotTauF) + sq(uDotTilt)); e.fanQ = uDotFanQ;
  e.sigTheta = uDotSigTh; e.sigFrel = uDotSigF; e.iso2 = glitterIso2(uDotD); e.fam = 0.0;
  return e;
}
Elem sparkleSandElem(vec2 p, Footprint F, mat3 fF, out mat2 SgA, out vec3 dbgId) {
  float wS = smoothstep(1.5, 6.0, F.area / (uSandCell * uSandCell));
  vec2 sm = vec2(0.0);
  mat2 M2 = mat2(0.0);
  float cov = 0.0;
  dbgId = vec3(0.35);
  if (wS < 1.0) {
    Lattice Ls = latticeOf(glitterAxes(2), uSandCell);
    vec2 off = glitterOffset(2);
    ivec2 c0 = ivec2(floor(Ls.Gi * p + off)) - 1;
    uint salt = uSeed ^ SAND_SALT;
    float d0 = 1e30, d1 = 1e30, d2 = 1e30;
    ivec2 h0 = ivec2(0), h1 = ivec2(0), h2 = ivec2(0);
    vec2 q0 = vec2(0.0), q1 = vec2(0.0), q2 = vec2(0.0);
    for (int j = 0; j < 3; ++j) for (int i = 0; i < 3; ++i) {
      ivec2 cell = c0 + ivec2(i, j), hc = latticeCell(Ls, cell);
      vec2 dl = p - Ls.G * (vec2(cell) + 0.5 + SAND_JITTER * (rnd3(hc, salt).xy - 0.5) - off);
      float d = dot(dl, dl);
      if (d < d0) { d2 = d1; h2 = h1; q2 = q1; d1 = d0; h1 = h0; q1 = q0; d0 = d; h0 = hc; q0 = dl; }
      else if (d < d1) { d2 = d1; h2 = h1; q2 = q1; d1 = d; h1 = hc; q1 = dl; }
      else if (d < d2) { d2 = d; h2 = hc; q2 = dl; }
    }
    float soft2 = sq(SAND_SOFT * uSandCell);
    vec2 e1 = q0 - q1, e2 = q0 - q2;
    float l1 = max(length(e1), 1e-6), l2 = max(length(e2), 1e-6);
    float x1 = (d1 - d0) / (2.0 * l1), x2 = (d2 - d0) / (2.0 * l2);
    float g1 = sqrt(sq(sigmaAlong(F, e1 / l1)) + soft2), g2 = sqrt(sq(sigmaAlong(F, e2 / l2)) + soft2);
    vec3 wk = vec3(1.0, exp(-min(1.702 * x1 / g1, 80.0)), exp(-min(1.702 * x2 / g2, 80.0)));
    wk *= (1.0 - wS) / (wk.x + wk.y + wk.z);
    vec2 s0 = sandTiltAt(h0, salt);
    vec2 s1 = wk.y > 1e-4 ? sandTiltAt(h1, salt) : vec2(0.0);
    vec2 s2 = wk.z > 1e-4 ? sandTiltAt(h2, salt) : vec2(0.0);
    cov = wk.x + wk.y + wk.z;
    sm = wk.x * s0 + wk.y * s1 + wk.z * s2;
    M2 = wk.x * outerProduct(s0, s0) + wk.y * outerProduct(s1, s1) + wk.z * outerProduct(s2, s2);
    dbgId = vec3(0.2 + 0.3 * rnd3(h0, salt).z);
  }
  SgA = M2 - outerProduct(sm, sm);
  float rem = max(uMatteSigS * uMatteSigS - uSandSigS * uSandSigS, 0.0);
  Elem e;
  e.n = normalize(fF[2] - sm.x * fF[0] - sm.y * fF[1]);
  e.g = normalize(fF[0] - e.n * dot(fF[0], e.n));
  e.invD = uDotInvD; e.hNm = 0.0; e.nc = uNc;
  e.sigS = sqrt(uSandSigS * uSandSigS + (1.0 - cov) * rem);
  e.tauF = 0.0; e.fanQ = 0.0; e.sigTheta = 0.0; e.sigFrel = 0.0; e.iso2 = 0.0;
  e.w = 0.0; e.fam = 0.0;
  return e;
}
Elem sparkleMatteElem(mat3 fF) {
  Elem e;
  e.n = fF[2]; e.g = fF[0];
  e.invD = uDotInvD; e.hNm = 0.0; e.nc = uNc;
  e.sigS = uMatteSigS; e.tauF = 0.0; e.fanQ = 0.0; e.sigTheta = 0.0; e.sigFrel = 0.0; e.iso2 = 0.0;
  e.w = 0.0; e.fam = 0.0;
  return e;
}
vec3 sparkleOrders(FLight l, vec3 Vp, Elem e, mat2 ScCard, mat3 fF) {
  vec3 H = e.nc * (l.Lp + Vp), t = cross(e.n, e.g);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  float ub = 1.1 * l.ltr + sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2 + sq(length(vec2(qg, qt)) * e.sigTheta)
           + float(uMaxOrder) * sq(e.fanQ) + 1e-10;
  if (qt * qt > 36.0 * ub) return vec3(0.0);
#if DEBUG_VIEW == 13
  return vec3(0.0);
#else
  return elemOrders(flightG(l), l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, etaOrdFor(l.slot, e.fam));
#endif
}
vec3 sparkleMirror(FLight l, vec3 Vp, Elem e, mat2 ScCard, mat3 fF) {
  vec3 H = e.nc * (l.Lp + Vp), t = cross(e.n, e.g);
  vec2 q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  float ub = 1.1 * l.ltr + 2.0 * (sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2) + 1e-10;
  if (dot(q, q) > 36.0 * ub) return vec3(0.0);
  return elemMirror(flightG(l), l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, l.mir);
}
struct SparkleA {
  vec3  ord;
  vec3  mir;
  vec3  env;
  float kept;
  float keptS;
  float cover;
  float speckW;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
  Elem  dom;
  float domW;
  vec3  domId;
  float idW;
#endif
};
SparkleA sparkleA(vec2 p, Footprint F, mat3 fF, vec3 V, vec3 Vp, mat2 ScCard, FLight fl[DISCRETE_LIGHTS],
                  float keepA, float w, vec3 mirEnvDot) {
  SparkleA o;
  o.ord = vec3(0.0); o.mir = vec3(0.0); o.env = vec3(0.0);
  o.kept = 0.0; o.keptS = 0.0; o.cover = 0.0; o.speckW = 0.0;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
  o.dom = sparkleHazeElem(fF, 0.0); o.domW = 0.0; o.domId = vec3(0.0); o.idW = 0.0;
#endif
  float sP = sqrt(0.5 * (F.S[0][0] + F.S[1][1]));
  int R = F.sMaj > SPARKLE_WIDE * uDotCell ? 2 : 1;
  int nC = 2 * R + 1;
  CovK kD = glitterCovK(F, uDotD, uDotAreaMean);
  CovK kS = glitterCovK(F, uSpeckScale * uDotD, uSpeckAreaMean);
  float rej = SPARKLE_REJECT * F.sMaj;
  for (int lay = 0; lay < HOLO_NOUNROLL(SPARKLE_LAYERS); ++lay) {
    if (1.0 - o.cover < 0.02) break;
    Lattice La = latticeOf(glitterAxes(lay), uDotCell);
    vec2  off = glitterOffset(lay);
    uint  salt = uSeed ^ (uint(lay) << 8) ^ SPARKLE_SALT;
    ivec2 c0 = ivec2(floor(La.Gi * p + off)) - R;
    float vis = 1.0 - o.cover;
    vec3  lo = vec3(0.0), lm = vec3(0.0), le = vec3(0.0);
    float lw = 0.0, lwS = 0.0, lc = 0.0, ls = 0.0;
    for (int j = 0; j < nC; ++j) for (int i = 0; i < nC; ++i) {
      ivec2 cell = c0 + ivec2(i, j), hc = latticeCell(La, cell);
      DotCore k = dotCore(cell, hc, salt, La.G, off);
      vec2 dl = p - k.c;
      if (dot(dl, dl) > sq(k.reach + rej)) continue;
      Dot d = dotFull(k, hc, salt);
      bool speck = d.speck > 0.5;
      float c = speck ? glitterCoverage(kS, F, dl, sdDot(dl, d)) : glitterCoverage(kD, F, dl, sdDot(dl, d));
      if (c < 1e-4) continue;
      lc += c;
#if DEBUG_VIEW == 11
      if (c * vis > o.idW) { o.idW = c * vis; o.domId = speck ? vec3(1.0) : vec3(d.rr, fract(7.31 * d.lobe.x + 0.5), fract(d.c.x * 1.37 + d.c.y * 0.71)); }
#endif
      if (speck && uSpeckType == 0) { ls += c; continue; }
      float keep = smoothstep(max(0.0, d.rr - 0.1), min(1.0, d.rr + 0.1), keepA);
      float om = keep * c;
      if (om <= 0.0) continue;
      Elem e = dotElem(d, fF, w);
      vec3 eo = vec3(0.0), em = vec3(0.0);
      for (int q = 0; q < DISCRETE_LIGHTS; ++q) {
        if (fl[q].radA <= 0.0) continue;
        eo += sparkleOrders(fl[q], Vp, e, ScCard, fF);
        em += sparkleMirror(fl[q], Vp, e, ScCard, fF);
      }
      lo += om * eo; lm += om * em;
#if FLAKE_ENV
      le += om * envMirror(V, Vp, e, fF[2], ScCard, mirEnvDot);
#endif
      if (speck) lwS += om; else lw += om;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
      if (om * vis > o.domW) { o.domW = om * vis; o.dom = e; }
#endif
    }
    float nrm = vis / max(lc, 1.0);
    o.ord += nrm * lo; o.mir += nrm * lm; o.env += nrm * le;
    o.kept += nrm * lw; o.keptS += nrm * lwS; o.speckW += nrm * ls;
    o.cover += vis * min(lc, 1.0);
  }
  return o;
}
void sparkleMeanField(FLight l, vec3 Vp, mat3 fF, mat2 ScCard, float w, out vec3 oAl, out vec3 mAl, out vec3 oSp, out vec3 mSp) {
  oAl = vec3(0.0); mAl = vec3(0.0); oSp = vec3(0.0); mSp = vec3(0.0);
  if (l.radA <= 0.0) return;
  GLight g = flightG(l);
  Elem e = sparkleDotMeanElem(fF, w);
  oAl = elemOrders(g, l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, etaOrdFor(l.slot, 0.0));
  float sP = dot(uNc * (l.Lp + Vp), fF[2]);
  float tr = 0.5 * (ScCard[0][0] + ScCard[1][1]);
  float sigQ = sqrt(tr + sq(sP * uDotTauF) + sq(sP * SPARKLE_DOT_SIGS) + glitterIso2(uDotD));
  mAl = mirrorMeanField(g, l.Lp, Vp, fF[2], fF[0], fF[1], uNc, sigQ, uDotTilt, l.Tc, l.mir);
  if (uSpeckType == 1) {
    float sigQs = sqrt(tr + sq(sP * uDotTauF) + sq(sP * SPARKLE_DOT_SIGS) + glitterIso2(uSpeckScale * uDotD));
    oSp = w * ringKernel(g, l.Lp, Vp, fF[2], fF[0], fF[1], uSpeckInvD, 0.0, sigQs, uDotDepth, uNc, uDotTilt, l.Tc,
                         etaOrdFor(l.slot, 2.0));
    mSp = mirrorMeanField(g, l.Lp, Vp, fF[2], fF[0], fF[1], uNc, sigQs, uDotTilt, l.Tc, l.mir);
  }
}
float sparkleSpeckCoverMean() { return uSpeckType == 0 ? uDotCover * uSpeckArea : 0.0; }
vec3 sparkleEnvMean(vec3 V, vec3 Vp, mat3 fF, mat2 ScCard, vec3 mirEnvDot, float w) {
  return envMirror(V, Vp, sparkleDotMeanElem(fF, w), fF[2], ScCard, mirEnvDot);
}
`})))()}function g(e,t){let n=e[t],r=typeof n==`number`?n:typeof n==`string`&&n.trim()!==``?Number(n):NaN;return Number.isFinite(r)?r:j[t]}function _(e,t,n,r){let i=e[t];return typeof i==`string`&&n.includes(i)?i:r}function v(e){return{type:_(e,`sparkle.tint`,M,`shortpass`),edgeNm:g(e,`sparkle.tintEdge`),widthNm:Math.max(g(e,`sparkle.tintWidth`),.001),floor:N(g(e,`sparkle.tintFloor`),0,1)}}function y(e){return{peakNm:g(e,`sparkle.speckDyePeak`),widthNm:Math.max(g(e,`sparkle.speckDyeWidth`),.001),floor:N(g(e,`sparkle.speckDyeFloor`),0,1)}}function b(e,t){let n=(e-t.peakNm)/t.widthNm;return t.floor+(1-t.floor)*Math.exp(-.5*n*n)}function x(e,t,n){let r=a(t),i=u(e,e=>r(e)*b(e,n)),o=u(e,r);return[i[0]/Math.max(o[0],1e-12),i[1]/Math.max(o[1],1e-12),i[2]/Math.max(o[2],1e-12)]}function S(e){let t=Math.max(g(e,`sparkle.pitch`),1),n=Math.max(g(e,`sparkle.depth`),0);return{pitchesNm:[t,t,Math.max(g(e,`sparkle.speckPitch`),1)],depthsNm:[n,Math.max(g(e,`sparkle.hazeDepth`),0),n],depthNm:n,nc:N(g(e,`sparkle.nc`),1.0001,3),gAzimuthRad:(g(e,`sparkle.grooveAngle`)-90)*k,recycle:!0,tint:v(e)}}function C(e){let t=Math.max(g(e,`sparkle.size`),1)*.001,n=N(g(e,`sparkle.coverage`),.01,.95),r=N(g(e,`sparkle.irregularity`),0,1),i=g(e,`sparkle.grooveAngle`)*k,a=Math.max(g(e,`sparkle.matte`),.01),o=N(g(e,`sparkle.sandTilt`),0,a);return{D:t,coverage:n,irr:r,cell:E(t,n,r),tilt:Math.tan(N(g(e,`sparkle.tilt`),0,80)*k),sigTh:Math.max(g(e,`sparkle.orientJitter`),0)*k,sigF:Math.max(g(e,`sparkle.pitchJitter`),0)/100,invD:1/Math.max(g(e,`sparkle.pitch`),1),gDir:[Math.sin(i),-Math.cos(i)],speckShare:N(g(e,`sparkle.speckShare`)/100,0,1),speckScale:N(g(e,`sparkle.speckSize`),.05,1),speckInvD:1/Math.max(g(e,`sparkle.speckPitch`),1),speckGrating:_(e,`sparkle.speckType`,O,`dyed`)===`grating`,seed:Math.max(Math.round(g(e,`sparkle.seed`)),0)>>>0,sandCell:Math.max(g(e,`sparkle.sandSize`),.01)*t,sandTilt:Math.tan(o*k),sandSigS:Math.sqrt(Math.max(a*a-o*o,.0625))*k,matteSigS:a*k,sandSoft:A}}function w(e){let t=.8*e;return 1+t*t/12}function T(e){let t=.15*e;return 1+t*t/3}function E(e,t,n){let r=1-Math.sqrt(1-Math.min(Math.max(t,1e-4),.999));return e*Math.sqrt(Math.PI/4*w(n)*T(n)/r)}function D(e){let t=Math.min(Math.max(e.speckShare,0),1),n=e.speckScale,r=(1-t)*w(e.irr),i=t*n*n*P,a=Math.min(Math.PI/4*e.D*e.D*T(e.irr)*(r+i)/(e.cell*e.cell),1);return{c1:a,union:1-(1-a)*(1-a),speckArea:r+i>0?i/(r+i):0}}var O,k,A,j,M,N,P;function F(){return(F=e((()=>{l(),c(),O=[`dyed`,`grating`],k=Math.PI/180,A=.22,j=Object.fromEntries(s.filter(e=>e.id.startsWith(`sparkle.`)).map(e=>[e.id,e.default])),M=[`clear`,`longpass`,`shortpass`],N=(e,t,n)=>Math.min(Math.max(e,t),n),P=1+.04/12})))()}function I(e){let t=v(e),n=y(e),r=`${t.type}|${t.edgeNm}|${t.widthNm}|${t.floor}|${n.peakNm}|${n.widthNm}|${n.floor}`;if(R&&R.key===r)return R.rgb;let i=new Float32Array(d.flatMap(e=>[...x(e,t,n)]));return R={key:r,rgb:i},i}var L,R,z;function B(){return(B=e((()=>{r(),p(),h(),F(),o(),t(),L=(e,t,n)=>Math.min(Math.max(e,t),n),R=null,z={id:`sparkle`,fragmentMain:f,extraChunks:[i,m],uniforms(e){let t=C(e),r=t.speckScale*t.D,i=D(t);return{uDotD:t.D,uDotCell:t.cell,uDotIrr:t.irr,uDotTilt:t.tilt,uDotTauF:Math.max(g(e,`sparkle.dome`),0)*n,uDotSigTh:t.sigTh,uDotSigF:t.sigF,uDotFanQ:Math.max(g(e,`sparkle.fan`),0)*n,uDotDepth:Math.max(g(e,`sparkle.depth`),0),uDotInvD:t.invD,uDotGDir:[t.gDir[0],t.gDir[1]],uDotAreaMean:Math.PI/4*t.D*t.D*w(t.irr)*T(t.irr),uSpeckAreaMean:Math.PI/4*r*r*P*T(t.irr),uDotCover:i.union,uSpeckArea:i.speckArea,uSpeckShare:t.speckShare,uSpeckInvD:t.speckInvD,uSpeckScale:t.speckScale,uSpeckType:+!!t.speckGrating,uSpeckTint:I(e),uMatteSigS:t.matteSigS,uSandCell:t.sandCell,uSandTilt:t.sandTilt,uSandSigS:t.sandSigS,uHazeShare:L(g(e,`sparkle.hazeShare`),0,1),uHazeDepth:Math.max(g(e,`sparkle.hazeDepth`),0),uHazeSigS:Math.max(g(e,`sparkle.hazeRoughness`),0)*n,uHazeFanQ:Math.max(g(e,`sparkle.hazeFan`),0)*n,uNc:L(g(e,`sparkle.nc`),1.0001,3),uCoatAlpha:L(g(e,`sparkle.coatAlpha`),.001,1),uSeed:t.seed>>>0,uFlakeD:0,uCell:0,uFlakeArea:0,uVisFrac:0,uTiltRMS:0,uTauF:0,uCoverage:0,uDepthNm:0,uStarD:0,uStarOcc:0,uShape:0,uLayers:0,uInvDRange:[0,0]}},defines(){return{}},gratingSummary:S,relief(e){return{seed:Math.max(Math.round(g(e,`sparkle.seed`)),0),wavinessDeg:Math.max(g(e,`sparkle.waviness`),0),orangePeelUm:Math.max(g(e,`sparkle.orangePeel`),0)}}}})))()}B();export{z as sparkle};