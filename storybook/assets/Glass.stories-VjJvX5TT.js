import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{n as r}from"./_pad-1r8DowwE.js";import{A as i,F as a,H as o,I as s,M as c,N as l,O as u,P as d,V as f,a as p,h as m,j as h,k as g,m as _,p as ee}from"./utils-_F9SZfcx.js";import{n as v,r as y,t as b}from"./_simplex3--pabs44y.js";import"./preset-DFGAZ5Mi.js";import{n as x,t as S}from"./jellyfish-DtC6VyHr.js";import{n as te,t as ne}from"./pigeon-Dic8r3mQ.js";import{n as re,t as ie}from"./amagi-rvGYqYQ3.js";import{i as ae,n as oe,r as se,t as ce}from"./robot-DYF1cG3Q.js";function le(e,t,n,r){let i=e instanceof Float32Array?1:1/255,a=r.sdfW,o=Math.round((a-t)/2),s=new Float32Array(a*r.sdfH);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let c=(r*t+n)*4,l=.2126*e[c]+.7152*e[c+1]+.0722*e[c+2];s[(r+o)*a+n+o]=Math.min(Math.max(l*i,0),1)}return s}function C(e,t){let n=t.sdfRect[2]/t.sdfW,r=Number.isFinite(e)?Math.round(Math.max(e,0)/n):0;return Math.min(r,ge)}function w(e,t,n){let r=t.sdfW,i=t.sdfH,a=e.slice(),o=new Float32Array(Math.max(r,i));for(let e=0;e<he;e++){for(let e=0;e<i;e++)c(a,e*r,1,r,n,o);for(let e=0;e<r;e++)c(a,e,r,i,n,o)}let s=1/(2*(t.sdfRect[2]/r)),l=new Float32Array(r*i*4),u=0;for(let e=0;e<i;e++)for(let t=0;t<r;t++){let n=e*r+t,o=(a[e*r+Math.min(t+1,r-1)]-a[e*r+Math.max(t-1,0)])*s,c=(a[Math.min(e+1,i-1)*r+t]-a[Math.max(e-1,0)*r+t])*s;l[n*4]=a[n],l[n*4+1]=o,l[n*4+2]=c,u=Math.max(u,Math.hypot(o,c))}return{relief:l,reliefMaxGrad:u}}function T(e,t,n,r){e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4);let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,n,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),i}function E(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?[e.naturalWidth||e.width,e.naturalHeight||e.height]:typeof HTMLVideoElement<`u`&&e instanceof HTMLVideoElement?[e.videoWidth||e.width,e.videoHeight||e.height]:[e.width,e.height]}function ue(e){let t=typeof e==`string`?j[e]??j.mono:e,n=t.length>0?[...t]:[...j.mono];return n.length===1?[n[0],n[0]]:n}function de(e,t){let n=e.length,r=e.map(O),i=n*2**Math.max(0,Math.ceil(Math.log2(F/n))),a=new Float64Array((i+1)*3),o=(1-t)*i;for(let e=0;e<i;e++){let t=r[Math.floor(e*n/i)];if(n===2){let n=Math.min(Math.max(e+1-o,0),1);t=n===0?r[0]:n===1?r[1]:r[0].map((e,t)=>e+(r[1][t]-e)*n)}for(let n=0;n<3;n++)a[(e+1)*3+n]=a[e*3+n]+t[n]}let s=(e,t)=>{let n=Math.min(Math.floor(e),i-1);return a[n*3+t]+(e-n)*(a[(n+1)*3+t]-a[n*3+t])},c=[];for(let e=i;;e=Math.max(1,Math.floor(e/2))){let t=new Float32Array(e*4),n=i/e;for(let r=0;r<e;r++){for(let e=0;e<3;e++)t[r*4+e]=(s((r+1)*n,e)-s(r*n,e))/n;t[r*4+3]=1}if(c.push(t),e===1)break}return c}function D(e){return typeof e==`string`&&e in N}function O(e){let[t,n,r]=o(e);return[t,n,r]}function k(e){return Math.sqrt((2+e*e+e*Math.sqrt(e*e+4))/2)}function A(e,t,n,r){return Number.isFinite(e)?Math.min(Math.max(Math.round(e),t),n):r}var j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,fe,pe,me,he,ge,_e,ve,ye,be,J;function xe(){return(xe=e((()=>{f(),s(),d(),y(),g(),j={mono:[`#000000`,`#ffffff`],pastel:[`#ff9f9f`,`#dfdf80`,`#9fff9f`,`#80dfdf`,`#9f9fff`,`#df80df`],redblue:[`#e8102a`,`#1a3fe0`]},M={sourceChannel:`alpha`,depth:.2,bevel:.03,bevelShape:`round`,bulge:0,bulgeWidth:.15,relief:0,reliefBlur:.006,ior:1.5,dispersion:.12,paths:2,samples:8,bounces:3,jitter:0,tint:`#ffffff`,absorption:0,reflection:1,bump:0,bumpScale:.15,frost:0,backdrop:`stripes`,backdropVisible:!1,backdropScale:.25,backdropDistance:.6,backdropSpeed:.15,backdropColors:`mono`,backdropRatio:.5,backdropSoftness:.03,lightIntensity:1.5,lightSoftness:.15,yaw:29,pitch:14,orbitAnimation:20,orbitSpeed:3.3,fov:30,zoom:.7,drag:!1,cameraOrigin:`element`,pointer:`none`,pointerStrength:1,resolution:1,antialias:!0,pad:`fullscreen`,debug:`off`},N={none:0,stripes:1,grid:2,marble:3,flow:4},P=5,F=4096,I=`0.3`,L=`3.0`,R=`0.14`,z={off:0,outer:1,inner:2,total:3},B={round:0,chamfer:1},V=4,H=16,U=6,W=2048,G=`0.35`,K=`0.6`,q=`0.6`,fe=1024,pe=4,me=3,he=3,ge=256,_e=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

${h}

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
uniform int bounces;
uniform float jitter;
uniform vec3 tint;
uniform float absorption;
uniform float reflection;
uniform float bump;
uniform float bumpScale;
uniform float frost;

uniform int backdropMode;
uniform sampler2D backdropTex;
uniform float backdropAspect;
uniform float backdropVisible;
uniform float backdropScale;
uniform float backdropDistance;
uniform float backdropOffset;
// The palette, baked along x with its own mip chain (the top level is
// its mean), and its number of colours.
uniform sampler2D paletteTex;
// Turn of the palette that keeps the bands of two colours centred where
// they are at an even split, whatever the ratio.
uniform float paletteShift;
uniform int paletteSize;
uniform float backdropSoftness;

uniform float lightIntensity;
uniform float lightSoftness;
uniform int debugView;

const int MAX_PATHS = ${V};
const int MAX_SAMPLES = ${H};
const int MAX_BOUNCES = ${U};
const int OUTER_STEPS = 72;
const int INNER_STEPS = 40;
const float HIT = 0.0012;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

${b}
${v}

// The palette at u (0 first colour, 1 last), blurred over a width w of u.
// Its texture repeats, so the last colour runs into the first, except for
// the grid, whose u does not go round.
// A mip level averages 2^lod texels, so the level follows w; the palette
// is laid out so that its colours start on texel boundaries of every
// level that is narrower than a colour.
vec3 palette(float u, float w) {
    float lod = log2(max(w * float(textureSize(paletteTex, 0).x), 1e-4));
    return textureLod(paletteTex, vec2(u, 0.5), lod).rgb;
}

// The backdrop plane, at view-space xy. fw is the footprint of the pixel
// on it, in the same units.
vec3 backdrop(vec2 p, float fw) {
    if (backdropMode == 0) {
        return vec3(0.0);
    }
    if (backdropMode == ${P}) {
        vec2 half_ = backdropScale * vec2(backdropAspect, 1.0)
            / max(backdropAspect, 1.0);
        vec2 q = p / half_ * 0.5 + 0.5;
        // Mirrored repeat, so the image has no visible border.
        q = 1.0 - abs(mod(q, 2.0) - 1.0);
        // The mip level from the footprint: the fold of the mirror and
        // the refraction would throw off the GPU's own derivatives.
        // fwidth's length is about sqrt(2) times the GPU's footprint.
        vec2 size = vec2(textureSize(backdropTex, 0));
        float texels = fw * 0.5 * max(size.x / half_.x, size.y / half_.y);
        float lod = log2(max(texels, 1e-4)) - 0.5;
        return textureLod(backdropTex, q, lod).rgb;
    }
    vec2 q = p / max(backdropScale, 1e-3);
    fw = clamp(fw / max(backdropScale, 1e-3), 1e-4, 4.0);
    // Each pattern gives u, 0 at the middle of the palette's first colour
    // and 1 at the middle of its last, before any threshold, and gu, the
    // length of its gradient in pattern units. u is area-equalised: equal
    // slices of it cover equal areas, so equal shares of the palette get
    // equal areas and the pattern's mean is the palette's. k scales the
    // softness: the bands keep it along u; the grid, whose u is not
    // proportional to distance, keeps it as a distance (k follows gu),
    // so all its edges are equally soft at any ratio.
    float u;
    float gu;
    float k = 1.0;
    if (backdropMode == 1) {
        // Once round the palette per stripe period.
        u = fract((q.x - q.y) * 0.7071 + backdropOffset + paletteShift);
        gu = 1.0;
    } else if (backdropMode == 2) {
        // Distance t from the lines' centre, 0..0.5. The area within t of
        // a line is 1 - (1 - 2t)^2.
        vec2 g = abs(fract(q + vec2(backdropOffset, 0.0)) - 0.5);
        float a = 1.0 - 2.0 * min(g.x, g.y);
        u = a * a;
        gu = 4.0 * a;
        k = gu;
    } else if (backdropMode == 3) {
        // "marble": contour bands of a slow noise field: closed loops
        // round its peaks, bands crowding where it is steep. A weaker
        // second octave makes the widths irregular. u goes once round the
        // palette per contour.
        vec3 n = vec3(q * ${R}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.3, 2.3, 1.5) + vec3(5.2, 1.3, 7.7));
        float s = (a.w + 0.2 * b.w) * ${L};
        u = fract(s + paletteShift);
        vec2 g = (a.xy + 0.46 * b.xy) * ${R};
        gu = ${L} * length(g);
    } else {
        // "flow": a diagonal run through the palette, bent by a noise
        // field. The bend stays weaker than the run, so the colours keep
        // going one way: no closed rings, and no points where they all
        // meet.
        vec3 n = vec3(q * ${I}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.1, 2.1, 1.3) + vec3(17.3, 5.1, 9.7));
        vec2 dir = vec2(0.7071, -0.7071) * 0.22;
        float h = dot(q, dir) + (a.w + 0.25 * b.w) * 0.32 + backdropOffset * 0.05;
        u = fract(h);
        gu = length(dir + (a.xy + 0.525 * b.xy) * 0.32 * ${I});
    }
    // Softness and filtering are one blur along u: the pixel's footprint
    // in u, or the softness in shares of a colour. Low softness matches
    // the smoothstep edges the patterns had (3 shares per unit); it
    // saturates at one share, which is a gradient through the colours.
    float sf = clamp(backdropSoftness, 0.0, 1.0);
    float shares = 3.0 * sf / (1.0 + 2.0 * sf * sqrt(sf));
    float soft = k * shares / float(max(paletteSize, 2));
    return palette(u, max(fw * gu, soft));
}

// A rectangular light seen in direction d: centre c, half size in
// tangent units, edges as soft as \`soft\`.
float boxLight(vec3 d, vec3 c, vec2 halfSize, float soft) {
    c = normalize(c);
    float k = dot(d, c);
    if (k <= 0.0) {
        return 0.0;
    }
    vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 v = cross(c, u);
    vec2 q = abs(vec2(dot(d, u), dot(d, v)) / k);
    vec2 s = max(soft * halfSize, vec2(1e-3));
    vec2 e = smoothstep(halfSize + s, halfSize - s, q);
    return e.x * e.y;
}

vec3 lights(vec3 d, float soft) {
    if (lightIntensity <= 0.0) {
        return vec3(0.0);
    }
    float l = boxLight(d, vec3(-0.7, 0.55, 0.45), vec2(0.55, 0.3), soft)
        + boxLight(d, vec3(0.95, 0.05, 0.3), vec2(0.1, 0.9), soft)
        + 0.6 * boxLight(d, vec3(0.25, -0.85, 0.45), vec2(0.7, 0.15), soft)
        // Behind the shape: only seen without a backdrop.
        + boxLight(d, vec3(0.25, 0.15, -1.0), vec2(0.8, 0.45), soft);
    return vec3(l * lightIntensity);
}

// Radiance along a ray in view space: one that left the glass, or one
// that misses it. \`rough\` is the frost of the surface the ray left (0
// for a miss).
vec3 radiance(vec3 p, vec3 d, float rough) {
    vec3 col = lights(d, max(lightSoftness, rough * ${K}));
    if (backdropMode != 0 && d.z < -1e-4) {
        float t = (-backdropDistance - p.z) / d.z;
        if (t > 0.0) {
            vec2 q = p.xy + d.xy * t;
            // Strong refraction squeezes a wide piece of the backdrop
            // into one pixel; filter the pattern by that footprint. A
            // rough surface scatters into a cone, so its blur grows
            // with the distance to the backdrop.
            float fw = length(fwidth(q));
            if (rough > 0.0) {
                fw += rough * ${G} * t;
            }
            col = backdrop(q, fw);
        }
    }
    return col;
}

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
    vec3 g = snoiseD(p / bumpScale).xyz * ${q};
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

// Heat map of a count of SDF lookups, 64 per colour step.
vec4 heat(float n) {
    float x = clamp(n / 64.0, 0.0, 5.0);
    vec3 c = mix(vec3(0.0), vec3(0.0, 0.0, 1.0), clamp(x, 0.0, 1.0));
    c = mix(c, vec3(0.0, 1.0, 0.0), clamp(x - 1.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 1.0, 0.0), clamp(x - 2.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 0.0, 0.0), clamp(x - 3.0, 0.0, 1.0));
    c = mix(c, vec3(1.0), clamp(x - 4.0, 0.0, 1.0));
    return vec4(c, 1.0);
}

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
    int nBounces = clamp(bounces, 1, MAX_BOUNCES);
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
        for (int b = 0; b < MAX_BOUNCES; b++) {
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
            bool last = b >= nBounces - 1;
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
`,ve=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform int hasScene;
uniform int raw;
out vec4 outColor;

vec3 softClip(vec3 x) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
    return mix(x, k, step(0.8, x));
}

void main() {
    if (hasScene == 0) {
        outColor = vec4(0.0);
        return;
    }
    vec4 s = texture(scene, uv);
    if (raw != 0) {
        outColor = s;
        return;
    }
    vec3 col = softClip(max(s.rgb, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    outColor = vec4(min(col, a), a);
}
`,ye=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

float luma(vec4 c) {
    return dot(c.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec4 m = texture(srcTex, uv);
    float lNW = luma(texture(srcTex, uv + texel * vec2(-1.0, -1.0)));
    float lNE = luma(texture(srcTex, uv + texel * vec2(1.0, -1.0)));
    float lSW = luma(texture(srcTex, uv + texel * vec2(-1.0, 1.0)));
    float lSE = luma(texture(srcTex, uv + texel * vec2(1.0, 1.0)));
    float lM = luma(m);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin < max(0.03, lMax * 0.1)) {
        outColor = m;
        return;
    }
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * texel;
    vec4 a = 0.5 * (texture(srcTex, uv + dir * (1.0 / 3.0 - 0.5))
        + texture(srcTex, uv + dir * (2.0 / 3.0 - 0.5)));
    vec4 b = a * 0.5 + 0.25 * (texture(srcTex, uv - dir * 0.5)
        + texture(srcTex, uv + dir * 0.5));
    float lB = luma(b);
    outColor = (lB < lMin || lB > lMax) ? a : b;
}
`,be=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`,J=class{params;#e;#t=new u({longSide:fe,onRead:e=>this.#A(e.pixels,e.width,e.height,e.aspect)});#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=null;#l=null;#u=null;#d=null;#f=[];#p=null;#m=null;#h=null;#g=2;#_=null;#v=null;#y=1;#b=null;#x=!1;#S=null;#C=!1;#w=0;#T=new a(M);#E=null;#D=!1;constructor(e={},t={}){this.params={...M,...e},this.#e=t.still??!1}setParams(e){Object.assign(this.params,e)}init(e){this.#s=e.gl,this.#D=!1,this.#E=e.onContextRestored(()=>{this.#t.contextRestored(),this.#s=e.gl,this.#c=null,this.#l=null,this.#u=null,this.#d=null,this.#f=[],this.#p=null,this.#m=null,this.#h=null,this.#r=this.#r??this.#i,this.#C=!0})}outputRect(e){return r(this.params.pad,e)}render(e){this.#t.phase===`idle`&&this.#n!==null&&i(this.params.sourceChannel)!==this.#n&&this.#t.refresh(),this.#t.update(e),this.#r&&=(this.#j(e,this.#r),this.#i=this.#r,null),this.#M(e),this.#P(e),this.#F(e),this.#I(e),this.#e||(this.#w+=Math.min(e.deltaTime,.1));let t=this.#T.update(this.params,{time:this.#w,dt:this.#e?0:e.deltaTime,dims:e.dims,outputRect:r(this.params.pad,e.dims),mouse:e.mouse,mouseViewport:e.mouseViewport,pixelRatio:e.pixelRatio,live:!this.#e,tilt:this.params.pointer===`tilt`}),n=this.#k(e,t),a=this.#O()!==0,[,,o,s]=r(this.params.pad,e.dims),c=Math.round(o),l=Math.round(s),u=this.params.antialias&&n!==null&&!a&&c>0&&l>0;u&&(this.#o?.width!==c||this.#o?.height!==l)&&(this.#o?.dispose(),this.#o=e.createRenderTarget({size:[c,l],filter:`linear`}));let d=u?this.#o:null;e.draw({frag:ve,uniforms:{scene:n??e.src,hasScene:+!!n,raw:+!!a},target:d??e.target}),d&&e.draw({frag:ye,uniforms:{srcTex:d,texel:[1/d.width,1/d.height]},target:e.target})}#O(){return z[this.params.debug]??0}#k(e,t){let n=this.#i,i=this.#l;if(!n||!i)return null;let a=this.params,[,,o,s]=r(a.pad,e.dims);if(o<=0||s<=0)return null;let c=Number.isFinite(a.resolution)?Math.min(Math.max(a.resolution,.25),2):1,l=Math.max(1,Math.round(o*c)),u=Math.max(1,Math.round(s*c));this.#a&&this.#a.width===l&&this.#a.height===u||(this.#a?.dispose(),this.#a=e.createRenderTarget({size:[l,u],float:!0,filter:`linear`}));let d=this.#a,f=this.#w,p=Math.max(a.depth/2,.005),m=Number.isFinite(a.bulge)?Math.max(a.bulge,0):0,h=Math.max(a.bulgeWidth,.001),g=m>0?2*m/h:0,_=Number.isFinite(a.relief)&&Math.abs(a.relief)>1e-6?Math.max(a.relief,-2*p*.8):0,ee=Math.abs(_)*n.reliefMaxGrad,v=D(a.backdrop)?null:this.#S,y=D(a.backdrop)?N[a.backdrop]:v?P:0;return e.draw({frag:_e,uniforms:{sdfTex:i,sdfRect:n.sdfRect,sdfSize:[n.sdfW,n.sdfH],halfDepth:p,rounding:Math.min(Math.max(a.bevel,0),p),bevelShape:B[a.bevelShape]??0,bulge:m,bulgeWidth:h,stepScale:m>0?1/k(g):1,reliefTex:this.#d??i,relief:_,reliefScale:k(g)/k(g+ee),shapeHalf:n.shapeHalf,viewRot:t.viewRot,camDist:t.camDist,focalPx:t.focalPx,eye:[t.eye[0],t.eye[1]],principalPx:t.principalPx,bufferPx:[o,s],pixelSize:o/l,ior:Math.max(a.ior,1.0001),dispersion:a.dispersion,paths:A(a.paths,1,V,2),samples:A(a.samples,1,H,8),bounces:A(a.bounces,1,U,3),jitter:Math.min(Math.max(a.jitter,0),1),tint:O(a.tint),absorption:Math.max(a.absorption,0),reflection:Math.max(a.reflection,0),bump:Number.isFinite(a.bump)?Math.min(Math.max(a.bump,0),1):0,bumpScale:Math.max(a.bumpScale,.001),frost:Number.isFinite(a.frost)?Math.min(Math.max(a.frost,0),1):0,backdropMode:y,backdropTex:v??i,backdropAspect:this.#y,backdropVisible:+!!a.backdropVisible,backdropScale:a.backdropScale,backdropDistance:Math.max(a.backdropDistance,p+m+Math.max(_,0)),backdropOffset:f*a.backdropSpeed,paletteTex:(y===N.grid?this.#m:this.#p)??i,paletteSize:this.#g,paletteShift:this.#g===2?.5-Math.min(Math.max(a.backdropRatio,0),1)/2:0,backdropSoftness:Math.min(Math.max(a.backdropSoftness,0),1),lightIntensity:Math.max(a.lightIntensity,0),lightSoftness:Math.min(Math.max(a.lightSoftness,0),1),debugView:this.#O()},target:d}),d}refresh(){this.#t.refresh()}#A(e,t,n,r){let a=i(this.params.sourceChannel),o=l(e,t,n,a,this.params.depth/2,r,pe,me);if(!o)return!1;let s=le(e,t,n,o),c=C(this.params.reliefBlur,o);return this.#r={...o,reliefLum:s,reliefRadius:c,...w(s,o,c)},this.#n=a,!0}#j(e,t){let n=e.gl;this.#c&&n.deleteTexture(this.#c),this.#c=null,this.#l=null;let r=T(n,t.sdfW,t.sdfH,t.sdf);e.resetState(),r&&(this.#c=r,this.#l=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`})),this.#N(e,t)}#M(e){let t=this.#i;if(!t)return;let n=C(this.params.reliefBlur,t);n!==t.reliefRadius&&(Object.assign(t,w(t.reliefLum,t,n)),t.reliefRadius=n,this.#N(e,t))}#N(e,t){let n=e.gl;this.#u&&n.deleteTexture(this.#u),this.#u=null,this.#d=null;let r=T(n,t.sdfW,t.sdfH,t.relief);e.resetState();let i=[t.sdfW,t.sdfH];r&&(this.#u=r,this.#d=e.wrapTexture(r,{size:i,filter:`linear`,wrap:`clamp`}))}#P(e){let t=ue(this.params.backdropColors),n=this.params.backdropRatio,r=Number.isFinite(n)?Math.min(Math.max(n,0),1):.5,i=t.length===2?`${t.join(`,`)}|${r}`:t.join(`,`);if(i===this.#h)return;this.#h=i,this.#g=t.length;let a=e.gl;for(let e of this.#f)a.deleteTexture(e);this.#f=[],this.#p=null,this.#m=null;let o=de(t,r);a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,!1),a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),a.pixelStorei(a.UNPACK_ALIGNMENT,4);let s=t=>{let n=a.createTexture();return a.bindTexture(a.TEXTURE_2D,n),o.forEach((e,t)=>{a.texImage2D(a.TEXTURE_2D,t,a.RGBA16F,e.length/4,1,0,a.RGBA,a.FLOAT,e)}),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR_MIPMAP_LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,t?a.REPEAT:a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.bindTexture(a.TEXTURE_2D,null),n?(this.#f.push(n),e.wrapTexture(n,{size:[o[0].length/4,1],filter:`linear`,wrap:[t?`repeat`:`clamp`,`clamp`]})):null};this.#p=s(!0),this.#m=s(!1),e.resetState()}#F(e){let t=this.params.backdrop;if(t===this.#v||(this.#v=t,this.#_?.dispose(),this.#_=null,this.#b=null,this.#S?.dispose(),this.#S=null,D(t)))return;let n=n=>{if(this.#D||this.#v!==t)return;let[r,i]=E(n);this.#y=r>0&&i>0?r/i:1,this.#b=n,this.#x=typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement,this.#C=!0,this.#_=e.wrapTexture(n,{filter:`linear`,wrap:`clamp`})};if(typeof t!=`string`){n(t);return}let r=new Image;r.crossOrigin=`anonymous`,r.src=t,r.decode().then(()=>n(r),()=>{})}#I(e){let t=this.#_,n=this.#b;if(!t||!n||!(this.#C||this.#x))return;let[r,i]=E(n),a=Math.min(1,W/Math.max(r,i,1)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));(this.#S?.width!==o||this.#S?.height!==s)&&(this.#S?.dispose(),this.#S=e.createRenderTarget({size:[o,s],filter:`linear`,mipmap:!0})),e.draw({frag:be,uniforms:{srcTex:t},target:this.#S}),this.#C=!1}dispose(){if(this.#D=!0,this.#T.dispose(),this.#E?.(),this.#E=null,this.#s&&this.#c&&this.#s.deleteTexture(this.#c),this.#s&&this.#u&&this.#s.deleteTexture(this.#u),this.#s)for(let e of this.#f)this.#s.deleteTexture(e);this.#f=[],this.#p=null,this.#m=null,this.#h=null,this.#u=null,this.#d=null,this.#s=null,this.#c=null,this.#l=null,this.#_?.dispose(),this.#_=null,this.#b=null,this.#v=null,this.#S?.dispose(),this.#S=null,this.#a?.dispose(),this.#a=null,this.#o?.dispose(),this.#o=null,this.#i=null,this.#r=null,this.#t.reset(),this.#n=null}}})))()}function Se(e){return X[e]??e}function Ce(e){let t=Y[e];if(`src`in t){let e=document.createElement(`img`);return e.style.cssText=t.style,e.src=t.src,e}let n=document.createElement(t.tag);return n.style.cssText=t.style,n.textContent=t.text,n}function we(e){return e instanceof HTMLImageElement?new Promise((t,n)=>{e.complete&&e.naturalWidth>0?t():(e.addEventListener(`load`,()=>t(),{once:!0}),e.addEventListener(`error`,()=>n(Error(`load failed`)),{once:!0}))}):document.fonts.ready.then(()=>{})}var Y,Te,Ee,X,De,Oe,Z,Q,$,ke;function Ae(){return(Ae=e((()=>{xe(),re(),S(),se(),n(),ne(),ce(),_(),Y={"VFX-JS logo":{src:t,style:`width: min(80vw, 960px)`},amagi:{src:ie,style:`height: min(70vh, 640px)`},"slab (photo)":{src:te,style:`max-width: min(60vw, 800px); max-height: 60vh`},"HTML text":{tag:`h1`,text:`Glass`,style:`margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(24vw, 300px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em`},"HTML button":{tag:`button`,text:`Click me`,style:`appearance: none; border: 0; border-radius: 999px; padding: 0.55em 1.4em; background: #fff; color: #000; font: 700 min(8vw, 96px) / 1 system-ui, sans-serif; cursor: pointer`}},Te=[`stripes`,`grid`,`marble`,`flow`,`none`],Ee=[...Object.keys(j),`custom`],X={"image: jellyfish":x,"image: pigeon":te,"image: robot":oe,"image: live":ae},De=[...Te,...Object.keys(X)],Oe={title:`Effect/Glass`,parameters:{layout:`fullscreen`,controls:{disable:!0}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000`;let n=ee(),r=m(),{backdrop:i,backdropColors:a,...o}=new J({drag:!0,...e.params}).params,s=typeof a==`string`?null:a,c=s??j[a],l={a:c[0],b:c[c.length-1]},u=typeof a==`string`?a:`custom`,d=()=>u===`custom`?s&&l.a===s[0]&&l.b===s[s.length-1]?s:[l.a,l.b]:u,f=e.backdrop,h=()=>({...o,backdrop:Se(f),backdropColors:d()}),g=e.source,_=null,v=null,y=0,b=Promise.resolve(),x=()=>{v&&Object.assign(v.params,h())},S=async()=>{let e=++y,i=_,a=Ce(g);_=a,i?(i.replaceWith(a),await b.catch(()=>{}),n.remove(i)):t.appendChild(a);try{await we(a),await new Promise(e=>requestAnimationFrame(e))}catch(e){console.error(e);return}e===y&&(v=new J(h(),{still:r}),b=n.add(a,{effect:v}),await b)};return S().then(()=>{r||p(`Glass`,o,x,{source:{keys:Object.keys(Y),value:g,onChange:e=>{g=e,S()}},backdrop:{keys:De,value:f,onChange:e=>{f=e,x()}},palette:{keys:Ee,value:u,onChange:e=>{u=e,x()}},colors:l})}),t}},Z={args:{source:`VFX-JS logo`,backdrop:`stripes`}},Q={args:{source:`amagi`,backdrop:`flow`,params:{backdropColors:`pastel`,backdropSoftness:1,depth:.3,bevel:.06,bevelShape:`chamfer`,dispersion:.25,paths:3}}},$={args:{source:`HTML button`,backdrop:`grid`,params:{relief:-.05}}},ke=[`logo`,`flow`,`htmlButton`],Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo",
    backdrop: "stripes"
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
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
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  args: {
    source: "HTML button",
    backdrop: "grid",
    params: {
      relief: -0.05
    }
  }
}`,...$.parameters?.docs?.source}}}})))()}Ae();export{ke as __namedExportsOrder,Oe as default,Q as flow,$ as htmlButton,Z as logo};