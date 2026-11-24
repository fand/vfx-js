import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{A as t,B as n,F as r,H as i,I as a,L as o,R as s,U as c,V as l,g as u,h as d,j as f,k as p,m,o as h}from"./utils-BD-Y7rvP.js";import{n as g,t as _}from"./logo-640w-20p-22Elz6NL.js";import{c as v,o as y,s as b}from"./_bloom-common-C9FLKm3C.js";import{a as x,c as S,d as C,i as ee,l as te,n as ne,o as re,r as ie,s as w,t as T,u as E}from"./_scene3d-BzU3S94a.js";import{n as ae,r as oe,t as se}from"./_simplex3--pabs44y.js";import"./preset-DFGAZ5Mi.js";import{n as ce,t as le}from"./amagi-rvGYqYQ3.js";import{n as ue,t as de}from"./jellyfish-DtC6VyHr.js";import{n as D,t as fe}from"./pigeon-Dic8r3mQ.js";import{i as pe,n as me,r as he,t as ge}from"./robot-DYF1cG3Q.js";function _e(e){let t=W.get(e);return t||(t=U(e),W.set(e,t)),t}function O(e){return Number.isFinite(e)&&Math.abs(e)>1e-6}function ve(e){e.sdf=G,e.spawn=G,e.relief=G}function k(e){return Math.sqrt((2+e*e+e*Math.sqrt(e*e+4))/2)}var A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K;function q(){return(q=e((()=>{c(),y(),te(),o(),n(),oe(),t(),A={sourceChannel:`alpha`,depth:.2,bevel:.03,bevelShape:`round`,bulge:0,bulgeWidth:.15,relief:0,reliefBlur:.006,ior:1.5,dispersion:.12,paths:2,samples:8,bounces:2,jitter:0,tint:`#ffffff`,absorption:0,reflection:1,bump:0,bumpScale:.15,frost:0,backdrop:`stripes`,backdropVisible:!1,backdropScale:.25,backdropDistance:.6,backdropSpeed:.15,backdropColors:`mono`,backdropRatio:.5,backdropSoftness:.03,lightIntensity:1.5,lightSoftness:.15,yaw:29,pitch:14,orbitAnimation:20,orbitSpeed:3.3,fov:30,zoom:.7,drag:!1,cameraOrigin:`element`,pointer:`none`,pointerStrength:1,resolution:1,antialias:!0,pad:100,debug:`off`},j={off:0,outer:1,inner:2,total:3},M={round:0,chamfer:1},N=4,P=16,F=5,I=`0.6`,L=1024,R=256,z=4,B=3,V=3,H=256,U=e=>`#version 300 es
#define BACKDROP_KIND ${e}
precision highp float;
in vec2 uv;
out vec4 outColor;

${s}

uniform int bevelShape;
uniform float bulge;
uniform float bulgeWidth;
// 1 / the Lipschitz constant of the bulged field, 1 without a bulge: the
// march steps are scaled by it so they cannot step through the caps.
uniform float stepScale;
// Relief of the front cap: \`relief\` times the height map in reliefTex
// (r = height 0..1, gb = its gradient in world units), on the SDF's grid.
uniform sampler2D reliefTex;
uniform float relief;
// The relief's share of the Lipschitz bound, <= 1: steps that may meet
// the relief are scaled by it on top of stepScale.
uniform float reliefScale;

// The extrusion of a 2D sample s (from sd2) at depth z, with a bevel and
// caps that rise by up to \`bulge\` away from the edge. hr is the relief
// sample (height, gradient) under it, only read when relief != 0.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, vec3 hr, float z) {
    float sz = z >= 0.0 ? 1.0 : -1.0;
    // The cap: b = |z| - height, and its gradient (k * grad2, sz).
    float h = halfDepth;
    float k = 0.0;
    if (bulge > 0.0) {
        // f(u) = 1 - (1 - u)^2: steepest at the edge, flat in the middle.
        float u = clamp(-s.x / bulgeWidth, 0.0, 1.0);
        h += bulge * (1.0 - (1.0 - u) * (1.0 - u));
        k = u > 0.0 && u < 1.0 ? 2.0 * bulge * (1.0 - u) / bulgeWidth : 0.0;
    }
    float b = abs(z) - h;
    vec3 gb = vec3(s.yz * k, sz);
    bool tilted = k > 0.0;
    if (relief != 0.0) {
        // Only the front cap carries the relief; the nearer cap wins.
        float bf = z - h - relief * hr.x;
        float bb = -z - h;
        b = max(bf, bb);
        gb = bf >= bb
            ? vec3(s.yz * k - relief * hr.yz, 1.0)
            : vec3(s.yz * k, -1.0);
        tilted = true;
    }
    if (bevelShape == 1) {
        // Chamfer: a 45° plane across the corner. Hard edges on purpose.
        float c = (s.x + b + rounding) * 0.7071;
        if (c > s.x && c > b) {
            return vec4(c, normalize(vec3(s.yz, 0.0) + gb));
        }
        if (s.x > b) {
            return vec4(s.x, s.yz, 0.0);
        }
        return vec4(b, tilted ? normalize(gb) : gb);
    }
    vec2 w = vec2(s.x + rounding, b + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        vec3 g = vec3(s.yz * w.x, 0.0) + gb * w.y;
        return vec4(l - rounding, tilted ? normalize(g) : g / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, tilted ? normalize(gb) : gb);
}

vec3 reliefAt(vec2 p) {
    return texture(reliefTex, (p - sdfRect.xy) / sdfRect.zw).rgb;
}

vec4 sdf3(vec3 p) {
    vec3 s = sd2(p.xy);
    if (relief == 0.0) {
        return extrude(s, vec3(0.0), p.z);
    }
    vec4 e = extrude(s, reliefAt(p.xy), p.z);
    // Steep relief needs short steps, but only near it. Two lower bounds
    // on the distance: the field scaled by the relief's Lipschitz share,
    // and the distance to the shape with the cap at its outermost plane
    // (outside) or innermost plane (inside), which has no relief slope.
    // The larger one is safe; far from the relief it is the plane's.
    bool out_ = e.x > 0.0;
    float hEnv = out_ == (relief > 0.0) ? 1.0 : 0.0;
    float env = extrude(s, vec3(hEnv, 0.0, 0.0), p.z).x;
    e.x = out_ ? max(env, e.x * reliefScale) : min(env, e.x * reliefScale);
    return e;
}

uniform vec2 sdfSize;
uniform vec2 shapeHalf;
// The camera (see _orbit-camera.ts): the eye in view space is
// (eye, camDist), and its axis meets the output at principalPx.
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 eye;
uniform vec2 principalPx;
uniform vec2 bufferPx;
// Size of a pixel of the target, in output px.
uniform float pixelSize;

uniform float ior;
uniform float dispersion;
uniform int paths;
uniform int samples;
uniform int exits;
uniform float jitter;
uniform vec3 tint;
uniform float absorption;
uniform float reflection;
uniform float bump;
uniform float bumpScale;
uniform float frost;

uniform int debugView;

const int MAX_PATHS = ${N};
const int MAX_SAMPLES = ${P};
// Tries to leave the glass: one more than the reflections.
const int MAX_EXITS = 6;
const int OUTER_STEPS = 72;
const int INNER_STEPS = 40;
const float HIT = 0.0012;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

${se}
${ae}
${ie}

// Unpolarised Fresnel reflectance, from a medium of index n1 into n2.
float fresnel(float cosI, float n1, float n2) {
    float e = n1 / n2;
    float sinT2 = e * e * (1.0 - cosI * cosI);
    if (sinT2 >= 1.0) {
        return 1.0;
    }
    float cosT = sqrt(1.0 - sinT2);
    float rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
    float rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
    return 0.5 * (rs * rs + rp * rp);
}

// RGB response at position t of the spectrum (0 red, 1 violet): three
// triangles, so that 3 samples are exactly red, green and blue.
vec3 spectral(float t) {
    return max(1.0 - abs(t - vec3(1.0, 3.0, 5.0) / 6.0) * 3.0, 0.0);
}

// A bicubic (B-spline) filtered lookup of a texture on the SDF's grid,
// in 4 bilinear taps. Stored gradients are only piecewise linear between
// texels, which shows as streaks once they bend light; these are smooth.
vec4 bicubic(sampler2D tex, vec2 uv) {
    vec2 st = uv * sdfSize - 0.5;
    vec2 i = floor(st);
    vec2 f = st - i;
    vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0;
    vec2 w1 = (4.0 - 6.0 * f * f + 3.0 * f * f * f) / 6.0;
    vec2 w2 = (1.0 + 3.0 * f + 3.0 * f * f - 3.0 * f * f * f) / 6.0;
    vec2 w3 = f * f * f / 6.0;
    vec2 g0 = w0 + w1;
    vec2 g1 = w2 + w3;
    vec2 h0 = (i - 0.5 + w1 / g0) / sdfSize;
    vec2 h1 = (i + 1.5 + w3 / g1) / sdfSize;
    return (texture(tex, vec2(h0.x, h0.y)) * g0.x
            + texture(tex, vec2(h1.x, h0.y)) * g1.x) * g0.y
        + (texture(tex, vec2(h0.x, h1.y)) * g0.x
            + texture(tex, vec2(h1.x, h1.y)) * g1.x) * g1.y;
}

// sd2, bicubic filtered.
vec3 sd2Smooth(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
        return sd2(p);
    }
    vec4 s = bicubic(sdfTex, uv);
    float gl = length(s.gb);
    return vec3(s.r, gl > 1e-5 ? s.gb / gl : vec2(0.0, 1.0));
}

// The surface normal at p, for a ray along d that meets it there.
vec3 normalAt(vec3 p, vec3 d) {
    vec3 hr = relief != 0.0
        ? bicubic(reliefTex, (p.xy - sdfRect.xy) / sdfRect.zw).rgb
        : vec3(0.0);
    vec3 n = extrude(sd2Smooth(p.xy), hr, p.z).yzw;
    if (bump <= 0.0) {
        return n;
    }
    // Ripples: tilt the normal against the tangential part of a noise
    // gradient. The noise is in object space, so it sticks to the shape.
    vec3 g = snoiseD(p / bumpScale).xyz * ${I};
    g -= n * dot(g, n);
    // Saturate the slope, so the tilt stays under 45°. Refraction
    // through two rippled faces magnifies the tilt a lot, so the strength
    // goes as bump^2 to leave room for subtle ripples.
    vec3 m = normalize(n - g * (bump * bump / sqrt(1.0 + dot(g, g))));
    // At grazing angles the tilt can turn the normal past the ray, which
    // would refract it to the wrong side: keep the side of n.
    float s = dot(d, n) < 0.0 ? -1.0 : 1.0;
    float lim = min(abs(dot(d, n)), 0.1);
    float c = dot(d, m) * s;
    if (c < lim) {
        m = normalize(m + d * (s * (lim - c)));
    }
    return m;
}

${ne}
// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit(vec3 ro, vec3 rd) {
    vec3 b = vec3(shapeHalf + 0.01, halfDepth + bulge + max(relief, 0.0) + 0.01);
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-b - ro) * inv;
    vec3 t1 = (b - ro) * inv;
    vec3 lo = min(t0, t1);
    vec3 hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

// The glass seen along rd at surface point p0: the reflection on the
// outside, plus the light that comes back out of the inside.
vec3 shade(vec3 p0, vec3 rd, inout float innerCount) {
    vec3 n0 = normalAt(p0, rd);
    float cos0 = clamp(-dot(rd, n0), 0.0, 1.0);

    // Reflection on the outer surface.
    float f0 = fresnel(cos0, 1.0, ior);
    vec3 col = radiance(viewRot * p0, viewRot * reflect(rd, n0), frost)
        * f0 * reflection;

    // Trace the inside once per path, each with its own IOR.
    vec3 exPos[MAX_PATHS];
    vec3 exDir[MAX_PATHS];
    float exLen[MAX_PATHS];
    float exW[MAX_PATHS];
    int exN[MAX_PATHS];
    int nPaths = clamp(paths, 1, MAX_PATHS);
    int nExits = clamp(exits, 1, MAX_EXITS);
    for (int m = 0; m < MAX_PATHS; m++) {
        if (m >= nPaths) {
            break;
        }
        float n = ior + dispersion * ((float(m) + 0.5) / float(nPaths) - 0.5);
        n = max(n, 1.0001);
        vec3 d = refract(rd, n0, 1.0 / n);
        vec3 p = p0 - n0 * (HIT * 3.0);
        float w = 1.0 - fresnel(cos0, 1.0, n);
        float len = 0.0;
        int nb = 0;
        for (int b = 0; b < MAX_EXITS; b++) {
            float ti = 0.0;
            vec4 si;
            for (int i = 0; i < INNER_STEPS; i++) {
                si = sdf3(p + d * ti);
                innerCount += 1.0;
                float di = -si.x;
                // At the wall, and heading out of it.
                if (di < HIT && dot(d, si.yzw) > 0.0) {
                    break;
                }
                ti += max(di * stepScale, HIT);
            }
            // The same Newton step onto the wall.
            ti += clamp(-si.x / max(dot(d, si.yzw), 0.1), 0.0, HIT * 4.0);
            p += d * ti;
            len += ti;
            vec3 ni = normalAt(p, d);
            float cosI = clamp(dot(d, ni), 0.0, 1.0);
            vec3 o = refract(d, -ni, n);
            bool last = b >= nExits - 1;
            if (dot(o, o) > 0.0) {
                w *= 1.0 - fresnel(cosI, n, 1.0);
                d = o;
                break;
            }
            if (last) {
                // Out of bounces inside: let it out along the surface
                // normal's side, dimmed.
                d = normalize(d + ni * 0.5);
                w *= 0.5;
                break;
            }
            d = reflect(d, ni);
            p -= ni * (HIT * 3.0);
            nb++;
        }
        exPos[m] = viewRot * p;
        exDir[m] = viewRot * d;
        exLen[m] = len;
        exW[m] = w;
        exN[m] = nb;
    }

    // Spectrum: each wavelength's exit ray is interpolated between the
    // two nearest paths.
    int nSamples = clamp(samples, 1, MAX_SAMPLES);
    float j = (hash12(gl_FragCoord.xy) - 0.5) * jitter;
    vec3 acc = vec3(0.0);
    vec3 wsum = vec3(0.0);
    vec3 absorb = absorption * (1.0 - tint);
    for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= nSamples) {
            break;
        }
        float ts = clamp((float(i) + 0.5 + j) / float(nSamples), 0.0, 1.0);
        float x = ts * float(nPaths) - 0.5;
        int a = clamp(int(floor(x)), 0, max(nPaths - 2, 0));
        int b = min(a + 1, nPaths - 1);
        float f = x - float(a);
        // Paths that left through different faces can't be blended:
        // snap to the nearest one.
        if (a == b || exN[a] != exN[b] || dot(exDir[a], exDir[b]) < 0.9) {
            f = step(0.5, f);
        }
        vec3 p = mix(exPos[a], exPos[b], f);
        vec3 d = normalize(mix(exDir[a], exDir[b], f));
        float len = mix(exLen[a], exLen[b], clamp(f, 0.0, 1.0));
        float w = mix(exW[a], exW[b], clamp(f, 0.0, 1.0));
        vec3 l = radiance(p, d, frost) * w * exp(-absorb * len);
        vec3 sw = nSamples == 1 ? vec3(1.0) : spectral(ts);
        acc += sw * l;
        wsum += sw;
    }
    return col + acc / max(wsum, vec3(1e-4));
}

void main() {
    vec2 px = uv * bufferPx;
    vec3 rdV = normalize(vec3((px - principalPx) / focalPx, -1.0));
    vec3 roV = vec3(eye, camDist);
    // viewRot maps object to view; its transpose maps back.
    vec3 ro = roV * viewRot;
    vec3 rd = rdV * viewRot;

    vec3 miss = vec3(0.0);
    float missA = 0.0;
    if (backdropVisible > 0.5) {
        miss = radiance(roV, rdV, 0.0) * step(0.5, float(backdropMode));
        missA = backdropMode == 0 ? 0.0 : 1.0;
    }

    vec2 tb = boundsHit(ro, rd);
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? heat(0.0) : vec4(miss, missA);
        return;
    }
    float outerCount = 0.0;
    float innerCount = 0.0;
    float t = max(tb.x, 0.0);
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    // Front to back: what is left to cover, and the colour so far. A ray
    // that grazes an edge covers part of the pixel with it and goes on
    // to what is behind, so edges are antialiased by their coverage.
    float remain = 1.0;
    // Up to two layers: their surface points and weights. They are
    // shaded after the march, where screen-space derivatives are valid.
    vec3 layerP[2];
    float layerW[2];
    int layers = 0;
    bool leaving = false;
    for (int i = 0; i < OUTER_STEPS; i++) {
        vec4 s = sdf3(ro + rd * t);
        outerCount += 1.0;
        float r = t * cone;
        float zone = max(HIT, r);
        if (leaving) {
            // Step away from the edge that was just grazed.
            if (s.x > zone) {
                leaving = false;
            }
            t += max(s.x * stepScale, 3.0 * r);
        } else if (s.x < zone) {
            // Near the surface. Step to where the ray would cross its
            // tangent plane: a ray that hits gets there, one that
            // grazes a convex edge ends up moving away from it.
            float k = s.x / r;
            bool solid = false;
            for (int j = 0; j < 6; j++) {
                if (s.x < 0.15 * r) {
                    solid = true;
                    break;
                }
                float c = dot(rd, s.yzw);
                if (c > -0.02) {
                    break;
                }
                t += min(s.x / -c * stepScale, 0.05);
                s = sdf3(ro + rd * t);
                outerCount += 1.0;
                k = min(k, s.x / (t * cone));
            }
            float cov = solid ? 1.0 : clamp(1.0 - k, 0.0, 1.0);
            if (cov > 0.0) {
                // Onto the surface: the march stops anywhere near it,
                // which would show as contour lines once refracted.
                vec3 p0 = ro + rd * t;
                if (solid) {
                    p0 += rd * clamp(
                        s.x / max(-dot(rd, s.yzw), 0.1),
                        -HIT * 4.0,
                        HIT * 4.0
                    );
                } else {
                    p0 -= s.yzw * s.x;
                }
                if (layers == 0) {
                    layerP[0] = p0;
                    layerW[0] = remain * cov;
                } else {
                    layerP[1] = p0;
                    layerW[1] = remain * cov;
                }
                remain *= 1.0 - cov;
                layers++;
            }
            if (solid || layers >= 2 || remain < 0.02) {
                break;
            }
            leaving = true;
            t += max(s.x * stepScale, 3.0 * r);
        } else {
            t += s.x * stepScale;
        }
        if (t > tb.y) {
            break;
        }
    }

    float layerA = backdropMode == 0 ? 0.0 : 1.0;
    vec4 acc = remain * vec4(miss, missA);
    if (layers > 0) {
        acc += layerW[0] * vec4(shade(layerP[0], rd, innerCount), layerA);
    }
    if (layers > 1) {
        acc += layerW[1] * vec4(shade(layerP[1], rd, innerCount), layerA);
    }
    outColor = acc;
    if (debugView != 0) {
        outColor = heat(
            (debugView != 2 ? outerCount : 0.0)
                + (debugView != 1 ? innerCount : 0.0)
        );
        return;
    }
}
`,W=new Map,G=new Float32Array,K=class{params;#e;#t=new p({longSide:L,minLongSide:R,onRead:(e,t)=>this.#b(e,t)});#n=null;#r=null;#i=null;#a=new x;#o=null;#s=null;#c=null;#l=null;#u=null;#d=!1;#f=0;#p=null;#m=new ee(T,A);#h=0;#g=new i(A);#_=null;constructor(e={},t={}){this.params={...A,...e},this.#e=t.still??!1}setParams(e){Object.assign(this.params,e)}init(e){this.#o=e.gl,this.#_=e.onContextRestored(()=>{this.#t.contextRestored(),this.#C(),this.#r||this.#t.refresh(),this.#o=e.gl,this.#c?.dispose(),this.#u?.dispose(),this.#s=null,this.#c=null,this.#l=null,this.#u=null,this.#m.contextRestored(),this.#i=null})}outputRect(e){return v(b(this.params.pad,A.pad),e)}render(e){this.#t.phase===`idle`&&this.#n!==null&&f(this.params.sourceChannel)!==this.#n&&this.#t.refresh(),this.#t.update(e),this.#r&&=(this.#x(e,this.#r),ve(this.#r),this.#i=this.#r,null),this.#S(e),this.#m.update(e,this.params),this.#e||(this.#h+=Math.min(e.deltaTime,.1));let t=this.#g.update(this.params,{time:this.#h,dt:this.#e?0:e.deltaTime,dims:e.dims,outputRect:v(b(this.params.pad,A.pad),e.dims),mouse:e.mouse,mouseViewport:e.mouseViewport,pixelRatio:e.pixelRatio,live:!this.#e,tilt:this.params.pointer===`tilt`}),n=this.#y(e,t);this.#a.output(e,n,{pad:b(this.params.pad,A.pad),antialias:this.params.antialias,raw:this.#v()!==0})}#v(){return j[this.params.debug]??0}#y(e,t){let n=this.#i,r=this.#c;if(!n||!r)return null;let i=this.params,a=this.#a.scene(e,b(i.pad,A.pad),i.resolution),[,,o,s]=v(b(i.pad,A.pad),e.dims);if(!a||o<=0||s<=0)return null;let c=this.#h,l=A,u=E(i.depth,.01,100,l.depth)/2,d=E(i.bulge,0,100,0),f=E(i.bulgeWidth,.001,100,l.bulgeWidth),p=d>0?2*d/f:0,m=O(i.relief)&&this.#u?Math.max(i.relief,-2*u*.8):0,h=Math.abs(m)*n.reliefMaxGrad;return e.draw({frag:_e(re(this.params.backdrop)),uniforms:{sdfTex:r,sdfRect:n.sdfRect,sdfSize:[n.sdfW,n.sdfH],halfDepth:u,rounding:Math.min(E(i.bevel,0,u,l.bevel),u),bevelShape:M[i.bevelShape]??0,bulge:d,bulgeWidth:f,stepScale:d>0?1/k(p):1,reliefTex:this.#u??r,relief:m,reliefScale:k(p)/k(p+h),shapeHalf:n.shapeHalf,viewRot:t.viewRot,camDist:t.camDist,focalPx:t.focalPx,eye:[t.eye[0],t.eye[1]],principalPx:t.principalPx,bufferPx:[o,s],pixelSize:o/a.width,ior:E(i.ior,1.0001,10,l.ior),dispersion:E(i.dispersion,-10,10,l.dispersion),paths:w(i.paths,1,N,2),samples:w(i.samples,1,P,8),exits:w(i.bounces,0,F,2)+1,jitter:E(i.jitter,0,1,l.jitter),tint:S(i.tint,A.tint),absorption:E(i.absorption,0,1e3,l.absorption),reflection:E(i.reflection,0,100,l.reflection),bump:E(i.bump,0,1,l.bump),bumpScale:E(i.bumpScale,.001,100,l.bumpScale),frost:E(i.frost,0,1,l.frost),...this.#m.uniforms(i,c,u+d+Math.max(m,0),r),debugView:this.#v()},target:a}),a}refresh(){this.#t.refresh()}async#b(e,t){let n=f(this.params.sourceChannel),r=O(this.params.relief),i=await a({pixels:e.pixels,mw:e.width,mh:e.height,channel:n,aspect:e.aspect,smoothRadius:z,smoothPasses:B,spawn:!1,relief:r?{blur:this.params.reliefBlur,passes:V,maxRadius:H}:void 0});if(!i)return!1;if(!t())return!0;let{relief:o,...s}=i;return this.#r={...s,reliefLum:o?.lum??null,reliefRadius:o?.radius??-1,relief:o?.map??G,reliefMaxGrad:o?.maxGrad??0},this.#n=n,!0}#x(e,t){let n=e.gl;this.#c?.dispose(),this.#s&&n.deleteTexture(this.#s),this.#s=null,this.#c=null;let r=C(n,t.sdfW,t.sdfH,t.sdf);e.resetState(),r&&(this.#s=r,this.#c=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`})),this.#T(e,t)}#S(e){let t=this.#i;if(!t)return;if(!O(this.params.relief)){t.reliefLum&&(t.reliefLum=null,t.reliefRadius=-1,t.reliefMaxGrad=0,this.#w(e.gl));return}if(!t.reliefLum){this.#t.phase===`idle`&&!this.#r&&this.#t.refresh();return}let n=this.#p;n&&(this.#p=null,n.shape===t&&(t.relief=n.map,t.reliefMaxGrad=n.maxGrad,t.reliefRadius=n.radius,this.#T(e,t),t.relief=G));let i=l(this.params.reliefBlur,t,H);if(i===t.reliefRadius||this.#d)return;this.#d=!0;let a=this.#f;r({lum:t.reliefLum,sdfRect:t.sdfRect,sdfW:t.sdfW,sdfH:t.sdfH,radius:i,passes:V}).then(e=>{a===this.#f&&(this.#d=!1,this.#p={shape:t,radius:i,...e})},e=>{a===this.#f&&(this.#d=!1,t.reliefRadius=i,console.warn(`[VFX-JS] GlassEffect could not build the relief:`,e))})}#C(){this.#f++,this.#d=!1,this.#p=null}#w(e){this.#u?.dispose(),this.#l&&e.deleteTexture(this.#l),this.#l=null,this.#u=null}#T(e,t){let n=e.gl;if(this.#w(n),!t.reliefLum)return;let r=C(n,t.sdfW,t.sdfH,t.relief);e.resetState();let i=[t.sdfW,t.sdfH];r&&(this.#l=r,this.#u=e.wrapTexture(r,{size:i,filter:`linear`,wrap:`clamp`}))}dispose(){this.#g.dispose(),this.#_?.(),this.#_=null,this.#c?.dispose(),this.#u?.dispose(),this.#o&&this.#s&&this.#o.deleteTexture(this.#s),this.#o&&this.#l&&this.#o.deleteTexture(this.#l),this.#m.dispose(this.#o),this.#l=null,this.#u=null,this.#o=null,this.#s=null,this.#c=null,this.#a.dispose(),this.#i=null,this.#r=null,this.#t.reset(),this.#C(),this.#n=null}}})))()}function ye(e){return Y[e]??e}function be(e){let t=J[e];if(`src`in t){let e=document.createElement(`img`);return e.style.cssText=t.style,e.src=t.src,e}let n=document.createElement(t.tag);return n.style.cssText=t.style,n.textContent=t.text,n}function xe(e){return e instanceof HTMLImageElement?new Promise((t,n)=>{e.complete&&e.naturalWidth>0?t():(e.addEventListener(`load`,()=>t(),{once:!0}),e.addEventListener(`error`,()=>n(Error(`load failed`)),{once:!0}))}):document.fonts.ready.then(()=>{})}var J,Se,Ce,Y,we,Te,X,Z,Q,Ee;function $(){return($=e((()=>{te(),q(),ce(),de(),he(),_(),fe(),ge(),d(),J={"VFX-JS logo":{src:g,style:`width: min(80vw, 960px)`},amagi:{src:le,style:`height: min(70vh, 640px)`},"slab (photo)":{src:D,style:`max-width: min(60vw, 800px); max-height: 60vh`},"HTML text":{tag:`h1`,text:`Glass`,style:`margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(24vw, 300px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em`},"HTML button":{tag:`button`,text:`Click me`,style:`appearance: none; border: 0; border-radius: 999px; padding: 0.55em 1.4em; background: #fff; color: #000; font: 700 min(8vw, 96px) / 1 system-ui, sans-serif; cursor: pointer`}},Se=[`stripes`,`grid`,`marble`,`flow`,`none`],Ce=[...Object.keys(T),`custom`],Y={"image: jellyfish":ue,"image: pigeon":D,"image: robot":me,"image: live":pe},we=[...Se,...Object.keys(Y)],Te={title:`Effect/Glass`,parameters:{layout:`fullscreen`,controls:{disable:!0}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000`;let n=m(),r=u(),{backdrop:i,backdropColors:a,...o}=new K({drag:!0,...e.params}).params,s=typeof a==`string`?null:a,c=s??T[a],l={a:c[0],b:c[c.length-1]},d=typeof a==`string`?a:`custom`,f=()=>d===`custom`?s&&l.a===s[0]&&l.b===s[s.length-1]?s:[l.a,l.b]:d,p=e.backdrop,g=()=>({...o,backdrop:ye(p),backdropColors:f()}),_=e.source,v=null,y=null,b=0,x=Promise.resolve(),S=()=>{y&&Object.assign(y.params,g())},C=async()=>{let e=++b,i=v,a=be(_);v=a,i?(i.replaceWith(a),await x.catch(()=>{}),n.remove(i)):t.appendChild(a);try{await xe(a),await new Promise(e=>requestAnimationFrame(e))}catch(e){console.error(e);return}e===b&&(y=new K(g(),{still:r}),x=n.add(a,{effect:y}),await x)};return C().then(()=>{r||h(`Glass`,o,S,{source:{keys:Object.keys(J),value:_,onChange:e=>{_=e,C()}},backdrop:{keys:we,value:p,onChange:e=>{p=e,S()}},palette:{keys:Ce,value:d,onChange:e=>{d=e,S()}},colors:l})}),t}},X={args:{source:`VFX-JS logo`,backdrop:`stripes`}},Z={args:{source:`amagi`,backdrop:`flow`,params:{backdropColors:`pastel`,backdropSoftness:1,depth:.3,bevel:.06,bevelShape:`chamfer`,dispersion:.25,paths:3}}},Q={args:{source:`HTML button`,backdrop:`grid`,params:{relief:-.05}}},Ee=[`logo`,`flow`,`htmlButton`],X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo",
    backdrop: "stripes"
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  args: {
    source: "amagi",
    backdrop: "flow",
    params: {
      backdropColors: "pastel",
      backdropSoftness: 1,
      depth: 0.3,
      bevel: 0.06,
      bevelShape: "chamfer",
      dispersion: 0.25,
      paths: 3
    }
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  args: {
    source: "HTML button",
    backdrop: "grid",
    params: {
      relief: -0.05
    }
  }
}`,...Q.parameters?.docs?.source}}}})))()}$();export{Ee as __namedExportsOrder,Te as default,Z as flow,Q as htmlButton,X as logo};