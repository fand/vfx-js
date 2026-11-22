var e=`#define FLAKE_JITTER 0.08
#define GLITTER_MAX_LAYERS 3
uniform float uFlakeD, uCell, uFlakeArea, uVisFrac, uTiltRMS, uTauF, uCoverage, uDepthNm, uNc, uStarD, uStarOcc;
uniform int   uShape, uLayers;
uniform vec2  uInvDRange;
uniform uint  uSeed;
const uint GLITTER_STAR_SALT = 0x700u;
mat2 glitterAxes(int layer) {
  if (layer == 1) return mat2(0.79863551, 0.60181502, -0.60181502, 0.79863551);
  if (layer == 2) return mat2(0.32556815, 0.94551858, -0.94551858, 0.32556815);
  if (layer < 0)  return mat2(0.94551858, 0.32556815, -0.32556815, 0.94551858);
  return mat2(1.0);
}
vec2 glitterOffset(int layer) { return layer < 0 ? vec2(0.597, 0.333) : vec2(0.371, 0.619) * float(layer); }
struct Flake {
  vec2  c;
  float rot;
  vec2  s;
  vec2  gCard;
  float invD;
  float rr;
  float h;
};
Flake makeFlake(ivec2 cell, ivec2 hc, uint salt, mat2 G, vec2 o, float tiltRMS) {
  vec3 a = rnd3(hc, salt), b = rnd3(hc, salt ^ 0x9E3779B9u), e = rnd3(hc, salt ^ 0x85EBCA6Bu);
  Flake f;
  f.c = G * (vec2(cell) + 0.5 + FLAKE_JITTER * (a.xy - 0.5) - o);
  f.rot = a.z * TAU;
  f.s = tiltRMS * gauss2(b.xy);
  float th = b.z * PI;
  f.gCard = vec2(cos(th), sin(th));
  f.invD = mix(uInvDRange.x, uInvDRange.y, e.x);
  f.rr = e.y;
  f.h = e.z;
  return f;
}
float glitterSd(vec2 p, float D, int shape) {
  if (shape == 0) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    float r = 0.5 * D;
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
  }
  if (shape == 1) { vec2 q = abs(p) - 0.5 * D; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
  return length(p) - 0.5 * D;
}
float sdFlake(vec2 p, float D) { return glitterSd(p, D, uShape); }
struct CovK { mat2 SI; float nrm; float kSz; };
CovK glitterCovK(Footprint F, float D, float area) {
  mat2 Sb = F.S + mat2(D * D / 16.0);
  CovK k;
  k.SI = inverse(Sb);
  k.nrm = area / (TAU * sqrt(max(determinant(Sb), 1e-30)));
  k.kSz = smoothstep(0.5, 2.0, 0.5 * D / max(F.sMin, 1e-9));
  return k;
}
float glitterCoverage(CovK k, Footprint F, vec2 dl, float sd) {
  float cPt = min(k.nrm * exp(-0.5 * dot(dl, k.SI * dl)), 1.0);
  float l = length(dl);
  float sN = sigmaAlong(F, l > 1e-9 ? dl / l : F.eMaj);
  float cSd = clamp(0.5 - sd / (2.5 * sN), 0.0, 1.0);
  return mix(cPt, cSd, k.kSz);
}
float glitterIso2(float Dmm) { return sq(0.242 / max(Dmm * 1000.0, 1.0)); }
float glitterFam(float invD) {
  float r = uInvDRange.y - uInvDRange.x;
  return r > 1e-12 ? clamp(2.0 * (uInvDRange.y - invD) / r, 0.0, 2.0) : 1.0;
}
Elem glitterElem(vec2 s, vec2 gCard, float invD, float Dmm, mat3 fF, float w) {
  Elem e;
  e.n = normalize(fF[2] - s.x * fF[0] - s.y * fF[1]);
  vec3 g0 = gCard.x * fF[0] + gCard.y * fF[1];
  e.g = normalize(g0 - e.n * dot(g0, e.n));
  e.invD = invD; e.hNm = uDepthNm; e.nc = uNc;
  e.sigS = 0.0; e.tauF = uTauF; e.fanQ = 0.0; e.sigTheta = 0.0; e.sigFrel = 0.0;
  e.iso2 = glitterIso2(Dmm);
  e.w = w;
  e.fam = glitterFam(invD);
  return e;
}
Elem starElem(vec2 p, vec2 cStar, vec2 s, float Dmm, mat3 fF, Footprint F, float w) {
  vec2 r = p - cStar;
  float rl = length(r);
  Elem e = glitterElem(s, rl > 0.02 ? r / rl : vec2(1.0, 0.0), 0.5 * (uInvDRange.x + uInvDRange.y), Dmm, fF, w);
  e.fam = 1.0;
  e.sigTheta = sqrt(0.5 * (F.S[0][0] + F.S[1][1])) / max(rl, 0.02);
  return e;
}
struct FLight {
  int   slot;
  int   spd;
  float radA;
  mat2  S;
  vec3  Lp;
  float Tc;
  vec3  mir;
  float lmin;
  float ltr;
  vec3  ring;
};
FLight flightNone() {
  FLight l;
  l.slot = 0; l.spd = 0; l.radA = 0.0; l.S = mat2(1e-8); l.Lp = vec3(0.0, 0.0, 1.0); l.Tc = 0.0;
  l.mir = vec3(0.0); l.lmin = 0.0; l.ltr = 0.0; l.ring = vec3(0.0);
  return l;
}
FLight flightMake(int slot, GLight g, vec3 Lp, float Tc, vec3 mir, mat2 ScCard) {
  FLight l;
  l.slot = slot; l.spd = g.spd; l.radA = g.A > 0.0 ? g.rad * g.A : 0.0; l.S = g.S; l.Lp = Lp; l.Tc = Tc; l.mir = mir;
  l.ring = vec3(0.0);
  mat2 St = ScCard + g.S;
  float m = 0.5 * (St[0][0] + St[1][1]), d = 0.5 * (St[0][0] - St[1][1]);
  l.lmin = max(m - sqrt(d * d + St[0][1] * St[0][1]), 0.0);
  l.ltr = 2.0 * m;
  return l;
}
GLight flightG(FLight l) {
  GLight g;
  g.type = 1; g.spd = l.spd; g.rad = l.radA; g.A = l.radA > 0.0 ? 1.0 : 0.0; g.rAng = 0.0;
  g.L = l.Lp; g.rgb = vec3(1.0); g.S = l.S; g.C = vec2(0.0); g.nP = 0;
  for (int k = 0; k < 4; ++k) g.c[k] = vec3(0.0);
  for (int k = 0; k < 5; ++k) g.P[k] = vec2(0.0);
  return g;
}
vec3 glitterOrders(FLight l, vec3 Vp, Elem e, mat2 ScCard, mat3 fF) {
  vec3 H = e.nc * (l.Lp + Vp), t = cross(e.n, e.g);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  float lb = 0.9 * l.lmin + sq(sn * e.tauF) + e.iso2 + sq(length(vec2(qg, qt)) * e.sigTheta) + 1e-10;
  if (qt * qt > 36.0 * lb) return vec3(0.0);
#if DEBUG_VIEW == 13
  return elemOrdersRef(flightG(l), l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, etaOrdFor(l.slot, e.fam));
#else
  return elemOrders(flightG(l), l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, etaOrdFor(l.slot, e.fam));
#endif
}
vec3 glitterMirror(FLight l, vec3 Vp, Elem e, mat2 ScCard, mat3 fF) {
  vec3 H = e.nc * (l.Lp + Vp), t = cross(e.n, e.g);
  vec2 q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  float ub = 1.1 * l.ltr + 2.0 * (sq(sn * e.tauF) + e.iso2) + 1e-10;
  if (dot(q, q) > 36.0 * ub) return vec3(0.0);
  return elemMirror(flightG(l), l.Lp, Vp, e, ScCard, fF[0], fF[1], l.Tc, l.mir);
}
struct GlitterA {
  vec3  ord;
  vec3  mir;
  vec3  env;
  float kept;
  float cover;
  float coverS;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
  Elem  dom;
  float domW;
  vec3  domId;
#endif
};
GlitterA glitterA(vec2 p, Footprint F, mat3 fF, vec3 V, vec3 Vp, mat2 ScCard, FLight fl[DISCRETE_LIGHTS],
                  float keepA, float w, vec3 mirEnv) {
  GlitterA o;
  o.ord = vec3(0.0); o.mir = vec3(0.0); o.env = vec3(0.0); o.kept = 0.0; o.cover = 0.0; o.coverS = 0.0;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
  o.dom = glitterElem(vec2(0.0), vec2(1.0, 0.0), uInvDRange.x, uFlakeD, fF, 0.0); o.domW = 0.0; o.domId = vec3(0.0);
#endif
  float sP = sqrt(0.5 * (F.S[0][0] + F.S[1][1]));
  CovK kF = glitterCovK(F, uFlakeD, uFlakeArea);
  for (int lay = -1; lay < HOLO_NOUNROLL(GLITTER_MAX_LAYERS); ++lay) {
    if (lay >= uLayers || 1.0 - o.cover < 0.02) break;
    bool star = lay < 0;
    if (star && uStarOcc <= 0.0) continue;
    if (!star && keepA <= 0.0) break;
    float cellMm = star ? 1.25 * uStarD : uCell;
    Lattice La = latticeOf(glitterAxes(lay), cellMm);
    vec2  off = glitterOffset(lay);
    uint  salt = uSeed ^ (star ? GLITTER_STAR_SALT : (uint(lay) << 8));
    vec2  u = La.Gi * p + off;
    int   R = star ? (sP > 0.14 * cellMm ? 1 : 0) : ((uFlakeR > 0 && sP > 0.2 * cellMm) ? 1 : 0);
    ivec2 c0 = R == 0 ? ivec2(floor(u - 0.5)) : ivec2(floor(u)) - 1;
    int   nC = 2 + R;
    float vis = 1.0 - o.cover;
    vec3  lo = vec3(0.0), lm = vec3(0.0), le = vec3(0.0);
    float lw = 0.0, lc = 0.0;
    for (int j = 0; j < nC; ++j) for (int i = 0; i < nC; ++i) {
      ivec2 cell = c0 + ivec2(i, j);
      Flake f = makeFlake(cell, latticeCell(La, cell), salt, La.G, off, star ? 0.5 * uTiltRMS : uTiltRMS);
      float D = uFlakeD, keep = 1.0;
      if (star) {
        if (f.rr >= uStarOcc) continue;
        D = uStarD * (0.6 + 0.8 * f.h);
      } else {
        keep = smoothstep(max(0.0, f.rr - 0.1), min(1.0, f.rr + 0.1), keepA);
      }
      vec2 dl = p - f.c;
      if (dot(dl, dl) > sq(D + 4.0 * F.sMaj)) continue;
      float cr = cos(f.rot), sr = sin(f.rot);
      vec2  pl = vec2(cr * dl.x + sr * dl.y, -sr * dl.x + cr * dl.y);
      float c = star ? glitterCoverage(glitterCovK(F, D, 0.78539816 * D * D), F, dl, glitterSd(pl, D, 2))
                     : glitterCoverage(kF, F, dl, sdFlake(pl, D));
      if (c < 1e-4) continue;
      lc += c;
      float om = keep * c;
      if (om <= 0.0) continue;
      Elem e;
      if (star) e = starElem(p, f.c, f.s, D, fF, F, w); else e = glitterElem(f.s, f.gCard, f.invD, D, fF, w);
      vec3 eo = vec3(0.0), em = vec3(0.0);
      for (int k = 0; k < DISCRETE_LIGHTS; ++k) {
        if (fl[k].radA <= 0.0) continue;
        eo += glitterOrders(fl[k], Vp, e, ScCard, fF);
        em += glitterMirror(fl[k], Vp, e, ScCard, fF);
      }
      lo += om * eo; lm += om * em;
#if FLAKE_ENV
      le += om * envMirror(V, Vp, e, fF[2], ScCard, mirEnv);
#endif
      lw += om;
#if DEBUG_VIEW == 3 || DEBUG_VIEW == 11 || DEBUG_VIEW == 12
      if (om * vis > o.domW) { o.domW = om * vis; o.dom = e; o.domId = vec3(f.rr, f.h, fract(f.rot / TAU + 0.37 * f.invD / uInvDRange.y)); }
#endif
    }
    float nrm = vis / max(lc, 1.0);
    o.ord += nrm * lo; o.mir += nrm * lm; o.env += nrm * le; o.kept += nrm * lw;
    o.cover += vis * min(lc, 1.0);
    if (star) o.coverS = o.cover;
  }
  return o;
}
void glitterMeanField(FLight l, vec3 Vp, mat3 fF, mat2 ScCard, float w, out vec3 mo, out vec3 mm) {
  mo = vec3(0.0); mm = vec3(0.0);
  if (l.radA <= 0.0) return;
  GLight g = flightG(l);
  float sP = dot(uNc * (l.Lp + Vp), fF[2]);
  float sigQ = sqrt(0.5 * (ScCard[0][0] + ScCard[1][1]) + sq(sP * uTauF) + glitterIso2(uFlakeD));
  float invDm = 0.5 * (uInvDRange.x + uInvDRange.y);
  float sigF = (uInvDRange.y - uInvDRange.x) / (1.7320508 * max(uInvDRange.x + uInvDRange.y, 1e-12));
  mo = w * ringKernel(g, l.Lp, Vp, fF[2], fF[0], fF[1], invDm, sigF, sigQ, uDepthNm, uNc, uTiltRMS, l.Tc,
                      etaOrdFor(l.slot, 1.0));
  mm = mirrorMeanField(g, l.Lp, Vp, fF[2], fF[0], fF[1], uNc, sigQ, uTiltRMS, l.Tc, l.mir);
}
vec3 glitterEnvMean(vec3 V, vec3 Vp, mat3 fF, mat2 ScCard, vec3 mirEnv, float w) {
  Elem e = glitterElem(vec2(0.0), vec2(1.0, 0.0), 0.5 * (uInvDRange.x + uInvDRange.y), uFlakeD, fF, w);
  e.tauF = sqrt(sq(uTauF) + sq(uTiltRMS));
  return envMirror(V, Vp, e, fF[2], ScCard, mirEnv);
}
float glitterWindow(float lo, float hi, float s) {
  s = max(s, 1e-6);
  float f = 0.0;
  for (int k = -1; k <= 1; ++k) {
    float o = float(k) * PI;
    f += gaussCdf((hi + o) / s) - gaussCdf((o - lo) / s);
  }
  return clamp(max(f, (lo + hi) / PI), 0.0, 1.0);
}
vec3 glitterB(FLight l, vec3 Vp, mat3 fF, vec2 p, Footprint F, mat2 ScCard, float wB, float w, float cF) {
  if (l.radA <= 0.0 || wB <= 0.0) return vec3(0.0);
  vec3  H = uNc * (l.Lp + Vp);
  vec2  q = vec2(dot(H, fF[0]), dot(H, fF[1]));
  float rho = length(q), sP = dot(H, fF[2]);
  vec2  ePerp = rho > 1e-6 ? vec2(-q.y, q.x) / rho : vec2(0.0, 1.0);
  float st2 = sq(sP * uTauF) + 0.5 * (l.S[0][0] + l.S[1][1]) + dot(ePerp, ScCard * ePerp) + glitterIso2(uFlakeD);
  float sTh = sqrt(st2 + sq(sP * uTiltRMS)) / max(rho, 1e-4);
  float psi = atan(q.y, q.x);
  if (psi < 0.0) psi += PI;
  if (psi >= PI) psi -= PI;
  CovK kB = glitterCovK(F, uFlakeD, uFlakeArea);
  bool cells3 = uBCells >= 3;
  float lodF = max(0.0, log2((cells3 ? 6.0 : 8.0) * F.sMaj / uCell));
  float l0 = floor(lodF), wHi = lodF - l0;
  int   nLev = clamp(uBLevels, 1, 2);
  float levA = l0, wA = 1.0 - wHi, wHiB = wHi;
  if (nLev == 1) {
    Lattice Lc = latticeOf(mat2(1.0), uCell * exp2(l0 + 1.0));
    levA = rnd3(latticeCell(Lc, ivec2(floor(Lc.Gi * p))), uSeed ^ 0x5EED0000u ^ (uint(l0) << 26)).x < wHi ? l0 + 1.0 : l0;
    wA = 1.0;
  }
  vec3 acc = vec3(0.0);
  for (int kl = 0; kl < nLev; ++kl) {
    float lev = levA + float(kl), wLev = wB * (kl == 0 ? wA : wHiB);
    if (wLev <= 0.0) continue;
    float cellL = uCell * exp2(lev);
    Lattice Lb = latticeOf(mat2(1.0), cellL);
    int   nTh = uLayers << (2 * int(lev));
    float binW = PI / float(nTh);
    int   K = min(uBBins, nTh);
    float uA = psi / binW;
    int   a0 = int(floor(uA + 0.5 - 0.5 * float(K)));
    int   nCell = cells3 ? 3 : 2;
    vec2  ub = Lb.Gi * p;
    ivec2 c0 = cells3 ? ivec2(floor(ub)) - 1 : ivec2(floor(ub - 0.5));
    for (int j = 0; j < nCell; ++j) for (int i = 0; i < nCell; ++i) {
     ivec2 cell = c0 + ivec2(i, j), hc = latticeCell(Lb, cell);
     for (int b = 0; b < K; ++b) {
      int   a = (a0 + b + nTh) % nTh;
      uint  salt = uSeed ^ (uint(lev) << 26) ^ (uint(a) * 2654435761u);
      vec3  r0 = rnd3(hc, salt);
      float keep = smoothstep(max(0.0, r0.z - 0.1), min(1.0, r0.z + 0.1), wLev);
      if (keep <= 0.0) continue;
      vec2  dx = Lb.G * (vec2(cell) + r0.xy) - p;
      float ws = kB.nrm * exp(-0.5 * dot(dx, kB.SI * dx));
      if (ws < 1e-7) continue;
      vec3  r1 = rnd3(hc, salt ^ 0x68E31DA4u), r2 = rnd3(hc, salt ^ 0xB5297A4Du);
      float th = (float(a) + r1.x) * binW;
      Elem  e = glitterElem(uTiltRMS * gauss2(r1.yz), vec2(cos(th), sin(th)), mix(uInvDRange.x, uInvDRange.y, r2.x),
                            uFlakeD, fF, w);
      acc += keep * ws * uVisFrac * glitterOrders(l, Vp, e, ScCard, fF);
     }
    }
    float frac = 1.0;
    if (K < nTh) frac = glitterWindow((uA - float(a0)) * binW, (float(a0 + K) - uA) * binW, sTh);
    acc += wLev * (1.0 - frac) * cF * l.ring;
  }
  return acc;
}
float gatedBinomial(float N, float p, vec3 u) {
  if (N < 1.0 || p <= 0.0) return 0.0;
  if (u.x >= 1.0 - pow(1.0 - min(p, 1.0), N)) return 0.0;
  float mu = (N - 1.0) * p, sg = sqrt(max(mu * (1.0 - p), 0.0));
  return 1.0 + max(0.0, floor(mu + sg * gauss2(u.yz).x + 0.5));
}
`;export{e as t};