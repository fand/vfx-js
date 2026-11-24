import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t}from"./_pad-1r8DowwE.js";import{A as n,F as r,H as i,L as a,R as o,U as s,V as c,W as l,j as u,k as d,z as f}from"./utils-AjYcdxV6.js";import{n as p,r as m,t as h}from"./_simplex3--pabs44y.js";function g(e,t,n,r){e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4);let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,n,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),i}function _(e){let[t,n,r]=i(e);return[t,n,r]}function v(e,t,n,r){return Number.isFinite(e)?Math.min(Math.max(Math.round(e),t),n):r}function y(e){return typeof e==`string`&&e in S}function b(e){return y(e)?S[e]:5}function x(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?[e.naturalWidth||e.width,e.naturalHeight||e.height]:typeof HTMLVideoElement<`u`&&e instanceof HTMLVideoElement?[e.videoWidth||e.width,e.videoHeight||e.height]:[e.width,e.height]}function ee(e,t){let n=typeof e==`string`?t[e]??t.mono:e,r=n.length>0?[...n]:[...t.mono];return r.length===1?[r[0],r[0]]:r}function te(e,t){let n=e.length,r=e.map(_),i=n*2**Math.max(0,Math.ceil(Math.log2(C/n))),a=new Float64Array((i+1)*3),o=(1-t)*i;for(let e=0;e<i;e++){let t=r[Math.floor(e*n/i)];if(n===2){let n=Math.min(Math.max(e+1-o,0),1);t=n===0?r[0]:n===1?r[1]:r[0].map((e,t)=>e+(r[1][t]-e)*n)}for(let n=0;n<3;n++)a[(e+1)*3+n]=a[e*3+n]+t[n]}let s=(e,t)=>{let n=Math.min(Math.floor(e),i-1);return a[n*3+t]+(e-n)*(a[(n+1)*3+t]-a[n*3+t])},c=[];for(let e=i;;e=Math.max(1,Math.floor(e/2))){let t=new Float32Array(e*4),n=i/e;for(let r=0;r<e;r++){for(let e=0;e<3;e++)t[r*4+e]=(s((r+1)*n,e)-s(r*n,e))/n;t[r*4+3]=1}if(c.push(t),e===1)break}return c}var S,C,w,T,E,D,O,k,A,j,M,ne,N,P;function F(){return(F=e((()=>{c(),S={none:0,stripes:1,grid:2,marble:3,flow:4},C=4096,w=`0.3`,T=`3.0`,E=`0.14`,D=2048,O=`0.35`,k=`
// The one backdrop mode compiled in, or -1 for all of them.
#ifndef BACKDROP_KIND
#define BACKDROP_KIND -1
#endif
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
#if BACKDROP_KIND == 0
    return vec3(0.0);
#else
    if (backdropMode == 0) {
        return vec3(0.0);
    }
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 5
    if (backdropMode == 5) {
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
#endif
#if BACKDROP_KIND == 5
    return vec3(0.0);
#else
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
    float u = 0.0;
    float gu = 1.0;
    float k = 1.0;
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 1
    if (backdropMode == 1) {
        // Once round the palette per stripe period.
        u = fract((q.x - q.y) * 0.7071 + backdropOffset + paletteShift);
        gu = 1.0;
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 2
    if (backdropMode == 2) {
        // Distance t from the lines' centre, 0..0.5. The area within t of
        // a line is 1 - (1 - 2t)^2.
        vec2 g = abs(fract(q + vec2(backdropOffset, 0.0)) - 0.5);
        float a = 1.0 - 2.0 * min(g.x, g.y);
        u = a * a;
        gu = 4.0 * a;
        k = gu;
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 3
    if (backdropMode == 3) {
        // "marble": contour bands of a slow noise field: closed loops
        // round its peaks, bands crowding where it is steep. A weaker
        // second octave makes the widths irregular. u goes once round the
        // palette per contour.
        vec3 n = vec3(q * ${E}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.3, 2.3, 1.5) + vec3(5.2, 1.3, 7.7));
        float s = (a.w + 0.2 * b.w) * ${T};
        u = fract(s + paletteShift);
        vec2 g = (a.xy + 0.46 * b.xy) * ${E};
        gu = ${T} * length(g);
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 4
    if (backdropMode == 4) {
        // "flow": a diagonal run through the palette, bent by a noise
        // field. The bend stays weaker than the run, so the colours keep
        // going one way: no closed rings, and no points where they all
        // meet.
        vec3 n = vec3(q * ${w}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.1, 2.1, 1.3) + vec3(17.3, 5.1, 9.7));
        vec2 dir = vec2(0.7071, -0.7071) * 0.22;
        float h = dot(q, dir) + (a.w + 0.25 * b.w) * 0.32 + backdropOffset * 0.05;
        u = fract(h);
        gu = length(dir + (a.xy + 0.525 * b.xy) * 0.32 * ${w});
    }
#endif
    // Softness and filtering are one blur along u: the pixel's footprint
    // in u, or the softness in shares of a colour. Low softness matches
    // the smoothstep edges the patterns had (3 shares per unit); it
    // saturates at one share, which is a gradient through the colours.
    float sf = clamp(backdropSoftness, 0.0, 1.0);
    float shares = 3.0 * sf / (1.0 + 2.0 * sf * sqrt(sf));
    float soft = k * shares / float(max(paletteSize, 2));
    return palette(u, max(fw * gu, soft));
#endif
#endif
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

// Radiance along a ray in view space: one that left the surface, or one
// that misses it. \`rough\` is the frost of the surface the ray left (0
// for a miss).
vec3 radiance(vec3 p, vec3 d, float rough) {
    vec3 col = lights(d, max(lightSoftness, rough * 0.6));
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
                fw += rough * ${O} * t;
            }
            col = backdrop(q, fw);
        }
    }
    return col;
}
`,A=`
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
`,j=`#version 300 es
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
`,M=`#version 300 es
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
`,ne=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`,N=class{#e;#t=[];#n=null;#r=null;#i=null;#a=2;#o=null;#s=null;#c=1;#l=null;#u=!1;#d=null;#f=!1;#p=!1;constructor(e){this.#e=e}contextRestored(){this.#t=[],this.#n=null,this.#r=null,this.#i=null,this.#f=!0}update(e,t){this.#p=!1,this.#m(e,t),this.#h(e,t),this.#g(e)}uniforms(e,t,n,r){let i=y(e.backdrop)?null:this.#d,a=y(e.backdrop)?S[e.backdrop]:i?5:0;return{backdropMode:a,backdropTex:i??r,backdropAspect:this.#c,backdropVisible:+!!e.backdropVisible,backdropScale:e.backdropScale,backdropDistance:Math.max(e.backdropDistance,n),backdropOffset:t*e.backdropSpeed,paletteTex:(a===S.grid?this.#r:this.#n)??r,paletteSize:this.#a,paletteShift:this.#a===2?.5-Math.min(Math.max(e.backdropRatio,0),1)/2:0,backdropSoftness:Math.min(Math.max(e.backdropSoftness,0),1),lightIntensity:Math.max(e.lightIntensity,0),lightSoftness:Math.min(Math.max(e.lightSoftness,0),1)}}#m(e,t){let n=ee(t.backdropColors,this.#e),r=t.backdropRatio,i=Number.isFinite(r)?Math.min(Math.max(r,0),1):.5,a=n.length===2?`${n.join(`,`)}|${i}`:n.join(`,`);if(a===this.#i)return;this.#i=a,this.#a=n.length;let o=e.gl;for(let e of this.#t)o.deleteTexture(e);this.#t=[],this.#n=null,this.#r=null;let s=te(n,i);o.pixelStorei(o.UNPACK_FLIP_Y_WEBGL,!1),o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),o.pixelStorei(o.UNPACK_ALIGNMENT,4);let c=t=>{let n=o.createTexture();return o.bindTexture(o.TEXTURE_2D,n),s.forEach((e,t)=>{o.texImage2D(o.TEXTURE_2D,t,o.RGBA16F,e.length/4,1,0,o.RGBA,o.FLOAT,e)}),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR_MIPMAP_LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,t?o.REPEAT:o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),o.bindTexture(o.TEXTURE_2D,null),n?(this.#t.push(n),e.wrapTexture(n,{size:[s[0].length/4,1],filter:`linear`,wrap:[t?`repeat`:`clamp`,`clamp`]})):null};this.#n=c(!0),this.#r=c(!1),e.resetState()}#h(e,t){let n=t.backdrop;if(n===this.#s||(this.#s=n,this.#o?.dispose(),this.#o=null,this.#l=null,this.#d?.dispose(),this.#d=null,y(n)))return;let r=t=>{if(this.#p||this.#s!==n)return;let[r,i]=x(t);this.#c=r>0&&i>0?r/i:1,this.#l=t,this.#u=typeof HTMLCanvasElement<`u`&&t instanceof HTMLCanvasElement||typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement,this.#f=!0,this.#o=e.wrapTexture(t,{filter:`linear`,wrap:`clamp`})};if(typeof n!=`string`){r(n);return}let i=new Image;i.crossOrigin=`anonymous`,i.src=n,i.decode().then(()=>r(i),()=>{})}#g(e){let t=this.#o,n=this.#l;if(!t||!n||!(this.#f||this.#u))return;let[r,i]=x(n),a=Math.min(1,D/Math.max(r,i,1)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));(this.#d?.width!==o||this.#d?.height!==s)&&(this.#d?.dispose(),this.#d=e.createRenderTarget({size:[o,s],filter:`linear`,mipmap:!0})),e.draw({frag:ne,uniforms:{srcTex:t},target:this.#d}),this.#f=!1}dispose(e){if(this.#p=!0,e)for(let t of this.#t)e.deleteTexture(t);this.#t=[],this.#n=null,this.#r=null,this.#i=null,this.#o?.dispose(),this.#o=null,this.#l=null,this.#s=null,this.#d?.dispose(),this.#d=null}},P=class{#e=null;#t=null;scene(e,n,r){let[,,i,a]=t(n,e.dims);if(i<=0||a<=0)return null;let o=Number.isFinite(r)?Math.min(Math.max(r,.25),2):1,s=Math.max(1,Math.round(i*o)),c=Math.max(1,Math.round(a*o));return this.#e&&this.#e.width===s&&this.#e.height===c||(this.#e?.dispose(),this.#e=e.createRenderTarget({size:[s,c],float:!0,filter:`linear`})),this.#e}output(e,n,r){let[,,i,a]=t(r.pad,e.dims),o=Math.round(i),s=Math.round(a),c=r.antialias&&n!==null&&!r.raw&&o>0&&s>0;c&&(this.#t?.width!==o||this.#t?.height!==s)&&(this.#t?.dispose(),this.#t=e.createRenderTarget({size:[o,s],filter:`linear`}));let l=c?this.#t:null;e.draw({frag:j,uniforms:{scene:n??e.src,hasScene:+!!n,raw:+!!r.raw},target:l??e.target}),l&&e.draw({frag:M,uniforms:{srcTex:l,texel:[1/l.width,1/l.height]},target:e.target})}dispose(){this.#e?.dispose(),this.#e=null,this.#t?.dispose(),this.#t=null}}})))()}function re(e){let t=$.get(e);return t||(t=Q(e),$.set(e,t)),t}function ie(e,t,n,r){let i=e instanceof Float32Array?1:1/255,a=r.sdfW,o=Math.round((a-t)/2),s=new Float32Array(a*r.sdfH);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let c=(r*t+n)*4,l=.2126*e[c]+.7152*e[c+1]+.0722*e[c+2];s[(r+o)*a+n+o]=Math.min(Math.max(l*i,0),1)}return s}function I(e,t){let n=t.sdfRect[2]/t.sdfW,r=Number.isFinite(e)?Math.round(Math.max(e,0)/n):0;return Math.min(r,Z)}function L(e,t,n){let r=t.sdfW,i=t.sdfH,o=e.slice(),s=new Float32Array(Math.max(r,i));for(let e=0;e<X;e++){for(let e=0;e<i;e++)a(o,e*r,1,r,n,s);for(let e=0;e<r;e++)a(o,e,r,i,n,s)}let c=1/(2*(t.sdfRect[2]/r)),l=new Float32Array(r*i*4),u=0;for(let e=0;e<i;e++)for(let t=0;t<r;t++){let n=e*r+t,a=(o[e*r+Math.min(t+1,r-1)]-o[e*r+Math.max(t-1,0)])*c,s=(o[Math.min(e+1,i-1)*r+t]-o[Math.max(e-1,0)*r+t])*c;l[n*4]=o[n],l[n*4+1]=a,l[n*4+2]=s,u=Math.max(u,Math.hypot(a,s))}return{relief:l,reliefMaxGrad:u}}function R(e){return Math.sqrt((2+e*e+e*Math.sqrt(e*e+4))/2)}var z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q,$,ae;function oe(){return(oe=e((()=>{l(),F(),f(),m(),n(),z={mono:[`#000000`,`#ffffff`],pastel:[`#ff9f9f`,`#dfdf80`,`#9fff9f`,`#80dfdf`,`#9f9fff`,`#df80df`],redblue:[`#e8102a`,`#1a3fe0`]},B={sourceChannel:`alpha`,depth:.2,bevel:.03,bevelShape:`round`,bulge:0,bulgeWidth:.15,relief:0,reliefBlur:.006,ior:1.5,dispersion:.12,paths:2,samples:8,bounces:3,jitter:0,tint:`#ffffff`,absorption:0,reflection:1,bump:0,bumpScale:.15,frost:0,backdrop:`stripes`,backdropVisible:!1,backdropScale:.25,backdropDistance:.6,backdropSpeed:.15,backdropColors:`mono`,backdropRatio:.5,backdropSoftness:.03,lightIntensity:1.5,lightSoftness:.15,yaw:29,pitch:14,orbitAnimation:20,orbitSpeed:3.3,fov:30,zoom:.7,drag:!1,cameraOrigin:`element`,pointer:`none`,pointerStrength:1,resolution:1,antialias:!0,pad:`fullscreen`,debug:`off`},V={off:0,outer:1,inner:2,total:3},H={round:0,chamfer:1},U=4,W=16,G=6,K=`0.6`,q=1024,J=4,Y=3,X=3,Z=256,Q=e=>`#version 300 es
#define BACKDROP_KIND ${e}
precision highp float;
in vec2 uv;
out vec4 outColor;

${r}

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

uniform int debugView;

const int MAX_PATHS = ${U};
const int MAX_SAMPLES = ${W};
const int MAX_BOUNCES = ${G};
const int OUTER_STEPS = 72;
const int INNER_STEPS = 40;
const float HIT = 0.0012;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

${h}
${p}
${k}

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
    vec3 g = snoiseD(p / bumpScale).xyz * ${K};
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

${A}
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
`,$=new Map,ae=class{params;#e;#t=new d({longSide:q,onRead:e=>this.#_(e.pixels,e.width,e.height,e.aspect)});#n=null;#r=null;#i=null;#a=new P;#o=null;#s=null;#c=null;#l=null;#u=null;#d=new N(z);#f=0;#p=new s(B);#m=null;constructor(e={},t={}){this.params={...B,...e},this.#e=t.still??!1}setParams(e){Object.assign(this.params,e)}init(e){this.#o=e.gl,this.#m=e.onContextRestored(()=>{this.#t.contextRestored(),this.#o=e.gl,this.#s=null,this.#c=null,this.#l=null,this.#u=null,this.#d.contextRestored(),this.#r=this.#r??this.#i})}outputRect(e){return t(this.params.pad,e)}render(e){this.#t.phase===`idle`&&this.#n!==null&&u(this.params.sourceChannel)!==this.#n&&this.#t.refresh(),this.#t.update(e),this.#r&&=(this.#v(e,this.#r),this.#i=this.#r,null),this.#y(e),this.#d.update(e,this.params),this.#e||(this.#f+=Math.min(e.deltaTime,.1));let n=this.#p.update(this.params,{time:this.#f,dt:this.#e?0:e.deltaTime,dims:e.dims,outputRect:t(this.params.pad,e.dims),mouse:e.mouse,mouseViewport:e.mouseViewport,pixelRatio:e.pixelRatio,live:!this.#e,tilt:this.params.pointer===`tilt`}),r=this.#g(e,n);this.#a.output(e,r,{pad:this.params.pad,antialias:this.params.antialias,raw:this.#h()!==0})}#h(){return V[this.params.debug]??0}#g(e,n){let r=this.#i,i=this.#c;if(!r||!i)return null;let a=this.params,o=this.#a.scene(e,a.pad,a.resolution),[,,s,c]=t(a.pad,e.dims);if(!o||s<=0||c<=0)return null;let l=this.#f,u=Math.max(a.depth/2,.005),d=Number.isFinite(a.bulge)?Math.max(a.bulge,0):0,f=Math.max(a.bulgeWidth,.001),p=d>0?2*d/f:0,m=Number.isFinite(a.relief)&&Math.abs(a.relief)>1e-6?Math.max(a.relief,-2*u*.8):0,h=Math.abs(m)*r.reliefMaxGrad;return e.draw({frag:re(b(this.params.backdrop)),uniforms:{sdfTex:i,sdfRect:r.sdfRect,sdfSize:[r.sdfW,r.sdfH],halfDepth:u,rounding:Math.min(Math.max(a.bevel,0),u),bevelShape:H[a.bevelShape]??0,bulge:d,bulgeWidth:f,stepScale:d>0?1/R(p):1,reliefTex:this.#u??i,relief:m,reliefScale:R(p)/R(p+h),shapeHalf:r.shapeHalf,viewRot:n.viewRot,camDist:n.camDist,focalPx:n.focalPx,eye:[n.eye[0],n.eye[1]],principalPx:n.principalPx,bufferPx:[s,c],pixelSize:s/o.width,ior:Math.max(a.ior,1.0001),dispersion:a.dispersion,paths:v(a.paths,1,U,2),samples:v(a.samples,1,W,8),bounces:v(a.bounces,1,G,3),jitter:Math.min(Math.max(a.jitter,0),1),tint:_(a.tint),absorption:Math.max(a.absorption,0),reflection:Math.max(a.reflection,0),bump:Number.isFinite(a.bump)?Math.min(Math.max(a.bump,0),1):0,bumpScale:Math.max(a.bumpScale,.001),frost:Number.isFinite(a.frost)?Math.min(Math.max(a.frost,0),1):0,...this.#d.uniforms(a,l,u+d+Math.max(m,0),i),debugView:this.#h()},target:o}),o}refresh(){this.#t.refresh()}#_(e,t,n,r){let i=u(this.params.sourceChannel),a=o(e,t,n,i,this.params.depth/2,r,J,Y);if(!a)return!1;let s=ie(e,t,n,a),c=I(this.params.reliefBlur,a);return this.#r={...a,reliefLum:s,reliefRadius:c,...L(s,a,c)},this.#n=i,!0}#v(e,t){let n=e.gl;this.#s&&n.deleteTexture(this.#s),this.#s=null,this.#c=null;let r=g(n,t.sdfW,t.sdfH,t.sdf);e.resetState(),r&&(this.#s=r,this.#c=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`})),this.#b(e,t)}#y(e){let t=this.#i;if(!t)return;let n=I(this.params.reliefBlur,t);n!==t.reliefRadius&&(Object.assign(t,L(t.reliefLum,t,n)),t.reliefRadius=n,this.#b(e,t))}#b(e,t){let n=e.gl;this.#l&&n.deleteTexture(this.#l),this.#l=null,this.#u=null;let r=g(n,t.sdfW,t.sdfH,t.relief);e.resetState();let i=[t.sdfW,t.sdfH];r&&(this.#l=r,this.#u=e.wrapTexture(r,{size:i,filter:`linear`,wrap:`clamp`}))}dispose(){this.#p.dispose(),this.#m?.(),this.#m=null,this.#o&&this.#s&&this.#o.deleteTexture(this.#s),this.#o&&this.#l&&this.#o.deleteTexture(this.#l),this.#d.dispose(this.#o),this.#l=null,this.#u=null,this.#o=null,this.#s=null,this.#c=null,this.#a.dispose(),this.#i=null,this.#r=null,this.#t.reset(),this.#n=null}}})))()}export{k as a,b as c,F as d,g as f,A as i,v as l,ae as n,N as o,oe as r,P as s,z as t,_ as u};