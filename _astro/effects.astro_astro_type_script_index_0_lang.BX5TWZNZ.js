import{c as e,d as t,l as n,u as r}from"./vfx.BQzHOgnc.js";import{_ as i,a,c as o,d as s,f as c,g as l,h as u,i as d,l as f,m as p,n as m,o as h,p as g,r as _,s as v,t as y,u as b}from"./pixelate.CZay5LvT.js";import{t as ee}from"./lifecycle.v3sQOfPt.js";import{t as x}from"./lazy.CVoox302.js";var S=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

// Sample at a content-space UV mirror-wrapped into [0, 1], remapped into
// the padded src buffer via srcRectUv.
vec4 mirrorTex(vec2 uv) {
    vec2 uv2 = 1. - abs(1. - mod(uv, 2.0));
    return texture(src, srcRectUv.xy + uv2 * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    float d = pow(l, power) * (intensity * 0.1);

    vec2 uvR = (uv - .5) / (1.0 + d * 1.) + 0.5;
    vec2 uvG = (uv - .5) / (1.0 + d * 2.) + 0.5;
    vec2 uvB = (uv - .5) / (1.0 + d * 3.) + 0.5;

    vec4 cr = mirrorTex(uvR);
    vec4 cg = mirrorTex(uvG);
    vec4 cb = mirrorTex(uvB);

    outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 3.0);
}
`,te={intensity:.3,radius:0,power:2},C=class{params;constructor(e={}){this.params={...te,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:S,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}},ne=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform float threshold;
uniform float thickness;
uniform float intensity;
uniform float opacity;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 background;

vec3 sampleSrc(vec2 uv) {
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw).rgb;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(void) {
    vec2 d = thickness / resolution;
    // Sobel gradient on luminance.
    float tl = lum(sampleSrc(uvContent + vec2(-d.x, d.y)));
    float tc = lum(sampleSrc(uvContent + vec2(0.0, d.y)));
    float tr = lum(sampleSrc(uvContent + vec2(d.x, d.y)));
    float ml = lum(sampleSrc(uvContent + vec2(-d.x, 0.0)));
    float mr = lum(sampleSrc(uvContent + vec2(d.x, 0.0)));
    float bl = lum(sampleSrc(uvContent + vec2(-d.x, -d.y)));
    float bc = lum(sampleSrc(uvContent + vec2(0.0, -d.y)));
    float br = lum(sampleSrc(uvContent + vec2(d.x, -d.y)));

    float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
    float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
    float g = length(vec2(gx, gy));

    float e = clamp(g * intensity - threshold, 0.0, 1.0);
    vec3 edgeCol = mix(color1.rgb, color2.rgb, clamp(g, 0.0, 1.0));
    vec3 base = mix(background.rgb, edgeCol, e);

    // Opacity blends the untouched source back in over the edge render.
    vec3 orig = sampleSrc(uvContent);
    outColor = vec4(mix(base, orig, opacity), 1.0);
}
`,w={threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},T=class{params;constructor(e={}){this.params={...w,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:ne,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],threshold:t.threshold,thickness:Math.max(.5,t.thickness),intensity:Math.max(0,t.intensity),opacity:Math.min(1,Math.max(0,t.opacity)),color1:f(t.color1),color2:f(t.color2),background:f(t.background)},target:e.target})}},E=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform vec2 simTexel;

void main() {
    float L = texture(velocity, uv - vec2(simTexel.x, 0.0)).y;
    float R = texture(velocity, uv + vec2(simTexel.x, 0.0)).y;
    float T = texture(velocity, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(velocity, uv - vec2(0.0, simTexel.y)).x;
    outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`,re=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 simTexel;
uniform float aspect;
uniform vec2 mouseUv;
uniform vec2 mouseDeltaUv;
uniform float curlStrength;
uniform float splatForce;
uniform float splatRadius;

void main() {
    float L = abs(texture(curl, uv - vec2(simTexel.x, 0.0)).x);
    float R = abs(texture(curl, uv + vec2(simTexel.x, 0.0)).x);
    float T = abs(texture(curl, uv + vec2(0.0, simTexel.y)).x);
    float B = abs(texture(curl, uv - vec2(0.0, simTexel.y)).x);
    float C = texture(curl, uv).x;

    vec2 force = vec2(T - B, R - L);
    float len = length(force);
    force = len > 0.0001 ? force / len : vec2(0.0);
    force *= curlStrength * C;
    force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    vel += force * 0.016;
    vel = clamp(vel, vec2(-1000.0), vec2(1000.0));

    // Mouse splat. diff is in uv space; aspect-correct so the falloff
    // is circular regardless of element shape.
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / splatRadius);
    vel += mouseDeltaUv * mSplat * splatForce;

    outColor = vec4(vel, 0.0, 1.0);
}
`,ie=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D vortVel;
uniform vec2 simTexel;

void main() {
    float L = texture(vortVel, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(vortVel, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(vortVel, uv + vec2(0.0, simTexel.y)).y;
    float B = texture(vortVel, uv - vec2(0.0, simTexel.y)).y;
    vec2 C = texture(vortVel, uv).xy;
    // No-flow-through walls: reflect velocity at boundaries.
    if (uv.x - simTexel.x < 0.0) L = -C.x;
    if (uv.x + simTexel.x > 1.0) R = -C.x;
    if (uv.y + simTexel.y > 1.0) T = -C.y;
    if (uv.y - simTexel.y < 0.0) B = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`,ae=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 simTexel;

void main() {
    float L = texture(pressure, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(pressure, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(pressure, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(pressure, uv - vec2(0.0, simTexel.y)).x;
    float div = texture(divergence, uv).x;
    outColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`,oe=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D vortVel;
uniform sampler2D pressure;
uniform vec2 simTexel;

void main() {
    float L = texture(pressure, uv - vec2(simTexel.x, 0.0)).x;
    float R = texture(pressure, uv + vec2(simTexel.x, 0.0)).x;
    float T = texture(pressure, uv + vec2(0.0, simTexel.y)).x;
    float B = texture(pressure, uv - vec2(0.0, simTexel.y)).x;
    vec2 vel = texture(vortVel, uv).xy;
    vel -= vec2(R - L, T - B);
    outColor = vec4(vel, 0.0, 1.0);
}
`,se=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D projVel;
uniform vec2 simTexel;
uniform float velocityDissipation;

void main() {
    vec2 vel = texture(projVel, uv).xy;
    vec2 coord = uv - vel * simTexel * 0.016;
    vec2 advected = texture(projVel, coord).xy;
    advected /= 1.0 + velocityDissipation * 0.016;
    outColor = vec4(advected, 0.0, 1.0);
}
`,ce=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D velocity;
uniform sampler2D dye;
uniform float time;
uniform float aspect;
uniform vec2 mouseUv;
uniform vec2 mouseDeltaUv;
uniform vec2 simSize;
uniform float densityDissipation;
uniform float dyeSplatRadius;
uniform float dyeSplatIntensity;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Velocity is in sim-texel units; convert to UV displacement.
    vec2 vel = texture(velocity, uv).xy;
    vec2 velTexel = 1.0 / simSize;
    vec2 coord = uv - vel * velTexel * 0.016;
    vec3 d = texture(dye, coord).rgb;

    d /= 1.0 + densityDissipation * 0.016;

    // Mouse dye splat (speed-dependent, hue cycles with time).
    vec2 diff = uv - mouseUv;
    diff.x *= aspect;
    float mSplat = exp(-dot(diff, diff) / dyeSplatRadius);
    float mSpeed = length(mouseDeltaUv) * max(simSize.x, simSize.y);
    vec3 mColor = hsv2rgb(vec3(fract(time * 0.06), 0.85, 1.0));
    d += mColor * mSplat * clamp(mSpeed * dyeSplatIntensity, 0.0, 3.0);

    outColor = vec4(max(d, vec3(0.0)), 1.0);
}
`,le=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D dye;
uniform sampler2D velocity;
uniform vec2 simSize;
uniform float showDye;
uniform float time;

vec3 spectrum(float x) {
    return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * 3.14);
}

void main() {
    vec3 c = texture(dye, uv).rgb;

    if (showDye > 0.5) {
        float a = max(c.r, max(c.g, c.b));
        outColor = vec4(c, a);
    } else {
        vec2 vel = texture(velocity, uv).xy;
        vec2 disp = vel / simSize;

        vec2 cr = texture(src, uvSrc - disp * 0.080).ra;
        vec2 cg = texture(src, uvSrc - disp * 0.060).ga;
        vec2 cb = texture(src, uvSrc - disp * 0.040).ba;
        outColor = vec4(cr.x, cg.x, cb.x, (cr.y + cg.y + cb.y) / 3.);

        float v = length(disp);
        outColor += vec4(spectrum(sin(v * 3. + time) * 0.4 + 0.5), 1)
                  * smoothstep(.2, .8, v) * 0.2;
    }
}
`,ue={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},de=class{params;#e=null;#t=null;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=[0,0];#l=!1;constructor(e={}){this.params={...ue,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};this.#e=e.createRenderTarget(n),this.#t=e.createRenderTarget(n),this.#n=e.createRenderTarget(n),this.#r=e.createRenderTarget(n),this.#i=e.createRenderTarget(n),this.#a=e.createRenderTarget(n),this.#o=e.createRenderTarget({size:t,float:!0,persistent:!0}),this.#s=e.createRenderTarget({float:!0,persistent:!0})}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#o||!this.#s)return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=this.#l?[h[0]-this.#c[0],h[1]-this.#c[1]]:[0,0];this.#c=h,this.#l=!0,e.draw({frag:E,uniforms:{velocity:this.#o,simTexel:d},target:this.#e}),e.draw({frag:re,uniforms:{velocity:this.#o,curl:this.#e,simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:this.#t}),e.draw({frag:ie,uniforms:{vortVel:this.#t,simTexel:d},target:this.#n}),e.clear(this.#r);let _=this.#r,v=this.#i;for(let t=0;t<n;t++){e.draw({frag:ae,uniforms:{pressure:_,divergence:this.#n,simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:oe,uniforms:{vortVel:this.#t,pressure:_,simTexel:d},target:this.#a}),e.draw({frag:se,uniforms:{projVel:this.#a,simTexel:d,velocityDissipation:i},target:this.#o}),e.draw({frag:ce,uniforms:{velocity:this.#o,dye:this.#s,time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:this.#s}),e.draw({frag:le,uniforms:{src:e.src,dye:this.#s,velocity:this.#o,simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#l=!1}},fe=8,pe=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${fe}];
uniform int colorCount;
uniform float scatter;
uniform float offset;
uniform int repeatType;
uniform float frequency;
uniform int mixSpace;
uniform float time;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 srgb2lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
// Clamp first: OKLab interpolation can leave the gamut, and pow() of a
// negative value is NaN (renders as garbage/magenta).
vec3 lin2srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

vec3 lin2oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
    );
}
vec3 oklab2lin(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
    );
}

// Interpolate two sRGB colors in the selected space, returning sRGB.
vec3 mixColor(vec3 a, vec3 b, float t) {
    if (mixSpace == 1) {
        return lin2srgb(mix(srgb2lin(a), srgb2lin(b), t));
    } else if (mixSpace == 2) {
        vec3 oa = lin2oklab(srgb2lin(a));
        vec3 ob = lin2oklab(srgb2lin(b));
        return lin2srgb(oklab2lin(mix(oa, ob, t)));
    }
    return mix(a, b, t);
}

// Fold t into [0, 1] per the repeat mode (none = clamp).
float applyRepeat(float t) {
    if (repeatType == 1) return fract(t);
    if (repeatType == 2) return 1.0 - abs(1.0 - fract(t * 0.5) * 2.0);
    return clamp(t, 0.0, 1.0);
}

vec3 sampleGradient(float t) {
    float f = t * float(colorCount - 1);
    int i = int(floor(f));
    i = clamp(i, 0, colorCount - 2);
    float frac = clamp(f - float(i), 0.0, 1.0);
    return clamp(mixColor(colors[i], colors[i + 1], frac), 0.0, 1.0);
}

void main(void) {
    vec4 tex = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    // src is premultiplied; take luma of the straight color.
    vec3 rgb = tex.a > 0.0 ? tex.rgb / tex.a : vec3(0.0);
    float l = dot(rgb, vec3(0.299, 0.587, 0.114));
    // Hash in pixel space (gl_FragCoord); hash12 degenerates on tiny
    // [0,1] uv inputs.
    l += scatter * (hash12(gl_FragCoord.xy) - 0.5);

    // offset (and time drift) advance one full cycle per unit, so a 0->1
    // offset sweep runs (frequency) cycles.
    float t = applyRepeat((l + offset + time) * frequency);
    // Premultiply: the final blit is premultiplied, so non-zero rgb in
    // transparent areas would add to the background as stray color.
    outColor = vec4(sampleGradient(t) * tex.a, tex.a);
}
`,me={none:0,repeat:1,mirror:2},he={srgb:0,linear:1,oklab:2},ge={colors:[`#bbee00`,`#3aa0ff`,`#000000`],scatter:0,offset:0,repeat:`mirror`,frequency:1,mixSpace:`srgb`,speed:0},_e=class{params;constructor(e={}){this.params={...ge,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,n=t.colors.length>=2?t.colors:ge.colors,r=Math.min(fe,n.length),i=new Float32Array(24);for(let e=0;e<fe;e++){let[t,a,o]=f(n[Math.min(e,r-1)]);i[e*3]=t,i[e*3+1]=a,i[e*3+2]=o}e.draw({frag:pe,uniforms:{src:e.src,colors:i,colorCount:r,scatter:Math.max(0,t.scatter),offset:t.offset,repeatType:me[t.repeat]??0,frequency:t.frequency,mixSpace:he[t.mixSpace]??0,time:e.time*t.speed},target:e.target})}},ve=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float shift;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hueShift(vec3 rgb, float t) {
    vec3 hsv = rgb2hsv(rgb);
    hsv.x = fract(hsv.x + t);
    return hsv2rgb(hsv);
}

void main (void) {
    vec4 color = readTex(uvContent);
    color.rgb = hueShift(color.rgb, shift);
    outColor = color;
}
`,ye={shift:.5},be=class{params;constructor(e={}){this.params={...ye,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:ve,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}},xe=.7,Se=1.3,Ce=`
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

float snoise(vec4 v) {
    const vec2 C = vec2(0.138196601125010504,
                        0.309016994374947451);
    vec4 i = floor(v + dot(v, C.yyyy));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
    vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
    vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
    vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
    i = mod289(i);
    float j0 = permute(
        permute(permute(permute(i.w) + i.z) + i.y) + i.x
    );
    vec4 j1 = permute(
        permute(
            permute(
                permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                + i.z + vec4(i1.z, i2.z, i3.z, 1.0)
            )
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0)
        )
        + i.x + vec4(i1.x, i2.x, i3.x, 1.0)
    );
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
        + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
}

vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
    vec4 dy = vec4(0.0, eps, 0.0, 0.0);
    vec4 dz = vec4(0.0, 0.0, eps, 0.0);
    vec4 pa = vec4(p,                                          t);
    vec4 pb = vec4(p + vec3(31.341, 47.853, 19.287),           t);
    vec4 pc = vec4(p + vec3(83.519, 71.523, 53.819),           t);
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}

// Aspect-corrected curl sampler. stretch maps element px so the noise
// grid is isotropic in screen space; the inverse scaling on the output
// keeps the velocity field circular regardless of element aspect.
vec3 sampleCurl(vec3 pos, vec2 elementPixel, float scale, float animTime) {
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 noiseInput = pos * stretch / max(scale, 1e-4);
    return curl3D(noiseInput, animTime) / stretch;
}
`,D=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),O=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,we=`#version 300 es
precision highp float;
in vec2 vCorner;
in vec4 vColor;
out vec4 outColor;

void main() {
    float d = length(vCorner) * 2.0;
    float fall = 1.0 - smoothstep(0.6, 1.0, d);
    if (fall <= 0.0) discard;
    float a = vColor.a * fall;
    outColor = vec4(vColor.rgb * a, a);
}
`,Te=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform sampler2D particleStamp;
uniform float trailFade;
uniform int blendMode;

void main() {
    vec4 prev = texture(trailPrev, uv);
    vec4 stamp = texture(particleStamp, uv);
    vec4 faded = prev * trailFade;
    if (blendMode == 1) {
        outColor = vec4(
            stamp.rgb + faded.rgb * (1.0 - stamp.a),
            clamp(stamp.a + faded.a * (1.0 - stamp.a), 0.0, 1.0)
        );
    } else {
        outColor = vec4(
            faded.rgb + stamp.rgb,
            clamp(faded.a + stamp.a, 0.0, 1.0)
        );
    }
}
`;function k(e){let t=A(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function A(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Ee(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}var De=.1;function j(e){return Math.min(De,Math.max(0,e))}var M=64,N=4096,Oe=.1,ke=[M,M],Ae=new Float32Array(N);for(let e=0;e<N;e++)Ae[e]=e;var je=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Me=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,Ne=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fadeIn;
uniform float fog;
uniform vec4 contentRectUv;

out vec2 vCorner;
out vec4 vColor;

void main() {
    int id = gl_InstanceID;
    if (id >= particleCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }
    int sx = id % int(stateSize.x);
    int sy = id / int(stateSize.x);
    vec2 stateUv = (vec2(float(sx), float(sy)) + 0.5) / stateSize;
    vec4 s = texture(posTex, stateUv);
    vec4 c = texture(colorTex, stateUv);

    float age = s.w;
    // smoothstep rise to ~1 at age=fadeIn, then pow-shaped decay to 0
    // at age=1. Small fadeIn keeps the radial-emit phase visible;
    // larger values restore the slow fade-in look.
    float rise = fadeIn > 0.0 ? smoothstep(0.0, fadeIn, age) : 1.0;
    float fall = pow(max(1.0 - age, 0.0), alphaDecay);
    float lifeAlpha = rise * fall;
    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    float fogFactor = fog > 0.0
        ? mix(1.0, smoothstep(1.0, -0.5, s.z), fog)
        : 1.0;

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, lifeAlpha * alpha * fogFactor);
}
`,Pe=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D trail;
uniform float srcOpacity;

void main() {
    // src is element-sized; the trail buffer extends to the canvas, so
    // mask src outside [0,1].
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = inside.x * inside.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0))
              * srcOpacity * srcMask;
    vec4 t = texture(trail, uv);
    outColor = vec4(base.rgb * (1.0 - t.a) + t.rgb, max(base.a, t.a));
}
`,Fe=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform sampler2D velTex;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float noiseSpeed;
uniform float emitSpeed;
uniform float noiseDelay;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float life;
${Ce}

void main() {
    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    vec3 curlV = sampleCurl(s.xyz, elementPixel, noiseScale, time * noiseAnimation);

    // velTex.xy is a unit direction in pixel space (0 for screen
    // spawns). Multiplying by shortAxis/elementPixel converts to a
    // uv-space velocity that's isotropic in screen px (circular blast
    // on non-square elements) and short-axis-normalized so emitSpeed
    // and noiseSpeed share the same uv/sec scale.
    vec2 radialDirPx = texture(velTex, uv).xy;
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 radialV = vec3(
        radialDirPx * shortAxis / max(elementPixel, vec2(1.0)),
        0.0
    );

    float blend = noiseDelay > 0.0 ? smoothstep(0.0, noiseDelay, age) : 1.0;
    vec3 v = mix(radialV * emitSpeed, curlV * noiseSpeed, blend);

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + v * dt * taper;

    float lifeMul = max(texture(colorTex, uv).w, 1e-3);
    age += dt / (max(life, 1e-3) * lifeMul);

    outColor = vec4(pos, age);
}
`,P=`#version 300 es
precision highp float;
in float position;

uniform sampler2D uSpawnTex;
uniform vec2 uSpawnTexSize;
uniform int uSpawnCount;
uniform vec2 stateSize;

out vec4 vSpawn;

void main() {
    int idx = int(position);
    if (idx >= uSpawnCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vSpawn = vec4(0.0);
        return;
    }
    int sx = idx % int(uSpawnTexSize.x);
    int sy = idx / int(uSpawnTexSize.x);
    vec4 s = texelFetch(uSpawnTex, ivec2(sx, sy), 0);
    int slot = int(s.x);
    int tx = slot % int(stateSize.x);
    int ty = slot / int(stateSize.x);
    vec2 ndc = (vec2(float(tx), float(ty)) + 0.5) / stateSize * 2.0 - 1.0;
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = 1.0;
    vSpawn = s;
}
`,Ie=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform float alphaThreshold;

void main() {
    vec2 spawnUv = vSpawn.yz;
    vec2 inside = step(vec2(0.0), spawnUv) * step(spawnUv, vec2(1.0));
    float visible = inside.x * inside.y;
    float a = texture(src, clamp(spawnUv, 0.0, 1.0)).a * visible;
    if (a < alphaThreshold) {
        outColor = vec4(0.0, 0.0, 0.0, 2.0); // born dead
        return;
    }
    outColor = vec4(spawnUv, 0.0, 0.0);
}
`,Le=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${O}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    // Un-premultiply; the particle shader multiplies by alpha.
    vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
    outColor = vec4(mix(rgb, color, colorMix), lifeJitter);
}
`,Re=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,ze={count:1048576,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},Be=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o=!1;#s;#c;#l=new Float32Array(N*4);#u=null;#d=null;#f=null;#p=null;#m=null;#h=null;#g=0;#_=0;#v=0;#y=null;#b=-1/0;constructor(e={}){this.#e={...ze,...e},this.#e.count=A(this.#e.count),this.#s=k(this.#e.count),this.#c=this.#s*this.#s}get maxCount(){return this.#c}setParam(e){let t=this.#e;for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?A(r):r)}init(e){this.#x(e),this.#i=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#a=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#p={attributes:{position:D}},this.#f={mode:`points`,attributes:{position:{data:Ae,itemSize:1}}},this.#m=e.gl,this.#w(e),this.#h=e.onContextRestored(()=>{this.#m=e.gl,this.#w(e),this.#o=!1})}#x(e){let t={size:[this.#s,this.#s],float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t),this.#r=e.createRenderTarget(t)}#S(){this.#t?.dispose(),this.#n?.dispose(),this.#r?.dispose(),this.#t=null,this.#n=null,this.#r=null}#C(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,M,M,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[M,M],filter:`nearest`,wrap:`clamp`})}}#w(e){let t=this.#C(e);this.#u=t.raw,this.#d=t.handle}#T(e){if(!this.#u)return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,this.#u),t.texSubImage2D(t.TEXTURE_2D,0,0,0,M,M,t.RGBA,t.FLOAT,this.#l),t.bindTexture(t.TEXTURE_2D,null)}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#p||!this.#f||!this.#d||!this.#u)return;let t=k(this.params.count);t!==this.#s&&(this.#S(),this.#s=t,this.#c=t*t,this.#x(e),this.#g=0,this.#o=!1),this.#o||=(e.draw({frag:je,target:this.#t}),e.draw({frag:Me,target:this.#n}),e.draw({frag:Me,target:this.#r}),!0);let n=j(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[this.#s,this.#s],a=this.#E(e,n,r);a>0&&this.#T(e);let o=a===0;if(e.draw({frag:Fe,uniforms:{posTex:this.#t,colorTex:this.#n,velTex:this.#r,elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:this.#t,swap:o}),a>0){let t={uSpawnTex:this.#d,uSpawnTexSize:ke,uSpawnCount:a,stateSize:i};e.draw({vert:P,frag:Ie,geometry:this.#f,uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:this.#t,blend:`none`}),e.draw({vert:P,frag:Le,geometry:this.#f,uniforms:{...t,src:e.src,color:Ee(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[xe,Se]},target:this.#n,blend:`none`}),e.draw({vert:P,frag:Re,geometry:this.#f,uniforms:t,target:this.#r,blend:`none`})}let s=this.#D();this.#p.instanceCount=s,e.clear(this.#i),e.draw({vert:Ne,frag:we,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:this.#p,target:this.#i,blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:Te,uniforms:{trailPrev:this.#a,particleStamp:this.#i,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#a}),e.draw({frag:Pe,uniforms:{src:e.src,trail:this.#a,srcOpacity:this.params.srcOpacity},target:e.target})}#E(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!this.#y||Math.abs(r[0]-this.#y[0])>1e-6||Math.abs(r[1]-this.#y[1])>1e-6)&&(this.#b=e.time),this.#y=r;let i=e.intersection>0,a=e.time-this.#b<Oe;this.#_=i&&(a||this.params.spawnOnIdle)?Math.min(this.#_+this.params.birthRate*t,N):0,this.#v=i?Math.min(this.#v+this.params.screenBirthRate*t,N):0;let o=Math.min(N,Math.floor(this.#_)),s=Math.min(N-o,Math.floor(this.#v));this.#_-=o,this.#v-=s;let c=o+s;if(c===0)return 0;let l=this.#D(),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=this.#l,p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=this.#g,f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,this.#g=(this.#g+1)%l}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=this.#g,f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,this.#g=(this.#g+1)%l}return c}#D(){return Math.max(1,Math.min(this.#c,Math.floor(this.params.count)))}dispose(){this.#h?.(),this.#h=null,this.#m&&this.#u&&this.#m.deleteTexture(this.#u),this.#u=null,this.#d=null,this.#f=null,this.#m=null,this.#S(),this.#i?.dispose(),this.#a?.dispose(),this.#i=null,this.#a=null,this.#p=null,this.#o=!1}outputRect(e){return e.canvasRect}},Ve=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform vec2 stateSize;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float noiseSpeed;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float outwardBias;
uniform float duration;
uniform float count;
uniform int uBurst;
${O}
${Ce}

void main() {
    if (uBurst == 1) {
        ivec2 pix = ivec2(floor(uv * stateSize));
        float fid = float(pix.y * int(stateSize.x) + pix.x);
        if (fid >= count) {
            outColor = vec4(0.0, 0.0, 0.0, 2.0); // dead
            return;
        }
        vec2 spawnUv = vec2(
            hash21(uv * 31.7 + 11.13),
            hash21(uv * 73.13 + 7.71)
        );
        float z0 = (hash21(uv * 53.7 + 0.81) - 0.5) * 0.02;
        outColor = vec4(spawnUv, z0, 0.0);
        return;
    }

    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    vec3 vNoise = sampleCurl(s.xyz, elementPixel, noiseScale, time * noiseAnimation);
    vec3 outward = vec3(s.xy - vec2(0.5), s.z) * outwardBias;

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + (vNoise + outward) * noiseSpeed * dt * taper;

    float lifespanScale = mix(
        ${xe.toFixed(4)},
        ${Se.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,He=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${O}

void main() {
    ivec2 pix = ivec2(floor(uv * stateSize));
    float fid = float(pix.y * int(stateSize.x) + pix.x);
    if (fid >= count) {
        outColor = vec4(0.0);
        return;
    }
    vec2 spawnUv = vec2(
        hash21(uv * 31.7 + 11.13),
        hash21(uv * 73.13 + 7.71)
    );
    vec2 sampleUv = srcRectUv.xy + spawnUv * srcRectUv.zw;
    vec4 c = texture(src, sampleUv);
    // Un-premultiply; the particle shader multiplies by alpha.
    vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
    outColor = vec4(mix(rgb, color, colorMix), c.a);
}
`,Ue=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fog;
uniform vec4 contentRectUv;

out vec2 vCorner;
out vec4 vColor;

void main() {
    int id = gl_InstanceID;
    if (id >= particleCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }
    int sx = id % int(stateSize.x);
    int sy = id / int(stateSize.x);
    vec2 stateUv = (vec2(float(sx), float(sy)) + 0.5) / stateSize;
    vec4 s = texture(posTex, stateUv);
    vec4 c = texture(colorTex, stateUv);

    float age = s.w;
    // Quarter-cosine envelope: full alpha at trigger, 0 at age=1.
    // alphaDecay > 1 holds peak alpha longer; < 1 makes the fade snappy.
    float lifeAlpha = (age >= 0.0 && age < 1.0)
        ? pow(cos(age * 1.5707963), alphaDecay)
        : 0.0;
    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    float fogFactor = fog > 0.0
        ? mix(1.0, smoothstep(1.0, -0.5, s.z), fog)
        : 1.0;

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha * fogFactor);
}
`,We=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,Ge={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},Ke=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o;#s=!1;#c=!1;#l=-1;#u=0;#d=0;constructor(e={}){this.#e={...Ge,...e},this.#e.count=A(this.#e.count);let t=k(this.#e.count);this.#o=[t,t]}trigger(){this.#s=!0,this.#c=!0,this.#l=-1,this.#u=0,this.#d=0}reset(){this.#s=!1,this.#c=!1,this.#l=-1,this.#u=0,this.#d=0}isDone(){return!this.#s||this.#u<this.params.duration?!1:this.#d>=this.#f()}#f(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))}init(e){this.#p(e),this.#r=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#i=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#a={attributes:{position:D}}}#p(e){let t={size:this.#o,float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t)}#m(){this.#t?.dispose(),this.#n?.dispose(),this.#t=null,this.#n=null}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||e.intersection<=0)return;let t=k(this.params.count),n=!this.#s||this.isDone();if(t!==this.#o[0]&&n&&(this.#m(),this.#o=[t,t],this.#p(e)),!this.#s){e.blit(e.src,e.target);return}this.#l<0&&(this.#l=e.time);let r=e.time-this.#l;this.#u=r;let i=r>=this.params.duration;if(i&&this.#d>=this.#f()){e.clear(e.target);return}let a=j(e.deltaTime),o=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(i)e.clear(this.#r),this.#d++;else{let t=+!!this.#c;this.#c=!1;let n=this.#h();e.draw({frag:Ve,uniforms:{posTex:this.#t,stateSize:this.#o,elementPixel:o,time:e.time,dt:a,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:this.#t}),t===1&&(e.draw({frag:He,uniforms:{src:e.src,stateSize:this.#o,count:n,color:Ee(this.params.color),colorMix:this.params.colorMix},target:this.#n}),e.clear(this.#i)),this.#a.instanceCount=n,e.clear(this.#r),e.draw({vert:Ue,frag:we,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:this.#o,pointSize:this.params.pointSize,elementPixel:o,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:this.#a,target:this.#r,blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:Te,uniforms:{trailPrev:this.#i,particleStamp:this.#r,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#i}),e.draw({frag:We,uniforms:{trail:this.#i},target:e.target})}#h(){let e=this.#o[0]*this.#o[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}dispose(){this.#m(),this.#r?.dispose(),this.#i?.dispose(),this.#r=null,this.#i=null,this.#a=null}outputRect(e){return e.canvasRect}},qe=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform int pattern;
uniform int edgeWrap;
uniform float strength;
uniform float smoothness;
uniform float frost;
uniform float dispersion;
uniform float stripWidth;
uniform float angle;
uniform float aspect;
${o}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise: bilinear-interpolated lattice hash.
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// Edge sampling for out-of-range coordinates.
vec4 readTexWrap(vec2 uv) {
    if (edgeWrap == 0) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            return vec4(0.0);
    } else if (edgeWrap == 1) {
        uv = clamp(uv, 0.0, 1.0);
    } else if (edgeWrap == 2) {
        uv = fract(uv);
    } else {
        vec2 m = mod(uv, 2.0);
        uv = mix(m, 2.0 - m, step(1.0, m));
    }
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

// Sample coordinate after the pattern displacement. stGrid fixes the pattern
// geometry (same for every channel); stDisp scales the displacement and is
// varied per channel to get dispersion, so RGB shifts within a strip while the
// strip boundaries stay aligned.
vec2 patternSample(vec2 uv, float stGrid, float stDisp) {
    vec2 q = rot2d(-radians(angle)) * (uv - center);
    float count = 1.0 / stripWidth;

    if (pattern == 2) {
        // Circular: shrink the content inside each grid circle toward the
        // circle's own center. aspect keeps the cells square so circles stay
        // round on any element shape.
        vec2 qa = vec2(q.x * aspect, q.y);
        vec2 g = qa * count;
        vec2 cl = fract(g) - 0.5;
        float r = length(cl);
        float edge = r * 2.0;
        float taper = smoothness > 0.0
            ? smoothstep(1.0, 1.0 - smoothness, edge)
            : step(edge, 1.0);
        float mask = r < 0.5 ? taper : 0.0;
        // Push the sample out from the circle center so a wider area maps in.
        vec2 offset = vec2(cl.x / aspect, cl.y) / count;
        q += offset * stDisp * mask;
        return rot2d(radians(angle)) * q + center;
    }

    // Lenticular: displace each strip's sample by its position within the
    // strip. n runs -1..1 across the strip. smoothness=0 keeps the interior
    // flat and spikes at the boundary (a jump, drawn as a tail); smoothness=1
    // is a sine: zero at the boundary, smooth wave that folds at the edges.
    float gx = q.x;
    float bendPhase = (q.y + 0.5) * TAU / (5.0 * stripWidth);
    if (pattern == 1) {
        // Waves: bend the lens grid along y. Frequency scales with 1/stripWidth.
        gx += sin(bendPhase) * stGrid * 0.5 * stripWidth;
    }
    float n = fract(gx * count) * 2.0 - 1.0;
    float sharp = sign(n) * pow(abs(n), 8.0);
    float soft = sin(n * TAU * 0.5);
    // Waves: keep the bend near the strip boundary so the interior stays flat
    // and adjacent strips join up; raising smoothness widens the connection.
    if (pattern == 1) soft *= n * n;
    float shape = mix(sharp, soft, smoothness);
    float disp = 0.3 * stripWidth * stDisp * shape;
    q.x += disp;
    if (pattern == 1) {
        // Refraction follows the bent grid: y shift = x shift times the grid's
        // slope along y, so where the bend rises the sample tilts up-right.
        q.y += disp * cos(bendPhase) * stGrid * 0.5 * TAU / 5.0;
    }
    return rot2d(radians(angle)) * q + center;
}

void main(void) {
    vec2 uvR = patternSample(uvContent, strength, strength * (1.0 + dispersion));
    vec2 uvG = patternSample(uvContent, strength, strength);
    vec2 uvB = patternSample(uvContent, strength, strength * (1.0 - dispersion));

    if (frost > 0.0) {
        // Frost: jitter the sample with value noise for a frosted-glass blur.
        vec2 j = (vec2(
            valueNoise(uvContent * 1024.0),
            valueNoise(uvContent * 1024.0 + 19.0)
        ) - 0.5) * frost * 0.05;
        uvR += j;
        uvG += j;
        uvB += j;
    }

    vec4 cg = readTexWrap(uvG);
    outColor = vec4(
        readTexWrap(uvR).r,
        cg.g,
        readTexWrap(uvB).b,
        cg.a
    );
}
`,Je={lenticular:0,waves:1,circular:2},Ye={zero:0,clamp:1,repeat:2,mirror:3},Xe={pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},Ze=class{params;constructor(e={}){this.params={...Xe,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:qe,uniforms:{src:e.src,center:[t.centerX,t.centerY],pattern:Je[t.pattern]??0,edgeWrap:Ye[t.edgeWrap]??0,strength:t.strength,smoothness:Math.min(1,Math.max(0,t.smoothness)),frost:Math.max(0,t.frost),dispersion:Math.max(0,t.dispersion),stripWidth:Math.min(1,Math.max(.001,t.stripWidth)),angle:t.angle,aspect:(n||1)/(r||1)},target:e.target})}},Qe=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform float angle;
uniform float offset;
uniform float reach;
uniform float smoothness;
${o}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Quadratic smooth min/max (Inigo Quilez) to round the band corners.
float smin(float a, float b, float k) {
    k = max(k, 1e-4);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

void main(void) {
    vec2 pr = rot2d(-radians(angle)) * (uvContent - center);

    // Line position along the rotated y axis (offset 0 = center).
    float line = offset * 0.5;
    float k = min(smoothness, max(reach, 0.0) * 0.49);

    // Source displacement: 0 below the line, ramps to reach across the
    // band, then holds at reach (shifting the rest of the image up).
    float disp = smin(smax(pr.y - line, 0.0, k), reach, k);

    vec2 uv = rot2d(radians(angle)) * vec2(pr.x, pr.y - disp) + center;
    outColor = readTex(uv);
}
`,$e={offset:0,reach:.1,smoothness:0,centerX:.5,centerY:.5,angle:45},et=class{params;constructor(e={}){this.params={...$e,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:Qe,uniforms:{src:e.src,center:[t.centerX,t.centerY],angle:t.angle,offset:t.offset,reach:Math.max(0,t.reach),smoothness:Math.max(0,t.smoothness)},target:e.target})}},tt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float aspect;
uniform float frequency;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hueShift(vec3 rgb, float t) {
    vec3 hsv = rgb2hsv(rgb);
    hsv.x = fract(hsv.x + t);
    return hsv2rgb(hsv);
}

void main() {
    vec2 uv = uvContent;
    vec2 uv2 = uv;
    uv2.x *= aspect;

    float x = (uv2.x - uv2.y) * frequency - fract(time);

    vec4 img = readTex(uv);
    float gray = length(img.rgb);

    img.rgb = vec3(hueShift(vec3(1, 0, 0), x) * gray);

    outColor = img;
}
`,nt={speed:1,frequency:1},rt=class{params;constructor(e={}){this.params={...nt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:tt,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}},it=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amount;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float random(vec2 st) {
    return fract(sin(dot(st, vec2(948.,824.))) * 30284.);
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float tt = mod(time, 17.);

    if (fract(tt * 0.73) > .8 || fract(tt * 0.91) > .8) {
        float t = floor(tt * 11.);

        float n = random(vec2(t, floor(uv.y * 17.7)));
        if (n > .7) {
            uvr.x += random(vec2(t, 1.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 2.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 3.)) * (amount * 2.0) - amount;
        }

        float ny = random(vec2(t * 17. + floor(uv * 19.7)));
        if (ny > .7) {
            uvr.x += random(vec2(t, 4.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 5.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 6.)) * (amount * 2.0) - amount;
        }
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        step(.1, cr.a + cg.a + cb.a)
    );
}
`,at={speed:1,amount:.05},ot=class{params;constructor(e={}){this.params={...at,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:it,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}},st=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float nn(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );

    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float t = mod(time, 30.);

    if (abs(nn(uv.y, t)) > 1.) {
        uvr.x += nn(uv.y, t) * amp;
        uvg.x += nn(uv.y, t + 10.) * amp;
        uvb.x += nn(uv.y, t + 20.) * amp;
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        smoothstep(.0, 1., cr.a + cg.a + cb.a)
    );
}
`,ct={speed:1,amount:10},lt=class{params;constructor(e={}){this.params={...ct,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:st,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}},ut=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float innerHeight;
uniform float spacing;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Keep one 1-px line per spacing-px band; rest goes black.
        float yPx = uvContent.y * innerHeight;
        if (mod(floor(yPx), spacing) < 1.0) {
            c = texture(src, uvSrc);
        }
    }
    outColor = c;
}
`,dt={spacing:4},ft=class{params;constructor(e={}){this.params={...dt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:ut,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}},pt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;
uniform float frequency;
uniform float blurDx;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec4 draw(vec2 uv) {
    vec2 uvr = uv, uvg = uv, uvb = uv;

    uvr.x += sin(uv.y * frequency + time * 3.) * amp;
    uvg.x += sin(uv.y * frequency + time * 3. + .4) * amp;
    uvb.x += sin(uv.y * frequency + time * 3. + .8) * amp;

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    return vec4(
        cr.r,
        cg.g,
        cb.b,
        cr.a + cg.a + cb.a
    );
}

void main (void) {
    vec2 uv = uvContent;

    // x blur (blurDx == 0 collapses the 3 taps back to a single sample)
    vec2 dx = vec2(blurDx, 0.0);
    outColor = (draw(uv) * 2. + draw(uv + dx) + draw(uv - dx)) / 4.;
}
`,mt={speed:1,amount:20,frequency:7,blur:2},ht=class{params;constructor(e={}){this.params={...mt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:pt,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}},gt=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform float angle;
uniform float size;
uniform float shift;
uniform float random;
${o}

vec4 readTex(vec2 c) {
    return texture(src, srcRectUv.xy + fract(c) * srcRectUv.zw);
}

// Per-strip sample offset, in strip-size units, along the division axis.
// Strip n samples toward the center strip by n * shift, so shift = 1 makes
// every strip show the center strip. random adds a per-strip jitter.
float stripShift(float n) {
    float jitter = (hash11(n) * 2.0 - 1.0) * random;
    return n * shift + jitter;
}

void main(void) {
    // Division axis in element-pixel space; strips stack along it.
    vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));
    float t = dot((uvContent - center) * resolution, dir);
    float n = floor(t / size + 0.5);

    vec2 uv = uvContent - stripShift(n) * size * dir / resolution;
    outColor = readTex(uv);
}
`,_t={shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},vt=class{params;constructor(e={}){this.params={..._t,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:gt,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[n||1,r||1],angle:t.angle,size:Math.max(1,t.size),shift:t.shift,random:Math.min(1,Math.max(0,t.random))},target:e.target})}};function F(e){return Object.freeze(e.map(e=>Object.freeze(e)))}var yt=Object.freeze({nebula:F([{offset:0,color:`#0e1554`},{offset:.45,color:`#3a50d4`},{offset:.8,color:`#c478e0`},{offset:1,color:`#f4e6ff`}]),ember:F([{offset:0,color:`#2a0603`},{offset:.45,color:`#b0260c`},{offset:.8,color:`#ff9a2e`},{offset:1,color:`#fff3cf`}]),aurora:F([{offset:0,color:`#03262a`},{offset:.45,color:`#0d8f72`},{offset:.8,color:`#5cf2b0`},{offset:1,color:`#e4fffb`}]),mono:F([{offset:0,color:`#141519`},{offset:.45,color:`#4b4f58`},{offset:.8,color:`#b4b8c0`},{offset:1,color:`#ffffff`}]),sakura:F([{offset:0,color:`#3b0d2f`},{offset:.45,color:`#a8357a`},{offset:.8,color:`#f5a3c7`},{offset:1,color:`#fff2f7`}]),ocean:F([{offset:0,color:`#021a35`},{offset:.45,color:`#0a61a3`},{offset:.8,color:`#2fc6da`},{offset:1,color:`#e9fcff`}])}),I={count:65536,depth:.22,swirl:1,curl:.8,curlScale:2.2,speed:.14,attract:10,peel:.8,life:4,intro:1.5,pointSize:1.4,streak:.3,fireflyRatio:.01,fireflyIntensity:6,fireflyColor:`#ffd2ec`,bloom:.9,palette:`nebula`,sourceColor:0,lightDirection:[-.45,.75,.55],lightColor:`#ffffff`,lightIntensity:1,ambient:.25,occlusion:.7,glint:.7,shadow:!1,shadowOpacity:.35,shadowSoftness:14,shadowDistance:.15,shadowColor:`#1c2233`,yaw:0,pitch:0,orbit:23,fov:35,zoom:1,drag:!1,mouse:`none`,mouseRadius:120,mouseStrength:1,pad:200,antialias:!1},bt=1<<20,L=400,R=3,xt=120,St=.01,Ct=5,wt=.3,z=256,Tt=6,Et=.85,Dt=1,B=256,Ot=1/30,kt=3,At=90,jt=.3,Mt=.05/3.2,Nt=2.875,V=6,H=Math.ceil(Math.sqrt(V)),U=Math.ceil(V/H),Pt=1e9,W=1024,Ft=.05,It=6,Lt=.1,Rt=.15,zt=.06,Bt=4,Vt=20,Ht=.25,G=Math.PI/180,Ut=`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseGrad(vec3 v, out vec3 gradient) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
    vec4 temp = m2 * m * pdotx;
    gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
    gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
    gradient *= 105.0;
    return 105.0 * dot(m4, pdotx);
}
`,K=`
uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
float rnd(uint v) {
    return float(pcg(v)) * (1.0 / 4294967296.0);
}
`,q=`
uniform sampler2D sdfTex;
uniform vec4 sdfRect;
uniform float halfDepth;
uniform float rounding;

