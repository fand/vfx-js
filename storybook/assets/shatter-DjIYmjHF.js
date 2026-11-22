import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{a as t,n,r,t as i}from"./build-CGrXap9d.js";var a;function o(){return(o=e((()=>{a=`uniform float uShardSize, uShardJit, uChords, uShardTilt, uChirp, uRidgeH, uRidgeW, uCreaseShare;
uniform int   uOrientK;
uniform vec3  uInvDSet;
uniform float uDepthNm, uCoverage, uFanQ, uNc, uSigS;
uniform uint  uSeed;
uniform mat3  uCardRot, uPrevCardRot;
uniform int   uDebugLight;
varying vec3 vWorldPos; varying vec3 vPrevWorldPos; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB;
#if DEBUG_VIEW == 1 || DEBUG_VIEW == 2 || DEBUG_VIEW == 3 || DEBUG_VIEW == 4 || DEBUG_VIEW == 5 || DEBUG_VIEW == 6 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
#define HOLO_RAW_VIEW 1
#endif
const uint SALT_VOR = 0x3C6EF372u, SALT_NCH = 0x7F4A7C15u, SALT_CHORD = 0x2545F491u;
const uint SALT_A = 0x51ED270Bu, SALT_B = 0xA2F1C3D5u, SALT_CREASE = 0x68E31DA4u, SALT_DBG = 0x1B873593u;
mat2 keyKernels(vec3 X, vec3 V, vec3 T, vec3 B, vec3 Nf, float snK, out vec2 qK) {
  bool key = uKeyLight >= 0 && uKeyLight < MAX_LIGHTS;
  int ki = clamp(uKeyLight, 0, MAX_LIGHTS - 1);
  vec3 Lk = key ? normalize(uLightPos[ki] - X) : reflect(-V, Nf);
  qK = vec2(dot(Lk + V, T), dot(Lk + V, B));
  vec2 w = fwidth(qK);
  float cap = 0.09 * snK * snK;
  mat2 S = mat2(min(w.x * w.x / TAU, cap), 0.0, 0.0, min(w.y * w.y / TAU, cap));
  if (key) {
    mat3 Rrel = uPrevCardRot * transpose(uCardRot);
    vec3 Hp = normalize(uPrevLightPos[ki] - vPrevWorldPos) + normalize(cameraPosition - vPrevWorldPos);
    vec2 dq = qK - vec2(dot(Hp, Rrel * T), dot(Hp, Rrel * B));
    float l = length(dq);
    if (l > 0.2) dq *= 0.2 / l;
    S += outerProduct(dq, dq) / 12.0;
  }
  return S;
}
struct Vor { ivec2 id, nid; float dE; vec2 e, cOwn, cNb; };
Vor voronoiShards(vec2 p) {
  float S2 = 2.0 * uShardSize;
  Lattice La = latticeOf(mat2(1.0), S2);
  vec2 x = La.Gi * p, nn = floor(x), f = x - nn;
  ivec2 n = ivec2(nn);
  Vor V; float md = 8.0 * S2 * S2; vec2 mr = vec2(0.0); ivec2 mg = ivec2(0);
  for (int j = -1; j <= 1; ++j) for (int i = -1; i <= 1; ++i) {
    ivec2 gi = ivec2(i, j);
    vec2 r = La.G * (vec2(gi) + 0.5 + uShardJit * (rnd3(latticeCell(La, n + gi), uSeed ^ SALT_VOR).xy - 0.5) - f);
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = gi; }
  }
  V.id = latticeCell(La, n + mg); V.cOwn = p + mr;
  V.nid = V.id; V.e = vec2(1.0, 0.0); V.cNb = V.cOwn;
  md = 8.0 * S2;
  for (int j = -uVorR; j <= uVorR; ++j) for (int i = -uVorR; i <= uVorR; ++i) {
    ivec2 gi = mg + ivec2(i, j);
    vec2 r = La.G * (vec2(gi) + 0.5 + uShardJit * (rnd3(latticeCell(La, n + gi), uSeed ^ SALT_VOR).xy - 0.5) - f);
    vec2 dr = r - mr;
    if (dot(dr, dr) > 1e-6 * S2 * S2) {
      vec2 e = normalize(dr);
      float d = dot(0.5 * (mr + r), e);
      if (d < md) { md = d; V.nid = latticeCell(La, n + gi); V.e = e; V.cNb = p + r; }
    }
  }
  V.dE = max(md, 0.0);
  return V;
}
int chordCount(ivec2 c) { return min(3, int(floor(uChords + rnd3(c, uSeed ^ SALT_NCH).x))); }
void chordOf(ivec2 c, int k, vec2 cF, out vec2 ck, out vec2 nk) {
  vec3 h = rnd3(c, uSeed ^ (SALT_CHORD + uint(k)));
  ck = cF + 0.6 * uShardSize * (h.xy - 0.5);
  float a = PI * h.z;
  nk = vec2(-sin(a), cos(a));
}
uint chordBits(ivec2 c, vec2 cF, vec2 q) {
  int nc = chordCount(c);
  uint bits = 0u;
  for (int k = 0; k < 3; ++k) {
    if (k >= nc) break;
    vec2 ck, nk; chordOf(c, k, cF, ck, nk);
    if (dot(nk, q - ck) > 0.0) bits |= 1u << uint(k);
  }
  return bits;
}
float creaseHeight(ivec2 a, uint ba, ivec2 b, uint bb) {
  bool swp = a.x > b.x || (a.x == b.x && (a.y > b.y || (a.y == b.y && ba > bb)));
  ivec2 lo = swp ? b : a, hi = swp ? a : b;
  uint bl = swp ? bb : ba, bh = swp ? ba : bb;
  uvec2 dd = uvec2(hi - lo + ivec2(32)) & 63u;
  vec3 h = rnd3(lo, uSeed ^ SALT_CREASE ^ (bl << 4u) ^ (bh << 8u) ^ (dd.x << 12u) ^ (dd.y << 18u));
  return h.x < uCreaseShare ? uRidgeH * h.y : 0.0;
}
struct Shard {
  ivec2 id; uint bits; vec2 cF;
  float d; vec2 e;
  int kind;
  int kC;
  ivec2 nid; vec2 cNb;
  uint nb;
  float H;
};
Shard shardAt(vec2 p) {
  Vor v = voronoiShards(p);
  Shard S;
  S.id = v.id; S.cF = v.cOwn; S.nid = v.nid; S.cNb = v.cNb;
  int nc = chordCount(v.id);
  uint bits = 0u; float dC = 1e9, sC = 1.0; vec2 nC = vec2(1.0, 0.0); int kC = 0;
  for (int k = 0; k < 3; ++k) {
    if (k >= nc) break;
    vec2 ck, nk; chordOf(v.id, k, v.cOwn, ck, nk);
    float s = dot(nk, p - ck);
    if (s > 0.0) bits |= 1u << uint(k);
    if (abs(s) < dC) { dC = abs(s); sC = s; nC = nk; kC = k; }
  }
  S.bits = bits; S.kC = kC;
  if (dC < v.dE) {
    S.kind = 1; S.d = dC; S.e = sC > 0.0 ? -nC : nC;
    S.nb = bits ^ (1u << uint(kC));
    S.H = creaseHeight(S.id, S.bits, S.id, S.nb);
  } else {
    S.kind = 0; S.d = v.dE; S.e = v.e;
    S.nb = chordBits(v.nid, v.cNb, p + v.dE * v.e);
    S.H = creaseHeight(S.id, S.bits, v.nid, S.nb);
  }
  return S;
}
Elem shardElem(ivec2 id, uint bits, vec2 cS, vec2 p, vec2 extraSlope, mat3 fF, float mottle) {
  uint salt = uSeed ^ (bits << 4u);
  vec3 a = rnd3(id, salt ^ SALT_A), b = rnd3(id, salt ^ SALT_B);
  float th = uOrientK > 0 ? (floor(a.x * float(uOrientK)) + 0.5) * PI / float(uOrientK) : a.x * PI;
  vec2 gc = vec2(cos(th), sin(th));
  vec3 gCard = gc.x * fF[0] + gc.y * fF[1];
  vec2 s = uShardTilt * gauss2(a.yz) + extraSlope;
  int f = min(int(b.x * 3.0), 2);
  Elem e;
  e.n = normalize(fF[2] - s.x * fF[0] - s.y * fF[1]);
  e.g = normalize(gCard - e.n * dot(gCard, e.n));
  e.invD = uInvDSet[f] * (1.0 + uChirp * (b.y - 0.5) * dot(p - cS, gc) / uShardSize);
  e.hNm = uDepthNm; e.nc = uNc; e.sigS = uSigS; e.tauF = 0.002; e.fanQ = uFanQ;
  e.sigTheta = 0.0; e.sigFrel = 0.0;
  e.iso2 = sq(0.44 * 0.55 / (uShardSize * 1000.0));
  e.w = clamp(clamp(uCoverage + 0.2 * (b.z - 0.5), 0.0, 1.0) * mottle, 0.0, 1.0);
  e.fam = float(f);
  return e;
}
void ghNode(int k, out float x, out float w) {
  if (uGhB >= 4) {
    const vec4 X4 = vec4(-2.3344142, -0.7419637, 0.7419637, 2.3344142);
    const vec4 W4 = vec4(0.0458758, 0.4541242, 0.4541242, 0.0458758);
    x = X4[k]; w = W4[k];
  } else {
    x = k == 0 ? -1.0 : 1.0; w = 0.5;
  }
}
Elem nodeElem(Shard S, int k, float sE, uint nb, vec2 p, mat3 fF, float mottle, out float wk, out bool own) {
  float xk; ghNode(k, xk, wk);
  float W = max(uRidgeW, 1e-6);
  float dk = S.d + xk * sE, ad = abs(dk), u = ad / W;
  float dh = u < 1.0 ? -4.0 * S.H * ad / (W * W) * (1.0 - u * u) : 0.0;
  own = dk >= 0.0;
  vec2 slope = dh * (own ? -S.e : S.e);
  if (own) return shardElem(S.id, S.bits, S.cF, p, slope, fF, mottle);
  return shardElem(S.kind == 1 ? S.id : S.nid, nb, S.kind == 1 ? S.cF : S.cNb, p, slope, fF, mottle);
}
vec3 shardMirror(GLight g, vec3 X, vec3 V, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, mat3 fF, float kTilt, float Ti, vec3 mir) {
#if RECT_LTC
  if (g.type == 2) return elemMirrorRect(g, X, V, e, ScCard, fF[0], fF[1], fF[2], kTilt, Ti, mir);
#endif
  return elemMirror(g, Lp, Vp, e, ScCard, fF[0], fF[1], Ti, mir);
}
vec3 shardOrders(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, mat3 fF, float Ti, vec4 eta) {
#if DEBUG_VIEW == 13
  if (g.type == 1) return elemOrdersRef(g, Lp, Vp, e, ScCard, fF[0], fF[1], Ti, eta);
#endif
  return elemOrders(g, Lp, Vp, e, ScCard, fF[0], fF[1], Ti, eta);
}
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 12
vec4 firstOrder(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec4(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho = length(vec2(qg, qt)), iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  float sgg = max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 1e-10);
  float stt = max(Sx[1][1] + iso2 + sq(rho * e.sigTheta) + sq(e.fanQ), 1e-10);
  float sgt = Sx[0][1], d = 1.0 / max(e.invD, 1e-6);
  float lam = d * abs(qg - (sgt / stt) * qt);
  float sigL = clamp(d * sqrt(max(sgg - sgt * sgt / stt, 1e-10)), 0.5, 512.0);
  return vec4(lam, sigL, exp(-0.5 * qt * qt / stt), sqrt(stt));
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
  vec2 qK;
  mat2 ScCard = keyKernels(X, V, T, B, fF[2], snK, qK) + snK * snK * SgB + SgC;
  float sig2 = SgB[0][0] + SgB[1][1] + SgC[0][0] + SgC[1][1];
  Print pr = printLayer(p, dUv);
  Wear wr = wearAt(p, F);
#if DEBUG_VIEW == 14
  pr.W = 0.0; pr.T2 = vec3(1.0); pr.onWhite = vec3(0.85); pr.silver = 0.0;
  wr.alphaAdd = 0.0; wr.gloss = 1.0; wr.mottle = 1.0; wr.dust = 0.0;
#endif
  Shard S = shardAt(p);
  float sE = sigmaAlong(F, S.e);
  bool edge = S.d <= max(uRidgeW, 0.0) + 3.0 * sE;
  int nGh = min(uGhB, 4);
  Elem eo = shardElem(S.id, S.bits, S.cF, p, vec2(0.0), fF, wr.mottle);
  vec3 Vp = refractIn(V, fF[2], uNc);
  float coIn = dot(fF[2], Vp);
  uvec4 nbits = uvec4(S.nb);
  if (edge && S.kind == 0) {
    for (int n = 0; n < nGh; ++n) {
      float xn, wn; ghNode(n, xn, wn);
      if (S.d + xn * sE < 0.0) nbits[n] = chordBits(S.nid, S.cNb, p - xn * sE * S.e);
    }
  }
#ifdef HOLO_RAW_VIEW
  vec3 raw = vec3(0.0);
#if DEBUG_VIEW == 1
  raw = vec3(dot(fF[2], T), dot(fF[2], B), dot(fF[2], N)) * 0.5 + 0.5;
#elif DEBUG_VIEW == 2
  raw = vec3(0.5 * (qK + 1.0), 0.0);
#elif DEBUG_VIEW == 3 || DEBUG_VIEW == 12
  GLight gd = lightSummary(uDebugLight, X, V, fF[0], fF[1], fF[2]);
  vec4 fo = firstOrder(gd, refractIn(gd.L, fF[2], uNc), Vp, eo, ScCard, fF[0], fF[1]);
#if DEBUG_VIEW == 3
  if (eo.w > 0.0 && fo.x >= 360.0 && fo.x <= 830.0) raw = vec3((fo.x - 350.0) / 500.0, fo.z, 0.25);
#else
  if (fo.x > 0.0) raw = vec3(fo.y / 100.0, fo.w / 0.2, 0.0);
#endif
#elif DEBUG_VIEW == 6
  raw = vec3(pr.W, (pr.T2.r + pr.T2.g + pr.T2.b) / 3.0, pr.silver);
#elif DEBUG_VIEW == 11
  raw = rnd3(S.id, uSeed ^ (S.bits << 4u) ^ SALT_DBG);
#endif
  gl_FragColor = vec4(clamp(raw, 0.0, 1.0), 1.0);
  return;
#endif
  vec3 Lc = vec3(0.0), Lpap = vec3(0.0), Lz = vec3(0.0), Lo = vec3(0.0), Ed = vec3(0.0);
#if DEBUG_VIEW != 14
  for (int k = 0; k < MAX_LIGHTS; ++k) {
    int i = uLightOrder[k];
    if (i < 0) break;
    GLight g = lightSummary(i, X, V, fF[0], fF[1], fF[2]);
    if (g.A <= 0.0) continue;
    float Ti = coatT(fC[2], g.L, V);
    vec3 Lp = refractIn(g.L, fF[2], uNc);
    float ciIn = dot(fF[2], Lp);
    vec3 P0 = specProject(vec4(1.0), g.spd);
    vec3 P1 = specProject(mirrorF1(uDepthNm, uNc, ciIn, coIn, uEtaMir[i]), g.spd);
    float kTilt = uNc * (ciIn + coIn) / max(dot(fF[2], g.L + V), 1e-3);
    vec3 ord = vec3(0.0), zer = vec3(0.0);
    if (edge && k < DISCRETE_LIGHTS) {
      for (int n = 0; n < nGh; ++n) {
        float wn; bool own;
        Elem en = nodeElem(S, n, sE, nbits[n], p, fF, wr.mottle, wn, own);
        ord += wn * shardOrders(g, Lp, Vp, en, ScCard, fF, Ti, etaOrdFor(i, en.fam));
        zer += wn * shardMirror(g, X, V, Lp, Vp, en, ScCard, fF, kTilt, Ti, mix(P0, P1, en.w));
      }
    } else {
      ord = shardOrders(g, Lp, Vp, eo, ScCard, fF, Ti, etaOrdFor(i, eo.fam));
      zer = shardMirror(g, X, V, Lp, Vp, eo, ScCard, fF, kTilt, Ti, mix(P0, P1, eo.w));
    }
    Lc += coatDirect(g, X, V, fC[2], uCoatAlpha + wr.alphaAdd, wr.gloss, sig2);
    if (k < DISCRETE_LIGHTS) Lc += scratchLobe(g, V, fC, p, F, ScCard);
    Lpap += pr.W * pr.onWhite * (g.rad * g.A / PI) * g.rgb;
    Lz += zer;
    Lo += ord;
    Ed += g.rad * g.A * g.rgb;
  }
#endif
  vec3 Ee = envIrradiance(fC[2]);
  Lc += coatEnv(V, fC[2], sqrt(sq(uCoatAlpha + wr.alphaAdd) + sig2), wr.gloss);
  Lpap += pr.W * pr.onWhite * Ee / PI;
  vec3 P0e = specProject(vec4(1.0), 0);
  vec3 P1e = specProject(mirrorF1(uDepthNm, uNc, coIn, coIn, uEtaEnv), 0);
  if (edge) {
    float wOwn = 0.0;
    for (int n = 0; n < nGh; ++n) {
      float wn; bool own;
      Elem en = nodeElem(S, n, sE, nbits[n], p, fF, wr.mottle, wn, own);
      Lz += wn * envMirror(V, Vp, en, fF[2], ScCard, mix(P0e, P1e, en.w));
      if (own) wOwn += wn;
    }
#if NB > 0
    if (wOwn > 0.0) Lo += wOwn * envDiffraction(V, eo, ScCard, fF[0], fF[1]);
    if (wOwn < 1.0) {
      Elem eNb = shardElem(S.kind == 1 ? S.id : S.nid, S.nb, S.kind == 1 ? S.cF : S.cNb, p, vec2(0.0), fF, wr.mottle);
      Lo += (1.0 - wOwn) * envDiffraction(V, eNb, ScCard, fF[0], fF[1]);
    }
#endif
  } else {
    Lz += envMirror(V, Vp, eo, fF[2], ScCard, mix(P0e, P1e, eo.w));
#if NB > 0
    Lo += envDiffraction(V, eo, ScCard, fF[0], fF[1]);
#endif
  }
  vec3 tint = (1.0 - pr.W) * pr.T2;
  vec3 L = mix(Lc + Lpap + tint * (Lz + Lo), dustRadiance(Ed + Ee, V, fC[2]), wr.dust);
#if DEBUG_VIEW == 7
  L = (1.0 - wr.dust) * Lc;
#elif DEBUG_VIEW == 8
  L = (1.0 - wr.dust) * (Lpap + tint * (Lz + Lo));
#elif DEBUG_VIEW == 9
  L = (1.0 - wr.dust) * tint * Lz;
#elif DEBUG_VIEW == 10
  L = (1.0 - wr.dust) * tint * Lo;
#endif
#ifdef HOLO_LDR
  L = gamutMapLuma(L, LUMA_SRGB);
#endif
  gl_FragColor = encodeCard(L);
}
`})))()}var s,c,l,u,d,f,p,m;function h(){return(h=e((()=>{o(),n(),s={type:`longpass`,edgeNm:500,widthNm:70,floor:.25},c=(e,t,n)=>Math.min(Math.max(e,t),n),l=(e,t,n)=>Math.max(r(e,t,n),1),u=e=>[l(e,`shatter.pitchA`,1150),l(e,`shatter.pitchB`,1080),l(e,`shatter.pitchC`,870)],d=e=>c(Math.round(r(e,`shatter.orientK`,0)),0,64),f=e=>Math.max(r(e,`shatter.depth`,95),0),p=e=>Math.max(r(e,`shatter.nc`,1.5),1.0001),m={id:`shatter`,fragmentMain:a,extraChunks:[],uniforms(e){let[t,n,a]=u(e);return{uShardSize:Math.max(r(e,`shatter.size`,2.5),.05),uShardJit:c(r(e,`shatter.jitter`,.9),0,1),uChords:c(r(e,`shatter.chords`,1.8),0,3),uOrientK:d(e),uShardTilt:Math.tan(c(r(e,`shatter.tilt`,1),0,45)*i),uFanQ:Math.max(r(e,`shatter.fan`,5),0)*i,uInvDSet:[1/t,1/n,1/a],uDepthNm:f(e),uCoverage:c(r(e,`shatter.coverage`,.7),0,1),uChirp:Math.max(r(e,`shatter.chirp`,0),0)/100,uRidgeH:r(e,`shatter.ridgeH`,.3)*.001,uRidgeW:Math.max(r(e,`shatter.ridgeW`,40),.001)*.001,uCreaseShare:c(r(e,`shatter.creaseShare`,50),0,100)/100,uNc:p(e),uSigS:Math.max(r(e,`shatter.roughness`,.45),0)*i,uCoatAlpha:c(r(e,`shatter.coatAlpha`,.05),.001,1),uSeed:Math.max(Math.round(r(e,`shatter.seed`,7)),0)>>>0}},defines(){return{}},gratingSummary(e){return{pitchesNm:u(e),depthNm:f(e),nc:p(e),gAzimuthRad:d(e)===1?Math.PI/2:null,recycle:!0,tint:t(e,`shatter`,s)}},relief(e){return{seed:Math.max(Math.round(r(e,`shatter.seed`,7)),0),wavinessDeg:Math.max(r(e,`shatter.waviness`,.3),0),orangePeelUm:Math.max(r(e,`shatter.orangePeel`,.6),0)}}}})))()}h();export{m as shatter};