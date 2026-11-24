import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{G as t,K as n}from"./utils-BD-Y7rvP.js";import{c as r,o as i}from"./_bloom-common-C9FLKm3C.js";function a(e,t,n,r){e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4);let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,n,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),i}function o(e,t=`#000000`){let[r,i,a]=n(typeof e==`string`&&O.test(e)?e:t);return[r,i,a]}function s(e,t,n,r){return Number.isFinite(e)?Math.min(Math.max(Math.round(e),t),n):r}function c(e,t,n,r){return Number.isFinite(e)?Math.min(Math.max(e,t),n):r}function l(e){return typeof e==`string`&&e in g}function u(e){return l(e)?g[e]:5}function d(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?[e.naturalWidth||e.width,e.naturalHeight||e.height]:typeof HTMLVideoElement<`u`&&e instanceof HTMLVideoElement?[e.videoWidth||e.width,e.videoHeight||e.height]:[e.width,e.height]}function f(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?e.complete&&e.naturalWidth>0:typeof HTMLVideoElement<`u`&&e instanceof HTMLVideoElement?e.readyState>=2:e.width>0&&e.height>0}function p(e,t){let n=typeof e==`string`?t[e]??t.mono:e,r=n.length>0?[...n]:[...t.mono];for(let e=0;e<r.length;e++)typeof r[e]==`string`&&O.test(r[e])||(r[e]=t.mono[e%t.mono.length]);return r.length===1?[r[0],r[0]]:r}function m(e,t){let n=e.length,r=e.map(e=>o(e)),i=n*2**Math.max(0,Math.ceil(Math.log2(_/n))),a=new Float64Array((i+1)*3),s=(1-t)*i;for(let e=0;e<i;e++){let t=r[Math.floor(e*n/i)];if(n===2){let n=Math.min(Math.max(e+1-s,0),1);t=n===0?r[0]:n===1?r[1]:r[0].map((e,t)=>e+(r[1][t]-e)*n)}for(let n=0;n<3;n++)a[(e+1)*3+n]=a[e*3+n]+t[n]}let c=(e,t)=>{let n=Math.min(Math.floor(e),i-1);return a[n*3+t]+(e-n)*(a[(n+1)*3+t]-a[n*3+t])},l=[];for(let e=i;;e=Math.max(1,Math.floor(e/2))){let t=new Float32Array(e*4),n=i/e;for(let r=0;r<e;r++){for(let e=0;e<3;e++)t[r*4+e]=(c((r+1)*n,e)-c(r*n,e))/n;t[r*4+3]=1}if(l.push(t),e===1)break}return l}var h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A;function j(){return(j=e((()=>{t(),i(),h={mono:[`#000000`,`#ffffff`],pastel:[`#ff9f9f`,`#dfdf80`,`#9fff9f`,`#80dfdf`,`#9f9fff`,`#df80df`],redblue:[`#e8102a`,`#1a3fe0`]},g={none:0,stripes:1,grid:2,marble:3,flow:4},_=4096,v=`0.3`,y=`3.0`,b=`0.14`,x=2048,S=`0.35`,C=`
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
        vec3 n = vec3(q * ${b}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.3, 2.3, 1.5) + vec3(5.2, 1.3, 7.7));
        float s = (a.w + 0.2 * b.w) * ${y};
        u = fract(s + paletteShift);
        vec2 g = (a.xy + 0.46 * b.xy) * ${b};
        gu = ${y} * length(g);
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 4
    if (backdropMode == 4) {
        // "flow": a diagonal run through the palette, bent by a noise
        // field. The bend stays weaker than the run, so the colours keep
        // going one way: no closed rings, and no points where they all
        // meet.
        vec3 n = vec3(q * ${v}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.1, 2.1, 1.3) + vec3(17.3, 5.1, 9.7));
        vec2 dir = vec2(0.7071, -0.7071) * 0.22;
        float h = dot(q, dir) + (a.w + 0.25 * b.w) * 0.32 + backdropOffset * 0.05;
        u = fract(h);
        gu = length(dir + (a.xy + 0.525 * b.xy) * 0.32 * ${v});
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
                fw += rough * ${S} * t;
            }
            col = backdrop(q, fw);
        }
    }
    return col;
}
`,w=`
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
`,T=`#version 300 es
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
`,E=`#version 300 es
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
`,D=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`,O=/^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,k=class{#e;#t;#n=[];#r=null;#i=null;#a=null;#o=2;#s=null;#c=null;#l=1;#u=null;#d=!1;#f=null;#p=!1;#m=!1;#h=0;#g=!1;constructor(e,t){this.#e=e,this.#t=t}contextRestored(){this.#r?.dispose(),this.#i?.dispose(),this.#n=[],this.#r=null,this.#i=null,this.#a=null,this.#p=!0}update(e,t){this.#g=!1,this.#_(e,t),this.#v(e,t),this.#y(e)}uniforms(e,t,n,r){let i=l(e.backdrop)?null:this.#f,a=l(e.backdrop)?g[e.backdrop]:i?5:0,o=this.#t;return{backdropMode:a,backdropTex:i??r,backdropAspect:this.#l,backdropVisible:+!!e.backdropVisible,backdropScale:c(e.backdropScale,.001,1e3,o.backdropScale),backdropDistance:c(e.backdropDistance,n,1e3,Math.max(o.backdropDistance,n)),backdropOffset:t*c(e.backdropSpeed,-1e3,1e3,o.backdropSpeed),paletteTex:(a===g.grid?this.#i:this.#r)??r,paletteSize:this.#o,paletteShift:this.#o===2?.5-c(e.backdropRatio,0,1,o.backdropRatio)/2:0,backdropSoftness:c(e.backdropSoftness,0,1,o.backdropSoftness),lightIntensity:c(e.lightIntensity,0,1e3,o.lightIntensity),lightSoftness:c(e.lightSoftness,0,1,o.lightSoftness)}}#_(e,t){let n=p(t.backdropColors,this.#e),r=t.backdropRatio,i=Number.isFinite(r)?Math.min(Math.max(r,0),1):.5,a=n.length===2?`${n.join(`,`)}|${i}`:n.join(`,`);if(a===this.#a)return;this.#a=a,this.#o=n.length;let o=e.gl;this.#r?.dispose(),this.#i?.dispose();for(let e of this.#n)o.deleteTexture(e);this.#n=[],this.#r=null,this.#i=null;let s=m(n,i);o.pixelStorei(o.UNPACK_FLIP_Y_WEBGL,!1),o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),o.pixelStorei(o.UNPACK_ALIGNMENT,4);let c=t=>{let n=o.createTexture();return o.bindTexture(o.TEXTURE_2D,n),s.forEach((e,t)=>{o.texImage2D(o.TEXTURE_2D,t,o.RGBA16F,e.length/4,1,0,o.RGBA,o.FLOAT,e)}),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR_MIPMAP_LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,t?o.REPEAT:o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),o.bindTexture(o.TEXTURE_2D,null),n?(this.#n.push(n),e.wrapTexture(n,{size:[s[0].length/4,1],filter:`linear`,wrap:[t?`repeat`:`clamp`,`clamp`]})):null};this.#r=c(!0),this.#i=c(!1),e.resetState()}#v(e,t){let n=t.backdrop;if(n===this.#c)return;this.#c=n,this.#s?.dispose(),this.#s=null,this.#u=null,this.#f?.dispose(),this.#f=null;let r=++this.#h;if(l(n))return;let i=t=>{this.#g||r!==this.#h||(this.#s?.dispose(),this.#u=t,this.#m=!1,this.#d=typeof HTMLCanvasElement<`u`&&t instanceof HTMLCanvasElement||typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement,this.#p=!0,this.#s=e.wrapTexture(t,{filter:`linear`,wrap:`clamp`}))};if(typeof n!=`string`){i(n);return}let a=new Image;a.crossOrigin=`anonymous`,a.src=n,a.decode().then(()=>i(a),()=>{!this.#g&&r===this.#h&&console.warn(`[VFX-JS] Could not load the backdrop image: ${n}`)})}#y(e){let t=this.#s,n=this.#u;if(!t||!n||!(this.#p||this.#d))return;if(!f(n)){this.#m=!0,this.#p=!0;return}this.#m&&(this.#m=!1,t.update());let[r,i]=d(n);this.#l=r/i;let a=Math.min(1,x/Math.max(r,i,1)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));(this.#f?.width!==o||this.#f?.height!==s)&&(this.#f?.dispose(),this.#f=e.createRenderTarget({size:[o,s],filter:`linear`,mipmap:!0})),e.draw({frag:D,uniforms:{srcTex:t},target:this.#f}),this.#p=!1}dispose(e){if(this.#g=!0,this.#r?.dispose(),this.#i?.dispose(),e)for(let t of this.#n)e.deleteTexture(t);this.#n=[],this.#r=null,this.#i=null,this.#a=null,this.#s?.dispose(),this.#s=null,this.#u=null,this.#c=null,this.#m=!1,this.#h++,this.#f?.dispose(),this.#f=null}},A=class{#e=null;#t=null;scene(e,t,n){let[,,i,a]=r(t,e.dims);if(i<=0||a<=0)return null;let o=Number.isFinite(n)?Math.min(Math.max(n,.25),2):1,s=Math.max(1,Math.round(i*o)),c=Math.max(1,Math.round(a*o));return this.#e&&this.#e.width===s&&this.#e.height===c||(this.#e?.dispose(),this.#e=e.createRenderTarget({size:[s,c],float:!0,filter:`linear`})),this.#e}output(e,t,n){let[,,i,a]=r(n.pad,e.dims),o=Math.round(i),s=Math.round(a),c=n.antialias&&t!==null&&!n.raw&&o>0&&s>0;c&&(this.#t?.width!==o||this.#t?.height!==s)&&(this.#t?.dispose(),this.#t=e.createRenderTarget({size:[o,s],filter:`linear`}));let l=c?this.#t:null;e.draw({frag:T,uniforms:{scene:t??e.src,hasScene:+!!t,raw:+!!n.raw},target:l??e.target}),l&&e.draw({frag:E,uniforms:{srcTex:l,texel:[1/l.width,1/l.height]},target:e.target})}dispose(){this.#e?.dispose(),this.#e=null,this.#t?.dispose(),this.#t=null}}})))()}export{A as a,o as c,a as d,k as i,j as l,w as n,u as o,C as r,s,h as t,c as u};