vec3 sd2(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    vec2 cuv = clamp(uv, 0.0, 1.0);
    vec4 s = texture(sdfTex, cuv);
    vec2 outside = (uv - cuv) * sdfRect.zw;
    float lo = length(outside);
    vec2 g = lo > 0.0 ? normalize(outside + s.gb * 0.05) : s.gb;
    float gl = length(g);
    return vec3(s.r + lo, gl > 1e-5 ? g / gl : vec2(0.0, 1.0));
}

// x = distance, yzw = unit gradient.
vec4 sdf3(vec3 p) {
    vec3 s = sd2(p.xy);
    float sz = p.z >= 0.0 ? 1.0 : -1.0;
    vec2 w = vec2(s.x + rounding, abs(p.z) - halfDepth + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        return vec4(l - rounding, vec3(s.yz * w.x, sz * w.y) / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, 0.0, 0.0, sz);
}
`,Wt=`
uniform sampler2D spawnTex;
uniform int spawnSize;

uint spawnKey(uint id, float gen) {
    return pcg(id ^ (uint(gen) * 2654435769u));
}

// xy = world position, z = position along the depth / halfDepth (-1..1).
vec4 spawnPoint(uint key) {
    int idx = int(key % uint(spawnSize * spawnSize));
    return texelFetch(spawnTex, ivec2(idx % spawnSize, idx / spawnSize), 0);
}
`,J=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

// State: pos = xyz + age / life (0..1; < 0 while waiting to be born in
// an intro), vel = xyz + generation (wraps at GEN_WRAP). Both stay
// meaningful in 16-bit float targets.
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform int stateWidth;
// Ids at or past \`count\` are not drawn and keep their state.
uniform int count;
// 1: respawn every particle. 2: the state grew; copy the first
// \`oldCount\` particles from the old, \`oldWidth\` wide state, respawn the rest.
uniform int reset;
// Seconds over which respawned particles are born; 0: all at once.
uniform float intro;
uniform sampler2D oldPosTex;
uniform sampler2D oldVelTex;
uniform int oldWidth;
uniform int oldCount;
// 1: the state targets are 16-bit floats.
uniform int halfState;
uniform int frameSeed;
uniform float lifeMean;
uniform float time;
uniform float dt;
uniform float swirl;
uniform float curl;
uniform float curlScale;
uniform float speed;
uniform float attract;
uniform float peel;
// Pointer repel: strength × fade (0 = off), the smoothed cursor and the
// radius in buffer px, and the camera that draws the particles.
uniform float mouseForce;
uniform vec2 mousePx;
uniform float mouseRadiusPx;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 centerPx;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

${K}
${Ut}
${q}
${Wt}

float lifeOf(uint id, float gen) {
    float life = lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
    // The first life after an intro is cut short at random, so the
    // particles born together die over a whole life, not together.
    if (gen >= ${W.toFixed(1)}) {
        life *= mix(${Ft.toFixed(2)}, 1.0, rnd(id * 40503u + 23u));
    }
    return life;
}

// Round onto the 16-bit float grid, up or down at random. In 16-bit
// state targets, an age step smaller than half a step of the grid would
// otherwise round away every frame and the particle would never die;
// this way the steps add up on average.
float roundHalf(float x, float r) {
    float e = exp2(floor(log2(max(abs(x), 6.2e-5))) - 10.0);
    return floor(x / e + r) * e;
}

vec3 spawn(uint id, float gen) {
    uint key = spawnKey(id, gen);
    vec4 s = spawnPoint(key);
    vec3 p = vec3(s.xy, s.z * halfDepth);
    // A thin fuzzy layer instead of an exact shell.
    vec4 d = sdf3(p);
    return p + d.yzw * (rnd(key + 11u) * 0.012 - d.x);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    uint id = uint(i);

    if (reset == 2 && i < oldCount) {
        ivec2 o = ivec2(i % oldWidth, i / oldWidth);
        outPos = texelFetch(oldPosTex, o, 0);
        outVel = texelFetch(oldVelTex, o, 0);
        return;
    }
    if (reset != 0) {
        if (intro > 0.0) {
            // Born at a random moment in the next \`intro\` seconds: until
            // then the age is negative and the particle waits, undrawn.
            // The births speed up (the share born by time t is
            // (t / intro)²): a few particles already show the whole
            // shape, so a steady rate would look done a third of the way in.
            float gen0 = ${W.toFixed(1)};
            float wait = sqrt(rnd(id * 7919u + 3u)) * intro;
            outPos = vec4(spawn(id, gen0), -wait / lifeOf(id, gen0));
            outVel = vec4(0.0, 0.0, 0.0, gen0);
            return;
        }
        // Random ages, so the particles don't all respawn together.
        outPos = vec4(spawn(id, 0.0), rnd(id * 7919u + 3u));
        outVel = vec4(0.0);
        return;
    }

    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    if (i >= count) {
        outPos = P;
        outVel = V;
        return;
    }

    float gen = V.w;
    float life = lifeOf(id, gen);
    float ageN = P.w + dt / life;
    if (halfState == 1) {
        ageN = roundHalf(ageN, rnd(id * 2654435761u + uint(frameSeed) * 2246822519u + 29u));
    }
    if (ageN < 0.0) {
        // Not born yet: hold on the spawn point, at rest. It grows in
        // once the age passes 0 (see lifeScale). After a refresh() it
        // flows onto the new shape from there, like the others.
        outPos = vec4(P.xyz, ageN);
        outVel = vec4(0.0, 0.0, 0.0, gen);
        return;
    }
    if (ageN >= 1.0) {
        gen = mod(gen + 1.0, ${W.toFixed(1)});
        outPos = vec4(spawn(id, gen), 0.0);
        outVel = vec4(0.0, 0.0, 0.0, gen);
        return;
    }

    vec3 p = P.xyz;
    vec3 v = V.xyz;
    vec4 s = sdf3(p);
    vec3 n = s.yzw;
    float d = s.x;

    // How firmly this particle still holds on to the surface.
    float peeler = smoothstep(0.5, 0.9, rnd(id * 31u + uint(gen) * 17u + 5u));
    float hold = 1.0 - peel * peeler * smoothstep(0.2, 0.9, ageN);

    // Tangential flow: cross(normal, A), with A a slow, low-frequency
    // vector field around a drifting main axis.
    vec3 ga;
    snoiseGrad(p * 0.55 + vec3(0.0, 0.0, time * 0.05), ga);
    vec3 axis = normalize(vec3(0.35 * sin(time * 0.11), 1.0, 0.45 * cos(time * 0.07)));
    vec3 A = normalize(axis + ga * 0.35);
    vec3 sw = cross(n, A);

    // Divergence-free noise: cross of two noise gradients.
    vec3 g1;
    vec3 g2;
    vec3 q = p * curlScale;
    snoiseGrad(q + vec3(time * 0.09, 0.0, 0.0), g1);
    snoiseGrad(q + vec3(31.4, 17.7, 9.2) - vec3(0.0, time * 0.08, 0.0), g2);
    vec3 cu = cross(g1, g2) * 0.12;
    // Attached particles stay tangent; peeled ones may lift off.
    vec3 cuT = cu - n * dot(cu, n) * hold;

    float near = exp(-max(d, 0.0) * 5.0);
    vec3 target = speed * (sw * swirl * mix(0.5, 1.0, near) + cuT * curl)
                - n * d * attract * hold
                + n * speed * 0.8 * (1.0 - hold);

    // Repel: measured on screen, with the camera that draws the particle,
    // pushed in the view plane. The push is in radii (at the particle's
    // depth) per second, so the hole is the same on any element size.
    if (mouseForce > 0.0) {
        vec3 qv = viewRot * p;
        float depth = camDist - qv.z;
        if (depth > 1e-3) {
            vec2 dd = centerPx + qv.xy * focalPx / depth - mousePx;
            float r = length(dd) / mouseRadiusPx;
            if (r < 1.0) {
                float f = 1.0 - r * r;
                f *= f;
                float a = rnd(id * 97u + 1u) * 6.2831853;
                vec2 dir = r > 1e-3 ? dd / (r * mouseRadiusPx) : vec2(cos(a), sin(a));
                float radiusW = mouseRadiusPx * depth / focalPx;
                // Inverse rotation: view plane → world.
                target += (vec3(dir, 0.0) * viewRot) * (mouseForce * ${Bt.toFixed(1)} * radiusW * f);
            }
        }
    }

    v = mix(v, target, 1.0 - exp(-dt * 5.0));
    p += v * dt;

    outPos = vec4(p, ageN);
    outVel = vec4(v, gen);
}
`,Gt=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D paletteTex;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 shapeHalf;
uniform float sourceColor;
uniform float time;
uniform float speed;
uniform int stateWidth;
uniform int count;

layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

${K}
${Ut}
${q}
${Wt}

vec3 ramp(float t) {
    float u = (clamp(t, 0.0, 1.0) * ${255 .toFixed(1)} + 0.5) / ${B.toFixed(1)};
    return textureLod(paletteTex, vec2(u, 0.5), 0.0).rgb;
}

// Straight colour of the source where this particle was born.
vec3 spawnColor(uint id, float gen) {
    vec2 xy = spawnPoint(spawnKey(id, gen)).xy;
    // Side-wall points sit on the contour; step inside to skip the AA edge.
    vec3 s = sd2(xy);
    xy -= s.yz * max(s.x + 0.01, 0.0);
    vec2 uv = clamp(xy / (2.0 * shapeHalf) + 0.5, 0.0, 1.0);
    vec4 c = textureLod(src, srcRectUv.xy + uv * srcRectUv.zw, 0.0);
    return c.a > 1e-3 ? c.rgb / c.a : vec3(0.0);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    if (i >= count) {
        outA = vec4(0.0);
        outB = vec4(0.0);
        return;
    }
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    vec3 p = P.xyz;
    float off = clamp(sdf3(p).x / 0.08, 0.0, 1.0);
    float r = rnd(id * 2246822519u + 13u);

    // Colour attribute: slow noise over the surface + speed + per particle.
    vec3 gn;
    float nz = snoiseGrad(p * 1.6 + vec3(0.0, time * 0.05, 0.0), gn);
    float spd = length(V.xyz) / max(speed, 1e-4);
    float t = 0.3 + 0.35 * nz + 0.3 * clamp(spd - 0.5, 0.0, 1.5) + 0.3 * (r - 0.5);
    t += 0.4 * off;
    vec3 base = ramp(t);
    vec3 highlight = ramp(1.0);
    if (sourceColor > 0.0) {
        // Carried from the spawn point like paint; t keeps some texture.
        vec3 sc = spawnColor(id, V.w);
        base = mix(base, sc * mix(0.85, 1.15, clamp(t, 0.0, 1.0)), sourceColor);
        highlight = mix(highlight, mix(sc, vec3(1.0), 0.5), sourceColor);
    }
    outA = vec4(base, off);
    outB = vec4(highlight, 0.0);
}
`;function Y(e){return`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define ${e.toUpperCase()}
#define TRAIL_SAMPLES ${V}
#define HIST_COLS ${H}

uniform int idOffset;
#ifdef FIREFLY
uniform float fireflyIntensity;
uniform vec3 fireflyColor;
uniform float time;
#else
in vec2 position;
uniform sampler2D velTex;
uniform float streak;
uniform sampler2D histTex;
// Newest first: slot in the history atlas, and seconds since it was written.
uniform float histSlot[TRAIL_SAMPLES];
uniform float histAgo[TRAIL_SAMPLES];
uniform sampler2D attrA;
#endif
#ifdef BODY
in float seg;
uniform sampler2D attrB;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform float ambient;
uniform float occlusion;
uniform float glintAmount;
#endif
#ifdef SHADOW
// Towards the light, z > 0; the page is at view z = -shadowDepth.
uniform vec3 shadowLight;
uniform float shadowDepth;
#endif

uniform sampler2D posTex;
uniform int stateWidth;
uniform mat3 viewRot;
uniform float camDist;
uniform float camNear;
uniform float camFar;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
uniform float pointPx;

out vec3 vColor;
out vec2 vLocal;
out vec2 vShape;

${K}
${e===`body`?q:``}

void cull() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vColor = vec3(0.0);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
}

// Camera space: xy in buffer px, z = distance from the camera.
vec3 project(vec3 p) {
    vec3 q = viewRot * p;
#ifdef SHADOW
    // Flatten onto the page along the light. Points behind the page
    // (the page cuts the shape when shadowDepth is small) lie on it.
    q -= shadowLight * (max(q.z + shadowDepth, 0.0) / shadowLight.z);
#endif
    float depth = camDist - q.z;
    return vec3(centerPx + q.xy * focalPx / max(depth, 1e-3), depth);
}

#ifndef FIREFLY
vec4 histAt(int k, ivec2 texel) {
    int slot = int(histSlot[k]);
    ivec2 o = ivec2(slot % HIST_COLS, slot / HIST_COLS) * stateWidth;
    return texelFetch(histTex, o + texel, 0);
}
#endif

void main() {
    int i = gl_InstanceID + idOffset;
    ivec2 texel = ivec2(i % stateWidth, i / stateWidth);
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec3 p = P.xyz;
    float ageN = P.w;

    // Grow in, shrink out: opaque particles can't fade.
    float lifeScale = smoothstep(0.0, 0.08, ageN) * (1.0 - smoothstep(0.85, 1.0, ageN));
    vec3 c = project(p);
    if (lifeScale <= 0.01 || c.z < camNear) {
        cull();
        return;
    }
    float persp = camDist / c.z;
    float r = rnd(id * 2246822519u + 13u);

#ifdef FIREFLY
    float zLin = (c.z - camNear) / (camFar - camNear);
    float flick = pow(0.5 + 0.5 * sin(time * (3.0 + r * 5.0) + r * 40.0), 6.0);
    // Nudge towards the camera so the fibres don't bury every sparkle.
    zLin -= 0.03 / (camFar - camNear);
    gl_Position = vec4(c.xy / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    gl_PointSize = pointPx * persp * (1.4 + 1.6 * flick) * lifeScale;
    vColor = fireflyColor * fireflyIntensity * (0.25 + 1.75 * flick);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
#else
    vec4 A = texelFetch(attrA, texel, 0);
    float off = A.w;
    float w = max(pointPx * persp * lifeScale * mix(1.0, 0.6, off), 1.0);
#ifdef BODY
    int sg = int(seg + 0.5);
#else
    int sg = 0;
#endif

    // Walk the trail from the head to segment sg. Point j + 1 is history
    // sample j. A sample from another generation (written before the
    // particle's last respawn, or never written: -1) ends the trail, so a
    // respawn never draws a line back. The trail is cut at \`streak\`
    // seconds and, like a speed cap, at 14 widths on screen per 0.3 s of
    // streak (the default), never fewer than 14.
    float gen = texelFetch(velTex, texel, 0).w;
    float capLen = w * 14.0 * max(streak / 0.3, 1.0);
    float used = 0.0;
    vec3 pa = p;
    vec3 ca = c;
    float agoA = 0.0;
    vec3 cb = c;
    bool reached = false;
    for (int j = 0; j < TRAIL_SAMPLES; j++) {
        vec4 h = histAt(j, texel);
        float ago = histAgo[j];
        // ago == agoA: the newest sample was written this frame.
        bool valid = agoA < streak && used < capLen && ago >= agoA
            && abs(h.w - gen) < 0.5;
        vec3 cn = ca;
        vec3 pn = pa;
        if (valid) {
            float f = ago > agoA ? min((streak - agoA) / (ago - agoA), 1.0) : 1.0;
            pn = mix(pa, h.xyz, f);
            cn = project(pn);
            float l = length(cn.xy - ca.xy);
            float room = capLen - used;
            if (l > room) {
                float k = room / l;
                cn = mix(ca, cn, k);
                pn = mix(pa, pn, k);
                l = room;
            }
            used += l;
        }
        if (j == sg) {
            cb = cn;
            // The head segment always draws, as a dot if need be.
            reached = valid || sg == 0;
            break;
        }
        if (!valid) {
            break;
        }
        pa = pn;
        ca = cn;
        agoA = ago;
    }
    if (!reached) {
        cull();
        return;
    }

    // Quad from the segment's start (ca, towards the head) to its end,
    // ws wide and ws / 2 longer at each end. The body draws it whole, the
    // shadow cuts a capsule out of it.
    float ws = w * mix(1.0, 0.55, clamp(agoA / max(streak, 1e-4), 0.0, 1.0));
#ifdef SHADOW
    // The coverage target is half-res: twice as wide (at least one of its
    // texels), so the dense body reads as solid rather than speckled.
    ws = max(ws * 2.0, 2.0);
#endif
    vec2 d = ca.xy - cb.xy;
    float len = length(d);
    vec2 ax = len > 1e-3 ? d / len : vec2(1.0, 0.0);
    vec2 pe = vec2(-ax.y, ax.x);
    vec2 mid = ca.xy - ax * len * 0.5;
    vec2 local = position * vec2(len + ws, ws);
    vec2 px = mid + ax * local.x + pe * local.y;
    float zA = clamp((ca.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zB = clamp((cb.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zLin = mix(zB, zA, position.x + 0.5);
    gl_Position = vec4(px / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    vLocal = local;
    vShape = vec2(len * 0.5, ws * 0.5);

#ifdef BODY
    // Shade from the SDF normal at the segment's start, in view space.
    vec3 base = A.rgb;
    vec3 highlight = texelFetch(attrB, texel, 0).rgb;
    vec4 s = sdf3(pa);
    vec3 nv = viewRot * s.yzw;
    float ndl = dot(nv, lightDir);
    float wrap = 0.5 + 0.5 * ndl;
    // Cheap occlusion: how far the field is clear along the normal.
    float aoDist = sdf3(pa + s.yzw * 0.07).x;
    float ao = mix(1.0 - occlusion, 1.0, clamp(aoDist / 0.07, 0.0, 1.0));
    vec3 col = base * (ambient + 0.9 * lightIntensity * wrap * lightColor) * ao;
    // Some fibres catch the light.
    float glint = pow(max(ndl, 0.0), 3.0) * step(0.65, fract(r * 7.13));
    col += highlight * lightColor * glint * glintAmount * ao;
    // Peeled-off wisps get lighter.
    col = mix(col, highlight * 0.85, off * 0.5);
    vColor = col;
#else
    vColor = vec3(1.0);
#endif
#endif
}
`}var Kt=Y(`body`),qt=Y(`shadow`),Jt=Y(`firefly`),Yt=`#version 300 es
precision highp float;
in vec3 vColor;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

// No discard: the quad's sides are the fibre's edges, so multisampling
// (antialias) smooths them. Round caps would be invisible at fibre
// widths anyway.
void main() {
    // Rounded shading across the width (vShape.y = half width).
    float r = vLocal.y / max(vShape.y, 1e-3);
    outColor = vec4(vColor * (1.0 - 0.3 * r * r), 1.0);
}
`,Xt=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

void main() {
    vec2 q = vec2(max(abs(vLocal.x) - vShape.x, 0.0), vLocal.y);
    if (length(q) > max(vShape.y, 1e-3)) discard;
    outColor = vec4(1.0);
}
`,Zt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D curTex;
uniform sampler2D histTex;
uniform float amount;
out vec4 outColor;

void main() {
    float c = texture(curTex, uv).r;
    // amount 1 restarts the average; skip whatever the history holds.
    float v = amount >= 1.0 ? c : mix(texture(histTex, uv).r, c, amount);
    outColor = vec4(v, 0.0, 0.0, 1.0);
}
`,Qt=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 dir;
uniform float sigma;
uniform int radius;
out vec4 outColor;

void main() {
    float k = -0.5 / (sigma * sigma);
    float sum = texture(srcTex, uv).r;
    float wsum = 1.0;
    for (int i = 1; i <= 24; i++) {
        if (i > radius) break;
        float w = exp(float(i * i) * k);
        sum += (texture(srcTex, uv + dir * float(i)).r
              + texture(srcTex, uv - dir * float(i)).r) * w;
        wsum += 2.0 * w;
    }
    outColor = vec4(sum / wsum, 0.0, 0.0, 1.0);
}
`,$t=`#version 300 es
in vec2 position;
uniform vec4 slotRect;
void main() {
    gl_Position = vec4(mix(slotRect.xy, slotRect.zw, position + 0.5), 0.0, 1.0);
}
`,en=`#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform vec2 slotOrigin;
out vec4 outColor;
void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy - slotOrigin);
    outColor = vec4(texelFetch(posTex, texel, 0).xyz, texelFetch(velTex, texel, 0).w);
}
`,tn=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, -1.0);
}
`,nn=`#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;

void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    // A hot core with a small 4-point star.
    float core = exp(-r2 * 10.0);
    float star = exp(-abs(c.x) * 14.0) * exp(-abs(c.y) * 2.5)
               + exp(-abs(c.y) * 14.0) * exp(-abs(c.x) * 2.5);
    float a = core + star * 0.45;
    if (a < 0.003) discard;
    outColor = vec4(vColor * a, 0.0);
}
`,rn=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform vec2 texel;
out vec4 outColor;

const float threshold = ${Dt.toFixed(1)};
${c}
void main() {
    vec3 c = texture(scene, uv + texel * vec2(-0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(-0.5, 0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, 0.5)).rgb;
    c *= 0.25;
    float br = max(c.r, max(c.g, c.b));
    outColor = vec4(c * bloomKnee(br, threshold, 0.5), 1.0);
}
`,an=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

void main() {
    vec3 c = texture(srcTex, uv).rgb * 0.5;
    c += texture(srcTex, uv + texel * vec2(-1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(-1.0, 1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, 1.0)).rgb * 0.125;
    outColor = vec4(c, 1.0);
}
`,on=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloomTex;
uniform sampler2D shadowTex;
uniform int hasScene;
uniform float bloom;
// shadowOpacity, or 0 with the shadow off.
uniform float shadowAmount;
uniform vec3 shadowColor;
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
    vec3 col = s.rgb + texture(bloomTex, uv).rgb * bloom;
    col = softClip(max(col, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    if (shadowAmount > 0.0) {
        float sh = shadowAmount * clamp(texture(shadowTex, uv).r, 0.0, 1.0);
        col += shadowColor * sh * (1.0 - a);
        a += sh * (1.0 - a);
    }
    // Noise dither against banding in the faint glow, on the alpha too:
    // the glow composites as a translucent colour, so where its wide tail
    // crosses an 8-bit alpha step it would draw a contour on a flat page.
    // The colour scales with the dithered alpha (premultiplied, hue kept)
    // and gets its own noise. Pixels with nothing drawn stay exactly 0.
    if (a <= 0.0) {
        outColor = vec4(0.0);
        return;
    }
    vec2 fc = gl_FragCoord.xy;
    float n1 = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    float n2 = fract(sin(dot(fc, vec2(39.3468, 11.135))) * 24634.6345) - 0.5;
    // Slightly under ±0.5 levels, so a vanishing tail can't round up to
    // specks across the whole output rect.
    float ad = clamp(a + n1 * 0.98 / 255.0, 0.0, 1.0);
    col = clamp(col * (ad / a) + n2 / 255.0, 0.0, ad);
    outColor = vec4(col, ad);
}
`,X=0x56bc75e2d63100000;function sn(e,t,n,r,i){let a=0;r[0]=0,i[0]=-0x56bc75e2d63100000,i[1]=X;for(let n=1;n<t;n++){let t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);for(;t<=i[a];)a--,t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);a++,r[a]=n,i[a]=t,i[a+1]=X}a=0;for(let o=0;o<t;o++){for(;i[a+1]<o;)a++;let t=o-r[a];n[o]=t*t+e[r[a]]}}function cn(e,t,n){let r=Math.max(t,n),i=new Float64Array(r),a=new Float64Array(r),o=new Int32Array(r),s=new Float64Array(r+1);for(let r=0;r<t;r++){for(let a=0;a<n;a++)i[a]=e[a*t+r];sn(i,n,a,o,s);for(let i=0;i<n;i++)e[i*t+r]=a[i]}for(let r=0;r<n;r++){for(let n=0;n<t;n++)i[n]=e[r*t+n];sn(i,t,a,o,s);for(let n=0;n<t;n++)e[r*t+n]=a[n]}}function ln(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function un(e,t,n,r,i){let a=e instanceof Float32Array?1:1/255,o=Math.max(t,n),s=Math.round(o*wt),c=t+s*2,l=n+s*2,u=new Uint8Array(c*l),d=0;for(let r=0;r<n;r++)for(let n=0;n<t;n++)e[(r*t+n)*4+3]*a>=.5&&(u[(r+s)*c+n+s]=1,d++);if(d<16)return null;let f=new Float64Array(c*l),p=new Float64Array(c*l);for(let e=0;e<c*l;e++)f[e]=u[e]?0:X,p[e]=u[e]?X:0;cn(f,c,l),cn(p,c,l);let m=new Float32Array(c*l);for(let e=0;e<c*l;e++)m[e]=u[e]?-(Math.sqrt(p[e])-.5):Math.sqrt(f[e])-.5;let h=new Float32Array(c*l);for(let e=0;e<l;e++)for(let t=0;t<c;t++){let n=0,r=0;for(let i=-1;i<=1;i++){let a=e+i;if(!(a<0||a>=l))for(let e=-1;e<=1;e++){let i=t+e;i<0||i>=c||(n+=m[a*c+i],r++)}}h[e*c+t]=n/r}let g=2/o,_=-(t/2+s)*g,v=-(n/2+s)*g,y=new Float32Array(c*l*4),b=new Float32Array(c*l),ee=new Float32Array(c*l);for(let e=0;e<l;e++)for(let t=0;t<c;t++){let n=e*c+t,r=h[e*c+Math.max(t-1,0)],i=h[e*c+Math.min(t+1,c-1)],a=h[Math.max(e-1,0)*c+t],o=h[Math.min(e+1,l-1)*c+t],s=i-r,u=o-a,d=Math.hypot(s,u);d>1e-6?(s/=d,u/=d):(s=0,u=0),b[n]=s,ee[n]=u,y[n*4]=h[n]*g,y[n*4+1]=s,y[n*4+2]=u}let x=[],S=[];for(let e=1;e<l-1;e++)for(let t=1;t<c-1;t++){let n=e*c+t;u[n]&&(x.push(n),u[n-1]&&u[n+1]&&u[n-c]&&u[n+c]||S.push(n))}let te=x.length*g*g*2,C=S.length*1.15*g*(2*r),ne=C/(C+te),w=ln(1592594996),T=z*z,E=new Float32Array(T*4);for(let e=0;e<T;e++){let t=e*4;if(w()<ne&&S.length>0){let e=S[Math.floor(w()*S.length)],n=e%c,r=(e-n)/c,i=h[e],a=_+(n+.5+(w()-.5)*.5)*g,o=v+(r+.5+(w()-.5)*.5)*g;E[t]=a-b[e]*i*g,E[t+1]=o-ee[e]*i*g,E[t+2]=w()*2-1}else{let e=x[Math.floor(w()*x.length)],n=e%c,r=(e-n)/c;E[t]=_+(n+w())*g,E[t+1]=v+(r+w())*g,E[t+2]=w()<.5?-1:1}}return{sdf:y,sdfW:c,sdfH:l,sdfRect:[_,v,c*g,l*g],shapeHalf:[t/o,n/o],spawn:E,aspect:i}}var dn={count:[1,bt],depth:[.01,4],swirl:[-10,10],curl:[-10,10],curlScale:[.01,50],speed:[0,10],attract:[0,100],peel:[0,1],life:[.1,120],intro:[0,120],pointSize:[0,64],streak:[0,10],fireflyRatio:[0,1],fireflyIntensity:[0,1e3],bloom:[0,100],sourceColor:[0,1],lightIntensity:[0,100],ambient:[0,1],occlusion:[0,1],glint:[0,100],shadowOpacity:[0,1],shadowSoftness:[0,500],shadowDistance:[0,100],yaw:[-36e3,36e3],pitch:[-36e3,36e3],orbit:[-720,720],fov:[1,150],zoom:[.01,100],mouseRadius:[0,1e4],mouseStrength:[0,100]},fn=Object.keys(dn),pn=1e4;function Z(e,t,n){return Math.min(Math.max(e,t),n)}function mn(e){return e===`fullscreen`?e:typeof e==`number`&&Number.isFinite(e)?Z(e,0,pn):I.pad}var hn=/^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,Q=new Map;function $(e,t){let n=typeof e==`string`&&hn.test(e)?e:t,r=Q.get(n);if(!r){Q.size>=64&&Q.clear();let[e,t,i]=f(n);r=[e,t,i],Q.set(n,r)}return r}function gn(e,t){let n=Array.isArray(e)?e:[],[r,i,a]=[Number(n[0]),Number(n[1]),Number(n[2])],o=Math.hypot(r,i,a);!Number.isFinite(o)||o<1e-6?gn(I.lightDirection,t):(t[0]=r/o,t[1]=i/o,t[2]=a/o)}function _n(e,t){let n=t??{light:[0,0,1]};for(let t of fn){let r=e[t],[i,a]=dn[t];n[t]=typeof r==`number`&&Number.isFinite(r)?Z(r,i,a):I[t]}return n.count=Math.floor(n.count),n.pad=mn(e.pad),n.shadow=!!e.shadow,n.drag=!!e.drag,n.antialias=!!e.antialias,n.mouse=e.mouse===`repel`||e.mouse===`tilt`?e.mouse:`none`,gn(e.lightDirection,n.light),n.lightColor=$(e.lightColor,I.lightColor),n.fireflyColor=$(e.fireflyColor,I.fireflyColor),n.shadowColor=$(e.shadowColor,I.shadowColor),n}function vn(e){let t=typeof e==`string`?yt[e]:Array.isArray(e)?e.filter(e=>e&&typeof e==`object`):null;return t&&t.length>0?t:yt.nebula}function yn(e){let t=vn(e).map(e=>({offset:Number.isFinite(e.offset)?Z(e.offset,0,1):0,rgb:$(e.color,`#000000`)})).sort((e,t)=>e.offset-t.offset),n=new Uint8Array(B*4),r=0;for(let e=0;e<B;e++){let i=e/255;for(;r<t.length-1&&t[r+1].offset<i;)r++;let a=t[r],o=t[Math.min(r+1,t.length-1)],s=0;s=i<=a.offset?0:i>=o.offset?1:(i-a.offset)/Math.max(o.offset-a.offset,1e-6);for(let t=0;t<3;t++){let r=a.rgb[t]+(o.rgb[t]-a.rgb[t])*s;n[e*4+t]=Math.round(r*255)}n[e*4+3]=255}return n}function bn(e){let t=[-.5,-.5,.5,-.5,.5,.5,-.5,.5],n=new Float32Array(48),r=new Float32Array(24),i=new Uint16Array(36);for(let e=0;e<V;e++){n.set(t,e*8),r.fill(e,e*4,e*4+4);let a=e*4;i.set([a,a+1,a+2,a,a+2,a+3],e*6)}return{attributes:{position:{data:n,itemSize:2},seg:{data:r,itemSize:1}},indices:i,instanceCount:e}}function xn(e,t,n){let r=Z((n-e)/(t-e),0,1);return r*r*(3-2*r)}function Sn(e,t){let n=Math.cos(e),r=Math.sin(e),i=Math.cos(t),a=Math.sin(t),o=n,s=r,c=a*r,l=i,u=-a*n;return[o,c,-i*r,0,l,a,s,u,i*n]}var Cn={bloom:null,shadow:null,shadowAmount:0},wn=class{params;#e;#t=!1;#n;#r=0;#i=`capture`;#a=0;#o=R;#s=[0,0];#c=0;#l=null;#u=null;#d=!0;#f=0;#p=0;#m=!1;#h=0;#g=[];#_=0;#v=null;#y=null;#b=null;#x=1;#S=null;#C=[0,0];#w=[];#T=[0,0];#E=null;#D=!1;#O=Cn;#k=0;#A=null;#j=null;#M=null;#N=null;#P=Array(V).fill(-1/0);#F=5;#I=-1/0;#L=null;#R=null;#z=null;#B=null;#V=null;#H=null;#U=null;#W=null;#G=[];#K=0;#q=null;#J=null;#Y=null;#X=-1;#Z=-1;#Q={attributes:{position:{data:D,itemSize:2}}};#$=0;#ee=0;#te=!1;#ne=[0,0];#re=null;#ie=null;#ae=[0,0];#oe=1;#se=[0,0];#ce=!1;#le=null;#ue=[0,0];#de=0;#fe=0;#pe=0;constructor(e={},t={}){this.params={...I,...e},this.#e=t.still??!1,this.#n=_n(this.params)}setParams(e){Object.assign(this.params,e)}init(e){this.#L=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`);let t=_n(this.params,this.#n);this.#he(e,k(t.count),!1),this.#me(e),this.#ie=e.onContextRestored(()=>{this.#r++,this.#L=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`),this.#R=null,this.#z=null,this.#B=null,this.#V=null,this.#H=null,this.#U=null,this.#W=null,this.#l=this.#l??this.#u,this.#i===`reading`&&(this.#i=`capture`,this.#a=0),this.#d=!0,this.#m=!1,this.#D=!1})}outputRect(e){return s(mn(this.params.pad),e)}#me(e){let t=this.#n.antialias?4:1;this.#b?.dispose();let n=e.createRenderTarget({float:!0,depth:!0,samples:t});return this.#b=n,this.#x=t,n}#he(e,t,n){let r=this.#v,i=this.#y,a=this.#_,o={size:[t,t],float:!0,persistent:!0,filter:`nearest`},s=e.createRenderTarget(o),c=e.createRenderTarget(o);this.#_=t,n&&r&&i&&!this.#d&&this.#V&&this.#H?e.draw({frag:J,uniforms:{...this.#Me(e),posTex:r,velTex:i,oldPosTex:r,oldVelTex:i,oldWidth:a,oldCount:a*a,reset:2,dt:0},target:[s,c]}):this.#d=!0,r?.dispose(),i?.dispose(),this.#j?.dispose(),this.#M?.dispose(),this.#N?.dispose(),this.#v=s,this.#y=c;let l={...o,persistent:!1};this.#j=e.createRenderTarget(l),this.#M=e.createRenderTarget(l),this.#N=e.createRenderTarget({...l,size:[t*H,t*U]}),this.#d||this.#Fe(e)}render(e){if(!this.#b||!this.#v||!this.#y)return;let t=_n(this.params,this.#n);this.#_e(),this.#ae[0]=e.mouse[0]-e.mouseViewport[0],this.#ae[1]=e.mouse[1]-e.mouseViewport[1],this.#oe=e.pixelRatio,this.#se[0]=e.dims.elementPixel[0],this.#se[1]=e.dims.elementPixel[1];let n=(t.antialias?4:1)===this.#x?this.#b:this.#me(e);this.#i===`idle`&&!this.#l&&this.#xe(e),this.#i===`capture`&&this.#Se(e),this.#l&&this.#Ce(e,this.#l)&&((!this.#u||this.#e)&&(this.#d=!0),this.#u=this.#l,this.#l=null),this.#Ee(e);let r=!!(this.#u&&this.#V&&this.#H&&this.#U);if(!r)this.#O=Cn;else{t.count>this.#_**2&&this.#he(e,k(t.count),!0),this.#De(e),this.#e&&t.count!==this.#h&&(this.#d=!0);let r=this.#e&&this.#ge(e,n);if(!this.#e||!this.#m||this.#d||r){let t=j(e.deltaTime)||0;this.#Ae(e,t),this.#Ne(e,t),this.#A=this.#je(e);let r=this.#Re(e,n,this.#A);this.#O={bloom:this.#Ue(e,n),shadow:r?r.tex:null,shadowAmount:r?r.amount:0}}}let i=this.#O;e.draw({frag:on,uniforms:{scene:n,bloomTex:i.bloom??n,shadowTex:i.shadow??n,hasScene:+!!r,bloom:i.bloom?t.bloom:0,shadowAmount:i.shadow?i.shadowAmount:0,shadowColor:t.shadowColor},target:e.target})}#ge(e,t){let n=this.#n,r=this.#g,i=0,a=!1,o=e=>{r[i]!==e&&(r[i]=e,a=!0),i++};for(let e of fn)o(n[e]);o(n.pad),o(n.shadow),o(n.light[0]),o(n.light[1]),o(n.light[2]),o(n.lightColor),o(n.fireflyColor),o(n.shadowColor),o(this.#K),o(this.#_),o(t.width),o(t.height),o(this.#x);let c=e.dims,[l,u]=s(n.pad,c);return o(c.elementPixel[0]),o(c.elementPixel[1]),o(l),o(u),a}#_e(){let e=this.#n,t=!this.#e&&typeof window<`u`;t&&e.drag?this.#ve():this.#re&&(this.#re(),this.#re=null,this.#te=!1),t&&e.mouse!==`none`?this.#ke():this.#le&&(this.#le(),this.#le=null,this.#ce=!1)}#ve(){if(this.#re)return;let e=e=>{this.#ye(e.clientX,e.clientY)&&(this.#te=!0,this.#ne=[e.clientX,e.clientY])},t=e=>{if(!this.#te)return;let t=e.clientX-this.#ne[0],n=e.clientY-this.#ne[1];this.#ne=[e.clientX,e.clientY],this.#$+=t*.006,this.#ee=Z(this.#ee+n*.006,-1.2,1.2)},n=()=>{this.#te=!1};window.addEventListener(`pointerdown`,e),window.addEventListener(`pointermove`,t),window.addEventListener(`pointerup`,n),window.addEventListener(`pointercancel`,n),this.#re=()=>{window.removeEventListener(`pointerdown`,e),window.removeEventListener(`pointermove`,t),window.removeEventListener(`pointerup`,n),window.removeEventListener(`pointercancel`,n)}}#ye(e,t){let n=this.#oe,r=e*n+this.#ae[0],i=(window.innerHeight-t)*n+this.#ae[1],[a,o]=this.#se;return r>=0&&i>=0&&r<=a&&i<=o}refresh(){this.#be()}#be(){this.#i===`reading`&&this.#r++,this.#i=`capture`,this.#a=0,this.#o=R}#xe(e){let t=this.#u,[n,r]=e.dims.elementPixel;if(!t||!(n>=1&&r>=1))return;let i=n!==this.#s[0]||r!==this.#s[1];this.#s[0]=n,this.#s[1]=r,this.#c=i?0:this.#c+1,this.#c>=Ct&&Math.abs(n/r/t.aspect-1)>St&&this.#be()}#Se(e){let[n,r]=e.dims.elementPixel;if(e.src.width===0||e.src.height===0||!(n>=1&&r>=1)||++this.#a<this.#o)return;let i=n/r,a=Math.max(1,i>=1?L:Math.round(L*i)),o=Math.max(1,i>=1?Math.round(L/i):L),s=e.createRenderTarget({size:[a,o]});t(e,s),this.#i=`reading`;let c=this.#r,l=this.#n.depth/2,u=e.readPixels(s);s.dispose();let d=e=>{this.#a=0,e&&(this.#o=Math.min(this.#o*2,xt)),this.#i=`capture`};u.then(e=>{if(c!==this.#r)return;let t=un(e,a,o,l,i);t?(this.#l=t,this.#i=`idle`):d(!0)},()=>{c===this.#r&&d(!1)})}#Ce(e,t){let n=e.gl;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let r=n.createTexture(),i=n.createTexture();return!r||!i?(n.deleteTexture(r),n.deleteTexture(i),e.resetState(),!1):(n.bindTexture(n.TEXTURE_2D,r),n.texImage2D(n.TEXTURE_2D,0,n.RGBA16F,t.sdfW,t.sdfH,0,n.RGBA,n.FLOAT,t.sdf),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,z,z,0,n.RGBA,n.FLOAT,t.spawn),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),this.#we(),this.#R=r,this.#z=i,this.#V=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`}),this.#H=e.wrapTexture(i,{size:[z,z],filter:`nearest`,wrap:`clamp`}),!0)}#we(){if(this.#L)for(let e of[this.#R,this.#z])e&&this.#L.deleteTexture(e);this.#R=null,this.#z=null,this.#V=null,this.#H=null}#Te(e){if(e!==this.#W)return!1;if(!Array.isArray(e))return!0;let t=this.#G;if(t.length!==e.length*2)return!1;for(let n=0;n<e.length;n++){let r=e[n];if(t[n*2]!==r?.offset||t[n*2+1]!==r?.color)return!1}return!0}#Ee(e){let t=this.params.palette;if(this.#U&&this.#Te(t))return;let n=e.gl,r=yn(t);n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let i=this.#B;i?(n.bindTexture(n.TEXTURE_2D,i),n.texSubImage2D(n.TEXTURE_2D,0,0,0,B,1,n.RGBA,n.UNSIGNED_BYTE,r)):(i=n.createTexture(),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,B,1,0,n.RGBA,n.UNSIGNED_BYTE,r),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),i&&(this.#U||=(this.#B=i,e.wrapTexture(i,{size:[B,1],filter:`linear`,wrap:`clamp`})),this.#W=t,this.#G=Array.isArray(t)?t.flatMap(e=>[e?.offset,e?.color]):[],this.#K++)}#De(e){let t=this.#n,n=Math.min(t.count,Math.round(t.count*t.fireflyRatio)),r=t.count-n;r!==this.#X&&(this.#q&&e.releaseGeometry(this.#q),this.#J&&e.releaseGeometry(this.#J),this.#q=bn(r),this.#J={attributes:{position:{data:D,itemSize:2}},instanceCount:r},this.#X=r),n!==this.#Z&&(this.#Y&&e.releaseGeometry(this.#Y),this.#Y={mode:`points`,attributes:{},drawRange:{start:0,count:1},instanceCount:n},this.#Z=n)}#Oe(){let e=this.#n.depth/2,t={sdfRect:this.#u?.sdfRect??[0,0,1,1],halfDepth:e,rounding:Math.min(.025,e*.5),stateWidth:this.#_,spawnSize:z};return this.#V&&this.#H&&(t.sdfTex=this.#V,t.spawnTex=this.#H),t}#ke(){if(this.#le)return;let e=e=>{this.#ce=e.clientX>=0&&e.clientY>=0&&e.clientX<window.innerWidth&&e.clientY<window.innerHeight},t=e=>{e.relatedTarget||(this.#ce=!1)},n=()=>{this.#ce=!1};window.addEventListener(`pointermove`,e,{passive:!0}),window.addEventListener(`pointerout`,t,{passive:!0}),window.addEventListener(`blur`,n),this.#le=()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`pointerout`,t),window.removeEventListener(`blur`,n)}}#Ae(e,t){let n=this.#n,r=this.#e?`none`:n.mouse,i=this.#ce&&!this.#e,[a,o]=e.mouse,s=i&&r===`repel`;if(s){if(this.#de<=0)this.#ue=[a,o];else{let e=1-Math.exp(-t/zt);this.#ue[0]+=(a-this.#ue[0])*e,this.#ue[1]+=(o-this.#ue[1])*e}}let c=t/Rt;this.#de=s?Math.min(this.#de+c,1):Math.max(this.#de-c,0);let l=0,u=0;if(i&&r===`tilt`){let[t,r]=e.dims.elementPixel,i=e.pixelRatio,s=typeof window<`u`?window.innerWidth*i:e.dims.canvasPixel[0],c=typeof window<`u`?window.innerHeight*i:e.dims.canvasPixel[1],d=Z((a-t/2)/Math.max(s/2,1),-1,1),f=Z((o-r/2)/Math.max(c/2,1),-1,1),p=Vt*G*n.mouseStrength;l=p*d,u=-p*f}let d=1-Math.exp(-t/Ht);this.#fe+=(l-this.#fe)*d,this.#pe+=(u-this.#pe)*d}#je(e){let t=this.#n,n=this.#f,r=(t.yaw+t.orbit*Math.sin(n*.13))*G+this.#$+this.#fe,i=(t.pitch+t.orbit*jt*Math.sin(n*.09+1.3))*G+this.#ee+this.#pe,a=1/Math.tan(t.fov*Math.PI/360),o=e.dims,[c,l]=o.elementPixel,[u,d]=s(t.pad,o),f=Math.max(c,l)/2*t.zoom;return{viewRot:Sn(r,i),camDist:a,focalPx:a*f,centerPx:[c/2-u,l/2-d],origin:[u,d]}}#Me(e){let t=this.#n,n=this.#H;return{...this.#Oe(),count:t.count,lifeMean:t.life,intro:this.#e?0:t.intro,swirl:t.swirl,curl:t.curl,curlScale:t.curlScale,speed:t.speed,attract:t.attract,peel:t.peel,time:this.#f,halfState:+!!this.#t,frameSeed:this.#p,...n?{oldPosTex:n,oldVelTex:n}:{},oldWidth:1,oldCount:0,...this.#Pe(e)}}#Ne(e,t){let n=this.#v,r=this.#y;if(!n||!r||!this.#V||!this.#H)return;let i,a;if(this.#e){if(this.#k=0,this.#m&&!this.#d)return;i=At,a=1/60}else this.#k=t,i=Z(Math.ceil(t/Ot),1,kt),a=t/i;let o=this.#Me(e);this.#d&&(e.draw({frag:J,uniforms:{...o,posTex:n,velTex:r,reset:1,dt:0},target:[n,r]}),this.#Fe(e),this.#d=!1,this.#D=!1);for(let t=0;t<i;t++)this.#f+=a,this.#p=(this.#p+1)%1048576,e.draw({frag:J,uniforms:{...o,posTex:n,velTex:r,reset:0,time:this.#f,frameSeed:this.#p,dt:a},target:[n,r]}),this.#Ie(e);this.#m=!0,this.#h=this.#n.count}#Pe(e){let t=this.#n,n=this.#A??this.#je(e);return{mouseForce:t.mouseRadius>0?this.#de*t.mouseStrength:0,mousePx:[this.#ue[0]-n.origin[0],this.#ue[1]-n.origin[1]],mouseRadiusPx:Math.max(t.mouseRadius*e.pixelRatio,1),viewRot:n.viewRot,camDist:n.camDist,focalPx:n.focalPx,centerPx:n.centerPx}}#Fe(e){this.#N&&e.draw({frag:tn,target:this.#N}),this.#P.fill(-1/0),this.#F=5,this.#I=-1/0}#Ie(e){let t=this.#N,n=this.#v,r=this.#y,i=this.#n.streak;if(!t||!n||!r||!(i>0))return;let a=i/5;if(this.#f-this.#I<a)return;let o=(this.#F+1)%V,s=o%H,c=Math.floor(o/H),l=2*s/H-1,u=2*c/U-1,d=this.#_;e.draw({vert:$t,frag:en,geometry:this.#Q,uniforms:{posTex:n,velTex:r,slotRect:[l,u,l+2/H,u+2/U],slotOrigin:[s*d,c*d]},target:t}),this.#F=o,this.#P[o]=this.#f,this.#I=this.#f}#Le(){let e=[],t=[];for(let n=0;n<V;n++){let r=(this.#F-n+12)%V,i=this.#P[r];e.push(r),t.push(Number.isFinite(i)?this.#f-i:Pt)}return{histSlot:e,histAgo:t}}#Re(e,t,n){let r=this.#v,i=this.#y,a=this.#u,o=this.#j,s=this.#M,c=this.#N,l=this.#q,u=this.#J,d=this.#Y;if(!r||!i||!a||!this.#U||!o||!s||!c||!l||!u||!d)return null;let f=this.#n,p=n.camDist,m={...this.#Oe(),posTex:r,viewRot:n.viewRot,camDist:p,camNear:p*Mt,camFar:p*Nt,focalPx:n.focalPx,centerPx:n.centerPx,bufferPx:[t.width,t.height],pointPx:f.pointSize*e.pixelRatio};e.clear(t),this.#X>0&&e.draw({frag:Gt,uniforms:{...m,velTex:i,count:f.count,time:this.#f,speed:f.speed,paletteTex:this.#U,src:e.src,shapeHalf:a.shapeHalf,sourceColor:f.sourceColor},target:[o,s]});let h={...m,...this.#Le(),velTex:i,histTex:c,attrA:o,idOffset:this.#Z,streak:f.streak};this.#X>0&&e.draw({vert:Kt,frag:Yt,geometry:l,uniforms:{...h,attrB:s,lightDir:f.light,lightColor:f.lightColor,lightIntensity:f.lightIntensity,ambient:f.ambient,occlusion:f.occlusion,glintAmount:f.glint},target:t,depthTest:!0,blend:`none`}),this.#Z>0&&e.draw({vert:Jt,frag:nn,geometry:d,uniforms:{...m,idOffset:0,time:this.#f,fireflyIntensity:f.fireflyIntensity,fireflyColor:f.fireflyColor},target:t,depthTest:!0,depthWrite:!1,blend:`additive`});let g=f.light,_=f.shadowOpacity*xn(0,.25,g[2]);if(!f.shadow||!(_>0)||this.#X===0)return this.#Ve(),null;let v=this.#Be(e,t,u,{...h,shadowLight:[g[0],g[1],Math.max(g[2],.02)],shadowDepth:f.shadowDistance});return v?{tex:v,amount:_}:null}#ze(e,t){let n=this.#w;for(;n.length<=t;){let t=2**n.length,r={size:[Math.max(1,Math.floor(this.#T[0]/t)),Math.max(1,Math.floor(this.#T[1]/t))],float:!0,filter:`linear`};n.push({a:e.createRenderTarget(r),b:e.createRenderTarget(r)})}return n[t]}#Be(e,t,n,r){let i=Math.max(1,Math.floor(t.width/2)),a=Math.max(1,Math.floor(t.height/2));(i!==this.#T[0]||a!==this.#T[1])&&(this.#Ve(),this.#T=[i,a]),this.#E||=e.createRenderTarget({size:[i,a],float:!0,persistent:!0,filter:`linear`});let o=this.#E,s=this.#ze(e,0).a;e.clear(s),e.draw({vert:qt,frag:Xt,geometry:n,uniforms:r,target:s,blend:`none`});let c=this.#D&&!this.#e?1-Math.exp(-this.#k/Lt):1;e.draw({frag:Zt,uniforms:{curTex:s,histTex:o,amount:c},target:o}),this.#D=!0;let l=this.#n.shadowSoftness*e.pixelRatio,u=0;for(;u<3&&l/2**(u+1)>It;)u++;let d=t=>t===0?o:this.#ze(e,t).a;for(let t=1;t<=u;t++){let n=d(t-1);e.draw({frag:an,uniforms:{srcTex:n,texel:[1/n.width,1/n.height]},target:this.#ze(e,t).a})}let f=d(u),p=l/2**(u+1);if(p<.3)return f;let{a:m,b:h}=this.#ze(e,u),g=Math.min(Math.ceil(p*3),24);return e.draw({frag:Qt,uniforms:{srcTex:f,dir:[1/f.width,0],sigma:p,radius:g},target:h}),e.draw({frag:Qt,uniforms:{srcTex:h,dir:[0,1/h.height],sigma:p,radius:g},target:m}),m}#Ve(){for(let e of this.#w)e.a.dispose(),e.b.dispose();this.#E?.dispose(),this.#E=null,this.#D=!1,this.#w=[],this.#T=[0,0]}#He(){this.#S&&p(this.#S),this.#S=null,this.#C=[0,0]}#Ue(e,t){if(!(this.#n.bloom>0))return this.#He(),null;this.#S&&t.width===this.#C[0]&&t.height===this.#C[1]||(this.#He(),this.#S=g(e,t.width,t.height,Tt),this.#C=[t.width,t.height]);let n=this.#S.down;e.draw({frag:rn,uniforms:{scene:t,texel:[1/t.width,1/t.height]},target:n[0]});for(let t=1;t<n.length;t++){let r=n[t-1];e.draw({frag:an,uniforms:{srcTex:r,texel:[1/r.width,1/r.height]},target:n[t]})}return u(e,this.#S,(e,t)=>({texelSize:[1/t.width,1/t.height],weightLarge:1,weightSmall:Et}))}dispose(){this.#re?.(),this.#re=null,this.#le?.(),this.#le=null,this.#ie?.(),this.#ie=null,this.#we(),this.#L&&this.#B&&this.#L.deleteTexture(this.#B),this.#B=null,this.#U=null,this.#L=null,this.#v?.dispose(),this.#y?.dispose(),this.#j?.dispose(),this.#M?.dispose(),this.#N?.dispose(),this.#b?.dispose(),this.#Ve(),this.#He(),this.#v=null,this.#y=null,this.#j=null,this.#M=null,this.#N=null,this.#b=null,this.#_=0,this.#q=null,this.#J=null,this.#Y=null,this.#X=-1,this.#Z=-1,this.#r++,this.#i=`capture`,this.#a=0,this.#o=R,this.#s.fill(0),this.#c=0,this.#l=null,this.#u=null,this.#d=!0,this.#f=0,this.#p=0,this.#m=!1,this.#h=0,this.#g=[],this.#O=Cn,this.#k=0,this.#A=null,this.#P.fill(-1/0),this.#F=5,this.#I=-1/0,this.#W=null,this.#G=[],this.#$=0,this.#ee=0,this.#te=!1,this.#ae.fill(0),this.#se.fill(0),this.#ce=!1,this.#ue=[0,0],this.#de=0,this.#fe=0,this.#pe=0}},Tn=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int shape;
uniform vec2 cellPx;
uniform float gap;
uniform float colorTrim;
uniform float averageColor;
uniform float dissolve;
uniform float falloff;
uniform float knockout;

vec4 sampleSrc(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Distance to a pointy-top hexagon's edge.
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.866025)), p.x);
}

// Nearest hexagon in a pointy-top honeycomb: local position (xy) and cell
// center (zw), in grid units.
vec4 hexCoords(vec2 g) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(g, r) - h;
    vec2 b = mod(g - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, g - gv);
}

void main(void) {
    vec2 px = uvContent * resolution;
    vec2 g = px / cellPx; // grid units (1 = one cell)
    float gapHalf = gap * 0.5;

    // Per shape: the cell center (grid units) and the coverage mask.
    vec2 centerCell;
    float mask;
    if (shape == 0 || shape == 1) {
        // Rectangle / ellipse on a square grid.
        vec2 id = floor(g);
        centerCell = id + 0.5;
        vec2 lc = g - centerCell;
        float th = 0.5 - gapHalf;
        mask = shape == 0
            ? (max(abs(lc.x), abs(lc.y)) < th ? 1.0 : 0.0)
            : (length(lc) < th ? 1.0 : 0.0);
    } else if (shape == 2) {
        // Pointy-top honeycomb; Voronoi boundary sits at 0.5 for this lattice.
        vec4 hc = hexCoords(g);
        centerCell = hc.zw;
        mask = hexDist(hc.xy) < 0.5 * (1.0 - gap) ? 1.0 : 0.0;
    } else {
        // Right triangles: each square cell is split by a diagonal whose
        // direction flips per cell, tiling the plane with 45° triangles.
        vec2 id = floor(g);
        vec2 lc = g - (id + 0.5);
        float diag = mod(id.x + id.y, 2.0);
        float s = diag < 0.5 ? (lc.x + lc.y) : (lc.x - lc.y);
        float tri = step(0.0, s);
        // Centroid of the selected triangle, for a distinct per-cell color.
        vec2 cen = diag < 0.5
            ? (tri > 0.5 ? vec2(1.0) : vec2(-1.0)) / 6.0
            : (tri > 0.5 ? vec2(1.0, -1.0) : vec2(-1.0, 1.0)) / 6.0;
        centerCell = id + 0.5 + cen;
        float dEdge = 0.5 - max(abs(lc.x), abs(lc.y));
        float dDiag = abs(s) / 1.4142136;
        mask = min(dEdge, dDiag) > gapHalf ? 1.0 : 0.0;
    }

    vec2 centerUv = centerCell * cellPx / resolution;
    vec4 centerCol = sampleSrc(centerUv);

    // Average color: blend the center tap with a 3x3 in-cell average.
    vec4 avg = vec4(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(x, y) * cellPx * 0.3 / resolution;
            avg += sampleSrc(centerUv + o);
        }
    }
    avg /= 9.0;
    vec4 col = mix(centerCol, avg, averageColor);

    // Color trim: posterize to fewer levels (more trim = fewer colors).
    float steps = max(1.0, 256.0 / exp2(colorTrim));
    // src is premultiplied; posterize straight color, then premultiply.
    vec3 straight = col.a > 0.0 ? col.rgb / col.a : vec3(0.0);
    col.rgb = floor(straight * steps) / steps * col.a;

    // Dissolve: drop cells by hash, with falloff biasing toward the top.
    float bias = mix(1.0, smoothstep(0.0, 1.0, centerUv.y), falloff);
    if (hash12(centerCell) < dissolve * bias) {
        mask = 0.0;
    }

    if (mask > 0.5) {
        outColor = col;
    } else {
        // Outside the shape / dropped: punch transparency, or fall back
        // to the untouched source when knockout is off.
        outColor = knockout > 0.5 ? vec4(0.0) : sampleSrc(uvContent);
    }
}
`,En={rectangle:0,ellipse:1,hexagon:2,triangle:3},Dn={shape:`rectangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},On=class{params;constructor(e={}){this.params={...Dn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel,i=Math.max(1,t.size);e.draw({frag:Tn,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],shape:En[t.shape]??0,cellPx:[i*Math.max(.1,t.stretch),i],gap:Math.min(1,Math.max(0,t.gap)),colorTrim:Math.max(0,t.colorTrim),averageColor:Math.min(1,Math.max(0,t.averageColor)),dissolve:Math.min(1,Math.max(0,t.dissolve)),falloff:Math.min(1,Math.max(0,t.falloff)),knockout:+!!t.knockout},target:e.target})}},kn=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 color3;
uniform float speed;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main (void) {
    vec4 color = readTex(uvContent);

    // src is premultiplied; un-premultiply for luminance.
    vec3 rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
    float gray = dot(rgb, vec3(0.2, 0.7, 0.08));
    float t = mod(gray * 3.0 + time * speed, 3.0);

    if (t < 1.) {
        outColor = mix(color1, color2, fract(t));
    } else if (t < 2.) {
        outColor = mix(color2, color3, fract(t));
    } else {
        outColor = mix(color3, color1, fract(t));
    }

    outColor *= color.a;
}
`,An={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},jn=class{params;constructor(e={}){this.params={...An,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:kn,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}},Mn=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;
    outColor = readTex(uv);

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    outColor *= 1. - pow(l, power) * intensity;
}
`,Nn={intensity:.5,radius:1,power:2},Pn=class{params;constructor(e={}){this.params={...Nn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:Mn,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}},Fn=`#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
// Auto-uploaded by the host; we redo the content→src remap manually
// because we sample at a UV scaled around the site.
uniform vec4 srcRectUv;
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float pressRadius;
uniform float press;
uniform float seed;
uniform float flatCells;
uniform float time;
uniform float speed;
uniform float breatheSpeed;
uniform float breathe;
uniform float breatheScale;
uniform vec4 bgColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// 3D simplex noise (Ashima Arts / Ian McEwan, MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(
        permute(
            permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0)
        )
        + i.x + vec4(0.0, i1.x, i2.x, 1.0)
    );

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(
        dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
    ), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(
        dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
    ));
}

vec2 jitterFor(vec2 cell) {
    vec2 base = hash22(cell + vec2(seed));
    if (speed > 0.0) {
        // Amplitude capped at 0.25 so sites stay inside the 3×3
        // search neighbourhood as they orbit.
        vec2 phase = hash22(cell + vec2(seed + 100.0)) * 6.2831853;
        base += 0.25 * vec2(
            sin(time * speed + phase.x),
            cos(time * speed + phase.y)
        );
    }
    return base;
}

void main() {
    vec2 contentPx = uvContent * elementPx;
    vec2 p = contentPx / cellSize;
    vec2 ipart = floor(p);
    vec2 fpart = fract(p);

    // Get grid-cell info for 9 neighbors
    vec2 sites[9];
    vec2 nearestSite = vec2(0.0);
    vec2 nearestG = vec2(0.0);
    float minDistSq = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + jitterFor(ipart + g);
            sites[(j + 1) * 3 + (i + 1)] = site;
            float d = dot(site - fpart, site - fpart);
            if (d < minDistSq) {
                minDistSq = d;
                nearestSite = site;
                nearestG = g;
            }
        }
    }
    vec2 ownerCell = ipart + nearestG;

    // Mouse falloff + per-cell breathe noise → total shrink.
    vec2 siteWorldPx = (ipart + nearestSite) * cellSize;
    vec2 mousePx = mouseUv * elementPx;
    float falloff = smoothstep(pressRadius, 0.,
                               distance(siteWorldPx, mousePx));

    float noiseShrink = 0.0;
    if (breathe > 0.0) {
        vec3 noisePos = vec3(
            ownerCell * cellSize / breatheScale + vec2(seed + 200.0),
            time * breatheSpeed
        );
        noiseShrink = breathe * max(0.0, snoise(noisePos));
    }
    float shrink = noiseShrink + press * falloff;

    // Distance to original cell edge (for stable AA), and to the
    // edge of the cell scaled uniformly around its site by
    // (1 - shrink) — per-neighbour offset preserves polygon shape.
    float minEdgeOrig = 1e9;
    float minEdgeShrunk = 1e9;
    for (int k = 0; k < 9; k++) {
        vec2 site = sites[k];
        vec2 d = site - nearestSite;
        float dlen2 = dot(d, d);
        if (dlen2 > 1e-4) {
            float dlen = sqrt(dlen2);
            float t = dot((site + nearestSite) * 0.5 - fpart, d / dlen);
            minEdgeOrig = min(minEdgeOrig, t);
            minEdgeShrunk = min(minEdgeShrunk, t - dlen * 0.5 * shrink);
        }
    }
    float edgePx = minEdgeOrig * cellSize;
    float wallDist = minEdgeShrunk * cellSize;

    // Scale UV around the site
    float cellScale = max(0.001, 1.0 - shrink);
    vec2 siteUvContent = siteWorldPx / elementPx;
    vec2 scaledUvContent =
        siteUvContent + (uvContent - siteUvContent) / cellScale;
    vec2 sampleContent = mix(scaledUvContent, siteUvContent, flatCells);
    vec4 base = texture(src, srcRectUv.xy + sampleContent * srcRectUv.zw);

    // fwidth on edgePx, not wallDist: shrink jumps at cell seams and
    // would spike fwidth there, leaking src through 1 px of bgColor.
    float aa = fwidth(edgePx);
    float visibleMask = smoothstep(-aa, 0.0, wallDist);

    // src is premultiplied; premultiply bgColor to match.
    vec4 bg = vec4(bgColor.rgb * bgColor.a, bgColor.a);
    outColor = mix(bg, base, visibleMask);
}
`,In={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`};function Ln(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Rn=class{params;constructor(e={}){this.params={...In,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:Fn,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:Ln(a.bgColor)},target:e.target})}},zn=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform int mode;
uniform float amp;
uniform float freq;
uniform float time;
${o}

vec4 readTex(vec2 c) {
    c = clamp(c, 0.0, 1.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 uv = uvContent;
    vec2 p = uv - center;
    float r = length(p);

    if (mode == 0) {
        // Sine wave: ripples per axis, centered so both diagonals stay straight.
        uv.x -= sin(p.y * freq * TAU + time) * amp * 0.05;
        uv.y -= sin(p.x * freq * TAU + time) * amp * 0.05;
    } else if (mode == 1) {
        // Twist: swirl that rotates most at the center and unwinds to the edge.
        // aspect scale keeps the field circular and contained in the element.
        vec2 s = resolution / max(resolution.x, resolution.y);
        vec2 tp = (uv - center) * 2.0 * s;
        float t = length(tp) / 1.41421356;
        tp = rot2d(amp * freq * (1.0 - t)) * tp;
        uv = tp / s * 0.5 + center;
    } else if (mode == 2) {
        // Ripple: scale the radius by a cosine of the distance from center.
        p *= 1.0 - cos((r-.5) * freq * 10.0 + time) * amp * 0.2;
        uv = p + center;
    }

    outColor = readTex(uv);
}
`,Bn={"sine wave":0,twist:1,ripple:2},Vn={type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},Hn=class{params;constructor(e={}){this.params={...Vn,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:zn,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[e.dims.element[0]||1,e.dims.element[1]||1],mode:Bn[t.type]??0,amp:t.amplitude,freq:t.frequency,time:e.time*t.speed},target:e.target})}},Un=[{name:`uvGradient`,media:`logo`},{name:`rainbow`,media:`logo`},{name:`glitch`,media:`logo`,props:{overflow:60}},{name:`rgbGlitch`,media:`logo`},{name:`rgbShift`,media:`logo`},{name:`shine`,media:`logo`},{name:`blink`,media:`logo`},{name:`spring`,media:`logo`},{name:`sinewave`,media:`logo`},{name:`pixelate`,media:`logo`},{name:`halftone`,media:`jellyfish`},{name:`invert`,media:`pigeon`},{name:`grayscale`,media:`pigeon`},{name:`duotone`,media:`jellyfish`,props:{uniforms:{color1:[1,0,0,1],color2:[0,0,1,1],speed:.2}}},{name:`tritone`,media:`jellyfish`,props:{uniforms:{color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2}}},{name:`hueShift`,media:`jellyfish`,props:{uniforms:{shift:.5}}},{name:`vignette`,media:`pigeon`,props:{uniforms:{intensity:.5,radius:.5,power:2}}},{name:`chromatic`,media:`pigeon`,props:{uniforms:{intensity:.3,radius:0,power:2}}}],Wn=[`slitScanReveal`,`warpReveal`,`pixelateReveal`,`focusReveal`].map(e=>({name:e,media:`logo`,props:{intersection:{threshold:1}}})),Gn=new WeakSet,Kn=[{name:`AsciiEffect`,text:`ASCII mosaic from a dark-to-light character ramp.`,media:`pigeon`,create:()=>new i},{name:`BadJpegEffect`,text:`JPEG damage: chroma subsampling and blocky DCT.`,media:`pigeon`,create:()=>new l({quality:4})},{name:`BloomEffect`,text:`Bloom with a soft threshold. Draws outside the element.`,media:`jellyfish`,create:()=>new b({threshold:.2,intensity:4})},{name:`ChromaticEffect`,text:`Chromatic aberration.`,media:`pigeon`,create:()=>new C},{name:`ColoredEdgesEffect`,text:`Edge detection with two edge colors.`,media:`pigeon`,create:()=>new T},{name:`DatamoshEffect`,text:`Fake datamosh.`,media:`jellyfish`,create:()=>new r,hint:`Click to start or stop.`,onClick:e=>{let t=e;Gn.has(t)?(Gn.delete(t),t.disable()):(Gn.add(t),t.enable())}},{name:`DitherEffect`,text:`Bayer or blue-noise dither with few colors.`,media:`pigeon`,create:()=>new v},{name:`DuotoneEffect`,text:`Two-color map.`,media:`pigeon`,create:()=>new h},{name:`FluidEffect`,text:`Fluid simulation driven by the pointer.`,media:`pigeon`,create:()=>new de,hint:`Move the pointer over it.`},{name:`GlitchEffect`,text:`Block shift and aberration glitch.`,media:`pigeon`,create:()=>new a},{name:`GradientMapEffect`,text:`Map brightness to a color gradient.`,media:`pigeon`,create:()=>new _e},{name:`HalftoneEffect`,text:`RGB or CMYK halftone screen.`,media:`pigeon`,create:()=>new d},{name:`HueShiftEffect`,text:`Rotate the hue.`,media:`pigeon`,create:()=>new be},{name:`JPEGGlitchEffect`,text:`Real JPEG glitch: breaks the encoded bytes.`,media:`pigeon`,create:()=>new n},{name:`LightStreakEffect`,text:`Anamorphic flare and starburst streaks.`,media:`jellyfish`,create:()=>new _},{name:`MatrixEffect`,text:`Digital rain of glyphs over the image.`,media:`pigeon`,create:()=>new m},{name:`ParticleEffect`,text:`GPU particles from the pointer.`,media:`pigeon`,create:()=>new Be,hint:`Move the pointer over it.`},{name:`ParticleExplodeEffect`,text:`One burst that shatters the element.`,media:`pigeon`,create:()=>new Ke,hint:`Click to burst.`,zIndex:-1,onClick:e=>e.trigger()},{name:`PatternRefractionEffect`,text:`Refraction through ribbed glass.`,media:`pigeon`,create:()=>new Ze},{name:`PixelateEffect`,text:`Pixelation. size is in CSS px.`,media:`pigeon`,create:()=>new y({size:8})},{name:`PixelSortEffect`,text:`Threshold pixel sort at any angle.`,media:`pigeon`,create:()=>new e},{name:`PixelStretchEffect`,text:`Smear one line across a band of the image.`,media:`pigeon`,create:()=>new et},{name:`RainbowEffect`,text:`Moving rainbow gradient.`,media:`pigeon`,create:()=>new rt},{name:`RgbGlitchEffect`,text:`Block glitch with RGB split.`,media:`pigeon`,create:()=>new ot},{name:`RgbShiftEffect`,text:`RGB channel shift.`,media:`pigeon`,create:()=>new lt},{name:`ScanlineEffect`,text:`CRT scanlines.`,media:`pigeon`,create:()=>new ft},{name:`SinewaveEffect`,text:`Sine wave distortion.`,media:`pigeon`,create:()=>new ht},{name:`SliceShiftEffect`,text:`Split into strips and shift each one.`,media:`pigeon`,create:()=>new vt},{name:`SwirlParticleEffect`,text:`Particles curling over the extruded silhouette.`,media:`logo`,create:()=>new wn({pad:40,yaw:11.5})},{name:`TilePixelateEffect`,text:`Pixelate into shaped tiles.`,media:`pigeon`,create:()=>new On},{name:`TritoneEffect`,text:`Three-color map.`,media:`pigeon`,create:()=>new jn},{name:`VignetteEffect`,text:`Vignette.`,media:`pigeon`,create:()=>new Pn},{name:`VoronoiEffect`,text:`Voronoi cells around the pointer.`,media:`pigeon`,create:()=>new Rn,hint:`Move the pointer over it.`},{name:`WarpEffect`,text:`Sine wave, twist or ripple warp.`,media:`pigeon`,create:()=>new Hn}];ee(()=>{for(let e of[...Un,...Wn]){let t=document.querySelector(`[data-preset="${e.name}"], [data-reveal-preset="${e.name}"]`);t&&x(t,()=>({shader:e.name,...e.props}))}for(let e of Kn){let t=document.querySelector(`[data-effect="${e.name}"]`);if(!t)continue;let n;x(t,()=>(n=e.create(),{effect:n,zIndex:e.zIndex}));let r=e.onClick;r&&t.addEventListener(`click`,()=>{n&&r(n)})}let e=document.getElementById(`UniformsDemo`);e&&x(e,()=>({shader:`duotone`,uniforms:{color1:[0,0,1,1],color2:[0,1,0,1],speed:.2}}));let t=document.getElementById(`ChainDemo`);t&&x(t,()=>({effect:[new y({size:10}),new ft({spacing:5}),new b({threshold:.01,intensity:10,pad:100})]}))});