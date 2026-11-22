const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/prism.AHThHMoM.js","_astro/build.ZQ8Ua7nb.js","_astro/shatter.CUi4o2sT.js","_astro/nebula.3fRVgFbb.js","_astro/glitter.WdC__lWR.js","_astro/sparkle.Cxujy15-.js","_astro/vortex.Dga2QZLx.js","_astro/emboss.Tl2ZpADr.js"])))=>i.map(i=>d[i]);
import{c as e,d as t,l as n,u as r}from"./vfx.BQzHOgnc.js";import{_ as i,a,c as o,d as s,f as c,g as l,h as u,i as d,l as f,m as p,n as m,o as h,p as g,r as _,s as v,t as y,u as b}from"./pixelate.CZay5LvT.js";import{t as x}from"./lifecycle.v3sQOfPt.js";import{t as S}from"./lazy.CVoox302.js";var C=`#version 300 es
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
`,w={intensity:.3,radius:0,power:2},T=class{params;constructor(e={}){this.params={...w,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:C,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}},E=`#version 300 es
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
`,ee={threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},te=class{params;constructor(e={}){this.params={...ee,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel;e.draw({frag:E,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],threshold:t.threshold,thickness:Math.max(.5,t.thickness),intensity:Math.max(0,t.intensity),opacity:Math.min(1,Math.max(0,t.opacity)),color1:f(t.color1),color2:f(t.color2),background:f(t.background)},target:e.target})}},D=`#version 300 es
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
`,ne=`#version 300 es
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
`,O=`#version 300 es
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
`,re=`#version 300 es
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
`,ie=`#version 300 es
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
`,ae=`#version 300 es
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
`,oe=`#version 300 es
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
`,se=`#version 300 es
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
`,ce={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},le=class{params;#e=null;#t=null;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=[0,0];#l=!1;constructor(e={}){this.params={...ce,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};this.#e=e.createRenderTarget(n),this.#t=e.createRenderTarget(n),this.#n=e.createRenderTarget(n),this.#r=e.createRenderTarget(n),this.#i=e.createRenderTarget(n),this.#a=e.createRenderTarget(n),this.#o=e.createRenderTarget({size:t,float:!0,persistent:!0}),this.#s=e.createRenderTarget({float:!0,persistent:!0})}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#o||!this.#s)return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=this.#l?[h[0]-this.#c[0],h[1]-this.#c[1]]:[0,0];this.#c=h,this.#l=!0,e.draw({frag:D,uniforms:{velocity:this.#o,simTexel:d},target:this.#e}),e.draw({frag:ne,uniforms:{velocity:this.#o,curl:this.#e,simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:this.#t}),e.draw({frag:O,uniforms:{vortVel:this.#t,simTexel:d},target:this.#n}),e.clear(this.#r);let _=this.#r,v=this.#i;for(let t=0;t<n;t++){e.draw({frag:re,uniforms:{pressure:_,divergence:this.#n,simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:ie,uniforms:{vortVel:this.#t,pressure:_,simTexel:d},target:this.#a}),e.draw({frag:ae,uniforms:{projVel:this.#a,simTexel:d,velocityDissipation:i},target:this.#o}),e.draw({frag:oe,uniforms:{velocity:this.#o,dye:this.#s,time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:this.#s}),e.draw({frag:se,uniforms:{src:e.src,dye:this.#s,velocity:this.#o,simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#l=!1}},ue=.3,de=`
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
`,fe=de+`
// The extrusion of a 2D sample s (from sd2) at depth z.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, float z) {
    float sz = z >= 0.0 ? 1.0 : -1.0;
    vec2 w = vec2(s.x + rounding, abs(z) - halfDepth + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        return vec4(l - rounding, vec3(s.yz * w.x, sz * w.y) / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, 0.0, 0.0, sz);
}

vec4 sdf3(vec3 p) {
    return extrude(sd2(p.xy), p.z);
}
`,pe=0x56bc75e2d63100000;function me(e,t,n,r,i){let a=0;r[0]=0,i[0]=-0x56bc75e2d63100000,i[1]=pe;for(let n=1;n<t;n++){let t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);for(;t<=i[a];)a--,t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);a++,r[a]=n,i[a]=t,i[a+1]=pe}a=0;for(let o=0;o<t;o++){for(;i[a+1]<o;)a++;let t=o-r[a];n[o]=t*t+e[r[a]]}}function he(e,t,n){let r=Math.max(t,n),i=new Float64Array(r),a=new Float64Array(r),o=new Int32Array(r),s=new Float64Array(r+1);for(let r=0;r<t;r++){for(let a=0;a<n;a++)i[a]=e[a*t+r];me(i,n,a,o,s);for(let i=0;i<n;i++)e[i*t+r]=a[i]}for(let r=0;r<n;r++){for(let n=0;n<t;n++)i[n]=e[r*t+n];me(i,t,a,o,s);for(let n=0;n<t;n++)e[r*t+n]=a[n]}}function ge(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function _e(e,t,n,r,i,a){for(let i=0;i<r;i++)a[i]=e[t+i*n];let o=0;for(let e=0;e<Math.min(i,r);e++)o+=a[e];for(let s=0;s<r;s++){s+i<r&&(o+=a[s+i]),s-i-1>=0&&(o-=a[s-i-1]);let c=Math.min(s+i,r-1)-Math.max(s-i,0)+1;e[t+s*n]=o/c}}function ve(e,t,n,r,i,a=1,o=1){let s=e instanceof Float32Array?1:1/255,c=Math.max(t,n),l=Math.round(c*ue),u=t+l*2,d=n+l*2,f=new Uint8Array(u*d),p=0;for(let r=0;r<n;r++)for(let n=0;n<t;n++)e[(r*t+n)*4+3]*s>=.5&&(f[(r+l)*u+n+l]=1,p++);if(p<16)return null;let m=new Float64Array(u*d),h=new Float64Array(u*d);for(let e=0;e<u*d;e++)m[e]=f[e]?0:pe,h[e]=f[e]?pe:0;he(m,u,d),he(h,u,d);let g=new Float32Array(u*d);for(let e=0;e<u*d;e++)g[e]=f[e]?-(Math.sqrt(h[e])-.5):Math.sqrt(m[e])-.5;let _=Math.max(Math.round(a),0);if(_>0){let e=new Float32Array(Math.max(u,d));for(let t=0;t<Math.max(o,0);t++){for(let t=0;t<d;t++)_e(g,t*u,1,u,_,e);for(let t=0;t<u;t++)_e(g,t,u,d,_,e)}}let v=2/c,y=-(t/2+l)*v,b=-(n/2+l)*v,x=new Float32Array(u*d*4),S=new Float32Array(u*d),C=new Float32Array(u*d);for(let e=0;e<d;e++)for(let t=0;t<u;t++){let n=e*u+t,r=g[e*u+Math.max(t-1,0)],i=g[e*u+Math.min(t+1,u-1)],a=g[Math.max(e-1,0)*u+t],o=g[Math.min(e+1,d-1)*u+t],s=i-r,c=o-a,l=Math.hypot(s,c);l>1e-6?(s/=l,c/=l):(s=0,c=0),S[n]=s,C[n]=c,x[n*4]=g[n]*v,x[n*4+1]=s,x[n*4+2]=c}let w=[],T=[];for(let e=1;e<d-1;e++)for(let t=1;t<u-1;t++){let n=e*u+t;f[n]&&(w.push(n),f[n-1]&&f[n+1]&&f[n-u]&&f[n+u]||T.push(n))}let E=w.length*v*v*2,ee=T.length*1.15*v*(2*r),te=ee/(ee+E),D=ge(1592594996),ne=65536,O=new Float32Array(ne*4);for(let e=0;e<ne;e++){let t=e*4;if(D()<te&&T.length>0){let e=T[Math.floor(D()*T.length)],n=e%u,r=(e-n)/u,i=g[e],a=y+(n+.5+(D()-.5)*.5)*v,o=b+(r+.5+(D()-.5)*.5)*v;O[t]=a-S[e]*i*v,O[t+1]=o-C[e]*i*v,O[t+2]=D()*2-1}else{let e=w[Math.floor(D()*w.length)],n=e%u,r=(e-n)/u;O[t]=y+(n+D())*v,O[t+1]=b+(r+D())*v,O[t+2]=D()<.5?-1:1}}return{sdf:x,sdfW:u,sdfH:d,sdfRect:[y,b,u*v,d*v],shapeHalf:[t/c,n/c],spawn:O,aspect:i}}function ye(e,t){let n=Math.cos(e),r=Math.sin(e),i=Math.cos(t),a=Math.sin(t),o=n,s=r,c=a*r,l=i,u=-a*n;return[o,c,-i*r,0,l,a,s,u,i*n]}var be=`
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
`,xe=`
vec4 snoiseD(vec3 v) {
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
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
    // d/dx of m^4 (p.x) = m^4 p - 8 m^3 (p.x) x
    vec4 t = m2 * m * pdotx;
    vec3 grad = m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3
        - 8.0 * (t.x * x0 + t.y * x1 + t.z * x2 + t.w * x3);
    return 42.0 * vec4(grad, dot(m4, pdotx));
}
`,Se={mono:[`#000000`,`#ffffff`],pastel:[`#ff9f9f`,`#dfdf80`,`#9fff9f`,`#80dfdf`,`#9f9fff`,`#df80df`],redblue:[`#e8102a`,`#1a3fe0`]},Ce={depth:.2,bevel:.03,bevelShape:`round`,bulge:0,bulgeWidth:.15,relief:0,reliefBlur:.006,ior:1.5,dispersion:.12,paths:2,samples:8,bounces:3,jitter:0,tint:`#ffffff`,absorption:0,reflection:1,bump:0,bumpScale:.15,frost:0,backdrop:`stripes`,backdropVisible:!1,backdropScale:.25,backdropDistance:.6,backdropSpeed:.15,backdropColors:`mono`,backdropRatio:.5,backdropSoftness:.03,lightIntensity:1.5,lightSoftness:.15,yaw:.5,pitch:.25,orbit:.35,fov:30,zoom:.7,drag:!1,resolution:1,fxaa:!0,pad:`fullscreen`,debug:`off`},we={none:0,stripes:1,grid:2,marble:3,flow:4},Te=5,Ee=4096,De=`0.3`,Oe=`3.0`,ke=`0.14`,Ae={off:0,outer:1,inner:2,total:3},je={round:0,chamfer:1},Me=4,Ne=16,Pe=6,Fe=2048,Ie=`0.35`,Le=`0.6`,Re=`0.6`,ze=1024,Be=4,Ve=3,He=3,Ue=256,We=.3,Ge=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

${de}

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
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 centerPx;
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

const int MAX_PATHS = ${Me};
const int MAX_SAMPLES = ${Ne};
const int MAX_BOUNCES = ${Pe};
const int OUTER_STEPS = 72;
const int INNER_STEPS = 40;
const float HIT = 0.0012;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

${be}
${xe}

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
    if (backdropMode == ${Te}) {
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
        vec3 n = vec3(q * ${ke}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.3, 2.3, 1.5) + vec3(5.2, 1.3, 7.7));
        float s = (a.w + 0.2 * b.w) * ${Oe};
        u = fract(s + paletteShift);
        vec2 g = (a.xy + 0.46 * b.xy) * ${ke};
        gu = ${Oe} * length(g);
    } else {
        // "flow": a diagonal run through the palette, bent by a noise
        // field. The bend stays weaker than the run, so the colours keep
        // going one way: no closed rings, and no points where they all
        // meet.
        vec3 n = vec3(q * ${De}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.1, 2.1, 1.3) + vec3(17.3, 5.1, 9.7));
        vec2 dir = vec2(0.7071, -0.7071) * 0.22;
        float h = dot(q, dir) + (a.w + 0.25 * b.w) * 0.32 + backdropOffset * 0.05;
        u = fract(h);
        gu = length(dir + (a.xy + 0.525 * b.xy) * 0.32 * ${De});
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
    vec3 col = lights(d, max(lightSoftness, rough * ${Le}));
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
                fw += rough * ${Ie} * t;
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
    vec3 g = snoiseD(p / bumpScale).xyz * ${Re};
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
    vec3 rdV = normalize(vec3((px - centerPx) / focalPx, -1.0));
    vec3 roV = vec3(0.0, 0.0, camDist);
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
`,Ke=`#version 300 es
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
`,qe=`#version 300 es
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
`,Je=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`;function Ye(e,t,n,r){let i=e instanceof Float32Array?1:1/255,a=r.sdfW,o=Math.round((a-t)/2),s=new Float32Array(a*r.sdfH);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let c=(r*t+n)*4,l=.2126*e[c]+.7152*e[c+1]+.0722*e[c+2];s[(r+o)*a+n+o]=Math.min(Math.max(l*i,0),1)}return s}function Xe(e,t){let n=t.sdfRect[2]/t.sdfW,r=Number.isFinite(e)?Math.round(Math.max(e,0)/n):0;return Math.min(r,Ue)}function Ze(e,t,n){let r=t.sdfW,i=t.sdfH,a=e.slice(),o=new Float32Array(Math.max(r,i));for(let e=0;e<He;e++){for(let e=0;e<i;e++)_e(a,e*r,1,r,n,o);for(let e=0;e<r;e++)_e(a,e,r,i,n,o)}let s=1/(2*(t.sdfRect[2]/r)),c=new Float32Array(r*i*4),l=0;for(let e=0;e<i;e++)for(let t=0;t<r;t++){let n=e*r+t,o=(a[e*r+Math.min(t+1,r-1)]-a[e*r+Math.max(t-1,0)])*s,u=(a[Math.min(e+1,i-1)*r+t]-a[Math.max(e-1,0)*r+t])*s;c[n*4]=a[n],c[n*4+1]=o,c[n*4+2]=u,l=Math.max(l,Math.hypot(o,u))}return{relief:c,reliefMaxGrad:l}}function Qe(e,t,n,r){e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4);let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,n,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),i}function $e(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?[e.naturalWidth||e.width,e.naturalHeight||e.height]:typeof HTMLVideoElement<`u`&&e instanceof HTMLVideoElement?[e.videoWidth||e.width,e.videoHeight||e.height]:[e.width,e.height]}function et(e){let t=typeof e==`string`?Se[e]??Se.mono:e,n=t.length>0?[...t]:[...Se.mono];return n.length===1?[n[0],n[0]]:n}function tt(e,t){let n=e.length,r=e.map(rt),i=n*2**Math.max(0,Math.ceil(Math.log2(Ee/n))),a=new Float64Array((i+1)*3),o=(1-t)*i;for(let e=0;e<i;e++){let t=r[Math.floor(e*n/i)];if(n===2){let n=Math.min(Math.max(e+1-o,0),1);t=n===0?r[0]:n===1?r[1]:r[0].map((e,t)=>e+(r[1][t]-e)*n)}for(let n=0;n<3;n++)a[(e+1)*3+n]=a[e*3+n]+t[n]}let s=(e,t)=>{let n=Math.min(Math.floor(e),i-1);return a[n*3+t]+(e-n)*(a[(n+1)*3+t]-a[n*3+t])},c=[];for(let e=i;;e=Math.max(1,Math.floor(e/2))){let t=new Float32Array(e*4),n=i/e;for(let r=0;r<e;r++){for(let e=0;e<3;e++)t[r*4+e]=(s((r+1)*n,e)-s(r*n,e))/n;t[r*4+3]=1}if(c.push(t),e===1)break}return c}function nt(e){return typeof e==`string`&&e in we}function rt(e){let[t,n,r]=f(e);return[t,n,r]}function it(e){return Math.sqrt((2+e*e+e*Math.sqrt(e*e+4))/2)}function at(e,t,n,r){return Number.isFinite(e)?Math.min(Math.max(Math.round(e),t),n):r}var ot=class{params;#e;#t=`capture`;#n=0;#r=null;#i=null;#a=null;#o=null;#s=null;#c=null;#l=null;#u=null;#d=null;#f=null;#p=[];#m=null;#h=null;#g=null;#_=2;#v=null;#y=null;#b=1;#x=null;#S=!1;#C=null;#w=!1;#T=0;#E=0;#D=0;#O=!1;#k=[0,0];#A=null;#j=null;#M=!1;constructor(e={},t={}){this.params={...Ce,...e},this.#e=t.still??!1}setParams(e){Object.assign(this.params,e)}init(e){if(this.#c=e.gl,this.#M=!1,this.#j=e.onContextRestored(()=>{this.#c=e.gl,this.#l=null,this.#u=null,this.#d=null,this.#f=null,this.#p=[],this.#m=null,this.#h=null,this.#g=null,this.#r=this.#i,this.#w=!0}),!this.#e&&typeof window<`u`){let e=e=>{this.params.drag&&(this.#O=!0,this.#k=[e.clientX,e.clientY])},t=e=>{if(!this.#O)return;let t=e.clientX-this.#k[0],n=e.clientY-this.#k[1];this.#k=[e.clientX,e.clientY],this.#E+=t*.006,this.#D=Math.max(-1.2,Math.min(1.2,this.#D+n*.006))},n=()=>{this.#O=!1};window.addEventListener(`pointerdown`,e),window.addEventListener(`pointermove`,t),window.addEventListener(`pointerup`,n),window.addEventListener(`pointercancel`,n),this.#A=()=>{window.removeEventListener(`pointerdown`,e),window.removeEventListener(`pointermove`,t),window.removeEventListener(`pointerup`,n),window.removeEventListener(`pointercancel`,n)}}}outputRect(e){return s(this.params.pad,e)}render(e){this.#t===`capture`&&this.#F(e),this.#r&&(this.#I(e,this.#r),this.#i=this.#r,this.#r=null,this.#t=`ready`),this.#L(e),this.#z(e),this.#B(e),this.#V(e),this.#e||(this.#T+=Math.min(e.deltaTime,.1));let t=this.#P(e),n=this.#N()!==0,[,,r,i]=s(this.params.pad,e.dims),a=Math.round(r),o=Math.round(i),c=this.params.fxaa&&t!==null&&!n&&a>0&&o>0;c&&(this.#s?.width!==a||this.#s?.height!==o)&&(this.#s?.dispose(),this.#s=e.createRenderTarget({size:[a,o],filter:`linear`}));let l=c?this.#s:null;e.draw({frag:Ke,uniforms:{scene:t??e.src,hasScene:+!!t,raw:+!!n},target:l??e.target}),l&&e.draw({frag:qe,uniforms:{srcTex:l,texel:[1/l.width,1/l.height]},target:e.target})}#N(){return Ae[this.params.debug]??0}#P(e){let t=this.#i,n=this.#u;if(this.#t!==`ready`||!t||!n)return null;let r=this.params,i=e.dims,[a,o,c,l]=s(r.pad,i);if(c<=0||l<=0)return null;let u=Number.isFinite(r.resolution)?Math.min(Math.max(r.resolution,.25),2):1,d=Math.max(1,Math.round(c*u)),f=Math.max(1,Math.round(l*u));this.#o&&this.#o.width===d&&this.#o.height===f||(this.#o?.dispose(),this.#o=e.createRenderTarget({size:[d,f],float:!0,filter:`linear`}));let p=this.#o,m=this.#T,h=Number.isFinite(r.orbit)?r.orbit:0,g=r.yaw+h*Math.sin(m*.43)+this.#E,_=r.pitch+h*We*Math.sin(m*.31+1.3)+this.#D,v=Math.min(Math.max(r.fov,1),150),y=1/Math.tan(v*Math.PI/360),[b,x]=i.elementPixel,S=Math.max(b,x)/2*r.zoom,C=Math.max(r.depth/2,.005),w=Number.isFinite(r.bulge)?Math.max(r.bulge,0):0,T=Math.max(r.bulgeWidth,.001),E=w>0?2*w/T:0,ee=Number.isFinite(r.relief)&&Math.abs(r.relief)>1e-6?Math.max(r.relief,-2*C*.8):0,te=Math.abs(ee)*t.reliefMaxGrad,D=nt(r.backdrop)?null:this.#C,ne=nt(r.backdrop)?we[r.backdrop]:D?Te:0;return e.draw({frag:Ge,uniforms:{sdfTex:n,sdfRect:t.sdfRect,sdfSize:[t.sdfW,t.sdfH],halfDepth:C,rounding:Math.min(Math.max(r.bevel,0),C),bevelShape:je[r.bevelShape]??0,bulge:w,bulgeWidth:T,stepScale:w>0?1/it(E):1,reliefTex:this.#f??n,relief:ee,reliefScale:it(E)/it(E+te),shapeHalf:t.shapeHalf,viewRot:ye(g,_),camDist:y,focalPx:y*S,centerPx:[b/2-a,x/2-o],bufferPx:[c,l],pixelSize:c/d,ior:Math.max(r.ior,1.0001),dispersion:r.dispersion,paths:at(r.paths,1,Me,2),samples:at(r.samples,1,Ne,8),bounces:at(r.bounces,1,Pe,3),jitter:Math.min(Math.max(r.jitter,0),1),tint:rt(r.tint),absorption:Math.max(r.absorption,0),reflection:Math.max(r.reflection,0),bump:Number.isFinite(r.bump)?Math.min(Math.max(r.bump,0),1):0,bumpScale:Math.max(r.bumpScale,.001),frost:Number.isFinite(r.frost)?Math.min(Math.max(r.frost,0),1):0,backdropMode:ne,backdropTex:D??n,backdropAspect:this.#b,backdropVisible:+!!r.backdropVisible,backdropScale:r.backdropScale,backdropDistance:Math.max(r.backdropDistance,C+w+Math.max(ee,0)),backdropOffset:m*r.backdropSpeed,paletteTex:(ne===we.grid?this.#h:this.#m)??n,paletteSize:this.#_,paletteShift:this.#_===2?.5-Math.min(Math.max(r.backdropRatio,0),1)/2:0,backdropSoftness:Math.min(Math.max(r.backdropSoftness,0),1),lightIntensity:Math.max(r.lightIntensity,0),lightSoftness:Math.min(Math.max(r.lightSoftness,0),1),debugView:this.#N()},target:p}),p}#F(e){if(e.src.width===0||e.src.height===0||++this.#n<3)return;let[n,r]=e.dims.elementPixel,i=n/Math.max(r,1),a=i>=1?ze:Math.round(ze*i),o=i>=1?Math.round(ze/i):ze;this.#a&&this.#a.width===a&&this.#a.height===o||(this.#a?.dispose(),this.#a=e.createRenderTarget({size:[a,o]})),t(e,this.#a),this.#t=`reading`,e.readPixels(this.#a).then(e=>{let t=ve(e,a,o,this.params.depth/2,i,Be,Ve);if(t){let n=Ye(e,a,o,t),r=Xe(this.params.reliefBlur,t);this.#r={...t,reliefLum:n,reliefRadius:r,...Ze(n,t,r)}}else this.#n=0,this.#t=`capture`},()=>{})}#I(e,t){let n=e.gl;this.#l&&n.deleteTexture(this.#l),this.#l=null,this.#u=null;let r=Qe(n,t.sdfW,t.sdfH,t.sdf);e.resetState(),r&&(this.#l=r,this.#u=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`})),this.#R(e,t)}#L(e){let t=this.#i;if(!t)return;let n=Xe(this.params.reliefBlur,t);n!==t.reliefRadius&&(Object.assign(t,Ze(t.reliefLum,t,n)),t.reliefRadius=n,this.#R(e,t))}#R(e,t){let n=e.gl;this.#d&&n.deleteTexture(this.#d),this.#d=null,this.#f=null;let r=Qe(n,t.sdfW,t.sdfH,t.relief);e.resetState();let i=[t.sdfW,t.sdfH];r&&(this.#d=r,this.#f=e.wrapTexture(r,{size:i,filter:`linear`,wrap:`clamp`}))}#z(e){let t=et(this.params.backdropColors),n=this.params.backdropRatio,r=Number.isFinite(n)?Math.min(Math.max(n,0),1):.5,i=t.length===2?`${t.join(`,`)}|${r}`:t.join(`,`);if(i===this.#g)return;this.#g=i,this.#_=t.length;let a=e.gl;for(let e of this.#p)a.deleteTexture(e);this.#p=[],this.#m=null,this.#h=null;let o=tt(t,r);a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,!1),a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),a.pixelStorei(a.UNPACK_ALIGNMENT,4);let s=t=>{let n=a.createTexture();return a.bindTexture(a.TEXTURE_2D,n),o.forEach((e,t)=>{a.texImage2D(a.TEXTURE_2D,t,a.RGBA16F,e.length/4,1,0,a.RGBA,a.FLOAT,e)}),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR_MIPMAP_LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,t?a.REPEAT:a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.bindTexture(a.TEXTURE_2D,null),n?(this.#p.push(n),e.wrapTexture(n,{size:[o[0].length/4,1],filter:`linear`,wrap:[t?`repeat`:`clamp`,`clamp`]})):null};this.#m=s(!0),this.#h=s(!1),e.resetState()}#B(e){let t=this.params.backdrop;if(t===this.#y||(this.#y=t,this.#v?.dispose(),this.#v=null,this.#x=null,this.#C?.dispose(),this.#C=null,nt(t)))return;let n=n=>{if(this.#M||this.#y!==t)return;let[r,i]=$e(n);this.#b=r>0&&i>0?r/i:1,this.#x=n,this.#S=typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement,this.#w=!0,this.#v=e.wrapTexture(n,{filter:`linear`,wrap:`clamp`})};if(typeof t!=`string`){n(t);return}let r=new Image;r.crossOrigin=`anonymous`,r.src=t,r.decode().then(()=>n(r),()=>{})}#V(e){let t=this.#v,n=this.#x;if(!t||!n||!(this.#w||this.#S))return;let[r,i]=$e(n),a=Math.min(1,Fe/Math.max(r,i,1)),o=Math.max(1,Math.round(r*a)),s=Math.max(1,Math.round(i*a));(this.#C?.width!==o||this.#C?.height!==s)&&(this.#C?.dispose(),this.#C=e.createRenderTarget({size:[o,s],filter:`linear`,mipmap:!0})),e.draw({frag:Je,uniforms:{srcTex:t},target:this.#C}),this.#w=!1}dispose(){if(this.#M=!0,this.#A?.(),this.#A=null,this.#j?.(),this.#j=null,this.#c&&this.#l&&this.#c.deleteTexture(this.#l),this.#c&&this.#d&&this.#c.deleteTexture(this.#d),this.#c)for(let e of this.#p)this.#c.deleteTexture(e);this.#p=[],this.#m=null,this.#h=null,this.#g=null,this.#d=null,this.#f=null,this.#c=null,this.#l=null,this.#u=null,this.#v?.dispose(),this.#v=null,this.#x=null,this.#y=null,this.#C?.dispose(),this.#C=null,this.#a?.dispose(),this.#a=null,this.#o?.dispose(),this.#o=null,this.#s?.dispose(),this.#s=null,this.#i=null,this.#r=null,this.#t=`capture`,this.#n=0}},st=8,ct=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${st}];
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
`,lt={none:0,repeat:1,mirror:2},ut={srgb:0,linear:1,oklab:2},dt={colors:[`#bbee00`,`#3aa0ff`,`#000000`],scatter:0,offset:0,repeat:`mirror`,frequency:1,mixSpace:`srgb`,speed:0},ft=class{params;constructor(e={}){this.params={...dt,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,n=t.colors.length>=2?t.colors:dt.colors,r=Math.min(st,n.length),i=new Float32Array(24);for(let e=0;e<st;e++){let[t,a,o]=f(n[Math.min(e,r-1)]);i[e*3]=t,i[e*3+1]=a,i[e*3+2]=o}e.draw({frag:ct,uniforms:{src:e.src,colors:i,colorCount:r,scatter:Math.max(0,t.scatter),offset:t.offset,repeatType:lt[t.repeat]??0,frequency:t.frequency,mixSpace:ut[t.mixSpace]??0,time:e.time*t.speed},target:e.target})}},pt={card:{prism:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5},"prism.pitch":1765,"prism.pattern":`concentric`,"prism.nc":1.56,"prism.waviness":0,"prism.coatAlpha":.01,"prism.orangePeel":0,"prism.seed":291},pose:{rx:-20.5,ry:-25}},shatter:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},nebula:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},sparkle:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},vortex:{values:{"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.64,y:.22},"studio.spotA.dir":{x:-.6,y:.32},"studio.spotB.dir":{x:-.26,y:-.48},"studio.spotC.on":!0,"studio.spotC.dir":{x:-.65,y:.47},"studio.ambient.rims":1,"studio.ambient.fill":.8,"studio.ambient.scrim":.5,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.85,"studio.ambient.backdrop":.84,"studio.ambient.rotation":-61,"studio.flash.size":11,"studio.flash.distance":.33,"grain.amount":.07,"card.emboss":`lines`,"card.embossPitch":.26,"card.wear":0,"motion.pose":{x:-25,y:-20.5}},pose:{rx:-20.5,ry:-25}},emboss:{values:{"dof.lens":51,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:-.3,y:-.7},"studio.panel.width":22,"studio.panel.length":8,"studio.panel.radiance":6,"studio.panel.distance":.45,"studio.spotA.dir":{x:.42,y:.33},"studio.spotA.size":2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":2800,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":.35,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":-28,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"card.bow":2,"motion.pose":{x:-.5,y:0},"emboss.height":15,"emboss.shoulder":.1,"emboss.profile":`bevel`,"emboss.puff":.3,"emboss.foil":`concentric`,"emboss.pitch":1200,"emboss.grooveAngle":149,"emboss.foilCoverage":1,"emboss.edgeBreakup":.31,"emboss.showThrough":0,"emboss.gloss":0,"emboss.sparkleSize":380,"emboss.foilBump":.29,"emboss.textureStrength":0,"emboss.fibreScale":1.32},pose:{rx:0,ry:-.5}}},object:{prism:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"prism.pitch":1765,"prism.pattern":`concentric`,"prism.nc":1.56,"prism.waviness":0,"prism.coatAlpha":.01,"prism.orangePeel":0,"prism.seed":291},pose:{rx:2.5,ry:-27}},shatter:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5}},pose:{rx:2.5,ry:-27}},nebula:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"nebula.size":140,"nebula.shape":`round`,"nebula.tilt":2.7,"nebula.curv":.05,"nebula.coverage":.57,"nebula.pitchMin":1180,"nebula.pitchMax":870,"nebula.depth":146,"nebula.starDensity":30,"nebula.baseColor":`#22155f`,"nebula.nc":1.65,"nebula.tintEdge":516,"nebula.tintWidth":150,"nebula.tintFloor":.07,"nebula.waviness":.57,"nebula.coatAlpha":.01,"nebula.orangePeel":1.2},pose:{rx:2.5,ry:-27}},sparkle:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5},"sparkle.size":215,"sparkle.coverage":.8},pose:{rx:2.5,ry:-27}},vortex:{values:{"dof.lens":200,"scene.background":`colour`,"scene.bgColor":`#ffffff`,"studio.panel.dir":{x:.03,y:-.07},"studio.spotA.dir":{x:-.55,y:1},"studio.spotA.size":3.2,"studio.spotA.radiance":1440,"studio.spotB.dir":{x:-.4,y:.95},"studio.spotB.size":2.2,"studio.spotB.radiance":1720,"studio.spotB.distance":1.85,"studio.spotC.on":!0,"studio.spotC.dir":{x:.88,y:-.53},"studio.spotC.size":.2,"studio.spotC.radiance":1300,"studio.spotC.distance":.7,"studio.ambient.rims":.9,"studio.ambient.fill":.45,"studio.ambient.scrim":2,"studio.ambient.cameraSide":.019,"studio.ambient.cameraTexture":.5,"studio.ambient.backdrop":.27,"studio.ambient.rotation":122,"studio.flash.size":7.5,"studio.flash.distance":.33,"display.ev":.8,"display.glare":.075,"grain.amount":.07,"motion.pose":{x:-27,y:2.5}},pose:{rx:2.5,ry:-27}}}},mt={"emboss.stock":{cotton:{"emboss.paperColour":`#f3f1ea`,"emboss.textureStrength":1,"emboss.fibreAmount":.55,"emboss.fibreScale":1,"emboss.tooth":7,"emboss.formation":.45,"emboss.roughness":.75,"emboss.sheen":.35,"emboss.translucency":.35},felt:{"emboss.paperColour":`#f2efe7`,"emboss.textureStrength":1.15,"emboss.fibreAmount":.45,"emboss.fibreScale":1,"emboss.tooth":10,"emboss.formation":.4,"emboss.roughness":.8,"emboss.sheen":.3,"emboss.translucency":.3},smooth:{"emboss.paperColour":`#f5f4f0`,"emboss.textureStrength":.7,"emboss.fibreAmount":.3,"emboss.fibreScale":.8,"emboss.tooth":3,"emboss.formation":.3,"emboss.roughness":.55,"emboss.sheen":.5,"emboss.translucency":.25},laid:{"emboss.paperColour":`#efe9dc`,"emboss.textureStrength":1,"emboss.fibreAmount":.45,"emboss.fibreScale":1.1,"emboss.tooth":6,"emboss.formation":.55,"emboss.roughness":.7,"emboss.sheen":.35,"emboss.translucency":.4},linen:{"emboss.paperColour":`#f5f3ee`,"emboss.textureStrength":1,"emboss.fibreAmount":.35,"emboss.fibreScale":.9,"emboss.tooth":4.5,"emboss.formation":.3,"emboss.roughness":.65,"emboss.sheen":.4,"emboss.translucency":.3},kraft:{"emboss.paperColour":`#b48c63`,"emboss.textureStrength":1.2,"emboss.fibreAmount":.85,"emboss.fibreScale":1.4,"emboss.tooth":8,"emboss.formation":.6,"emboss.roughness":.8,"emboss.sheen":.25,"emboss.translucency":.15}}},ht=[{id:`dof.lens`,kind:`slider`,default:62,min:24,max:200,step:1},{id:`scene.background`,kind:`select`,default:`white`,options:[`black`,`white`,`colour`]},{id:`scene.bgColor`,kind:`color`,default:`#3a4458`},{id:`studio.preset`,kind:`select`,default:`studio`,options:[`studio`,`spot`,`softbox`,`strip`,`dark`,`desk`,`office`,`raking`]},{id:`studio.panel.on`,kind:`toggle`,default:!0},{id:`studio.panel.dir`,kind:`pad`,default:{x:-.48,y:.66},min:-1,max:1,step:.01},{id:`studio.panel.width`,kind:`slider`,default:14,min:1,max:80,step:1},{id:`studio.panel.length`,kind:`slider`,default:50,min:1,max:90,step:1},{id:`studio.panel.radiance`,kind:`slider`,default:4,min:0,max:50,step:.1},{id:`studio.panel.distance`,kind:`slider`,default:.9,min:.3,max:3,step:.05},{id:`studio.panel.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotA.on`,kind:`toggle`,default:!0},{id:`studio.spotA.dir`,kind:`pad`,default:{x:-.04,y:-.1},min:-1,max:1,step:.01},{id:`studio.spotA.size`,kind:`slider`,default:1.5,min:.2,max:10,step:.1},{id:`studio.spotA.radiance`,kind:`slider`,default:1200,min:0,max:5e3,step:10},{id:`studio.spotA.distance`,kind:`slider`,default:1,min:.3,max:3,step:.05},{id:`studio.spotA.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotB.on`,kind:`toggle`,default:!0},{id:`studio.spotB.dir`,kind:`pad`,default:{x:-.25,y:-.68},min:-1,max:1,step:.01},{id:`studio.spotB.size`,kind:`slider`,default:2.5,min:.2,max:10,step:.1},{id:`studio.spotB.radiance`,kind:`slider`,default:600,min:0,max:5e3,step:10},{id:`studio.spotB.distance`,kind:`slider`,default:1.2,min:.3,max:3,step:.05},{id:`studio.spotB.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.spotC.on`,kind:`toggle`,default:!1},{id:`studio.spotC.dir`,kind:`pad`,default:{x:.21,y:-.37},min:-1,max:1,step:.01},{id:`studio.spotC.size`,kind:`slider`,default:1,min:.2,max:10,step:.1},{id:`studio.spotC.radiance`,kind:`slider`,default:1200,min:0,max:5e3,step:10},{id:`studio.spotC.distance`,kind:`slider`,default:1,min:.3,max:3,step:.05},{id:`studio.spotC.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`studio.ambient.rims`,kind:`slider`,default:3,min:0,max:10,step:.1},{id:`studio.ambient.fill`,kind:`slider`,default:.4,min:0,max:3,step:.05},{id:`studio.ambient.scrim`,kind:`slider`,default:.4,min:0,max:2,step:.05},{id:`studio.ambient.cameraSide`,kind:`slider`,default:.004,min:0,max:.1,step:.001},{id:`studio.ambient.cameraTexture`,kind:`slider`,default:1,min:0,max:1,step:.05},{id:`studio.ambient.backdrop`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`studio.ambient.rotation`,kind:`slider`,default:0,min:-180,max:180,step:1},{id:`studio.flash.size`,kind:`slider`,default:8.5,min:1,max:20,step:.5},{id:`studio.flash.distance`,kind:`slider`,default:.3,min:.15,max:1,step:.01},{id:`studio.flash.radiance`,kind:`slider`,default:1500,min:0,max:5e3,step:10},{id:`studio.flash.spd`,kind:`select`,default:`equal`,options:[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`]},{id:`display.ev`,kind:`slider`,default:.5,min:-3,max:3,step:.1},{id:`display.tone`,kind:`select`,default:`neutral`,options:[`neutral`,`agx`,`clamp`]},{id:`display.glare`,kind:`slider`,default:.03,min:0,max:.1,step:.005},{id:`display.glareRadius`,kind:`slider`,default:8,min:2,max:32,step:1},{id:`grain.on`,kind:`toggle`,default:!0},{id:`grain.amount`,kind:`slider`,default:.07,min:0,max:.6,step:.005},{id:`grain.size`,kind:`slider`,default:1,min:1,max:4,step:.25},{id:`grain.animated`,kind:`toggle`,default:!0},{id:`grain.colour`,kind:`select`,default:`mono`,options:[`mono`,`rgb`]},{id:`grain.onBackground`,kind:`toggle`,default:!1},{id:`card.bow`,kind:`slider`,default:1.6,min:0,max:2,step:.05},{id:`card.bowAxis`,kind:`select`,default:`across`,options:[`across`,`along`]},{id:`card.emboss`,kind:`select`,default:`crosshatch`,options:[`none`,`lines`,`crosshatch`]},{id:`card.embossPitch`,kind:`slider`,default:1.17,min:.15,max:2,step:.01},{id:`card.embossHeight`,kind:`slider`,default:.5,min:0,max:15,step:.5},{id:`card.embossLayer`,kind:`select`,default:`varnish`,options:[`foil`,`varnish`]},{id:`card.wear`,kind:`slider`,default:.16,min:0,max:1,step:.01},{id:`motion.pointer`,kind:`select`,default:`tilt`,options:[`tilt`,`light`,`flash`,`none`]},{id:`motion.tiltRange`,kind:`slider`,default:25,min:5,max:35,step:1},{id:`motion.pose`,kind:`pad`,default:{x:0,y:0},min:-35,max:35,step:.5},{id:`motion.wobble`,kind:`toggle`,default:!0},{id:`motion.wobbleAmp`,kind:`slider`,default:14,min:0,max:25,step:.5},{id:`prism.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`prism.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`prism.pattern`,kind:`select`,default:`linear`,options:[`linear`,`concentric`,`radial`]},{id:`prism.depth`,kind:`slider`,default:50,min:0,max:200,step:1},{id:`prism.coverage`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`prism.fan`,kind:`slider`,default:7,min:0,max:20,step:.1},{id:`prism.sigTheta`,kind:`slider`,default:.3,min:0,max:5,step:.05},{id:`prism.sigPitch`,kind:`slider`,default:.5,min:0,max:3,step:.05},{id:`prism.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`prism.roughness`,kind:`slider`,default:.2,min:.05,max:3,step:.05},{id:`prism.tint`,kind:`select`,default:`clear`,options:[`clear`,`longpass`,`shortpass`]},{id:`prism.tintEdge`,kind:`slider`,default:505,min:400,max:700,step:1},{id:`prism.tintWidth`,kind:`slider`,default:35,min:5,max:150,step:1},{id:`prism.tintFloor`,kind:`slider`,default:.06,min:0,max:1,step:.01},{id:`prism.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`prism.coatAlpha`,kind:`slider`,default:.04,min:.01,max:.5,step:.005},{id:`prism.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`prism.seed`,kind:`slider`,default:1,min:1,max:999,step:1},{id:`shatter.size`,kind:`slider`,default:2.5,min:.5,max:8,step:.1},{id:`shatter.jitter`,kind:`slider`,default:.9,min:0,max:1,step:.01},{id:`shatter.chords`,kind:`slider`,default:1.8,min:0,max:3,step:.1},{id:`shatter.orientK`,kind:`slider`,default:0,min:0,max:24,step:1},{id:`shatter.tilt`,kind:`slider`,default:1,min:0,max:6,step:.05},{id:`shatter.fan`,kind:`slider`,default:5,min:0,max:15,step:.1},{id:`shatter.pitchA`,kind:`slider`,default:1150,min:500,max:2e3,step:5},{id:`shatter.pitchB`,kind:`slider`,default:1080,min:500,max:2e3,step:5},{id:`shatter.pitchC`,kind:`slider`,default:870,min:500,max:2e3,step:5},{id:`shatter.depth`,kind:`slider`,default:95,min:0,max:200,step:1},{id:`shatter.coverage`,kind:`slider`,default:.7,min:.2,max:1,step:.01},{id:`shatter.chirp`,kind:`slider`,default:0,min:0,max:5,step:.1},{id:`shatter.ridgeH`,kind:`slider`,default:.3,min:-.4,max:.4,step:.01},{id:`shatter.ridgeW`,kind:`slider`,default:40,min:10,max:200,step:1},{id:`shatter.creaseShare`,kind:`slider`,default:50,min:0,max:100,step:1},{id:`shatter.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`shatter.roughness`,kind:`slider`,default:.45,min:.05,max:3,step:.05},{id:`shatter.tint`,kind:`select`,default:`longpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`shatter.tintEdge`,kind:`slider`,default:500,min:400,max:700,step:1},{id:`shatter.tintWidth`,kind:`slider`,default:70,min:5,max:150,step:1},{id:`shatter.tintFloor`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`shatter.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`shatter.coatAlpha`,kind:`slider`,default:.05,min:.01,max:.5,step:.005},{id:`shatter.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`shatter.seed`,kind:`slider`,default:7,min:1,max:999,step:1},{id:`nebula.size`,kind:`slider`,default:200,min:50,max:400,step:5},{id:`nebula.shape`,kind:`select`,default:`hex`,options:[`hex`,`square`,`round`]},{id:`nebula.layers`,kind:`slider`,default:2,min:1,max:3,step:1},{id:`nebula.tilt`,kind:`slider`,default:4.6,min:0,max:20,step:.1},{id:`nebula.curv`,kind:`slider`,default:.4,min:.05,max:3,step:.05},{id:`nebula.coverage`,kind:`slider`,default:.65,min:0,max:1,step:.01},{id:`nebula.pitchMin`,kind:`slider`,default:665,min:400,max:2e3,step:5},{id:`nebula.pitchMax`,kind:`slider`,default:740,min:400,max:2e3,step:5},{id:`nebula.depth`,kind:`slider`,default:100,min:0,max:200,step:1},{id:`nebula.starSize`,kind:`slider`,default:600,min:150,max:1500,step:10},{id:`nebula.starDensity`,kind:`slider`,default:3,min:0,max:30,step:.5},{id:`nebula.baseColor`,kind:`color`,default:`#0c0a24`},{id:`nebula.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`nebula.tint`,kind:`select`,default:`shortpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`nebula.tintEdge`,kind:`slider`,default:525,min:400,max:700,step:1},{id:`nebula.tintWidth`,kind:`slider`,default:30,min:5,max:150,step:1},{id:`nebula.tintFloor`,kind:`slider`,default:.15,min:0,max:1,step:.01},{id:`nebula.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`nebula.coatAlpha`,kind:`slider`,default:.06,min:.01,max:.5,step:.005},{id:`nebula.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`nebula.seed`,kind:`slider`,default:3,min:1,max:999,step:1},{id:`sparkle.size`,kind:`slider`,default:470,min:100,max:1500,step:5},{id:`sparkle.coverage`,kind:`slider`,default:.4,min:.1,max:.8,step:.01},{id:`sparkle.irregularity`,kind:`slider`,default:.8,min:0,max:1,step:.01},{id:`sparkle.tilt`,kind:`slider`,default:.3,min:0,max:5,step:.05},{id:`sparkle.dome`,kind:`slider`,default:.3,min:.05,max:2,step:.05},{id:`sparkle.orientJitter`,kind:`slider`,default:2,min:0,max:15,step:.1},{id:`sparkle.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`sparkle.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`sparkle.depth`,kind:`slider`,default:55,min:0,max:200,step:1},{id:`sparkle.fan`,kind:`slider`,default:12,min:0,max:30,step:.1},{id:`sparkle.pitchJitter`,kind:`slider`,default:1.5,min:0,max:5,step:.05},{id:`sparkle.speckShare`,kind:`slider`,default:9,min:0,max:30,step:.5},{id:`sparkle.speckType`,kind:`select`,default:`dyed`,options:[`dyed`,`grating`]},{id:`sparkle.speckDyePeak`,kind:`slider`,default:460,min:420,max:520,step:1},{id:`sparkle.speckDyeWidth`,kind:`slider`,default:25,min:10,max:60,step:1},{id:`sparkle.speckDyeFloor`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`sparkle.speckPitch`,kind:`slider`,default:700,min:400,max:2e3,step:5},{id:`sparkle.speckSize`,kind:`slider`,default:.9,min:.3,max:1,step:.01},{id:`sparkle.matte`,kind:`slider`,default:8,min:1,max:20,step:.1},{id:`sparkle.sandSize`,kind:`slider`,default:.5,min:.15,max:1,step:.01},{id:`sparkle.sandTilt`,kind:`slider`,default:5,min:0,max:8,step:.1},{id:`sparkle.hazeShare`,kind:`slider`,default:0,min:0,max:1,step:.01},{id:`sparkle.hazeDepth`,kind:`slider`,default:60,min:0,max:200,step:1},{id:`sparkle.hazeRoughness`,kind:`slider`,default:1.5,min:.05,max:6,step:.05},{id:`sparkle.hazeFan`,kind:`slider`,default:10,min:0,max:20,step:.1},{id:`sparkle.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`sparkle.tint`,kind:`select`,default:`shortpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`sparkle.tintEdge`,kind:`slider`,default:600,min:400,max:700,step:1},{id:`sparkle.tintWidth`,kind:`slider`,default:90,min:5,max:150,step:1},{id:`sparkle.tintFloor`,kind:`slider`,default:.5,min:0,max:1,step:.01},{id:`sparkle.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`sparkle.coatAlpha`,kind:`slider`,default:.05,min:.01,max:.5,step:.005},{id:`sparkle.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`sparkle.seed`,kind:`slider`,default:5,min:1,max:999,step:1},{id:`vortex.pitch`,kind:`slider`,default:1250,min:600,max:2e3,step:5},{id:`vortex.swirl`,kind:`slider`,default:15,min:0,max:60,step:.5},{id:`vortex.handedness`,kind:`select`,default:`ccw`,options:[`ccw`,`cw`]},{id:`vortex.centre`,kind:`pad`,default:{x:0,y:0},min:-1,max:1,step:.01},{id:`vortex.depth`,kind:`slider`,default:45,min:0,max:200,step:1},{id:`vortex.fan`,kind:`slider`,default:1.5,min:0,max:10,step:.1},{id:`vortex.bands`,kind:`slider`,default:24,min:0,max:96,step:1},{id:`vortex.contrast`,kind:`slider`,default:.45,min:0,max:1,step:.01},{id:`vortex.nc`,kind:`slider`,default:1.5,min:1.4,max:1.7,step:.01},{id:`vortex.roughness`,kind:`slider`,default:.25,min:.05,max:3,step:.05},{id:`vortex.tint`,kind:`select`,default:`longpass`,options:[`clear`,`longpass`,`shortpass`]},{id:`vortex.tintEdge`,kind:`slider`,default:500,min:400,max:700,step:1},{id:`vortex.tintWidth`,kind:`slider`,default:50,min:5,max:150,step:1},{id:`vortex.tintFloor`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`vortex.waviness`,kind:`slider`,default:.3,min:0,max:1,step:.01},{id:`vortex.coatAlpha`,kind:`slider`,default:.045,min:.01,max:.5,step:.005},{id:`vortex.orangePeel`,kind:`slider`,default:.6,min:0,max:2,step:.05},{id:`vortex.seed`,kind:`slider`,default:9,min:1,max:999,step:1},{id:`emboss.logo`,kind:`image`,default:``},{id:`emboss.threshold`,kind:`slider`,default:.5,min:.01,max:.99,step:.01},{id:`emboss.x`,kind:`slider`,default:null,step:1},{id:`emboss.y`,kind:`slider`,default:null,step:1},{id:`emboss.width`,kind:`slider`,default:null,min:1,step:1},{id:`emboss.rotation`,kind:`slider`,default:0,min:-180,max:180,step:.5},{id:`emboss.height`,kind:`slider`,default:450,min:0,max:1e3,step:5},{id:`emboss.shoulder`,kind:`slider`,default:.6,min:.05,max:2,step:.01},{id:`emboss.profile`,kind:`select`,default:`round`,options:[`round`,`bevel`,`dome`,`deboss`]},{id:`emboss.puff`,kind:`slider`,default:.4,min:0,max:1,step:.01},{id:`emboss.foil`,kind:`select`,default:`rainbow`,options:[`rainbow`,`concentric`,`sparkle`,`silver`,`gold`]},{id:`emboss.pitch`,kind:`slider`,default:1e3,min:500,max:2e3,step:5},{id:`emboss.grooveAngle`,kind:`slider`,default:120,min:0,max:180,step:1},{id:`emboss.foilCoverage`,kind:`slider`,default:.85,min:0,max:1,step:.01},{id:`emboss.edgeBreakup`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.showThrough`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`emboss.gloss`,kind:`slider`,default:.8,min:0,max:1,step:.01},{id:`emboss.sparkleSize`,kind:`slider`,default:160,min:40,max:600,step:5},{id:`emboss.foilBump`,kind:`slider`,default:.25,min:0,max:1,step:.01},{id:`emboss.print`,kind:`image`,default:``,options:[]},{id:`emboss.printInk`,kind:`slider`,default:1,min:0,max:1,step:.01},{id:`emboss.paperColour`,kind:`color`,default:`#f3f1ea`},{id:`emboss.stock`,kind:`select`,default:`cotton`,options:[`cotton`,`felt`,`smooth`,`laid`,`linen`,`kraft`]},{id:`emboss.textureStrength`,kind:`slider`,default:1,min:0,max:2,step:.01},{id:`emboss.fibreAmount`,kind:`slider`,default:.55,min:0,max:1,step:.01},{id:`emboss.fibreScale`,kind:`slider`,default:1,min:.5,max:2,step:.01},{id:`emboss.tooth`,kind:`slider`,default:7,min:0,max:30,step:.5},{id:`emboss.formation`,kind:`slider`,default:.45,min:0,max:1,step:.01},{id:`emboss.roughness`,kind:`slider`,default:.75,min:.2,max:1,step:.01},{id:`emboss.sheen`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.translucency`,kind:`slider`,default:.35,min:0,max:1,step:.01},{id:`emboss.waviness`,kind:`slider`,default:.12,min:0,max:1,step:.01},{id:`emboss.paperBump`,kind:`toggle`,default:!1},{id:`emboss.exposure`,kind:`slider`,default:.6,min:-2,max:2,step:.1},{id:`emboss.seed`,kind:`slider`,default:7,min:1,max:999,step:1}],gt={prism:{compactDisc:{"prism.pattern":`concentric`,"prism.pitch":1600,"prism.fan":1.5,"prism.coatAlpha":.02,"prism.orangePeel":0},goldRainbowFoil:{"prism.tint":`longpass`,"prism.tintEdge":500,"prism.tintWidth":70,"prism.tintFloor":.25,"prism.depth":80},softPastelSatin:{"prism.fan":16,"prism.roughness":1.2,"prism.sigPitch":2,"prism.coatAlpha":.15},sunburst:{"prism.pattern":`radial`,"prism.pitch":1200,"prism.depth":110,"prism.fan":0,"prism.sigTheta":3},iceBlue:{"prism.tint":`shortpass`,"prism.tintEdge":560,"prism.tintWidth":60,"prism.tintFloor":.3}},shatter:{silverCrackedIce:{"shatter.tint":`clear`,"shatter.depth":75},fineFrost:{"shatter.size":.8,"shatter.chords":1,"shatter.tilt":2.5,"shatter.fan":8},largeMirrorFacets:{"shatter.size":6,"shatter.coverage":.3,"shatter.tilt":3,"shatter.ridgeH":.4,"shatter.creaseShare":100},steppedFlashes:{"shatter.orientK":6,"shatter.jitter":.6,"shatter.chords":.8},squareTiles:{"shatter.jitter":0,"shatter.chords":0,"shatter.size":3,"shatter.creaseShare":100}},nebula:{silverHolographicGlitter:{"nebula.tint":`clear`,"nebula.baseColor":`#101014`,"nebula.pitchMin":800,"nebula.pitchMax":1200},goldGlitter:{"nebula.tint":`longpass`,"nebula.tintEdge":500,"nebula.tintWidth":70,"nebula.tintFloor":.25,"nebula.baseColor":`#2a1a05`,"nebula.pitchMin":900,"nebula.pitchMax":1200},fineShimmerDust:{"nebula.size":60,"nebula.layers":3,"nebula.tilt":8,"nebula.starDensity":0},chunkyFlakes:{"nebula.size":400,"nebula.shape":`square`,"nebula.layers":1,"nebula.curv":.2,"nebula.tilt":3},starfield:{"nebula.starDensity":12,"nebula.starSize":900,"nebula.coverage":.4,"nebula.baseColor":`#05040f`}},sparkle:{silverSparkleFilm:{"sparkle.tint":`clear`,"sparkle.speckShare":0},champagneSparkle:{"sparkle.tint":`longpass`,"sparkle.tintEdge":540,"sparkle.tintWidth":90,"sparkle.tintFloor":.5,"sparkle.speckShare":0},fineDenseGlitter:{"sparkle.size":200,"sparkle.coverage":.7,"sparkle.irregularity":1},confettiDots:{"sparkle.size":1200,"sparkle.coverage":.5,"sparkle.irregularity":.3,"sparkle.tilt":1.5,"sparkle.orientJitter":8},twinklingSpecks:{"sparkle.speckType":`grating`,"sparkle.speckShare":25,"sparkle.speckPitch":700}},vortex:{silverVortex:{"vortex.tint":`clear`},discRings:{"vortex.swirl":0,"vortex.bands":0,"vortex.pitch":1600,"vortex.tint":`clear`},tightWhirlpool:{"vortex.swirl":40,"vortex.fan":.8,"vortex.bands":48,"vortex.contrast":.7},softGlowArms:{"vortex.fan":6,"vortex.roughness":.8,"vortex.bands":0},offCentreCopper:{"vortex.centre":{x:.5,y:-.4},"vortex.handedness":`cw`,"vortex.tintEdge":570,"vortex.tintWidth":80,"vortex.tintFloor":.2}},emboss:{goldMarkOnCotton:{"emboss.foil":`gold`,"emboss.height":350,"emboss.shoulder":.3},silverDeboss:{"emboss.foil":`silver`,"emboss.profile":`deboss`,"emboss.height":300,"emboss.gloss":.4},rainbowSealOnKraft:{"emboss.stock":`kraft`,"emboss.foil":`rainbow`},sparkleFoilPillow:{"emboss.foil":`sparkle`,"emboss.sparkleSize":120,"emboss.profile":`dome`,"emboss.height":600,"emboss.puff":.7}}},_t={studio:{"studio.panel.on":!0,"studio.panel.dir":{x:-.48,y:.66},"studio.panel.width":14,"studio.panel.length":50,"studio.panel.radiance":4,"studio.panel.distance":.9,"studio.panel.spd":`equal`,"studio.spotA.on":!0,"studio.spotA.dir":{x:-.04,y:-.1},"studio.spotA.size":1.5,"studio.spotA.radiance":1200,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!0,"studio.spotB.dir":{x:-.25,y:-.68},"studio.spotB.size":2.5,"studio.spotB.radiance":600,"studio.spotB.distance":1.2,"studio.spotB.spd":`equal`,"studio.spotC.on":!1,"studio.ambient.rims":3,"studio.ambient.fill":.4,"studio.ambient.scrim":.4,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},spot:{"studio.panel.on":!1,"studio.spotA.on":!0,"studio.spotA.dir":{x:.48,y:.28},"studio.spotA.size":1.5,"studio.spotA.radiance":1200,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":0,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.002,"studio.ambient.cameraTexture":0},softbox:{"studio.panel.on":!0,"studio.panel.dir":{x:.48,y:.28},"studio.panel.width":40,"studio.panel.length":40,"studio.panel.radiance":3,"studio.panel.distance":.8,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.1,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},strip:{"studio.panel.on":!0,"studio.panel.dir":{x:.48,y:.28},"studio.panel.width":6,"studio.panel.length":60,"studio.panel.radiance":12,"studio.panel.distance":.9,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.1,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},dark:{"studio.panel.on":!1,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":3,"studio.ambient.fill":.4,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.004,"studio.ambient.cameraTexture":1},desk:{"studio.panel.on":!0,"studio.panel.dir":{x:-.55,y:.35},"studio.panel.width":30,"studio.panel.length":45,"studio.panel.radiance":3,"studio.panel.distance":1.5,"studio.panel.spd":`daylight`,"studio.spotA.on":!0,"studio.spotA.dir":{x:.45,y:.3},"studio.spotA.size":4,"studio.spotA.radiance":300,"studio.spotA.distance":.5,"studio.spotA.spd":`tungsten`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.2,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.006,"studio.ambient.cameraTexture":1},office:{"studio.panel.on":!0,"studio.panel.dir":{x:0,y:.55},"studio.panel.width":4,"studio.panel.length":70,"studio.panel.radiance":20,"studio.panel.distance":1.6,"studio.panel.spd":`triphosphor`,"studio.spotA.on":!1,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.3,"studio.ambient.scrim":0,"studio.ambient.cameraSide":.01,"studio.ambient.cameraTexture":1},raking:{"studio.panel.on":!1,"studio.spotA.on":!0,"studio.spotA.dir":{x:-.83,y:.52},"studio.spotA.size":3,"studio.spotA.radiance":1500,"studio.spotA.distance":1,"studio.spotA.spd":`equal`,"studio.spotB.on":!1,"studio.spotC.on":!1,"studio.ambient.rims":0,"studio.ambient.fill":.15,"studio.ambient.scrim":.3,"studio.ambient.cameraSide":.003,"studio.ambient.cameraTexture":1}},vt=`uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform ivec2 uSrcSize;
uniform vec2 uSrcMin, uSrcMax;
#if GLARE_MODE < 2
vec3 decodeTexel(ivec2 p) {
  if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, uSrcSize))) return vec3(0.0);
  vec4 P = texelFetch(tSrc, p, 0);
  float a = clamp(P.a, 0.0, 1.0);
  if (a <= 1e-5) return vec3(0.0);
  vec3 cu = P.rgb / a;
  vec3 c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4));
  c = clamp(sanitize(c), vec3(-1.0e4), vec3(1.0e4));
  float Y = dot(c, LUMA_SRGB);
  c *= Y > 1.0e4 ? 1.0e4 / Y : (Y < 0.0 ? 0.0 : 1.0);
  return c * a;
}
#endif
#if GLARE_MODE == 0
const float W13[36] = float[36](
   8.0,  8.0, 16.0, 16.0,  8.0,  8.0,
   8.0, 40.0, 48.0, 48.0, 40.0,  8.0,
  16.0, 48.0, 64.0, 64.0, 48.0, 16.0,
  16.0, 48.0, 64.0, 64.0, 48.0, 16.0,
   8.0, 40.0, 48.0, 48.0, 40.0,  8.0,
   8.0,  8.0, 16.0, 16.0,  8.0,  8.0);
void main() {
  ivec2 base = 2 * ivec2(gl_FragCoord.xy) - 2;
  vec3 s = vec3(0.0);
  for (int j = 0; j < 6; ++j)
    for (int i = 0; i < 6; ++i)
      s += W13[j * 6 + i] * decodeTexel(base + ivec2(i, j));
  gl_FragColor = vec4(s * (1.0 / 1024.0), 1.0);
}
#elif GLARE_MODE == 1
const float W8[8] = float[8](0.5, 1.5, 2.5, 3.5, 3.5, 2.5, 1.5, 0.5);
void main() {
  ivec2 base = 4 * ivec2(gl_FragCoord.xy) - 2;
  vec3 s = vec3(0.0);
  for (int j = 0; j < 8; ++j) {
    vec3 row = vec3(0.0);
    for (int i = 0; i < 8; ++i) row += W8[i] * decodeTexel(base + ivec2(i, j));
    s += W8[j] * row;
  }
  gl_FragColor = vec4(s * (1.0 / 256.0), 1.0);
}
#else
vec3 tapSrc(vec2 uv) { return textureLod(tSrc, clamp(uv, uSrcMin, uSrcMax), 0.0).rgb; }
void main() {
  vec2 c = 2.0 * gl_FragCoord.xy * uSrcTexel, t = uSrcTexel;
  vec3 a = tapSrc(c + t * vec2(-2.0,  2.0)), b = tapSrc(c + t * vec2(0.0,  2.0)), cc = tapSrc(c + t * vec2(2.0,  2.0));
  vec3 d = tapSrc(c + t * vec2(-2.0,  0.0)), e = tapSrc(c),                       f = tapSrc(c + t * vec2(2.0,  0.0));
  vec3 g = tapSrc(c + t * vec2(-2.0, -2.0)), h = tapSrc(c + t * vec2(0.0, -2.0)), i = tapSrc(c + t * vec2(2.0, -2.0));
  vec3 j = tapSrc(c + t * vec2(-1.0,  1.0)), k = tapSrc(c + t * vec2(1.0,  1.0));
  vec3 l = tapSrc(c + t * vec2(-1.0, -1.0)), m = tapSrc(c + t * vec2(1.0, -1.0));
  vec3 s = e * 0.125 + (a + cc + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(s, 1.0);
}
#endif
`,yt=`uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform vec2 uSrcMin, uSrcMax;
uniform float uK;
vec3 tapSrc(vec2 uv) { return textureLod(tSrc, clamp(uv, uSrcMin, uSrcMax), 0.0).rgb; }
void main() {
  vec2 c = 0.5 * gl_FragCoord.xy * uSrcTexel, t = uSrcTexel;
  vec3 s = 4.0 * tapSrc(c)
         + 2.0 * (tapSrc(c + vec2(t.x, 0.0)) + tapSrc(c - vec2(t.x, 0.0)) + tapSrc(c + vec2(0.0, t.y)) + tapSrc(c - vec2(0.0, t.y)))
         + tapSrc(c + t) + tapSrc(c - t) + tapSrc(c + vec2(t.x, -t.y)) + tapSrc(c + vec2(-t.x, t.y));
  gl_FragColor = vec4(uK * s * (1.0 / 16.0), 0.0);
}
`,bt=`uniform float uCoatAlpha;
float D_GGX(float NoH, float a) {
  float a2 = a * a, d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * max(d * d, 1e-20));
}
float V_SmithGGXCorrelated(float NoL, float NoV, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2), gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-6);
}
vec3 coatDirect(GLight g, vec3 X, vec3 V, vec3 Nc, float alpha, float gloss, float sig2) {
  if (g.A <= 0.0) return vec3(0.0);
  float a = sqrt(max(alpha * alpha + sig2, 1e-6));
#if RECT_LTC
  if (g.type == 2) return gloss * g.rad * g.rgb * ltcGGX(Nc, V, X, a, 0.04, g.c);
#endif
  float ci = dot(Nc, g.L), co = dot(Nc, V);
  if (ci <= 0.0 || co <= 0.0) return vec3(0.0);
  vec3 H = normalize(g.L + V);
  a = sqrt(a * a + 0.25 * g.rAng * g.rAng);
  return gloss * g.rad * g.A * g.rgb * D_GGX(max(dot(Nc, H), 0.0), a) * V_SmithGGXCorrelated(ci, co, a)
       * fresnelDiel(dot(H, g.L), 1.5);
}
float coatT(vec3 Nc, vec3 L, vec3 V) {
  return (1.0 - fresnelDiel(max(dot(Nc, L), 0.0), 1.5)) * (1.0 - fresnelDiel(max(dot(Nc, V), 0.0), 1.5));
}
`,xt=`#ifndef NSPD
#define NSPD 5
#endif
#ifndef MAX_LIGHTS
#define MAX_LIGHTS 4
#endif
#ifndef DEBUG_VIEW
#define DEBUG_VIEW 0
#endif
#ifndef RECT_EXACT
#define RECT_EXACT 0
#endif
#ifndef RECT_LTC
#define RECT_LTC 0
#endif
#ifndef NB
#define NB 0
#endif
#ifndef IBL_ORDERS
#define IBL_ORDERS 0
#endif
#ifndef DISCRETE_LIGHTS
#define DISCRETE_LIGHTS 2
#endif
#ifndef DISCRETE_LIGHTS_B
#define DISCRETE_LIGHTS_B 1
#endif
#ifndef FLAKE_ENV
#define FLAKE_ENV 0
#endif
#ifndef WEAR_CELLS
#define WEAR_CELLS 2
#endif
#define saturate(a) clamp(a, 0.0, 1.0)
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;
uniform int uMaxOrder, uGhB, uVorR, uFlakeR, uBCells, uBBins, uBLevels;
#define HOLO_NOUNROLL(n) ((n) + min(uMaxOrder, 0))
float sq(float x) { return x * x; }
float max3(vec3 c) { return max(max(c.x, c.y), c.z); }
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
vec3 rnd3(ivec2 c, uint salt) {
  return vec3(pcg3d(uvec3(uvec2(c + ivec2(1 << 20)), salt)) >> 8u) * (1.0 / 16777216.0);
}
vec2 gauss2(vec2 u) { float r = sqrt(-2.0 * log(max(u.x, 1e-7))); return r * vec2(cos(TAU * u.y), sin(TAU * u.y)); }
float erfA(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(max(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)), 0.0));
}
float gaussPdf(float u) { return 0.39894228 * exp(-0.5 * u * u); }
float gaussCdf(float u) {
  float z = abs(u) * 0.70710678;
  float t = 1.0 / (1.0 + 0.3275911 * z);
  float y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
          * exp(-z * z);
  return u >= 0.0 ? 1.0 - 0.5 * y : 0.5 * y;
}
float gauss1(float x, float s) { s = max(s, 1e-12); return exp(-0.5 * x * x / (s * s)) * (0.39894228 / s); }
float besselJ(int m, float x) {
  float h = 0.5 * x, term = 1.0;
  for (int i = 1; i <= 8; ++i) if (i <= m) term *= h / float(i);
  float s = term, h2 = h * h;
  for (int k = 1; k < 8; ++k) { term *= -h2 / float(k * (k + m)); s += term; }
  return s;
}
float i0e(float k) {
  k = abs(k);
  if (k < 3.75) {
    float t = k / 3.75; t *= t;
    return exp(-k) * (1.0 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813))))));
  }
  float u = 3.75 / k;
  return (0.39894228 + u * (0.01328592 + u * (0.00225319 + u * (-0.00157565 + u * (0.00916281 + u * (-0.02057706
         + u * (0.02635537 + u * (-0.01647633 + u * 0.00392377)))))))) / sqrt(k);
}
float cosInside(float cAir, float nc) { return sqrt(max(1.0 - (1.0 - cAir * cAir) / (nc * nc), 0.0)); }
float fresnelDiel(float cAir, float nc) {
  float ci = clamp(cAir, 0.0, 1.0), ct = cosInside(ci, nc);
  float rs = (ci - nc * ct) / max(ci + nc * ct, 1e-12), rp = (nc * ci - ct) / max(nc * ci + ct, 1e-12);
  return 0.5 * (rs * rs + rp * rp);
}
vec3 refractIn(vec3 D, vec3 N, float nc) {
  vec3 Dt = D - N * dot(D, N);
  return Dt / nc + N * sqrt(max(1.0 - dot(Dt, Dt) / (nc * nc), 0.0));
}
vec3 refractOut(vec3 Dp, vec3 N, float nc) {
  float c = dot(Dp, N);
  vec3 Dt = (Dp - N * c) * nc;
  float k = 1.0 - dot(Dt, Dt);
  return (k <= 0.0 || c <= 0.0) ? vec3(0.0) : Dt + N * sqrt(k);
}
mat2 psd2(mat2 S, float eps) {
  float a = S[0][0], c = S[1][1], b = 0.5 * (S[0][1] + S[1][0]);
  float m = 0.5 * (a + c), d = 0.5 * (a - c), r = sqrt(d * d + b * b);
  float l1 = m + r, l2 = m - r;
  if (l2 >= eps) return mat2(a, b, b, c);
  if (r <= 1e-6 * abs(m) + 1e-30) return mat2(max(m, eps));
  vec2 e = d >= 0.0 ? vec2(d + r, b) : vec2(b, r - d);
  e /= length(e);
  vec2 f = vec2(-e.y, e.x);
  return max(l1, eps) * outerProduct(e, e) + max(l2, eps) * outerProduct(f, f);
}
vec3 sanitize(vec3 c) {
  uvec3 b = floatBitsToUint(c) & 0x7fffffffu;
  return mix(c, vec3(0.0), greaterThanEqual(b, uvec3(0x7f800000u)));
}
const float ENC_S = 0.25;
#ifdef CARD_PROGRAM
varying float vOcc;
#define HOLO_OCC_K (1.0 - vOcc)
#else
#define HOLO_OCC_K 1.0
#endif
vec4 encodeCard(vec3 c) {
  c = clamp(sanitize(c), vec3(-6.0e4), vec3(6.0e4)) * HOLO_OCC_K;
  float m = max(max3(c), 0.0) * ENC_S;
  return vec4(c * ENC_S / (1.0 + m), 1.0);
}
const vec3 LUMA_SRGB = vec3(0.2126, 0.7152, 0.0722);
const vec3 LUMA_P3   = vec3(0.2290, 0.6917, 0.0793);
vec3 gamutMapLuma(vec3 c, vec3 lumaW) {
  float Y = dot(c, lumaW), mn = min(c.r, min(c.g, c.b));
  if (Y <= 0.0) return vec3(0.0);
  if (mn >= 0.0) return c;
  vec3 e = max(-c, vec3(0.0));
  vec3 e15 = e * sqrt(e);
  float S = Y + pow(e15.r + e15.g + e15.b, 2.0 / 3.0);
  return Y + (c - Y) * (Y / S);
}
`,St=`struct Elem {
  vec3  n;
  vec3  g;
  float invD;
  float hNm;
  float nc;
  float sigS;
  float tauF;
  float fanQ;
  float sigTheta;
  float sigFrel;
  float iso2;
  float w;
  float fam;
};
vec4 etaOrdFor(int light, float fam) {
  int li = clamp(light, 0, MAX_LIGHTS - 1);
  float fc = clamp(fam, 0.0, 2.0);
  int f0 = int(floor(fc)), f1 = min(f0 + 1, 2);
  return mix(uEtaOrd[3 * li + f0], uEtaOrd[3 * li + f1], fc - float(f0));
}
float orderEff(int m, float lam, float hNm, float nc, float ciIn, float coIn) {
#ifdef HOLO_FIXTURE_ETA
  return float(HOLO_FIXTURE_ETA);
#else
  float x = min(PI * nc * hNm * (ciIn + coIn) / max(lam, 1.0), 5.5);
  float j = besselJ(abs(m), x);
  return j * j;
#endif
}
vec2 besselJPair(int m, float x) {
  float h = 0.5 * x, t = 1.0;
  for (int i = 1; i <= 8; ++i) if (i < m) t *= h / float(i);
  float jm1 = 0.0, jm = 0.0, h2 = h * h, fm = float(m);
  for (int k = 0; k < 8; ++k) {
    jm1 += t; jm += t * h / (float(k) + fm);
    t *= -h2 / ((float(k) + 1.0) * (float(k) + fm));
  }
  return vec2(jm, jm1);
}
float orderEffD(int m, float lam, float hNm, float nc, float ciIn, float coIn, out float dlnEta) {
#ifdef HOLO_FIXTURE_ETA
  dlnEta = 0.0;
  return float(HOLO_FIXTURE_ETA);
#else
  float l = max(lam, 1.0), xr = PI * nc * hNm * (ciIn + coIn) / l, x = min(xr, 5.5);
  vec2 j = besselJPair(max(m, 1), x);
  dlnEta = (xr < 5.5 && abs(j.x) > 1e-3) ? 2.0 * (float(m) - x * j.y / j.x) / l : 0.0;
  return j.x * j.x;
#endif
}
float etaSlope(vec4 e, float lam) {
#ifdef HOLO_FIXTURE_ETAN
  return 0.0;
#else
  float x = (lam - 430.0) / 80.0;
  if (x <= 0.0 || x >= 3.0) return 0.0;
  return x < 1.0 ? (e.y - e.x) / 80.0 : x < 2.0 ? (e.z - e.y) / 80.0 : (e.w - e.z) / 80.0;
#endif
}
vec3 lobeColour(int m, float lam, float sigL, float hNm, float nc, float ciIn, float coIn, vec4 eta, int spd) {
  float dEta, eff = orderEffD(m, lam, hNm, nc, ciIn, coIn, dEta);
  float en = etaAt(eta, lam);
  float a = dEta + etaSlope(eta, lam) / max(en, 1e-6);
  float sh = clamp(a * sigL * sigL, -0.5 * sigL, 0.5 * sigL);
  return eff * en * exp(0.5 * sq(sh / sigL)) * cmfConv(lam + sh, sigL, spd);
}
vec4 mirrorF1(float hNm, float nc, float ciIn, float coIn, vec4 etaM) {
  vec4 f;
  for (int k = 0; k < 4; ++k) {
    float j0 = besselJ(0, min(PI * nc * hNm * (ciIn + coIn) / SPEC_NODES[k], 5.5));
    f[k] = etaM[k] * j0 * j0;
  }
  return f;
}
vec3 elemOrders(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || e.w <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t  = cross(e.n, e.g);
  vec3  H  = e.nc * (Lp + Vp);
  float qg = dot(H, e.g), qt = dot(H, t), sn = dot(H, e.n);
  mat2  R  = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho  = length(vec2(qg, qt));
  float iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  float sgg  = max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 1e-10);
  float stt0 = Sx[1][1] + iso2 + sq(rho * e.sigTheta);
  float sgt  = Sx[0][1];
  float d    = 1.0 / max(e.invD, 1e-6);
  vec3 acc = vec3(0.0);
  for (int m = 1; m <= uMaxOrder; ++m) {
    float stt = max(stt0 + float(m) * sq(e.fanQ), 1e-10);
    float qgc = qg - (sgt / stt) * qt;
    float sgc = sqrt(max(sgg - sgt * sgt / stt, 1e-10));
    float lam = d * abs(qgc) / float(m), sigL = clamp(d * sgc / float(m), 0.5, 512.0);
    if (lam + 3.0 * sigL < 360.0 || lam - 3.0 * sigL > 830.0) continue;
    float n1 = exp(-0.5 * qt * qt / stt) * inversesqrt(TAU * stt);
    acc += n1 * (d / float(m)) * lobeColour(m, lam, sigL, e.hNm, e.nc, ciIn, coIn, eta, g.spd);
  }
  return g.rad * g.A * Tc * e.w * acc;
}
vec3 elemMirror(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec3 mirRgb) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  vec2  q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  S = psd2(R * (ScCard + g.S) * transpose(R) + mat2(sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2), 1e-10);
  float det = max(S[0][0] * S[1][1] - S[0][1] * S[0][1], 1e-14);
  float e0  = max((S[1][1] * q.x * q.x - 2.0 * S[0][1] * q.x * q.y + S[0][0] * q.y * q.y) / det, 0.0);
  return g.rad * g.A * Tc * exp(-0.5 * e0) / (TAU * sqrt(det)) * mirRgb;
}
#if RECT_LTC
vec3 elemMirrorRect(GLight g, vec3 X, vec3 V, Elem e, mat2 ScCard, vec3 Tf, vec3 Bf, vec3 Nf, float kTilt, float Tc, vec3 mirRgb) {
  if (g.A <= 0.0) return vec3(0.0);
  vec2  s   = -vec2(dot(e.n, Tf), dot(e.n, Bf)) / max(dot(e.n, Nf), 1e-3);
  vec3  nEq = normalize(Nf - kTilt * (s.x * Tf + s.y * Bf));
  float co  = max(dot(nEq, V), 1e-3), coIn = cosInside(co, e.nc);
  float sp  = e.nc * 2.0 * coIn;
  float sq2 = sq(sp * e.sigS) + sq(sp * e.tauF) + e.iso2 + 0.5 * (ScCard[0][0] + ScCard[1][1]);
  float a0  = clamp(0.70710678 * sqrt(sq2) / co, 0.002, 1.0);
  return g.rad * Tc * mirRgb * ltcGGX(nEq, V, X, a0, 1.0, g.c);
}
#endif
#if RECT_EXACT
vec3 elemOrdersRect(GLight g, vec3 V, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float co = dot(e.n, V);
  if (co <= 0.0 || e.w <= 0.0 || g.nP < 3 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  vec2  v = vec2(dot(V, e.g), dot(V, t)), cen = R * g.C;
  vec2  P[5]; vec2 lo2 = vec2(1e9), hi2 = vec2(-1e9); float area2 = 0.0;
  for (int k = 0; k < 5; ++k) P[k] = vec2(0.0);
  for (int k = 0; k < 5; ++k) { if (k >= g.nP) break; P[k] = R * g.P[k]; lo2 = min(lo2, P[k]); hi2 = max(hi2, P[k]); }
  for (int k = 0; k < 5; ++k) { if (k >= g.nP) break; vec2 a = P[k], b = P[k + 1 < g.nP ? k + 1 : 0]; area2 += a.x * b.y - b.x * a.y; }
  float orient = area2 >= 0.0 ? 1.0 : -1.0;
  float wChord = smoothstep(0.25, 0.6, 0.5 * abs(area2) / g.A);
  vec3 acc = vec3(0.0);
  if (wChord > 0.0) {
    float ciIn = cosInside(max(dot(e.n, g.L), 1e-3), e.nc), coIn = cosInside(co, e.nc);
    mat2  Sx = R * ScCard * transpose(R);
    float rho  = length(v + cen);
    float iso2 = sq(e.nc * (ciIn + coIn) * e.sigS) + e.iso2;
    float sg   = sqrt(max(Sx[0][0] + iso2 + sq(rho * e.sigFrel), 0.0));
    float st0  = Sx[1][1] + iso2 + sq(rho * e.sigTheta);
    float t0 = -v.y, d = 1.0 / max(e.invD, 1e-6);
    for (int m = 1; m <= uMaxOrder; ++m) {
      float st = sqrt(max(st0 + float(m) * sq(e.fanQ), 1e-8)), sigL = clamp(d * sg / float(m), 0.5, 512.0);
      for (int s = -1; s <= 1; s += 2) {
        float k = float(s * m) * e.invD;
        float la = (lo2.x + v.x) / k, lb = (hi2.x + v.x) / k;
        if (max(la, lb) < CMF_L0 || min(la, lb) > CMF_L0 + CMF_SPAN) continue;
        float lc = clamp((cen.x + v.x) / k, 380.0, 780.0);
        vec3 sum = vec3(0.0);
        for (int j = 0; j < 5; ++j) {
          if (j >= g.nP) break;
          vec2 a = P[j], b = P[j + 1 < g.nP ? j + 1 : 0];
          float dt = b.y - a.y;
          if (abs(dt) < 1e-7) continue;
          float ua = (min(a.y, b.y) - t0) / st, ub = (max(a.y, b.y) - t0) / st;
          float Pe = gaussCdf(ub) - gaussCdf(ua);
          if (Pe < 1e-6) continue;
          float pa = gaussPdf(ua), pb = gaussPdf(ub);
          float mu  = st * (pa - pb) / Pe;
          float var = st * st * max(1.0 + (ua * pa - ub * pb) / Pe - sq((pa - pb) / Pe), 0.0);
          float dgdt = (b.x - a.x) / dt;
          float lam = (a.x + (t0 + mu - a.y) * dgdt + v.x) / k;
          float sc  = clamp(sqrt(sigL * sigL + sq(dgdt / k) * var), 0.5, 512.0);
          sum += orient * sign(dt) * float(s) * Pe * cmfCumExt(lam, sc, g.spd);
        }
        acc += orderEff(m, lc, e.hNm, e.nc, ciIn, coIn) * etaAt(eta, lc) * sum;
      }
    }
    acc *= g.rad * Tc * e.w;
  }
  if (wChord < 1.0) {
    vec3 Lp = refractIn(g.L, e.n, e.nc), Vp = refractIn(V, e.n, e.nc);
    acc = mix(elemOrders(g, Lp, Vp, e, ScCard, T, B, Tc, eta), acc, wChord);
  }
  return acc;
}
#endif
vec3 ringKernel(GLight g, vec3 Lp, vec3 Vp, vec3 N, vec3 T, vec3 B, float invDm, float sigFrel, float sigQ,
                float hNm, float nc, float tiltRMS, float Tc, vec4 eta) {
  float ciIn = dot(N, Lp), coIn = dot(N, Vp); if (ciIn <= 0.0 || coIn <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3 H = nc * (Lp + Vp); vec2 q = vec2(dot(H, T), dot(H, B));
  float sT  = dot(H, N) * tiltRMS;
  float rho = max(sqrt(dot(q, q) + 2.0 * sT * sT), 1e-4);
  float sr  = sqrt(sigQ * sigQ + sT * sT + 0.5 * (g.S[0][0] + g.S[1][1]) + sq(rho * sigFrel));
  float d = 1.0 / max(invDm, 1e-6);
  vec3 acc = vec3(0.0);
  for (int k = 1; k <= uMaxOrder; ++k) {
    float lam = d * rho / float(k), sigL = clamp(d * sr / float(k), 0.5, 512.0);
    if (lam + 3.0 * sigL < 360.0 || lam - 3.0 * sigL > 830.0) continue;
    acc += (d / (PI * float(k) * rho)) * lobeColour(k, lam, sigL, hNm, nc, ciIn, coIn, eta, g.spd);
  }
  return g.rad * g.A * Tc * acc;
}
vec3 mirrorMeanField(GLight g, vec3 Lp, vec3 Vp, vec3 N, vec3 T, vec3 B, float nc, float sigQ, float tiltRMS, float Tc, vec3 mirRgb) {
  if (g.A <= 0.0) return vec3(0.0);
  vec3 H = nc * (Lp + Vp); vec2 q = vec2(dot(H, T), dot(H, B));
  float s2 = max(sigQ * sigQ + sq(dot(H, N) * tiltRMS) + 0.5 * (g.S[0][0] + g.S[1][1]), 1e-10);
  return g.rad * g.A * Tc * exp(-0.5 * dot(q, q) / s2) / (TAU * s2) * mirRgb;
}
#if DEBUG_VIEW == 13
vec3 elemOrdersRef(GLight g, vec3 Lp, vec3 Vp, Elem e, mat2 ScCard, vec3 T, vec3 B, float Tc, vec4 eta) {
  float ciIn = dot(e.n, Lp), coIn = dot(e.n, Vp);
  if (ciIn <= 0.0 || coIn <= 0.0 || e.w <= 0.0 || g.A <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g), H = e.nc * (Lp + Vp);
  vec2  q = vec2(dot(H, e.g), dot(H, t));
  float sn = dot(H, e.n);
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * (ScCard + g.S) * transpose(R);
  float rho = length(q), iso2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
  const float DL = 6.25;
  vec3 acc = vec3(0.0);
  for (int m = 1; m <= 3; ++m) {
    mat2 S = psd2(Sx + mat2(iso2 + sq(rho * e.sigFrel), 0.0, 0.0, iso2 + sq(rho * e.sigTheta) + float(m) * sq(e.fanQ)), 1e-10);
    float det = max(S[0][0] * S[1][1] - S[0][1] * S[0][1], 1e-14), nrm = 1.0 / (TAU * sqrt(det));
    for (int s = -1; s <= 1; s += 2) {
      for (int k = 0; k < HOLO_NOUNROLL(64); ++k) {
        float lam = 380.0 + (float(k) + 0.5) * DL;
        vec2  dq = q - vec2(float(s * m) * lam * e.invD, 0.0);
        float e0 = (S[1][1] * dq.x * dq.x - 2.0 * S[0][1] * dq.x * dq.y + S[0][0] * dq.y * dq.y) / det;
        if (e0 > 80.0) continue;
        vec3 wk = cmfCum(lam + 0.5 * DL, 0.5, g.spd) - cmfCum(lam - 0.5 * DL, 0.5, g.spd);
        acc += orderEff(m, lam, e.hNm, e.nc, ciIn, coIn) * etaAt(eta, lam) * exp(-0.5 * e0) * nrm * wk;
      }
    }
  }
  return g.rad * g.A * Tc * e.w * acc;
}
#endif
`,Ct=`uniform samplerCube uEnv; uniform float uEnvMaxLod; uniform mat3 uEnvRot; uniform float uEnvIntensity; uniform int uEnvUniform;
#if NB > 0
uniform float uBinLam[NB];
uniform mat3  uBinW[NB];
uniform float uBinWidth;
#endif
vec3 envRadiance(vec3 dirW, float r) {
  if (uEnvUniform == 1) return vec3(1.0);
  r = clamp(r, 0.045, 1.0);
  return textureLod(uEnv, uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r)).rgb * uEnvIntensity;
}
vec3  envIrradiance(vec3 N) { return PI * envRadiance(N, 1.0); }
float sigmaToRough(float sigDir) { return sqrt(max(sigDir, 0.0) * 0.70710678); }
vec2 dfgApprox(float NoV, float rough) {
  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough * c0 + c1;
  float a004 = min(r.x * r.x, exp2(-9.28 * saturate(NoV))) * r.x + r.y;
  return vec2(-1.04, 1.04) * a004 + r.zw;
}
vec3 coatEnv(vec3 V, vec3 Nc, float alpha, float gloss) {
  float NoV = max(dot(Nc, V), 0.0), rough = sqrt(clamp(alpha, 0.0, 1.0));
  vec2 ab = dfgApprox(NoV, rough);
  return gloss * envRadiance(reflect(-V, Nc), rough) * (0.04 * ab.x + ab.y);
}
vec3 envMirror(vec3 V, vec3 Vp, Elem e, vec3 Nf, mat2 ScCard, vec3 mirRgbEnv) {
  float co = dot(Nf, V), coIn = dot(e.n, Vp);
  if (co <= 0.0 || coIn <= 0.0) return vec3(0.0);
  vec3 R = refractOut(reflect(-Vp, e.n), Nf, e.nc);
  float cr = dot(R, Nf);
  if (cr <= 0.0) return vec3(0.0);
  float sn = 2.0 * e.nc * coIn;
  float sig = sqrt(sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2 + 0.5 * (ScCard[0][0] + ScCard[1][1]));
  float sDir = sig / max(co, 0.05);
  float Tc = (1.0 - fresnelDiel(co, 1.5)) * (1.0 - fresnelDiel(cr, 1.5));
  return Tc * mirRgbEnv * envRadiance(R, sigmaToRough(sDir));
}
#if NB > 0
vec3 envDiffraction(vec3 V, Elem e, mat2 ScCard, vec3 T, vec3 B) {
  vec3 Nf = normalize(cross(T, B));
  float co = dot(Nf, V);
  if (co <= 0.0 || e.w <= 0.0) return vec3(0.0);
  vec3  Vp = refractIn(V, Nf, e.nc);
  float coIn = dot(e.n, Vp);
  if (coIn <= 0.0) return vec3(0.0);
  vec3  t = cross(e.n, e.g);
  float To = 1.0 - fresnelDiel(co, 1.5);
  vec2  vp = e.nc * vec2(dot(Vp, e.g), dot(Vp, t));
  mat2  R = mat2(dot(T, e.g), dot(T, t), dot(B, e.g), dot(B, t));
  mat2  Sx = R * ScCard * transpose(R);
  vec3  acc = vec3(0.0);
  for (int k = 1; k <= IBL_ORDERS; ++k) for (int s = -1; s <= 1; s += 2) for (int j = 0; j < HOLO_NOUNROLL(NB); ++j) {
    float lam = uBinLam[j];
    vec2  lt  = (vec2(float(s * k) * lam * e.invD, 0.0) - vp) / e.nc;
    float r2  = dot(lt, lt);
    if (r2 >= 1.0) continue;
    float ciIn = sqrt(1.0 - r2);
    vec3  L = refractOut(lt.x * e.g + lt.y * t + ciIn * e.n, Nf, e.nc);
    float ci = dot(L, Nf);
    if (ci <= 0.0) continue;
    float sn = e.nc * (ciIn + coIn);
    float base2 = sq(sn * e.sigS) + sq(sn * e.tauF) + e.iso2;
    float rq = float(k) * lam * e.invD;
    float sg = sqrt(base2 + Sx[0][0] + sq(rq * e.sigFrel));
    float st = sqrt(base2 + Sx[1][1] + sq(rq * e.sigTheta) + float(k) * sq(e.fanQ));
    float sDir = max(sqrt(sg * st), 0.5 * float(k) * uBinWidth * e.invD) / sqrt(ci);
    vec3  Le = envRadiance(L, sigmaToRough(sDir));
    float Tc = (1.0 - fresnelDiel(ci, 1.5)) * To;
    acc += Tc * orderEff(k, lam, e.hNm, e.nc, ciIn, coIn) * etaAt(uEtaEnv, lam) * (uBinW[j] * Le);
  }
  return e.w * acc;
}
#endif
`,wt=`uniform int   uLightType[MAX_LIGHTS];
uniform int   uLightOrder[MAX_LIGHTS];
uniform vec3  uLightPos[MAX_LIGHTS];
uniform vec3  uPrevLightPos[MAX_LIGHTS];
uniform vec3  uLightU[MAX_LIGHTS];
uniform vec3  uLightW[MAX_LIGHTS];
uniform float uLightRadius[MAX_LIGHTS];
uniform float uLightRad[MAX_LIGHTS];
uniform int   uLightSpd[MAX_LIGHTS];
uniform vec3  uLightRGB[MAX_LIGHTS];
uniform vec4  uEtaOrd[3 * MAX_LIGHTS];
uniform vec4  uEtaMir[MAX_LIGHTS];
uniform vec4  uEtaEnv;
uniform int   uKeyLight;
struct GLight {
  int   type;
  int   spd;
  float rad;
  float A;
  float rAng;
  vec3  L;
  vec3  rgb;
  mat2  S;
  vec2  C;
  vec3  c[4];
  vec2  P[5];
  int   nP;
};
GLight lightSummary(int i, vec3 X, vec3 V, vec3 T, vec3 B, vec3 N) {
  GLight g;
  int s = clamp(i, 0, MAX_LIGHTS - 1);
  g.type = (i == s) ? uLightType[s] : 0;
  g.spd = clamp(uLightSpd[s], 0, NSPD - 1);
  g.rad = uLightRad[s]; g.rgb = uLightRGB[s];
  g.A = 0.0; g.rAng = 0.0; g.L = N; g.S = mat2(1e-8); g.C = vec2(0.0); g.nP = 0;
  for (int k = 0; k < 4; ++k) g.c[k] = vec3(0.0);
  for (int k = 0; k < 5; ++k) g.P[k] = vec2(0.0);
  if (g.type == 1) {
    vec3 dP = uLightPos[s] - X; float dist = max(length(dP), 1e-6);
    g.L = dP / dist;
    float sa = clamp(uLightRadius[s] / dist, 1e-5, 0.999);
    g.rAng = asin(sa);
    vec2 lc = vec2(dot(g.L, T), dot(g.L, B));
    float cc = max(dot(g.L, N), 0.0), r = length(lc);
    vec2 er = r > 1e-5 ? lc / r : vec2(1.0, 0.0), ep = vec2(-er.y, er.x);
    float ar = max(sa * cc, 1e-5), ap = sa;
    g.A = PI * ar * ap;
    g.S = 0.5 * ar * ar * outerProduct(er, er) + 0.5 * ap * ap * outerProduct(ep, ep);
    g.C = lc;
    if (cc <= 0.0) g.A = 0.0;
  } else if (g.type == 2) {
    vec3 P0 = uLightPos[s], U = uLightU[s], W = uLightW[s];
    g.c[0] = P0 + U + W; g.c[1] = P0 + U - W; g.c[2] = P0 - U - W; g.c[3] = P0 - U + W;
    vec3 Q[5]; int nQ = 0;
    for (int k = 0; k < 5; ++k) Q[k] = vec3(0.0);
    for (int k = 0; k < 4; ++k) {
      vec3 a = g.c[k] - X, b = g.c[(k + 1) & 3] - X;
      float da = dot(N, a) - 1e-4 * length(a), db = dot(N, b) - 1e-4 * length(b);
      if (da >= 0.0) { Q[nQ] = a; nQ++; }
      if ((da >= 0.0) != (db >= 0.0)) { Q[nQ] = a + (b - a) * (da / (da - db)); nQ++; }
    }
    g.nP = nQ; g.rAng = 0.0;
    if (nQ < 3) { g.A = 0.0; return g; }
    for (int k = 0; k < 5; ++k) {
      if (k >= nQ) break;
      vec3 u = Q[k] * inversesqrt(max(dot(Q[k], Q[k]), 1e-30));
      g.P[k] = vec2(dot(u, T), dot(u, B));
    }
    vec2 o = g.P[0]; float A2 = 0.0, Ixx = 0.0, Iyy = 0.0, Ixy = 0.0; vec2 Cn = vec2(0.0);
    for (int k = 1; k < 4; ++k) {
      if (k + 1 >= nQ) break;
      vec2 a = g.P[k] - o, b = g.P[k + 1] - o; float cr = a.x * b.y - b.x * a.y;
      A2 += cr; Cn += (a + b) * cr;
      Ixx += (a.x * a.x + a.x * b.x + b.x * b.x) * cr;
      Iyy += (a.y * a.y + a.y * b.y + b.y * b.y) * cr;
      Ixy += (a.x * b.y + 2.0 * a.x * a.y + 2.0 * b.x * b.y + b.x * a.y) * cr;
    }
    vec3 ln = cross(g.c[1] - g.c[0], g.c[3] - g.c[0]);
    vec3 F = vec3(0.0);
    for (int k = 0; k < 5; ++k) {
      if (k >= nQ) break;
      vec3 a = Q[k], b = Q[k + 1 < nQ ? k + 1 : 0];
      F += ltcEdgeVFF(a * inversesqrt(max(dot(a, a), 1e-30)), b * inversesqrt(max(dot(b, b), 1e-30)));
    }
    g.A = dot(ln, X - g.c[0]) < 0.0 ? 0.0 : PI * max(-dot(F, N), 0.0);
    if (g.A <= 0.0) return g;
    float wChord = abs(A2) < 1e-9 ? 0.0 : smoothstep(0.25, 0.6, 0.5 * abs(A2) / g.A);
    if (wChord > 0.0) {
      vec2 Cl = Cn / (3.0 * A2);
      mat2 E2 = mat2(Ixx / 6.0, Ixy / 12.0, Ixy / 12.0, Iyy / 6.0) / A2;
      g.S = psd2(2.0 * (E2 - outerProduct(Cl, Cl)), 1e-8);
      g.C = o + Cl;
    }
    if (wChord < 1.0) {
      vec3 Ld = normalize(-F);
      vec2 Cr = vec2(dot(Ld, T), dot(Ld, B));
      mat2 Vs = mat2(0.0);
      for (int k = 0; k < 5; ++k) { if (k >= nQ) break; vec2 dv = g.P[k] - Cr; Vs += outerProduct(dv, dv); }
      Vs /= float(nQ);
      float va = Vs[0][0], vc = Vs[1][1], vb = Vs[0][1];
      float vm = 0.5 * (va + vc), vd = 0.5 * (va - vc), vr = sqrt(vd * vd + vb * vb);
      vec2 e1 = vr <= 1e-12 ? vec2(1.0, 0.0) : normalize(vd >= 0.0 ? vec2(vd + vr, vb) : vec2(vb, vr - vd));
      vec2 e2 = vec2(-e1.y, e1.x);
      float s1 = max(0.6666667 * (vm + vr), 1e-8), s2 = clamp(sq(g.A / TAU) / s1, 1e-8, s1);
      mat2 Sr = s1 * outerProduct(e1, e1) + s2 * outerProduct(e2, e2);
      g.S = (1.0 - wChord) * Sr + wChord * g.S;
      g.C = mix(Cr, g.C, wChord);
    }
    g.L = normalize(g.C.x * T + g.C.y * B + sqrt(max(1.0 - dot(g.C, g.C), 0.0)) * N);
    g.rAng = sqrt(g.A / (PI * max(dot(N, g.L), 0.05)));
  }
  return g;
}
float keySn(vec3 X, vec3 V, vec3 N) {
  if (uKeyLight < 0 || uKeyLight >= MAX_LIGHTS) return 2.0;
  vec3 dL = uLightPos[uKeyLight] - X;
  vec3 L = dL * inversesqrt(max(dot(dL, dL), 1e-20));
  return max(dot(N, L + V), 0.25);
}
`,Tt=`uniform sampler2D uLtc1, uLtc2;
vec2 ltcUv(const in vec3 N, const in vec3 V, const in float roughness) {
  const float LUT_SIZE = 64.0;
  const float LUT_SCALE = (LUT_SIZE - 1.0) / LUT_SIZE;
  const float LUT_BIAS = 0.5 / LUT_SIZE;
  float dotNV = saturate(dot(N, V));
  vec2 uv = vec2(roughness, sqrt(1.0 - dotNV));
  uv = uv * LUT_SCALE + LUT_BIAS;
  return uv;
}
float ltcClippedSphereFF(const in vec3 f) {
  float l = length(f);
  return max((l * l + f.z) / (l + 1.0), 0.0);
}
vec3 ltcEdgeVFF(const in vec3 v1, const in vec3 v2) {
  float x = dot(v1, v2);
  float y = abs(x);
  float a = 0.8543985 + (0.4965155 + 0.0145206 * y) * y;
  float b = 3.4175940 + (4.1616724 + y) * y;
  float v = a / b;
  float theta_sintheta = (x > 0.0) ? v : 0.5 * inversesqrt(max(1.0 - x * x, 1e-7)) - v;
  return cross(v1, v2) * theta_sintheta;
}
vec3 ltcEvaluate(const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[4]) {
  vec3 v1 = rectCoords[1] - rectCoords[0];
  vec3 v2 = rectCoords[3] - rectCoords[0];
  vec3 lightNormal = cross(v1, v2);
  if (dot(lightNormal, P - rectCoords[0]) < 0.0) return vec3(0.0);
  vec3 T1, T2;
  vec3 Vt = V - N * dot(V, N);
  T1 = dot(Vt, Vt) < 1e-8 ? normalize(cross(N, abs(N.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)))
                          : normalize(Vt);
  T2 = -cross(N, T1);
  mat3 mat = mInv * transpose(mat3(T1, T2, N));
  vec3 coords[4];
  coords[0] = mat * (rectCoords[0] - P);
  coords[1] = mat * (rectCoords[1] - P);
  coords[2] = mat * (rectCoords[2] - P);
  coords[3] = mat * (rectCoords[3] - P);
  coords[0] = normalize(coords[0]);
  coords[1] = normalize(coords[1]);
  coords[2] = normalize(coords[2]);
  coords[3] = normalize(coords[3]);
  vec3 vectorFormFactor = vec3(0.0);
  vectorFormFactor += ltcEdgeVFF(coords[0], coords[1]);
  vectorFormFactor += ltcEdgeVFF(coords[1], coords[2]);
  vectorFormFactor += ltcEdgeVFF(coords[2], coords[3]);
  vectorFormFactor += ltcEdgeVFF(coords[3], coords[0]);
  float result = ltcClippedSphereFF(vectorFormFactor);
  return vec3(result);
}
float ltcFormFactor(vec3 N, vec3 V, vec3 P, vec3 c[4]) { return ltcEvaluate(N, V, P, mat3(1.0), c).x; }
#if RECT_LTC
float ltcGGX(vec3 N, vec3 V, vec3 P, float alpha, float F0, vec3 c[4]) {
  vec2 uv = ltcUv(N, V, sqrt(clamp(alpha, 1e-4, 1.0)));
  vec4 t1 = textureLod(uLtc1, uv, 0.0), t2 = textureLod(uLtc2, uv, 0.0);
  mat3 mInv = mat3(vec3(t1.x, 0.0, t1.y), vec3(0.0, 1.0, 0.0), vec3(t1.z, 0.0, t1.w));
  return (F0 * t2.x + (1.0 - F0) * t2.y) * ltcEvaluate(N, V, P, mInv, c).x;
}
#endif
`,Et=`uniform vec2  uCardSizeMm;
uniform float uBowMm;
uniform int   uBowAxis;
uniform vec4  uWave[32];
uniform ivec2 uWaveBoard, uWaveCoat;
uniform int   uBumpMode;
uniform sampler2D uBumpMom, uBumpCross;
uniform vec2  uBumpScale, uBumpK;
uniform vec2  uWrapMm;
const float LATTICE_OPEN_MM = 2048.0;
struct Lattice { mat2 G, Gi; ivec2 ku, kv; int det; bool wrap; };
Lattice latticeOf(mat2 E, float pitch) {
  Lattice L;
  L.G = pitch * E; L.Gi = transpose(E) / pitch;
  L.ku = ivec2(0); L.kv = ivec2(0); L.det = 1; L.wrap = false;
  if (uWrapMm.x <= 0.0 && uWrapMm.y <= 0.0) return L;
  vec2 P = vec2(uWrapMm.x > 0.0 ? uWrapMm.x : LATTICE_OPEN_MM, uWrapMm.y > 0.0 ? uWrapMm.y : LATTICE_OPEN_MM);
  mat2 Et = transpose(E);
  vec2 ku = round(Et * vec2(P.x / pitch, 0.0)), kv = round(Et * vec2(0.0, P.y / pitch));
  ivec2 iu = ivec2(ku), iv = ivec2(kv);
  int det = iu.x * iv.y - iv.x * iu.y;
  if (det == 0) return L;
  mat2 K = mat2(ku, kv);
  L.G = mat2(P.x, 0.0, 0.0, P.y) * inverse(K);
  L.Gi = K * mat2(1.0 / P.x, 0.0, 0.0, 1.0 / P.y);
  L.ku = iu; L.kv = det > 0 ? iv : -iv; L.det = det > 0 ? det : -det; L.wrap = true;
  return L;
}
int floorDivPos(int a, int b) { return a >= 0 ? a / b : -((b - 1 - a) / b); }
ivec2 latticeCell(Lattice L, ivec2 k) {
  if (!L.wrap) return k;
  int zx = floorDivPos(L.kv.y * k.x - L.kv.x * k.y, L.det);
  int zy = floorDivPos(L.ku.x * k.y - L.ku.y * k.x, L.det);
  return k - zx * L.ku - zy * L.kv;
}
vec2 wrapDelta(vec2 d) {
  if (uWrapMm.x > 0.0) d.x -= uWrapMm.x * round(d.x / uWrapMm.x);
  if (uWrapMm.y > 0.0) d.y -= uWrapMm.y * round(d.y / uWrapMm.y);
  return d;
}
vec2 wrapFreq(vec2 f) {
  if (uWrapMm.x > 0.0) f.x = round(f.x * uWrapMm.x) / uWrapMm.x;
  if (uWrapMm.y > 0.0) f.y = round(f.y * uWrapMm.y) / uWrapMm.y;
  return f;
}
struct Footprint { mat2 S; float area, sMaj, sMin; vec2 eMaj; };
const float FOOTPRINT_KA = 16.0;
Footprint footprintOf(vec2 p  ) {
  vec2 dx = dFdx(p), dy = dFdy(p);
  Footprint F;
  mat2 S = 0.15915494 * (outerProduct(dx, dx) + outerProduct(dy, dy));
  F.area = abs(dx.x * dy.y - dx.y * dy.x);
  float a = S[0][0], b = S[0][1], c = S[1][1];
  float m = 0.5 * (a + c), r = sqrt(max(m * m - (a * c - b * b), 0.0));
  float l1 = m + r, l2 = max(m - r, l1 / (FOOTPRINT_KA * FOOTPRINT_KA));
  F.eMaj = abs(b) > 1e-20 ? normalize(vec2(l1 - c, b)) : (a >= c ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  vec2 eMin = vec2(-F.eMaj.y, F.eMaj.x);
  F.S = l1 * outerProduct(F.eMaj, F.eMaj) + l2 * outerProduct(eMin, eMin);
  F.sMaj = sqrt(l1); F.sMin = sqrt(l2);
  return F;
}
float sigmaAlong(Footprint F, vec2 n) { return sqrt(max(dot(n, F.S * n), 1e-14)); }
vec2 bowSlope(vec2 p) {
  vec2 c = p - 0.5 * uCardSizeMm;
  return uBowAxis == 1 ? vec2(0.0, 8.0 * uBowMm * c.y / (uCardSizeMm.y * uCardSizeMm.y))
                       : vec2(8.0 * uBowMm * c.x / (uCardSizeMm.x * uCardSizeMm.x), 0.0);
}
void wavesSlope(ivec2 range, vec2 p, Footprint F, out vec2 slope, out mat2 sig) {
  slope = vec2(0.0); sig = mat2(0.0);
  int n = min(range.y, 32 - clamp(range.x, 0, 32));
  for (int k = 0; k < n; ++k) {
    vec4 w = uWave[range.x + k];
    float G = exp(-19.7392088 * dot(w.xy, F.S * w.xy));
    vec2 gA = TAU * w.z * w.xy;
    float ph = fract(dot(w.xy, p) + w.w);
    slope += G * gA * cos(TAU * ph);
    sig   += 0.5 * (1.0 - G * G) * outerProduct(gA, gA);
  }
}
void bumpSlope(vec2 p, Footprint F, out vec2 s, out mat2 Sg) {
  s = vec2(0.0); Sg = mat2(0.0);
  if (uBumpMode == 0) return;
  vec2 uv = p * uBumpScale;
  vec2 gMaj = (2.50662827 * F.sMaj) * F.eMaj * uBumpScale;
  vec2 gMin = (2.50662827 * F.sMin) * vec2(-F.eMaj.y, F.eMaj.x) * uBumpScale;
  vec4  m   = textureGrad(uBumpMom, uv, gMaj, gMin);
  float mxy = textureGrad(uBumpCross, uv, gMaj, gMin).r;
  float vxx = max(m.z - m.x * m.x, 0.0), vyy = max(m.w - m.y * m.y, 0.0);
  float c = sqrt(vxx * vyy), vxy = clamp(mxy - m.x * m.y, -c, c);
  s = uBumpK * m.xy;
  float kxy = uBumpK.x * uBumpK.y;
  Sg = mat2(vxx * uBumpK.x * uBumpK.x, vxy * kxy, vxy * kxy, vyy * uBumpK.y * uBumpK.y);
}
mat3 frameFromSlope(vec3 T, vec3 B, vec3 N, vec2 s) {
  vec3 n = normalize(N - s.x * T - s.y * B), t = normalize(T - n * dot(T, n));
  return mat3(t, cross(n, t), n);
}
`,Dt=`const float CMF_L0 = 300.0, CMF_SPAN = 1024.0, CMF_ROWS = 41.0;
uniform highp sampler2DArray uCmfConv;
uniform highp sampler2DArray uCmfCum;
uniform mat4 uSpecProj[NSPD];
float cmfRow(float sigL) { return (4.0 * log2(clamp(sigL, 0.5, 512.0) / 0.5) + 0.5) / CMF_ROWS; }
const float CMF_LO = 301.0, CMF_HI = 1323.0;
const vec3  CMF_CENTROID = vec3(600.0, 550.0, 460.0);
vec3 cmfMills(vec3 x) {
  vec3 t = 1.0 / (1.0 + 0.3275911 * 0.70710678 * max(x, 0.0));
  return 1.25331414 * t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
}
vec3 cmfConv(float lam, float sigL, int spd) {
  float s = clamp(sigL, 0.5, 512.0), le = clamp(lam, CMF_LO, CMF_HI);
  vec3 c = textureLod(uCmfConv, vec3((le - CMF_L0) / CMF_SPAN, cmfRow(s), float(spd)), 0.0).rgb;
  if (lam != le) {
    float d = abs(lam - le);
    vec3 A = lam < le ? CMF_CENTROID - CMF_LO : CMF_HI - CMF_CENTROID;
    c *= exp(-d * (d + 2.0 * A) / (2.0 * s * s));
  }
  return c;
}
vec3 cmfCum(float lam, float sigL, int spd) {
  return textureLod(uCmfCum, vec3((lam - CMF_L0) / CMF_SPAN, cmfRow(sigL), float(spd)), 0.0).rgb;
}
vec3 cmfCumExt(float lam, float sigL, int spd) {
  float s = clamp(sigL, 0.5, 512.0);
  if (s <= 24.0) return cmfCum(lam, s, spd);
  float row = cmfRow(s);
  vec3 cLo = textureLod(uCmfConv, vec3((CMF_LO - CMF_L0) / CMF_SPAN, row, float(spd)), 0.0).rgb;
  vec3 A = (CMF_CENTROID - CMF_LO) / s;
  if (lam < CMF_L0) {
    vec3 x2 = (CMF_CENTROID - lam) / s;
    return cLo * s * cmfMills(x2) * exp(-0.5 * (x2 * x2 - A * A));
  }
  vec3 x0 = (CMF_CENTROID - CMF_L0) / s;
  vec3 c = cmfCum(min(lam, CMF_HI), s, spd) + cLo * s * cmfMills(x0) * exp(-0.5 * (x0 * x0 - A * A));
  if (lam > CMF_HI) {
    vec3 cHi = textureLod(uCmfConv, vec3((CMF_HI - CMF_L0) / CMF_SPAN, row, float(spd)), 0.0).rgb;
    vec3 Bq = (CMF_HI - CMF_CENTROID) / s, x2 = (lam - CMF_CENTROID) / s;
    c += cHi * s * (cmfMills(Bq) - cmfMills(x2) * exp(-0.5 * (x2 * x2 - Bq * Bq)));
  }
  return c;
}
const vec4 SPEC_NODES = vec4(430.0, 510.0, 590.0, 670.0);
vec3 specProject(vec4 f, int spd) { return (uSpecProj[spd] * f).rgb; }
float etaAt(vec4 e, float lam) {
#ifdef HOLO_FIXTURE_ETAN
  return float(HOLO_FIXTURE_ETAN);
#else
  float x = clamp((lam - 430.0) / 80.0, 0.0, 3.0);
  vec4 w = max(vec4(0.0), 1.0 - abs(vec4(x) - vec4(0.0, 1.0, 2.0, 3.0)));
  return dot(e, w);
#endif
}
`,Ot=`uniform float uWear;
struct Wear { float alphaAdd; float gloss; float mottle; float dust; };
const uint WEAR_SEED = 11u;
float wearSmudge(vec2 p) {
  float m = 0.0;
  for (int k = 0; k < 3; ++k) {
    vec3 a = rnd3(ivec2(k, 0), WEAR_SEED ^ 0x53D6E000u);
    vec3 b = rnd3(ivec2(k, 1), WEAR_SEED ^ 0x53D6E000u);
    vec2 c = vec2(6.0, 8.0) + a.xy * (uCardSizeMm - vec2(12.0, 16.0));
    vec2 s = 0.5 * mix(vec2(6.0), vec2(14.0), b.xy);
    vec2 e = vec2(cos(PI * b.z), sin(PI * b.z));
    vec2 d = wrapDelta(p - c);
    vec2 u = vec2(dot(d, e), dot(d, vec2(-e.y, e.x))) / s;
    m = max(m, exp(-0.5 * dot(u, u)));
  }
  return m;
}
float wearMottle(vec2 p, Footprint F) {
  float M = 0.0;
  for (int k = 0; k < 3; ++k) {
    vec3 a = rnd3(ivec2(k, 2), WEAR_SEED ^ 0x0A77E000u);
    float lam = 5.0 * exp2(2.0 * a.x);
    vec2 f = wrapFreq(vec2(cos(PI * a.y), sin(PI * a.y)) / lam);
    float G = exp(-19.7392088 * dot(f, F.S * f));
    M += G * sin(TAU * fract(dot(f, p) + a.z));
  }
  return M / 3.0;
}
float wearDust(vec2 p, Footprint F) {
  const float CELL = 5.0;
  Lattice La = latticeOf(mat2(1.0), CELL);
  ivec2 cell = ivec2(floor(La.Gi * p)), hc = latticeCell(La, cell);
  vec3 h = rnd3(hc, WEAR_SEED ^ 0xD0570000u);
  if (h.z >= 0.3 * uWear) return 0.0;
  vec3 h2 = rnd3(hc, WEAR_SEED ^ 0xD0571000u);
  vec2 c = La.G * (vec2(cell) + 0.15 + 0.7 * h.xy);
  float r = mix(0.015, 0.050, h2.x);
  mat2 S = F.S + mat2(0.25 * r * r);
  float det = max(determinant(S), 1e-20);
  vec2 d = p - c;
  float e = dot(d, inverse(S) * d);
  return min(PI * r * r * exp(-0.5 * e) / (TAU * sqrt(det)), 1.0);
}
Wear wearAt(vec2 p, Footprint F) {
  Wear w;
  w.alphaAdd = 0.0; w.gloss = 1.0; w.mottle = 1.0; w.dust = 0.0;
  if (uWear <= 0.0) return w;
  float m = wearSmudge(p);
  w.alphaAdd = 0.12 * uWear * m;
  w.gloss = 1.0 - 0.15 * uWear * m;
  w.mottle = 1.0 + 0.35 * uWear * wearMottle(p, F);
  w.dust = wearDust(p, F);
  return w;
}
vec3 scratchLobe(GLight g, vec3 V, mat3 fC, vec2 p, Footprint F, mat2 ScCard) {
  if (uWear <= 0.0 || g.type != 1 || g.A <= 0.0) return vec3(0.0);
  vec3 Nc = fC[2], Hs = g.L + V;
  float sn = dot(Hs, Nc);
  if (sn <= 0.0 || dot(Nc, g.L) <= 0.0 || dot(Nc, V) <= 0.0) return vec3(0.0);
  float Fr = fresnelDiel(dot(normalize(Hs), g.L), 1.5);
  const float CELL = 2.0, TAN_TS = 0.57735027;
  float halfW = sn * TAN_TS, edge = 0.05 * sn;
  float base2 = sq(sn * 0.02) + 0.5 * (g.S[0][0] + g.S[1][1]);
  Lattice La = latticeOf(mat2(1.0), CELL);
  vec2 cf = La.Gi * p;
#if WEAR_CELLS >= 3
  const int NC = 3; ivec2 c0 = ivec2(floor(cf)) - 1;
#else
  const int NC = 2; ivec2 c0 = ivec2(floor(cf - 0.5));
#endif
  float acc = 0.0;
  for (int j = 0; j < NC; ++j) for (int i = 0; i < NC; ++i) {
    ivec2 cell = c0 + ivec2(i, j), hc = latticeCell(La, cell);
    for (int k = 0; k < 2; ++k) {
      vec3 h = rnd3(hc, WEAR_SEED ^ (0x5C7A0000u + uint(k)));
      if (h.z >= 0.6 * uWear) continue;
      vec3 h2 = rnd3(hc, WEAR_SEED ^ (0x5C7B0000u + uint(k)));
      vec2 c = La.G * (vec2(cell) + h.xy);
      vec2 dir = vec2(cos(PI * h2.x), sin(PI * h2.x)), nrm = vec2(-dir.y, dir.x);
      float hl = mix(0.2, 1.0, h2.y) * CELL;
      float ws = mix(0.002, 0.004, h2.z);
      vec2 d = p - c;
      float along = dot(d, dir), across = dot(d, nrm);
      float sPerp = max(sigmaAlong(F, nrm), ws), sPar = sigmaAlong(F, dir);
      float lenW = gaussCdf((hl - along) / sPar) - gaussCdf((-hl - along) / sPar);
      float cov = ws * gauss1(across, sPerp) * lenW;
      if (cov < 1e-8) continue;
      vec3 t3 = normalize(dir.x * fC[0] + dir.y * fC[1]);
      vec3 n3 = cross(Nc, t3);
      float qPar = dot(Hs, t3), qPerp = dot(Hs, n3);
      float sPar2 = base2 + dot(dir, ScCard * dir);
      float win = 1.0 - smoothstep(halfW - edge, halfW + edge, abs(qPerp));
      acc += cov * gauss1(qPar, sqrt(sPar2)) * win;
    }
  }
  return g.rad * g.A * Fr * acc / (2.0 * halfW) * g.rgb;
}
vec3 dustRadiance(vec3 E, vec3 V, vec3 Nc) {
  float co = clamp(dot(Nc, V), 0.0, 1.0);
  return (0.4 / PI) * E * (1.0 + 3.0 * sq(1.0 - co));
}
`;function kt(e,t,n,r){if(!e.includes(t))throw Error(`holo: shader adaptation "${r}" no longer applies`);return e.split(t).join(n)}var At=`#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
precision highp float;
precision highp int;
precision highp sampler2D;
#define HIGH_PRECISION
uniform vec3 cameraPosition;
`,jt=kt(Dt,`uniform highp sampler2DArray uCmfConv;
uniform highp sampler2DArray uCmfCum;`,`uniform highp sampler2D uCmfConv;
uniform highp sampler2D uCmfCum;
// vfx-js port: the SPD layers are stacked vertically in one 2D atlas. c = (u, v within the layer, layer). v lies in
// [0.5, 40.5]/41 (cmfRow clamps σ), so bilinear filtering never mixes layers.
vec4 cmfAtlas(highp sampler2D t, vec3 c, float lod) {
  return textureLod(t, vec2(c.x, (c.z + c.y) / float(NSPD)), lod);
}`,`spectral atlas`).replace(/textureLod\((uCmfConv|uCmfCum), vec3\(/g,`cmfAtlas($1, vec3(`);if(jt.includes(`textureLod(uCmf`))throw Error(`holo: shader adaptation "spectral lookups" incomplete`);var Mt=`
vec2 octEncode(vec3 d) {
  d /= abs(d.x) + abs(d.y) + abs(d.z);
  vec2 e = d.z >= 0.0 ? d.xy : (1.0 - abs(d.yx)) * vec2(d.x >= 0.0 ? 1.0 : -1.0, d.y >= 0.0 ? 1.0 : -1.0);
  return e * 0.5 + 0.5;
}
vec3 octDecode(vec2 uv) {
  vec2 f = uv * 2.0 - 1.0;
  vec3 n = vec3(f, 1.0 - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.0);
  n.xy += vec2(n.x >= 0.0 ? -t : t, n.y >= 0.0 ? -t : t);
  return normalize(n);
}
`,Nt=kt(kt(Ct,`uniform samplerCube uEnv;`,`uniform sampler2D uEnv;${Mt}
// vfx-js port: uEnv is an octahedral atlas of ENV_LEVELS prefiltered tiles stacked vertically (scene/env.ts); the
// level blends the two nearest tiles, like a trilinear lookup of the PMREM mips.
vec3 envOctLod(vec3 d, float lod) {
  const float N = ${7 .toFixed(1)}, S = ${128 .toFixed(1)};
  vec2 uv = clamp(octEncode(d), 0.5 / S, 1.0 - 0.5 / S);
  float l = clamp(lod, 0.0, N - 1.0), l0 = floor(l), l1 = min(l0 + 1.0, N - 1.0);
  vec3 a = textureLod(uEnv, vec2(uv.x, (l0 + uv.y) / N), 0.0).rgb;
  vec3 b = textureLod(uEnv, vec2(uv.x, (l1 + uv.y) / N), 0.0).rgb;
  return mix(a, b, l - l0);
}`,`ibl sampler`),`textureLod(uEnv, uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r)).rgb`,`envOctLod(uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r))`,`ibl lookup`),Pt=`
// ===== print (vfx-js port) — the element is the print layer =====
// holospot composes R ≈ (1 − W)·T2·R_foil + W·onWhite (print.glsl). Here W = 0 everywhere (the element's own pixels
// outside the foil are composited by the output pass) and T2 = mix(1, element colour, uInk): the element tints the
// foil like a translucent ink. The foil's coverage comes from the element too (uMask: 0 its alpha, 1 its luma × alpha,
// 2 everywhere) and goes into the card target's alpha, as holospot's coverage does, so the glare only sees visible
// foil.
uniform sampler2D uPrintSrc;
uniform vec4 srcRectUv;    // element UV → src texture UV (vfx-js auto uniform)
uniform float uInk;
uniform int uMask;
struct Print { float W; vec3 T2; vec3 onWhite; float silver; };
in vec2 vHoloUv;             // card UV of this fragment (CARD_VERT; the mains declare their own vUv)
vec4 printUvDerivs(vec2 p) { return vec4(0.0); }
vec3 printSrgbToLinear(vec3 c) {
  return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, vec3(lessThanEqual(c, vec3(0.04045))));
}
Print printLayer(vec2 pMm, vec4 dUv) {
  Print pr; pr.W = 0.0; pr.onWhite = vec3(0.85); pr.silver = 0.0;
  vec4 s = texture(uPrintSrc, srcRectUv.xy + (pMm / uCardSizeMm) * srcRectUv.zw);
  vec3 c = s.a > 1e-4 ? printSrgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) : vec3(1.0);
  pr.T2 = mix(vec3(1.0), c, uInk);
  return pr;
}
#ifdef HOLO_CLEAR_PAPER
// emboss with the element as its logo and no ground: only the logo is drawn (defined by the emboss chunk)
float holoPaperAlpha();
#endif
float printCoverage() {
#ifdef HOLO_CLEAR_PAPER
  return holoPaperAlpha();
#endif
  if (uMask == 2) return 1.0;
  vec4 s = texture(uPrintSrc, srcRectUv.xy + vHoloUv * srcRectUv.zw);
  if (uMask == 0) return clamp(s.a, 0.0, 1.0);
  vec3 u = s.a > 1e-4 ? clamp(s.rgb / s.a, 0.0, 1.0) : vec3(0.0);
  return clamp(dot(u, LUMA_SRGB) * s.a, 0.0, 1.0);
}
// Foil Emboss's printed picture (paper.glsl printTint): the element, or the emboss.print image (uPrintOwn, fitted by
// uPrintRect); linear colour, straight alpha, as three decodes an sRGB image texture.
uniform sampler2D uPrintImg;
uniform vec4 uPrintRect;
uniform int uPrintOwn;
vec4 holoPrintSample(vec2 uv, vec2 dx, vec2 dy) {
  vec4 s = uPrintOwn == 1
    ? textureGrad(uPrintImg, uPrintRect.xy + uv * uPrintRect.zw, dx * uPrintRect.zw, dy * uPrintRect.zw)
    : textureGrad(uPrintSrc, srcRectUv.xy + uv * srcRectUv.zw, dx * srcRectUv.zw, dy * srcRectUv.zw);
  return vec4(s.a > 1e-4 ? printSrgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) : vec3(1.0), s.a);
}
// The material mains end with gl_FragColor = encodeCard(L): premultiply it by the coverage.
vec4 encodeCardCovered(vec3 L) { return encodeCard(L) * printCoverage(); }
#define encodeCard(L) encodeCardCovered(L)
`,Ft=/^[A-Za-z_][A-Za-z0-9_]*$/;function It(e){return Object.entries(e).map(([e,t])=>{if(!Ft.test(e))throw Error(`holo: invalid define name "${e}"`);return`#define ${e} ${t}`}).join(`
`)}function Lt(e,t,n){return[At,It(e),`#define CARD_PROGRAM 1`,xt,jt,Tt,wt,Et,bt,Ot,St,Nt,Pt,...t,n].join(`
`)}var Rt=`#version 300 es
precision highp float;
in vec3 position;
uniform mat3 uCardRot, uPrevCardRot;
uniform vec2 uCardWorldMm;
uniform mat3 uVisRot;
uniform mat4 uViewProj;
uniform int uPersp;
out vec3 vWorldPos; out vec3 vPrevWorldPos; out vec2 vUv; out vec3 vN; out vec3 vT; out vec3 vB;
out float vOcc;
out vec2 vHoloUv;
void main() {
  vec2 uv = position.xy * 0.5 + 0.5;
  vec3 local = vec3((uv - 0.5) * uCardWorldMm * 0.001, 0.0);   // metres, card centre at the origin
  vWorldPos = uCardRot * local;
  vPrevWorldPos = uPrevCardRot * local;
  vUv = uv;
  vN = uCardRot[2]; vT = uCardRot[0]; vB = uCardRot[1];
  vOcc = 0.0;
  vHoloUv = uv;
  gl_Position = uPersp == 1 ? uViewProj * vec4(uVisRot * local, 1.0) : vec4(position.xy, 0.0, 1.0);
}
`,zt=`#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D src;
uniform vec4 srcRectUv;
out vec4 outColor;
void main() { outColor = texture(src, srcRectUv.xy + vUv * srcRectUv.zw); }
`,k=`#version 300 es
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;function Bt(e,t,n,r){let i=Math.max(n,.001),a=[];for(let n=0;n<e;n++)a.push(Math.exp(-(t*2**n)/Math.max(r,.001)/i));let o=a.reduce((e,t)=>e+t,0);return a.map(e=>e/o)}var Vt=e=>`${At}\n#define GLARE_MODE ${e}\n${xt}\n${vt}`,Ht=`${At}\n${yt}`,Ut=class{levels=[];key=``;ensure(e,t,n,r,i){let a=`${t}x${n}/${r}/${i}`;if(a===this.key)return;this.dispose(),this.key=a;let o=Math.max(1,Math.ceil(t/i)),s=Math.max(1,Math.ceil(n/i));for(let t=0;t<r;t++)this.levels.push({rt:e.createRenderTarget({size:[o,s],float:!0,filter:`linear`}),w:o,h:s}),o=Math.max(1,Math.ceil(o/2)),s=Math.max(1,Math.ceil(s/2))}get level0(){return this.levels[0]?.rt??null}render(e,t,n,r,i,a,o){let s=this.levels.length;if(!s)return 0;let c=Bt(s,i,a,o);for(let a=0;a<s;a++){let o=this.levels[a];if(a===0)e.draw({frag:Vt(+(i===4)),vert:k,target:o.rt,uniforms:{tSrc:t,uSrcTexel:[1/n,1/r],uSrcSize:[n,r],uSrcMin:[0,0],uSrcMax:[1,1]}});else{let t=this.levels[a-1];e.draw({frag:Vt(2),vert:k,target:o.rt,uniforms:{tSrc:t.rt,uSrcTexel:[1/t.w,1/t.h],uSrcSize:[t.w,t.h],uSrcMin:[.5/t.w,.5/t.h],uSrcMax:[(t.w-.5)/t.w,(t.h-.5)/t.h]}})}}for(let t=s-1;t>=1;t--){let n=this.levels[t],r=this.levels[t-1];e.draw({frag:Ht,vert:k,target:r.rt,blend:`additive`,uniforms:{tSrc:n.rt,uSrcTexel:[1/n.w,1/n.h],uSrcMin:[.5/n.w,.5/n.h],uSrcMax:[(n.w-.5)/n.w,(n.h-.5)/n.h],uK:c[t]/Math.max(c[t-1],1e-30)}})}return c[0]}outputScale(e,t,n){let r=this.levels[0];return r?[e/n/r.w,t/n/r.h]:[1,1]}dispose(){for(let e of this.levels)e.rt.dispose();this.levels=[],this.key=``}},Wt=`uniform sampler2D tHdr; uniform sampler2D tG0; uniform float uGW0; uniform vec2 uViewScale;
uniform vec2 uHdrMax;
uniform vec2 uG0Scale, uG0Max;
uniform float uGlare, uExposure; uniform int uTone, uP3, uRaw; uniform vec3 uBg;
uniform float uGrain, uGrainCell, uGrainSeed; uniform int uGrainRgb, uGrainBg;
varying vec2 vUv;
const mat3 M_SRGB_TO_P3 = mat3(0.822462, 0.033194, 0.017083,
                               0.177538, 0.966806, 0.072397,
                               0.0,      0.0,      0.910520);
vec3 neutralTM(vec3 color) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < StartCompression) return color;
  float d = 1.0 - StartCompression;
  float newPeak = 1.0 - d * d / (peak + d - StartCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (Desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
const mat3 OUT_SRGB_TO_REC2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 OUT_REC2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
vec3 outAgxContrast(vec3 x) {
  vec3 x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 agxTM(vec3 color) {
  const mat3 AgXInsetMatrix = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
                                   vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
                                   vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 AgXOutsetMatrix = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
                                    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
                                    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const float AgxMinEv = -12.47393, AgxMaxEv = 4.026069;
  color = OUT_SRGB_TO_REC2020 * color;
  color = AgXInsetMatrix * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - AgxMinEv) / (AgxMaxEv - AgxMinEv);
  color = clamp(color, 0.0, 1.0);
  color = outAgxContrast(color);
  color = AgXOutsetMatrix * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  color = OUT_REC2020_TO_SRGB * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toDisplay(vec3 c) {
  if (uTone == 1) {
    c = agxTM(gamutMapLuma(c, LUMA_SRGB));
    return clamp(uP3 == 1 ? M_SRGB_TO_P3 * c : c, 0.0, 1.0);
  }
  if (uP3 == 1) c = M_SRGB_TO_P3 * c;
  c = gamutMapLuma(c, uP3 == 1 ? LUMA_P3 : LUMA_SRGB);
  return clamp(uTone == 0 ? neutralTM(c) : c, 0.0, 1.0);
}
float min3Bg(vec3 c) { return min(min(c.x, c.y), c.z); }
vec3 srgbOETF(vec3 x) {
  x = clamp(x, 0.0, 1.0);
  return mix(1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, 12.92 * x, vec3(lessThanEqual(x, vec3(0.0031308))));
}
float triangularDither(vec2 fragCoord) {
  uvec3 h = pcg3d(uvec3(uvec2(fragCoord), 0x2545f491u));
  vec2 u = vec2(h.xy >> 8u) * (1.0 / 16777216.0);
  return u.x + u.y - 1.0;
}
float grainHash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float grainLattice(vec2 q, float z) { return grainHash(vec3(mod(q, 2048.0), z)) - 0.5; }
float grainNoise(vec2 fc, float z) {
  if (uGrainCell <= 1.0) return grainLattice(floor(fc), z);
  vec2 x = fc / uGrainCell - 0.5;
  vec2 i = floor(x), f = x - i;
  vec2 s = f * f * (3.0 - 2.0 * f);
  vec4 w = vec4((1.0 - s.x) * (1.0 - s.y), s.x * (1.0 - s.y), (1.0 - s.x) * s.y, s.x * s.y);
  vec4 v = vec4(grainLattice(i, z), grainLattice(i + vec2(1.0, 0.0), z),
                grainLattice(i + vec2(0.0, 1.0), z), grainLattice(i + vec2(1.0, 1.0), z));
  return dot(w, v) * inversesqrt(dot(w, w));
}
void main() {
  vec2 uv = min(vUv * uViewScale, uHdrMax);
  vec4 P = textureLod(tHdr, uv, 0.0);
  if (uRaw == 1) { gl_FragColor = vec4(P.rgb, 1.0); return; }
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 G = uGW0 * textureLod(tG0, min(vUv * uG0Scale, uG0Max), 0.0).rgb;
  vec3 card  = toDisplay(((1.0 - uGlare) * c + uGlare * G) * uExposure);
  vec3 spill = toDisplay(uGlare * G * uExposure);
  vec3 bgD = uP3 == 1 ? clamp(M_SRGB_TO_P3 * uBg, 0.0, 1.0) : uBg;
  vec3 lin = a * card + (1.0 - a) * (1.0 - (1.0 - bgD) * (1.0 - spill));
  vec3 enc = srgbOETF(lin);
  if (uGrain > 0.0) {
    vec2 fc = gl_FragCoord.xy;
    float k = uGrain * (uGrainBg == 1 ? 1.0 : a);
    enc += k * (uGrainRgb == 1
      ? vec3(grainNoise(fc, uGrainSeed), grainNoise(fc, uGrainSeed + 171.0), grainNoise(fc, uGrainSeed + 342.0))
      : vec3(grainNoise(fc, uGrainSeed)));
  }
  bool page = a <= 0.0 && (min3Bg(uBg) >= 1.0 || max3(spill) <= 1e-4);
  if (!page) enc += triangularDither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(clamp(enc, 0.0, 1.0), 1.0);
}
`,Gt=`PAAAATwAABA8AAAYPAAAHDwAACA8AAAiPAAAJDwAACY8AAAoPAAAKTwAACo8AAArPAAALDwAAC08AAAuPAAALzwAADA8AAAwPAAAMTwAADE8AAAyPAAAMzwAADM8AAA0PAAANDwAADQ8AAA1PAAANTwAADY8AAA2PAAANzwAADc8AAA3PAAAODwAADg8AAA4PAAAODwAADk8AAA5PAAAOTwAADk8AAA5PAAAOjwAADo8AAA6PAAAOjwAADo8AAA7PAAAOzwAADs8AAA7PAAAOzwAADs8AAA8PAAAPDwAADw8AAA8PAAAPDwAADw8AAA8PAAAPDwAADw8AAA8PAAAPP+AJQD/gCUA/4IlAP+GJQD/iSUA/4wl//+OJQD/kCX//5ElAP+TJf//lCX//5Ul//+WJf//lyX//5gl//+ZJf//mSX//5olAP+bJQD/nCX//5wl//+cJf//nCX//54l//+eJf//nyX//58lAP+gJf//oCUA/6Al//+gJQD/oSX//6El//+hJf//oSUA/6El//+hJQD/oSUA/6Il//+hJf//oSUA/6Il//+hJP//oiQA/6Ek//+hJP//oST//6EkAP+hI///oCMA/6Ai//+gIv//nyH//58hAP+dIAD/niAA/5weAP+cHgD/mhwA/5ocAACXGQD/lhgA/5ETAACAAAD/AAP//wAD//8CA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wQD//8DA///AwP//wMD//8DA///AwP//wMD//8DA///AwP//wMD//8DBP//AwP//wQEAP8DA///AwP//wQE//8DA///AwP//wQEAP8DBP//BAT//wMD//8EBP//AwMA/wQE//8DAwD/BAT//wMD//8EBP//AwMA/wQEAP8DAwD/BAQA/wMDAP8EBP8AAwMAAAQEAAADA///BAQAAAMDAAAEBAD/goEA/wACAP8AAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wEC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgL//wIC//8CAv//AgH//wIC//8CAv//AgL//wIC//8CAv//AgIA/wICAP8CAgD/AgIA/wICAP8CAgAAAgIAAAICAAACAgD/AgIAAAMBAP8AAf//AAH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAQD/AQEA/wEBAP8BAQD/AQEA/wECAP8BAQAAAQIAAAEBAAD+/gD/AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAP//AQH//wEB//8BAf//AQH//wEB//8BAQD/AQH//wEBAP8BAQD/AQH//wEBAP8BAP8AAQEAAAEBAAABAQAAAwUA/wAB//8AAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wAB//8AAf//AQH//wEB//8BAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wAB//8AAf//AAH//wAB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wEB//8BAf//AQH//wAB//8BAf//AQH//wAB//8BAf//AQH//wEB//8BAf//AQD//wEA//8BAP//AQD//wEA//8BAf//AAH//wABAP8BAf//AQAA/wEAAP8AAQD/AQAA/wEBAP8BAAAAAQAAAAEAAP8AAP//AAD//wAA//8AAP//AAD//wEA//8AAP//AQD//wAA//8AAP//AQD//wAA//8AAP//AAD//wEA//8AAP//AAD//wAA//8AAP//AQD//wEA//8BAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AQD//wEA//8BAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAH//wAB//8AAf//AAH//wAA//8AAP//AAD//wEA//8BAP//AAD//wAA//8AAf//AAEA/wAA//8BAAD/AAAA/wAA//8BAAAAAAAAAAAAAP/8/gD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAAAAAAA/wAAAAAAAQAAAwAA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAP//AAAA/wAAAAAAAAD/AAAAAAEBAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAAAAAAAP/9+wD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAA//8AAAD/AAAA/wAAAAAAAAAAAwAA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAEAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAAAAD//QD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AwIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAP8AAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAD9/gD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAQEA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAP//AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAD//wAAAP8AAAD/AAAA/wAAAP///wD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAgEA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA//7+AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAD//wAAAP8AAAD/AAAAAAAAAAD/AAD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAAAAQIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAAAAAAAAP7+AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAD9/AD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AgQA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAP//AAAA/wAAAP8AAAAAAAAAAP//AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAD9/wD/AP///wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/BAIA/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAP/9AP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAAAAAAD8/QD/AP///wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAAAAP4A/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wUHAP8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAD+/QD/AAD///////////////////////////////////////////////////////////////////8A////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD//wAA////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAA//8AAAD/AAAA/wAAAAAAAAD/9vUA////////AP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP//AAD//wAA////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAYFAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAACBAD//wD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wD///8A////AP///wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAA/fkA/wAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAAAHWCAP//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///////////////////wD///8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA//8AAACMfQAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAQQA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A////AP//AAD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wACAP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD//wAAAAAAAAB/gAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP///wAAcfQA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD//////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD//wAAABCMAP//AP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8CAwD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD//wAA//8AAP//AAD/AAAA/wAAAP8AAAAA7fIA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP//AAD//wAAAP8AAAD/AAAAAAAAAJWQAP//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA//8AAP//AAD///8A////AAD49AD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAP//AAD//wAA//8AAP//AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA//8AAP///wD/h4sA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///////8A//8AAP//AAD//wAA//8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAICAP7////+/////v///v7////+///+/v////7////+/////v///v7////+/////v///v7////+/////v////7////+/////v////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP8AAAD/AAD//wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAD+/gD+/////v////7///7+///+/v///v7////+///+/v////7///7+///+/v////7////+///+/v////7////+/////v///v7////+////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP8AAAD/AAAA/wAAAAAAAAAAAAAA/wAAAP8AAAAAd3IA/////////////////////v/////////+/////v////7//////////v////7//////////v////7////////////////////+/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP///wD///8A////AP///wD///8A////AP///wAAAAAA/wAAAP8AAAD/AAAAAA4TAP7////+/////v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///////////////////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAD//wAA//8AAP8AAAADAwD+/////v////7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v////7////+/////v//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//7/AAD9/wAAb2wA/v////7////+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+///+/v///v7///7+/////v////7////+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP///wD///8A////AP///wAA//8AAP//AP///wD///8A////AAD+/wD//P8A/xEUAP3////9/////f///v3+//79///9/f///v3+//79///+/f///f3+//79///+/f///v3+//7+/v/+/v///v7///7+///+/v///v7////+/////v////7////+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A/wD/AP8A/wD/AAAA/wAAAP8A/wD/AP8A/wD/AP///wAA//8AAP//AAD//wAA//8AAPv/AAACAgD9/////f////3//v79/v79/f/+/f3+/v39/v79/f7//f3///39/v/9/f7//v3+//39/v/9/v7//v7+//7+///+/v////7///7+///////////////+//////////7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP8A/wD/AP8A/wD/AP8A/wD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/wAAAAAA/P/+//z//v/8/v7//P7+/vz+/vz8/v78/P7+/Pz+/v38/v78/P7+/fz+/v38/v79/f7+/v3+/v39/v/+/v7//v7///7+/////v////7////+/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wD///8A////AP8A/wAAAP8A/wD/AP8A/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABQEAAP39APv//f/7//7/+/7+//v9/v77/v79+/3+/Pv9/vv7/f77+/7+/Pv9/vz8/f78/P7+/f3+/v39/v7+/f7+/v3+/v79/v/+/v////7////+/////v////7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAP//AP///wAA//8AAP//AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAQBAABvcAD4//v/+P78//j8/P/4/Pv/+Pz8/vj8/P34/Pz8+Pz8+/n8/Pv6/f38+/39/fz9/v38/v7+/f7+/v3+/v7+//7//v7+//7+/v/+//7//v////7////+/////v///////////////v////7//v////7/////////////////////////////////////////////////////////////////////////////////////////////////////////////AP///wD///8AAP//AAD//wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEBAAADAgD/FBMA7P/4AOv+2f/s++T/7Pfm/+z16P/t9Oz/7vXt/vH38P3z+PL89fnz+/n8+/36/fz++/38/vv9/P79/v3//f39/vz+/f79/v3+/f79//3+/f7+/v7//v7+//7+/v/+//7//v/+//7//v/+//7//v/+/////v////7///////////////////////////////////////////////////////////////////////////////////////////////////////8A////AP8A/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAEAAAABAAAAAQAAAAEAAAACAQD/AgIA/wQFAAAAAE8AAAAgAAAAIAAAAKQAAAAgAAAAcwAAAKQAAABSAAAAIAAAADkAAABzAAAAzgAAAKUAAAB0AAAAUwAAAEMAAAAiAAAAqgAAADsAAADVAAAAdgAAAB0AAAC9AAAAMgAAAJIAAAD2AAAAXQAAAMgAAAAyAAAAmgAAAAIAAAB4AAAA7QAAADAAAABmAAAAowAAAN4AAAAWAAAAUQAAAIsAAADBAAAA+wAAADEAAABlAAAAmgAAAMsAAAD8AAAAKQAAAFcAAACAAAAAqgAAANAAAAD1AAAACwAAABsAAAAqAAAAOQAAAEYAAABSAAAAXgAAAGgAAAByAAAAegAAAIP/B74A/r2+AP72vgD+q74A/u2+AP6hvv/+q74A/oq+//7tvgD+gb7//qG+//6bvv/+rL7//tS+//6Kvv/+N77//u++//6zvgD/gr4A/y2+//6bvv/+873//6O2//4Dvv/+ir3//hO9//+ZuwD+Brn//yi0AP4YqP//4LUA/xOv//8qpP//GpX//2COAP/Yj///uXYA/4NXAP86Yf/+8Dr//+sdAP8zDf//q9X//0PTAP+mjv//4nX//2w1//9tDAD/BJX///M0Af9zof//cEP//36U//+9QgD/+n8A/3c8AP+d6AD/+lwA/5jlAP+EKQAA678A/0sRAP8bhAAAEQ8A/Aj///2+//799v/+/f7//v3///79///9/f7//v3+//39///+/f7//v3///79/v/9/f7//v3///79///+/f7//f3+//79/v/+/P7//vz///79//79/f3+/f0W//z9//7//v7///7+/v79/f/+/v7//v39/v3+/P/9/dX6/v3+//39/gD9/f3+/v0EAAD9/f7//f3//v0zCf/98vv//vz///0QAwD9/AD+/S8I//7C8f/+EAL//tT2AP4KAP/+5foA/hAE//7k9P/+IBH/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`,Kt=`PAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA7AAAAOwAAADsAAAA7AAAAOwAAADsAAAA7AAAAOwAAADsAAAA7AAAAOwEAADsBAAA7AAAAOwAAADsAAAA7AAAAOwEAADsBAAA7AQAAOwEAADsBAAA7AgAkOwIAKjsBAC06AgAvOgIAMDoCADE6AgAyOgIAMzoCADQ6AgA0OQIANTkCADU5AwA2OQMANjkDADc5AwA3OAMAODgDADg4AwA4OAMAODgDADk3AgA5NwIAOTcCADk2AgA6NgIAOjYCADo2AgA6NQIAOzUCADs1AgA7NAIAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAI//8AGQAAACAAAAAlAAAABAD/AAEAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAD//wAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAS/wAAEv//AAcAAAAE/wAAAv8AAAH//wABAAAAAP8AAAD/AAAAAAAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAD/AAAAAAAA/wAAAAAAAAIAAAAT/wAACf8AAAQA/wADAAAAAv8AAAH/AAAB//8AAAAAAAD/AAAA/wAAAAAAAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP//AAAA/wAAAAAAAAAAAAMAAAAQ/wAABv8AAAT/AAACAAAAAQAAAAH/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAP8AAAAAAAEAAAAOAAAABgAAAAP/AAAC//8AAQAAAAEAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAA//8AAAD/AAAAAAANAAAABv8AAAP/AAAC/wAAAv//AAEAAAABAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP//AAAAAAALAAAABgAAAAMAAAAC/wAAAf8AAAH/AAABAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAD/AAAAAAAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAD//wAHAAAABwAAAAMAAAAC/wAAAf8AAAH/AAAB/wAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA/wAAAP8AAAAAAAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAB//8ACQAAAAQAAAACAAAAAv8AAAH/AAAA/wAAAf8AAAAAAAAAAAAAAP8AAAAAAAAA/wAAAP8AAAAAAAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA//8ACgAAAAQAAAACAAAAAgAAAAH/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAABP//AAX/AAADAAAAAgAAAAEAAAABAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAP8AAAj/AAAEAAAAAgAAAAEAAAABAAAAAQAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAA/wAAAP8BAAD/AAAA/wEAAP8AAAD/AQAA/wAAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAf/AAAF/wAAAgAAAAEAAAABAAAAAQAAAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAAABAAD/AQAA/wEAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG//8AAwAAAAIAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAD/AQAA/wEAAP8AAAD/AQAA/wEAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/wAABP//AAL/AAABAAAAAQAAAAEAAAAAAAEAAAAAAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABgAAAAP/AAAC/wAAAQAAAAAAAAABAAEAAAABAAAAAAAAAAEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wAAAP8AAAAAAAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAABgAAAAT/AAAC/wAAAQAAAAH/AAABAAEAAAABAAAAAQAAAAEAAAABAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX/AQAD/wAAAf8AAAEAAAAAAAEAAQABAAD/AQAA/wAAAAAAAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAQAEAAEAAv8AAAH/AQAB/wEAAAABAAAAAQAAAAEAAP8AAAAAAQAAAAEAAAABAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AQAGAAEAA/8BAAH/AAABAAEAAQABAAEAAQAAAAEAAP8BAAD/AQAAAAEAAAABAAAAAAAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEAAEABAABAAIAAAAB/wEAAf8BAAD/AQABAAEAAAABAAD/AQAAAAEAAAABAAAAAAAAAAAAAAABAAD/AAAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEABgABAAP/AQAB/wEAAf8BAAH/AQAAAAEAAAABAAD/AQAA/wAAAAAAAAAAAQAAAAEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAgACAAQAAQACAAEAAf8AAAH/AQAAAAEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAAAAQAAAAEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAb/AQADAAEAAgABAAH/AQABAAEAAAABAAAAAQAAAAEAAP8BAAD/AQAAAAEAAAABAAAAAQAAAAAAAP8AAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAQAEAAEAAgABAAH/AQAB/wAAAP8BAAD/AQAA/wEAAP8BAAD/AQAAAAEAAP8BAAD/AAAA/wEAAP8BAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAEAAAABAAAAAgAEAAIAAwABAAIAAQAB/wEAAf8BAAD/AQAAAAEAAAABAAD/AQAA/wAAAP8BAAD/AQAA/wEAAAABAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAEABv8BAAIAAQAB/wEAAf8BAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAQAAAAEAAAABAAAAAQAAAAEAAgABAAQAAgACAAEAAQABAAH/AAAA/wEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAEAAAAAAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAYAAQACAAEAAgABAAH/AQAB/wEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAEAAEAAgABAAH/AQABAAEAAP8BAAAAAQAAAAEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAAAAAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAACAAAAAgADAAIAA/8BAAIAAQABAAEAAf8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAAAAQAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAMAAQABAAEAAQABAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAQAAQACAAEAAQABAAH/AQAA/wEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAMAAQADAAEAAgABAAH/AQABAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAFAAEAAv8BAAEAAQABAAEAAf8BAAD/AQAAAAEAAAABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAIAAQABAAEAAQABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAMAAQACAAEAAQABAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAP8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAQABAAH/AQAAAAEAAP8BAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAEAAEAAv8BAAEAAQABAAEAAP8BAAD/AQAA/wEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAA/wEAAAABAAAAAQAAAAEAAAABAAAAAQADAAEAAwABAAEAAQABAAEAAQABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAIAAQABAAEAAf8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAQAAQACAAEAAQABAAEAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAMAAQADAAEAAf8BAAEAAQABAAEAAP8BAAAAAQAAAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAGAAEAAgABAAEAAQABAAEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABAABAAIAAQABAAEAAf8BAAAAAQAA/wEAAAABAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAgABAAMAAQABAAEAAQABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAYAAQACAAEAAf8BAAEAAQAAAAEAAf8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAFAAEAAgABAAEAAQAB/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAwAAAAEAAAABAAAAAAAAAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEABgABAAMAAQABAAEAAQABAAAAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAf8BAAH/AQAB/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAQAAAAEAAAAAAAAAAf8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAwAAAAIAAAABAAAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAP8BAAAAAQAAAAEABwABAAMAAQAB/wEAAf8BAAH/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAUAAQACAAEAAQABAAEAAQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AQAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAEAAAADAAAAAgAAAAEAAAAB/wAAAP8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAwAAAAH/AAAB/wAAAf8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEABwABAAIAAQACAAEAAf8BAAH/AQAB/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAUAAQAC/wEAAf8BAAH/AQAB/wEAAP8BAAD/AQAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAEAAAAAgAAAAL/AAAB/wAAAf8AAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAAAAAALAAAAA/8AAAL/AAAB/wAAAf8AAAH/AAAB/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAB/8BAAP/AAAC/wAAAv8AAAH/AAAB/wAAAf8AAAD/AAAB/wAAAf8AAAH/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA/wEAAP8AAAr+AAAG/wAABP8AAAT/AAAD/wAAAwAAAAIAAAACAAAAAgAAAAIAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAB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B3wAJQqkACUL2AAlC8kAJA68ACQQsQAjE6YAIhWcACIXkgAhGosAEBqDABAcmwAPHdIADyDaAA4izwANJMIADSW5AAwmrwALJ6cACiqfAAksmAAJLZAACC2pAAYv2gAELvQABC/pAAIu3AABLdMAACvHAAApwAAAANAAAP/QAAAA0ABXANAA+wDQAE4AzwCBAM4Ac//NAOT9yQAL/sYAmPrAAKj5ygC499MAgfTfAGrw7QBx7gEAdusUAHvp/gCA6eoAQ+nXAETpxQBG6rQASOymAEnumABL8YwATPSBAE33hABO+r0AKfzNACf/vwAnAbIAKASmACgGmgAoCJEAKAuIACgNgAAnDn0AJxG5ACcR0AAnEsMAJhS4ACYWrgAlGKQAFBqaABEdkgARH4sAESGEABAiqQAPI98ADyXhAA4o1AAOKckADCy+AAsttAALLqsACS+jAAgynAAHNJUABjajAAQ21QADOAQAATj4AAE48AAAOOUAAAD0AAAA9AAAAPQAqwD0AGAA9ADg//MAWv/xAAT66gAL/eoAzvrkAK353QC/9tQAx/HIAG/uuwB37LEAfeiiAIPllACI5bYAVOXcAEnm4gBM6M4ATuu9AE/trABR8KAAUvSUAFT4iQBV+4AAQf53ACsBlQAsAswALAa/ACsHswAsCagALAueACsNlQArD4wALBGEACsTfAArFJQAKhbOACoXzgApGMEAKBq2ABQcrQAUHqQAEyCcABIilQARJY4AESeHABEpsgAQKuUADizlAA4t2gANMNAADDLEAAs1ugAKN7QACTitAAc6pwAGPKIAAz6dAAJAzwAAQvwAAEMUAAAAHgAAAB4AAAAeAAsAHQDsAB0AAgAcAK7+GQAM/BIAPfsOALX4AwDK9PkA3e/qAHfr2gB/58wAhuO4AI3gpwCU35gAed+KAFDifgBS5JIAVOjDAFbswQBY8LMAWvWmAFz4mwBd/JAAVwCHADADfwAwBnYAMAlwADEKqwAxDMIAMA62ADAQrAAxEaEAMROZADAVkAAwFokALxiBAC8ZegAuG6gALh3dABge0gAWH8YAFSC7ABUirwAVJKYAFCaeABMplwASK5AAES6KABExtAAQM+cADzX0AA437AANOOQACzrZAAo90AAJP8gABkK/AAVEuQADRrMAAUiuAABKuwAAACcAAAAnAAAAJwAAACgAVv8nAJ7/KAA1+SYAS/wuAM32LwDZ8iMA7+wPALDm+wCM4eYAlNzOAJ3ZuQCk2KYAmtqWAFneiABc4XwAXuhzAGHtagBj8pUAZfi5AGf8rQBoAaIAaQWZADUIjwA2C4YANw1/ADcPdwA3EXEANxKLADgTxgA4FLoAOBWwADcWpwA3F54ANxmXADYakAA1HIkANR2DACkffwAZILcAGiLeABkk1AAYJswAFyjCABcpuAAXK68AFS2mABUvoQAUMZsAEjWWABI3sgAQOuMADz4PAA5ABwAMQ/4ACkb2AAlI7gAHSuQABEzbAAFO0gAAUcwAAADDAAAAwwBQAMMAHgDCAJYAwQAP+bsAYPu5AErzsQDw7acAC+StAO/buQCe1MoAqM3ZALPLvwC7zakAuNOZAGbajABp4YIAbOp5AHDwcQBy+GsAdf5lAHcEcwB5Ca4AeAyqAD4PoAA/EpcAQBSQAEAWiABAF4EAQRh6AEEZdABBGm4AQRqpAEAbxABBG7cAQByuAEAcpABAHZ0APx6WADggjwAeIYoAHyOFAB0ljwAdJ8UAHSnsABwr4wAbLdsAGi/VABoyzwAYNMcAFze/ABc4twAVO68AEz2oABJAowAQQtAAD0X8AA1IJAALSx0ACFAYAAZTEgAEVwwAAVoEAAAA4gAAAOIApADhAKr/4QBK+twAiffWAMvtyQAY4rkAPNKjAC/EjQC9u3cAyrZkANe6XgDhxIoA0tCSAHvdiQB/6YMAhPZ9AIj/eACLCHMAjg5uAJEUaQCUGGQAhBpfAEwclQBNHqsATh6iAE4fmQBPH5IAUCCKAE8fgwBQIH0AUCB2AFAgcgBQIIoATyHEAFAhxwBPIb4ATiK1AEMjrQAmI6UAJySdACUmmAAlJ5IAJSmOACMrlQAjLcoAIjD7ACEy+wAgNPQAHzfsAB455gAcPd8AGz/bABpD1QAYRc8AFknLABNMxgART8EAD1LqAA1VDwAJWTMABVtVAAFfUQAAAAYAAAAGAMb/BQCt9vsAi+vtAGTV0QBxtaoApJd+AHqIXQD9i0kAEZ1BACK4QgAx1EQA8uxHAKcBcQCtEY8Asx6NALgliQC9K4MAwS5+AMYwdwDJMHEAkC9rAGcvZQBpL2EAai2AAGssrwBsKqYAbCqeAG0omABuKJEAbieLAG4mhgBuJoAAbiZ7AG4ldwBtJqUAbSfbAE0n1AA1KM0ANSnGADQqwQA0K7oAMyy0ADIurQAxL6gAMDGiAC8znQAuNcQALDjxACs6GwApPRoAKD8TACZDDAAkRQcAIkkCACBM+wAdT/cAG1P0ABdX8QATWu8AEF7tAAtj6gAEZg4AAP8mAACCpwBW7QYAjicoAM9bOwAGkEkAjcxdAAMKdADEQIYA5maPAJB8jwA3h4kA24mAAMqGdQDagGwA6Hh9APZwrADyaKQAvGCYAIZajQBOU4QAFk18ABlIdQAdRG8AID9pACM7YwAlOGoAJzWlACkyrAAqMKQAKy6dACwslgAsK5AAHCqKAPsphADaKX8AuCh7AJYodwCTKawAkyneAJEq2ACQK9EAjizLAI0uxgCKL8IAiTG9AIYzuQCENbYAgDizAH46sAB6Pa4Ad0DUAHJD/wBuRicAaUlLAGRMTwBeUE4AWVRMAFFXSgBKW0kAQV9HADdjRgAqZ0cAG2xGAAA=`,qt=63;function Jt(e,t,n){let r=Math.abs(e);if(!(r>=2**-62)||!Number.isFinite(e)){t[n]=0,t[n+1]=0,t[n+2]=0;return}let i=Math.floor(Math.log2(r)),a=Math.round((r/2**i-1)*65536);a>=65536?(a=0,i+=1):a<0&&(a+=65536,--i);let o=Math.min(Math.max(i+qt,1),127);t[n]=(e<0?128:0)+o,t[n+1]=a>>8,t[n+2]=a&255}var Yt=`
float decodeFloat24(vec3 c) {
    vec3 b = floor(c * 255.0 + 0.5);
    float e = mod(b.x, 128.0);
    if (e < 0.5) return 0.0;
    float v = (1.0 + (b.y * 256.0 + b.z) / 65536.0) * exp2(e - ${qt.toFixed(1)});
    return b.x >= 128.0 ? -v : v;
}
`;function Xt(e){let t=e&32768?-1:1,n=e>>10&31,r=e&1023;return n===0?t*r*2**-24:n===31?r?NaN:t*(1/0):t*(1+r/1024)*2**(n-15)}var Zt={width:256,height:128};function Qt(e){let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e++)n[e]=t.charCodeAt(e);return n}function $t(){let{width:e,height:t}=Zt,n=new Uint8ClampedArray(e*t*4).fill(255);return[Gt,Kt].forEach((r,i)=>{let a=Qt(r),o=a.length/2,s=new Uint16Array(o);for(let t=0;t<o;t++){let n=a[t]<<8|a[o+t];s[t]=n+(t>=e?s[t-e]:0)&65535}for(let r=0;r<64;r++){let a=t-1-(i*64+r);for(let t=0;t<e;t++)Jt(Xt(s[r*e+t]),n,4*(a*e+t))}}),n}var en=`
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 2, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 3, y), 0).rgb));
}
`,tn=(function(){let e=typeof document<`u`&&document.createElement(`link`).relList;return e&&e.supports&&e.supports(`modulepreload`)?`modulepreload`:`preload`})(),nn=function(e){return`/vfx-js/`+e},rn={},an=function(e){return e.pathname.endsWith(`.css`)},on=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},A=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=nn(t,n);let r=s(t),i=an(r);return on(rn,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:tn,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},sn={prism:()=>A(()=>import(`./prism.AHThHMoM.js`).then(e=>e.prism),__vite__mapDeps([0,1])),shatter:()=>A(()=>import(`./shatter.CUi4o2sT.js`).then(e=>e.shatter),__vite__mapDeps([2,1])),nebula:()=>A(()=>import(`./nebula.3fRVgFbb.js`).then(e=>e.nebula),__vite__mapDeps([3,1,4])),sparkle:()=>A(()=>import(`./sparkle.Cxujy15-.js`).then(e=>e.sparkle),__vite__mapDeps([5,1,4])),vortex:()=>A(()=>import(`./vortex.Dga2QZLx.js`).then(e=>e.vortex),__vite__mapDeps([6,1])),emboss:()=>A(()=>import(`./emboss.Tl2ZpADr.js`).then(e=>e.emboss),__vite__mapDeps([7,1]))},cn=Object.keys(sn),ln=e=>typeof e==`string`&&Object.hasOwn(sn,e),un=new Map,dn=new Map;function fn(e){return un.get(e)}function pn(e){let t=un.get(e);if(t)return Promise.resolve(t);let n=dn.get(e);return n||(n=sn[e]().then(t=>(un.set(e,t),dn.delete(e),t),t=>{throw dn.delete(e),t}),dn.set(e,n)),n}var j=Math.PI/180;function mn(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function hn(e,t){return[e[0]*t,e[1]*t,e[2]*t]}function gn(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function _n(e){return Math.hypot(e[0],e[1],e[2])}function vn(e){let t=_n(e);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function yn(e,t){return[e[t],e[3+t],e[6+t]]}function bn(e,t){let n=Math.hypot(e,t),r=Math.min(n,.996),i=n>0?r/n:0;return[e*i,t*i,Math.sqrt(1-r*r)]}function xn(e,t){return t*Math.tan(.5*e*j)}function Sn(e){let t=Math.hypot(e[0],e[1]),n=t<1e-4?0:Math.atan2(e[1],e[0]),r=Math.sqrt(Math.max(1-t*t,0)),i=Math.min(t,1),a=Math.cos(n),o=Math.sin(n);return{eTheta:[r*a,r*o,-i],ePhi:[-o,a,0]}}function Cn(e,t,n,r){let{eTheta:i,ePhi:a}=Sn(e);return{U:hn(i,r*Math.tan(.5*t*j)),W:hn(a,r*Math.tan(.5*n*j))}}function wn(e,t,n,r=22){let i=2*Math.tan(.5*r*j);return Math.max(2*n/.7/i,2*t/.8/(i*Math.max(e,1e-6)))}function Tn(e,t,n){let r=Math.cos(e*j),i=Math.sin(e*j),a=Math.cos(t*j),o=Math.sin(t*j),s=Math.cos(n*j),c=Math.sin(n*j);return[a*s,-a*c,o,r*c+i*s*o,r*s-i*c*o,-i*a,i*c-r*s*o,i*s+r*c*o,r*a]}function En(e,t,n,r,i,a){let o=e*j,s=t*j,c=[Math.sin(o)*Math.cos(s),Math.sin(o)*Math.sin(s),Math.cos(o)],{eTheta:l,ePhi:u}=Sn(c);return{centre:c,eTheta:l,ePhi:u,halfU:.5*n*j,halfW:.5*r*j,edgeRad:i*j,profile:a}}En(78,0,5,60,3,()=>1),En(78,180,5,60,3,()=>1),En(62,90,60,60,3,(e,t)=>1+.15*(1-Math.min(e*e+t*t,1))),En(20,90,20,50,3,e=>.75+.25*Math.min(Math.max(e,-1),1));function Dn(e,t){let n=typeof t==`number`?Math.min(Math.max(t,0),1):+(t===`white`);return{rims:e.rims,fill:n===1?1.5*e.fill:(1+.5*n)*e.fill,scrim:e.scrim,cameraSide:n>0?Math.max(e.cameraSide,.03*n):e.cameraSide,cameraTexture:e.cameraTexture,behind:.6*n*e.backdrop}}var M=.5;Math.round(470/M)+1;var N=new Float64Array(941),P=new Float64Array(941);for(let e=0;e<941;e++)N[e]=360+M*e,P[e]=e===0||e===940?.5*M:M;var On=[[.362,442,.0624,.0374],[1.056,599.8,.0264,.0323],[-.065,501.1,.049,.0382]],kn=[[.821,568.8,.0213,.0247],[.286,530.9,.0613,.0322]],An=[[1.217,437,.0845,.0278],[.681,459,.0385,.0725]];function jn(e,t){let n=0;for(let[r,i,a,o]of t){let t=(e-i)*(e<i?a:o);n+=r*Math.exp(-.5*t*t)}return n}function Mn(e){return[jn(e,On),jn(e,kn),jn(e,An)]}var Nn=(()=>{let e=0,t=0,n=0;for(let r=0;r<941;r++){let[i,a,o]=Mn(N[r]);e+=P[r]*i,t+=P[r]*a,n+=P[r]*o}return[e,t,n]})();function Pn(e,t){return[e[0]*t[0]+e[1]*t[1]+e[2]*t[2],e[3]*t[0]+e[4]*t[1]+e[5]*t[2],e[6]*t[0]+e[7]*t[1]+e[8]*t[2]]}function Fn(e,t){let n=Array(9);for(let r=0;r<3;r++)for(let i=0;i<3;i++)n[3*r+i]=e[3*r]*t[i]+e[3*r+1]*t[3+i]+e[3*r+2]*t[6+i];return n}function F(e){let[t,n,r,i,a,o,s,c,l]=e,u=a*l-o*c,d=o*s-i*l,f=i*c-a*s,p=t*u+n*d+r*f;if(Math.abs(p)<1e-300)throw Error(`mat3Inverse: singular matrix`);let m=1/p;return[u*m,(r*c-n*l)*m,(n*o-r*a)*m,d*m,(t*l-r*s)*m,(r*i-t*o)*m,f*m,(n*s-t*c)*m,(t*a-n*i)*m]}function In(e){return[e[0],0,0,0,e[1],0,0,0,e[2]]}var Ln=[.3127,.329],Rn=[[.64,.33],[.3,.6],[.15,.06]],zn=[[.68,.32],[.265,.69],[.15,.06]];function Bn(e,t){let n=([e,t])=>[e/t,1,(1-e-t)/t],r=n(e[0]),i=n(e[1]),a=n(e[2]),o=[r[0],i[0],a[0],r[1],i[1],a[1],r[2],i[2],a[2]];return Fn(o,In(Pn(F(o),n(t))))}var Vn=Bn(Rn,Ln),Hn=F(Vn),Un=Pn(Vn,[1,1,1]),Wn=[.8951,.2664,-.1614,-.7502,1.7135,.0367,.0389,-.0685,1.0296],Gn=Fn(Hn,(()=>{let e=e=>Pn(Wn,e),t=e([1,1,1]),n=e(Un);return Fn(F(Wn),Fn(In([n[0]/t[0],n[1]/t[1],n[2]/t[2]]),Wn))})());F(Fn(F(Bn(zn,Ln)),Vn));function Kn(e){let[t,n,r]=Mn(e);return Pn(Gn,[t/Nn[0],n/Nn[1],r/Nn[2]])}var I=(()=>{let e=new Float64Array(2823);for(let t=0;t<941;t++){let n=Kn(N[t]);e[3*t]=n[0],e[3*t+1]=n[1],e[3*t+2]=n[2]}return e})();function qn(e,t,n){let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)}function Jn(e){return .889-125e-6*(Math.min(Math.max(e,380),780)-450)}function Yn(e,t){if(t.type===`clear`)return 1;let n=qn(t.edgeNm-t.widthNm,t.edgeNm+t.widthNm,e);return t.floor+(1-t.floor)*(t.type===`longpass`?n:1-n)}function Xn(e){let t={type:e.type,edgeNm:e.edgeNm,widthNm:e.widthNm,floor:e.floor};return e=>Jn(e)*Yn(e,t)}var Zn=14388e3;function Qn(e,t){return e**-5/Math.expm1(Zn/(e*t))}function $n(e,t,n){let r=(e-t)/n;return Math.exp(-.5*r*r)}var er=[[405,.12,2.5],[436,.55,2.5],[487,.12,3],[546,1,3],[577,.15,3],[611,.95,4],[631,.12,4]];function tr(e,t){switch(e){case`equal`:return 1;case`daylight`:return Qn(t,5600);case`tungsten`:return Qn(t,3200);case`led`:return $n(t,452,10)+.62*$n(t,565,52);case`triphosphor`:{let e=.03;for(let[n,r,i]of er)e+=r*$n(t,n,i);return e}}}var nr=(()=>{let e=[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`],t=0,n={};for(let t of e)n[t]=0;for(let r=0;r<941;r++){let i=N[r],a=P[r]*Mn(i)[1];t+=a;for(let t of e)n[t]+=a*tr(t,i)}let r={};for(let i of e)r[i]=i===`equal`?1:t/n[i];return r})();function rr(e,t){return e===`equal`?1:nr[e]*tr(e,t)}function ir(e,t){let n=0,r=0,i=0;for(let a=0;a<941;a++){let o=N[a],s=P[a]*rr(e,o)*t(o);n+=s*I[3*a],r+=s*I[3*a+1],i+=s*I[3*a+2]}return[n,r,i]}var ar=()=>1,or=new Map;function sr(e){let t=or.get(e);return t||(t=ir(e,ar),or.set(e,t)),t}var L={lambda0:300,dLambda:2,width:512,rows:41,layers:5};function cr(e){return .5*2**(e/4)}function lr(e){let t=Math.abs(e),n=1/(1+.5*t),r=n*Math.exp(-t*t-1.26551223+n*(1.00002368+n*(.37409196+n*(.09678418+n*(-.18628806+n*(.27886807+n*(-1.13520398+n*(1.48851587+n*(-.82215223+n*.17087277)))))))));return e>=0?r:2-r}function ur(e){return .5*lr(-e*Math.SQRT1_2)}var dr=.3989422804014327,R=M,z=Math.round(360/R),fr=Math.round(L.lambda0/R),pr=Math.round((L.lambda0+.5*L.dLambda)/R),mr=Math.round(L.dLambda/R),B=940,hr=z-(pr+mr*(L.width-1))-32,gr=z+B+32-fr+32,_r=6;function vr(e){return 2**Math.max(Math.floor(e/4)-4,-1)/R}function yr(e,t,n){let r=0,i=0,a=0;for(let o=0;o<941;o++){let s=N[o],c=rr(e,s)*t(s),l=c*I[3*o],u=c*I[3*o+1],d=c*I[3*o+2];o>0&&(n[3*o]=n[3*o-3]+.5*R*(r+l),n[3*o+1]=n[3*o-2]+.5*R*(i+u),n[3*o+2]=n[3*o-1]+.5*R*(a+d)),r=l,i=u,a=d}}function br(e,t){let{PHI:n,SPSI:r}=e,i=R/t;for(let e=hr;e<=gr;e++){let a=e*i,o=e-hr;if(a<-6)n[o]=0,r[o]=0;else if(a>_r)n[o]=1,r[o]=t*a;else{let e=ur(a);n[o]=e,r[o]=t*(a*e+dr*Math.exp(-.5*a*a))}}}function xr(e,t){let{gp:n,edge:r,fb:i,mass:a,pre:o,SPSI:s}=e,c=Math.ceil(B/t);o[0]=o[1]=o[2]=0,r[0]=z;for(let e=0;e<c;e++){let c=e*t,l=Math.min(c+t,B),u=(l-c)*R;r[e+1]=z+l;for(let t=0;t<3;t++)i[3*e+t]=(n[3*l+t]-n[3*c+t])/u;let d=s[r[e+1]-fr-hr]-s[r[e]-fr-hr];a[e]=d;for(let t=0;t<3;t++)o[3*(e+1)+t]=o[3*e+t]+i[3*e+t]*d}return c}function Sr(e,t,n,r){let{edge:i,PHI:a,SPSI:o,mass:s,fb:c,acc:l}=e,u=0,d=0,f=0,p=0,m=0,h=0,g=i[t]+r,_=a[g],v=o[g];for(let e=t;e<=n;e++){let t=i[e+1]+r,n=a[t],l=o[t],g=n-_,y=s[e]-(l-v),b=c[3*e],x=c[3*e+1],S=c[3*e+2];u+=b*g,d+=x*g,f+=S*g,p+=b*y,m+=x*y,h+=S*y,_=n,v=l}l[0]=u,l[1]=d,l[2]=f,l[3]=p,l[4]=m,l[5]=h}function Cr(e,t,n,r,i,a,o){let s=L.width,{pre:c,acc:l}=e,u=Math.ceil(_r*n/R)+1;for(let n=0;n<s;n++){let d=pr+mr*n,f=Math.max(0,Math.ceil((d-u-z)/r)-1),p=Math.min(i-1,Math.floor((d+u-z)/r)),m=Math.min(f,i),h=0,g=0,_=0,v=c[3*m],y=c[3*m+1],b=c[3*m+2];f<=p&&(Sr(e,f,p,-d-hr),h=l[0],g=l[1],_=l[2],v+=l[3],y+=l[4],b+=l[5]);let x=(t*s+n)*4;a[x]=h,a[x+1]=g,a[x+2]=_,a[x+3]=1,o[x]=v,o[x+1]=y,o[x+2]=b,o[x+3]=1}}function wr(e,t){let n=L.width,r=L.rows,i=gr-hr+1,a=new Float32Array(n*r*4),o=new Float32Array(n*r*4),s={gp:new Float64Array(3*(B+1)),PHI:new Float64Array(i),SPSI:new Float64Array(i),edge:new Int32Array(B+1),fb:new Float64Array(3*B),mass:new Float64Array(B),pre:new Float64Array(3*(B+1)),acc:new Float64Array(6)};yr(e,t,s.gp);for(let e=0;e<r;e++){let t=cr(e),n=vr(e);br(s,t);let r=xr(s,n);Cr(s,e,t,n,r,a,o)}return{conv:a,cum:o}}var Tr=[430,510,590,670];function Er(e){let t=Math.min(Math.max(e,400),700),n=Tr,r=e=>{let r=1;for(let i=0;i<4;i++)i!==e&&(r*=(t-n[i])/(n[e]-n[i]));return r};return[r(0),r(1),r(2),r(3)]}var Dr=(()=>{let e=new Float64Array(3764);for(let t=0;t<941;t++)e.set(Er(N[t]),4*t);return e})();function Or(e,t){let n=new Float64Array(16);for(let r=0;r<941;r++){let i=N[r],a=P[r]*rr(e,i)*t(i),o=a*I[3*r],s=a*I[3*r+1],c=a*I[3*r+2];for(let e=0;e<4;e++){let t=Dr[4*r+e];n[4*e]+=o*t,n[4*e+1]+=s*t,n[4*e+2]+=c*t}}let r=new Float32Array(16);for(let e=0;e<4;e++)for(let t=0;t<3;t++)r[4*e+t]=n[4*e+t];return r}function kr(e){let t=1-qn(480,520,e),n=qn(570,610,e);return[n,1-n-t,t]}function Ar(e,t){let n=300/e,r=new Float32Array(e),i=new Float64Array(3*e),a=new Float64Array(3*e);for(let t=0;t<e;t++)r[t]=400+(t+.5)*n;for(let r=0;r<940;r++){let o=N[r],s=o+.5*M,c=Math.min(Math.max(Math.floor((s-400)/n),0),e-1),l=t(o),u=t(o+M);for(let e=0;e<3;e++){let t=I[3*r+e],n=I[3*r+3+e];i[3*c+e]+=.5*M*(t+n),a[3*c+e]+=.5*M*(l*t+u*n)}}let o=Array.from(r,e=>kr(e)),s=Array(9).fill(0);for(let t=0;t<e;t++)for(let e=0;e<3;e++)for(let n=0;n<3;n++)s[3*e+n]+=i[3*t+e]*o[t][n];let c=F(s),l=new Float32Array(9*e);for(let t=0;t<e;t++)for(let e=0;e<3;e++)for(let n=0;n<3;n++){let r=0;for(let i=0;i<3;i++)r+=a[3*t+e]*o[t][i]*c[3*i+n];l[9*t+3*n+e]=r}return{lambda:r,width:n,W:l}}function jr(e,t){let n=Math.abs(e),r=.5*t,i=1;for(let e=1;e<=n;e++)i*=r/e;let a=i,o=r*r;for(let e=1;e<8;e++)i*=-o/(e*(e+n)),a+=i;return e<0&&(n&1)==1?-a:a}function Mr(e,t){return Math.sqrt(Math.max(1-(1-e*e)/(t*t),0))}function Nr(e,t){let n=Math.min(Math.max(e,0),1),r=Mr(n,t),i=(n-t*r)/(n+t*r),a=(t*n-r)/(t*n+r);return .5*(i*i+a*a)}var V={uMax:1.6,entries:601,halfWindow:.03},Pr=new Map;function Fr(e,t){let n=Math.abs(e);return n>=1?1:Nr(Math.sqrt(1-n*n),t)}function Ir(e){let t=5e-4,n=Math.round((V.uMax+2*V.halfWindow)/t)+1,r=new Float64Array(n),i=Fr(0,e);for(let a=1;a<n;a++){let n=Fr(a*t,e);r[a]=r[a-1]+.5*t*(i+n),i=n}let a=e=>{let i=Math.abs(e)/t,a=Math.min(Math.floor(i),n-2),o=i-a,s=r[a]*(1-o)+r[a+1]*o;return e<0?-s:s},o=V.entries,s=V.halfWindow,c=new Float64Array(o);for(let e=0;e<o;e++){let t=V.uMax*e/(o-1);c[e]=(a(t+s)-a(t-s))/(2*s)}return c}var Lr=NaN,Rr=null;function zr(e){if(e===Lr&&Rr)return Rr;let t=Pr.get(e);return t||(t=Ir(e),Pr.set(e,t)),Lr=e,Rr=t,t}function Br(e,t){let n=V.entries,r=Math.min(Math.abs(t),V.uMax)/V.uMax*(n-1),i=Math.min(Math.floor(r),n-2),a=r-i;return e[i]*(1-a)+e[i+1]*a}function Vr(e){let{lg:t,lt:n,invD:r,depthNm:i,nc:a,lambdaNm:o,R:s}=e,c=Mr(e.ci,a),l=zr(a),u=o*r,d=u>1e-6&&Number.isFinite(u)?Math.min(Math.floor((a+Math.abs(t))/u)+1,4096):0,f=n*n,p=a*a,m=Math.PI*a*i/o,h=0,g=0;for(let e=-d;e<=d;e++){let n=e*u-t,r=n*n+f;if(r>=p)continue;let i=Math.sqrt(r),o=qn(a,a-.1,i);if(o<=0)continue;let s=Math.sqrt(Math.max(1-r/p,0)),d=jr(e,Math.min(m*(c+s),5.5)),_=o*d*d;h+=_,g+=_*Br(l,i)}return h>1e-9?e.recycle?1/(h-s*g):1/h:1}function Hr(e,t){return Jn(t)*Yn(t,e.tint)}function Ur(e,t,n,r,i,a,o,s){let c=t.x*n+t.y*r,l=-t.x*r+t.y*n,u=Math.sqrt(Math.max(1-(t.x*t.x+t.y*t.y),0));for(let t=0;t<4;t++){let n=Tr[t];o[s+t]=Vr({lg:c,lt:l,ci:u,invD:1/i,depthNm:a,nc:e.nc,lambdaNm:n,R:Hr(e,n),recycle:e.recycle})}}function Wr(e,t,n,r,i,a){let o=new Float64Array(4),s=new Float64Array(4);for(let i=0;i<8;i++){let a=i*Math.PI/8;Ur(e,t,Math.cos(a),Math.sin(a),n,r,s,0);for(let e=0;e<4;e++)o[e]+=s[e]/8}for(let e=0;e<4;e++)i[a+e]=o[e]}function Gr(e,t){return e.pitchesNm[Math.min(t,e.pitchesNm.length-1)]}function Kr(e){return Math.floor(e.pitchesNm.length/2)}function qr(e,t){let n=e.depthsNm;return n&&n.length>0?n[Math.min(t,n.length-1)]:e.depthNm}function Jr(e,t,n){let r=new Float32Array(12),i=new Float32Array(4),a,o;if(e.gAzimuthRad!==null)a=Math.cos(e.gAzimuthRad),o=Math.sin(e.gAzimuthRad);else{let e=t.x+n.x,r=t.y+n.y,i=Math.hypot(e,r),s=Math.hypot(t.x,t.y);i>1e-9?(a=e/i,o=r/i):s>1e-9?(a=t.x/s,o=t.y/s):(a=1,o=0)}for(let n=0;n<3;n++)Ur(e,t,a,o,Gr(e,n),qr(e,n),r,4*n);if(e.gAzimuthRad!==null)Ur(e,t,a,o,Gr(e,0),qr(e,0),i,0);else{let n=Kr(e);Wr(e,t,Gr(e,n),qr(e,n),i,0)}return{ord:r,mir:i}}function Yr(e,t){let n=new Float32Array(4);if(e.gAzimuthRad!==null)Ur(e,t,Math.cos(e.gAzimuthRad),Math.sin(e.gAzimuthRad),Gr(e,0),qr(e,0),n,0);else{let r=Kr(e);Wr(e,t,Gr(e,r),qr(e,r),n,0)}return n}function Xr(e,t,n,r,i=[0,0,0]){let a=yn(n,0),o=yn(n,1),s=vn(mn(r,i)),c={x:gn(s,a),y:gn(s,o)},l=new Float32Array(48).fill(1),u=new Float32Array(16).fill(1);for(let n=0;n<4;n++){if(t.type[n]===0)continue;let r=vn(mn([t.pos[3*n],t.pos[3*n+1],t.pos[3*n+2]],i)),s=Jr(e,{x:gn(r,a),y:gn(r,o)},c);l.set(s.ord,12*n),u.set(s.mir,4*n)}return{ord:l,mir:u,env:Yr(e,c)}}var Zr=`uniform float uRims, uFill, uScrim, uCameraSide, uCameraTexture, uBehind;
uniform vec4 uBlobs[5];
uniform float uBlobNorm;
varying vec3 vDir;
const float ENV_DEG = 0.017453292519943295;
const float ENV_EDGE = 3.0 * ENV_DEG;
float envPanel(vec3 d, float th, float ph, float hu, float hw, out vec2 ang) {
  vec3 c  = vec3(sin(th) * cos(ph), sin(th) * sin(ph), cos(th));
  vec3 er = vec3(cos(th) * cos(ph), cos(th) * sin(ph), -sin(th));
  vec3 et = vec3(-sin(ph), cos(ph), 0.0);
  float z = dot(d, c);
  ang = vec2(1.0e3);
  if (z <= 1e-6) return 0.0;
  ang = atan(vec2(dot(d, er), dot(d, et)) / z);
  float e = 0.5 * ENV_EDGE;
  float mu = 1.0 - smoothstep(0.0, 1.0, (abs(ang.x) - (hu - e)) / (2.0 * e));
  float mw = 1.0 - smoothstep(0.0, 1.0, (abs(ang.y) - (hw - e)) / (2.0 * e));
  return mu * mw;
}
float envCameraSide(vec3 d) {
  float B = 0.0;
  for (int k = 0; k < 5; ++k) {
    float a = acos(clamp(dot(d, uBlobs[k].xyz), -1.0, 1.0)) / uBlobs[k].w;
    B = max(B, exp(-0.5 * a * a));
  }
  return (0.5 + 4.5 * B) / uBlobNorm;
}
float envStudio(vec3 d) {
  vec2 a; float m, cover = 0.0, L = 0.0;
  m = envPanel(d, 78.0 * ENV_DEG, 0.0, 2.5 * ENV_DEG, 30.0 * ENV_DEG, a);
  cover += m; L += uRims * m;
  m = envPanel(d, 78.0 * ENV_DEG, 180.0 * ENV_DEG, 2.5 * ENV_DEG, 30.0 * ENV_DEG, a);
  cover += m; L += uRims * m;
  m = envPanel(d, 62.0 * ENV_DEG, 90.0 * ENV_DEG, 30.0 * ENV_DEG, 30.0 * ENV_DEG, a);
  if (m > 0.0) { vec2 s = a / (30.0 * ENV_DEG); cover += m; L += uFill * m * (1.0 + 0.15 * (1.0 - min(dot(s, s), 1.0))); }
  m = envPanel(d, 20.0 * ENV_DEG, 90.0 * ENV_DEG, 10.0 * ENV_DEG, 25.0 * ENV_DEG, a);
  if (m > 0.0) { cover += m; L += uScrim * m * (0.75 + 0.25 * clamp(a.x / (10.0 * ENV_DEG), -1.0, 1.0)); }
  float front = L + uCameraSide * mix(1.0, envCameraSide(d), uCameraTexture) * max(1.0 - cover, 0.0);
  return mix(uBehind, front, smoothstep(-0.002, 0.002, d.z));
}
void main() {
  vec3 dx = dFdx(vDir) * 0.25, dy = dFdy(vDir) * 0.25;
  float L = 0.25 * (envStudio(normalize(vDir - dx - dy)) + envStudio(normalize(vDir + dx - dy))
                  + envStudio(normalize(vDir - dx + dy)) + envStudio(normalize(vDir + dx + dy)));
  gl_FragColor = vec4(vec3(L), 1.0);
}
`,Qr=[8,40],$r=[.5,5],ei=1.5;function ti(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function ni(e,t){return ti((Math.imul((e|0)^1540483477,2654435761)^Math.imul(t,2246822507))>>>0)}function ri(e,t,n,r){let i=[];if(e<=0)return i;let a=Array.from({length:e},(e,t)=>t);for(let t=e-1;t>0;t--){let e=Math.floor(r()*(t+1)),n=a[t];a[t]=a[e],a[e]=n}let o=Math.log(n/t);for(let n=0;n<e;n++){let s=t*Math.exp(o*(n+r())/e),c=Math.PI*(a[n]+r())/e,l=r();l>=0&&l<1||(l=0),i.push({fx:Math.cos(c)/s,fy:Math.sin(c)/s,lambda:s,phase:l})}return i}function ii(e){let t=e.pitchMm,n=.5*Math.max(0,e.heightUm)*.001;if(e.emboss===`none`||!(t>0)||!(n>0))return[];if(e.emboss===`lines`)return[{fx:0,fy:1/t,A:n}];let r=Math.SQRT1_2/t;return[{fx:r,fy:r,A:n},{fx:-r,fy:r,A:n}]}function ai(e,t,n){let r=new Float32Array(128),i=ii(t),a=Math.max(0,Number.isFinite(e.wavinessDeg)?e.wavinessDeg:0),o=Math.max(0,Number.isFinite(e.orangePeelUm)?e.orangePeelUm:0),s=a>0?Math.max(0,Math.floor(n.board)):0,c=o>0?Math.max(0,Math.floor(n.coat)):0,l=i.length;for(;s+c+l>32;)c>s?c--:s--;let u=0,d=(e,t,n,i)=>{r[4*u]=e,r[4*u+1]=t,r[4*u+2]=n,r[4*u+3]=i,u++},f=ri(s,Qr[0],Qr[1],ni(e.seed,1));if(f.length){let e=0;for(let t of f)e+=t.lambda**(2*ei-2);let t=a*Math.PI/180/Math.sqrt(2*Math.PI*Math.PI*e);for(let e of f)d(e.fx,e.fy,t*e.lambda**ei,e.phase)}if(t.layer===`foil`)for(let e of i)d(e.fx,e.fy,e.A,0);let p=[0,u],m=ri(c,$r[0],$r[1],ni(e.seed,2));if(m.length){let e=0;for(let t of m)e+=t.lambda**(2*ei);let t=o*.001*Math.sqrt(2/e);for(let e of m)d(e.fx,e.fy,t*e.lambda**ei,e.phase)}if(t.layer===`varnish`)for(let e of i)d(e.fx,e.fy,e.A,0);return{data:r,board:p,coat:[p[1],u-p[1]]}}var oi=20973;function si(e=oi){let t=ti(e),n=[];for(let e=0;e<5;e++){let e=t(),r=2*Math.PI*t(),i=Math.sqrt(Math.max(0,1-e*e)),a=(12+13*t())*Math.PI/180;n.push([i*Math.cos(r),i*Math.sin(r),e,a])}let r=0;for(let e=0;e<96;e++){let t=(e+.5)/96,i=Math.sqrt(1-t*t);for(let e=0;e<192;e++){let a=2*Math.PI*(e+.5)/192,o=i*Math.cos(a),s=i*Math.sin(a),c=0;for(let e of n){let n=Math.acos(Math.min(1,Math.max(-1,o*e[0]+s*e[1]+t*e[2])))/e[3];c=Math.max(c,Math.exp(-.5*n*n))}r+=.5+4.5*c}}return{blobs:new Float32Array(n.flat()),norm:r/18432}}function ci(e,t){let n=-e*Math.PI/180,r=Math.cos(n),i=Math.sin(n),a=[r,-i,0,i,r,0,0,0,1],o=t?Array.from({length:9},(e,n)=>{let r=Math.floor(n/3),i=n%3;return a[3*r]*t[i]+a[3*r+1]*t[3+i]+a[3*r+2]*t[6+i]}):a;return new Float32Array([o[0],o[3],o[6],o[1],o[4],o[7],o[2],o[5],o[8]])}function li(e,t){return!!e&&e.rims===t.rims&&e.fill===t.fill&&e.scrim===t.scrim&&e.cameraSide===t.cameraSide&&e.cameraTexture===t.cameraTexture&&e.behind===t.behind}var ui=`#version 300 es
precision highp float;
precision highp int;
#define gl_FragColor pc_fragColor
layout(location = 0) out highp vec4 pc_fragColor;
${Zr.slice(0,Zr.indexOf(`void main()`)).replace(`varying vec3 vDir;
`,``)}
${Mt}
const float ENV_SIZE_F = ${128 .toFixed(1)};
const float ENV_MAX_LOD = ${6 .toFixed(1)};
const int SAMPLES = 192;

vec2 hammersley(int i, int n) {
  uint b = uint(i);
  b = (b << 16u) | (b >> 16u);
  b = ((b & 0x55555555u) << 1u) | ((b & 0xAAAAAAAAu) >> 1u);
  b = ((b & 0x33333333u) << 2u) | ((b & 0xCCCCCCCCu) >> 2u);
  b = ((b & 0x0F0F0F0Fu) << 4u) | ((b & 0xF0F0F0F0u) >> 4u);
  b = ((b & 0x00FF00FFu) << 8u) | ((b & 0xFF00FF00u) >> 8u);
  return vec2(float(i) / float(n), float(b) * 2.3283064365386963e-10);
}

void main() {
  float tile = floor(gl_FragCoord.y / ENV_SIZE_F);
  vec2 uv = vec2(gl_FragCoord.x, gl_FragCoord.y - tile * ENV_SIZE_F) / ENV_SIZE_F;
  vec3 n = octDecode(uv);
  if (tile < 0.5) {
    // the sharp level: 4× supersampled over the texel, as env.frag
    float h = 0.25 / ENV_SIZE_F;
    float L = 0.25 * (envStudio(octDecode(uv + vec2(-h, -h))) + envStudio(octDecode(uv + vec2(h, -h)))
                    + envStudio(octDecode(uv + vec2(-h, h))) + envStudio(octDecode(uv + vec2(h, h))));
    gl_FragColor = vec4(vec3(L), 1.0);
    return;
  }
  float r = 1.0 - sqrt(max(1.0 - tile / ENV_MAX_LOD, 0.0));   // tile = ENV_MAX_LOD·r(2 − r)
  float a = max(r * r, 1e-4);
  vec3 up = abs(n.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tx = normalize(cross(up, n)), ty = cross(n, tx);
  float sum = 0.0, wsum = 0.0;
  for (int i = 0; i < SAMPLES; ++i) {
    vec2 xi = hammersley(i, SAMPLES);
    float phi = 6.28318530718 * xi.y;
    float ct = sqrt((1.0 - xi.x) / (1.0 + (a * a - 1.0) * xi.x));
    float st = sqrt(1.0 - ct * ct);
    vec3 hv = normalize(tx * (st * cos(phi)) + ty * (st * sin(phi)) + n * ct);
    vec3 l = reflect(-n, hv);
    float nl = dot(n, l);
    if (nl <= 0.0) continue;
    sum += envStudio(l) * nl;
    wsum += nl;
  }
  gl_FragColor = vec4(vec3(sum / max(wsum, 1e-6)), 1.0);
}
`,H=[`equal`,`daylight`,`tungsten`,`led`,`triphosphor`],di=new Map;function fi(e){let t=di.get(e);return t||(t=sr(e),di.set(e,t)),t}function pi(e,t){let[n,r,i]=t,a=2*(e.y*i-e.z*r),o=2*(e.z*n-e.x*i),s=2*(e.x*r-e.y*n);return[n+e.w*a+(e.y*s-e.z*o),r+e.w*o+(e.z*a-e.x*s),i+e.w*s+(e.x*o-e.y*a)]}function mi(){return{type:new Int32Array(4),pos:new Float32Array(12),u:new Float32Array(12),w:new Float32Array(12),radius:new Float32Array(4),rad:new Float32Array(4),spd:new Int32Array(4),rgb:new Float32Array(12).fill(1),key:-1,order:new Int32Array(4).fill(-1)}}function hi(e){return Math.max(0,H.indexOf(e))}function gi(e,t,n,r,i,a){e.type[t]=1,e.pos.set(n,3*t),e.u.fill(0,3*t,3*t+3),e.w.fill(0,3*t,3*t+3),e.radius[t]=Math.max(r,1e-6),e.rad[t]=Math.max(i,0),e.spd[t]=hi(a),e.rgb.set(fi(a),3*t)}function _i(e,t,n,r){let i=bn(n.dir.x,n.dir.y);gi(e,t,pi(r,[i[0]*n.distanceM,i[1]*n.distanceM,i[2]*n.distanceM]),xn(n.sizeDeg,n.distanceM),n.radiance,n.spd)}function vi(e,t){let n=e.pos[3*t],r=e.pos[3*t+1],i=e.pos[3*t+2],a=Math.hypot(n,r,i);if(a<=0)return 0;let o=Math.min(e.radius[t]/a,.999);return e.rad[t]*Math.PI*o*o*Math.max(i/a,0)}function yi(e,t,n){let r=[[e[0]+t[0]+n[0],e[1]+t[1]+n[1],e[2]+t[2]+n[2]],[e[0]+t[0]-n[0],e[1]+t[1]-n[1],e[2]+t[2]-n[2]],[e[0]-t[0]-n[0],e[1]-t[1]-n[1],e[2]-t[2]-n[2]],[e[0]-t[0]+n[0],e[1]-t[1]+n[1],e[2]-t[2]+n[2]]],i=[];for(let e=0;e<4;e++){let t=r[e],n=r[e+1&3];if(t[2]>=0&&i.push(t),t[2]>=0!=n[2]>=0){let e=t[2]/(t[2]-n[2]);i.push([t[0]+(n[0]-t[0])*e,t[1]+(n[1]-t[1])*e,0])}}if(i.length<3)return 0;let a=0;for(let e=0;e<i.length;e++){let t=i[e],n=i[(e+1)%i.length],r=Math.hypot(...t),o=Math.hypot(...n),s=[t[0]/r,t[1]/r,t[2]/r],c=[n[0]/o,n[1]/o,n[2]/o],l=s[1]*c[2]-s[2]*c[1],u=s[2]*c[0]-s[0]*c[2],d=s[0]*c[1]-s[1]*c[0],f=Math.hypot(l,u,d);if(f<1e-12)continue;let p=Math.atan2(f,s[0]*c[0]+s[1]*c[1]+s[2]*c[2]);a+=d/f*p}return Math.abs(a)/2}function bi(e,t){let n=[e.pos[3*t],e.pos[3*t+1],e.pos[3*t+2]],r=[e.u[3*t],e.u[3*t+1],e.u[3*t+2]],i=[e.w[3*t],e.w[3*t+1],e.w[3*t+2]];return e.rad[t]*yi(n,r,i)}function xi(e,t){return e.type[t]===1?vi(e,t):e.type[t]===2?bi(e,t):0}function Si(e,t,n,r,i,a=mi()){let o=a;o.type.fill(0),o.pos.fill(0),o.u.fill(0),o.w.fill(0),o.radius.fill(0),o.rad.fill(0),o.spd.fill(0),o.rgb.fill(1);let s=e.panel;if(s.on&&s.radiance>0){let e=bn(s.dir.x,s.dir.y),t=Cn(e,s.widthDeg,s.lengthDeg,s.distanceM);o.type[0]=2,o.pos.set(pi(r,[e[0]*s.distanceM,e[1]*s.distanceM,e[2]*s.distanceM]),0),o.u.set(pi(r,t.U),0),o.w.set(pi(r,t.W),0),o.rad[0]=s.radiance,o.spd[0]=hi(s.spd),o.rgb.set(fi(s.spd),0)}e.spotA.on&&e.spotA.radiance>0&&_i(o,1,e.spotA,r),e.spotB.on&&e.spotB.radiance>0&&_i(o,2,e.spotB,r);let c=e.flash;if(t.mode===`flash`)c.radiance>0&&gi(o,3,i,c.sizeMm/2e3,c.radiance,c.spd);else if(t.mode===`light`){if(c.radiance>0){let e=bn(t.pad.x,t.pad.y);gi(o,3,[e[0]*c.distanceM,e[1]*c.distanceM,e[2]*c.distanceM],c.sizeMm/2e3,c.radiance,c.spd)}}else e.spotC.on&&e.spotC.radiance>0&&_i(o,3,e.spotC,r);let l=-1,u=0,d=[];for(let e=0;e<4;e++){if(o.type[e]===0)continue;d.push(e);let t=xi(o,e);t>u&&(u=t,l=e)}return o.key=l,d.sort((e,t)=>o.type[e]-o.type[t]||o.rad[t]-o.rad[e]||e-t),o.order.fill(-1),d.forEach((e,t)=>{o.order[t]=e}),o}var Ci=class{stiffness;damping;mass;rx=0;ry=0;vx=0;vy=0;started=!1;constructor(e=190,t=22,n=1){this.stiffness=e,this.damping=t,this.mass=n}step(e,t){if(!this.started){this.rx=e.rx,this.ry=e.ry,this.started=!0;return}let n=Math.max(1,Math.ceil(t/(1/240))),r=t/n;for(let t=0;t<n;t++){let t=(-this.stiffness*(this.rx-e.rx)-this.damping*this.vx)/this.mass,n=(-this.stiffness*(this.ry-e.ry)-this.damping*this.vy)/this.mass;this.vx+=t*r,this.vy+=n*r,this.rx+=this.vx*r,this.ry+=this.vy*r}}snap(e){this.rx=e.rx,this.ry=e.ry,this.vx=0,this.vy=0,this.started=!0}};function wi(e,t){let n=e*Math.PI/360,r=t*Math.PI/360,i=Math.sin(n),a=Math.cos(n),o=Math.sin(r),s=Math.cos(r);return{x:-i*s,y:-a*o,z:-i*o,w:a*s}}function Ti(e,t){return{rx:.45*t*Math.sin(.53*e),ry:t*Math.sin(.37*e+1.1)}}var Ei={"dof.on":!1,"dof.fstop":`2.8`,"dof.focus":`object`,"dof.point":{x:0,y:0},"dof.pointZ":0,"dof.distance":32,"dof.offset":0,"dof.blades":`9`,"dof.bladeCurve":.6,"dof.bladeAngle":0,"dof.catsEye":.3,"dof.rim":.15,"dof.loca":.2,"display.wideGamut":!0,"card.corner":3.2,"card.thickness":.33,"card.border":`ink`,"card.borderColor":`#ece9e2`,"card.backColor":`#22304a`,"card.edgeSilver":!0,"bump.map":`/bumps/scratches.jpg`,"bump.strength":.78,"bump.tiling":3.5,"bump.layer":`foil`,"bump.invert":!0,"emboss.element":`foil`,"emboss.shape":`square`,"emboss.aspect":1,"emboss.cornerRadius":2.5,"emboss.edit":!1,"emboss.holo.type":`reflection`,"emboss.holo.subject":`eagle`,"emboss.holo.size":80,"emboss.holo.depth":-25,"emboss.holo.yaw":0,"emboss.holo.pitch":-10,"emboss.holo.recLight":{x:-.5,y:.5},"emboss.holo.speckle":.5,"emboss.holo.backdrop":`seal`,"emboss.holo.backdropDepth":-100,"emboss.holo.patternSize":50,"emboss.holo.lineWidth":.22,"emboss.holo.gratingPitch":1e3,"emboss.holo.patternStrength":1,"emboss.holo.patternRotation":0,"emboss.holo.patternDepth":-8,"emboss.holo.colour":545,"emboss.holo.bandwidth":30,"emboss.holo.reference":{x:-.25,y:-.68},"emboss.holo.selectivity":16,"emboss.holo.slit":9,"emboss.holo.efficiency":.85,"emboss.holo.recording":`stereogram`,"emboss.holo.views":20,"emboss.holo.viewBlend":.5,"emboss.holo.viewZone":30,"emboss.holo.coatAlpha":.04,"emboss.holo.glare":.15,"emboss.filmUm":40,"emboss.filmWall":0,"emboss.thickness":.8,"emboss.doc":``},Di=new Set(`scene.material,scene.object,scene.orbit,scene.orbitGlide,scene.autoMotion,scene.print,scene.wall,scene.wallArt1,scene.wallArt2,scene.wallArt3,scene.wallArt4,scene.wallFill1,scene.wallFill2,scene.wallFill3,scene.wallFill4,scene.flagImage,object.bend,object.amplitude,object.wavelength,object.crumple,object.seed,object.modelSize,object.modelMapping,object.structureScale,object.doubleSided,object.clothSize,object.clothAspect,object.clothViscosity,object.clothStiffness,object.clothSmoothing,object.clothMemory,object.clothFloat,object.clothGrab,object.clothShadow,object.clothTwoSided,object.wallView,object.wallParallax,object.wallBorder,object.wallBorderMm,object.wallShadow,object.wallShadowSoft,object.wallContact,object.wallBumps,object.wallBubbles,object.wallCreases,object.wallEdgeLift,object.wallGloss,object.wallStiffness,object.wallAdhesion,object.flagPaused,object.flagTimeSpeed,object.flagWind,object.flagWindDir,object.flagWindLift,object.flagGust,object.flagTurb,object.flagFlutter,object.flagSeed,object.flagSurface,object.flagColour,object.flagSize,object.flagAspect,object.flagTail,object.flagTailDepth,object.flagWeight,object.flagStiffness,object.flagSheen,object.flagTranslucency,object.flagShadow,object.flagPoleAngle,object.flagAttach,object.flagRings,object.flagFinial,display.quality,motion.spring,motion.hold,motion.gyro,motion.gyroGain,volume.type,volume.subject,volume.size,volume.depth,volume.yaw,volume.pitch,volume.recLight,volume.speckle,volume.backdrop,volume.backdropDepth,volume.patternSize,volume.lineWidth,volume.gratingPitch,volume.patternStrength,volume.patternRotation,volume.patternDepth,volume.colour,volume.bandwidth,volume.reference,volume.selectivity,volume.slit,volume.efficiency,volume.recording,volume.views,volume.viewBlend,volume.viewZone,volume.waviness,volume.coatAlpha,volume.glare,volume.orangePeel,volume.seed`.split(`,`)),Oi=new Map(ht.map(e=>[e.id,e]));function ki(e){let t=e.split(`.`)[0];return t===`studio`||t===`display`||t===`grain`||t===`card`||t===`motion`||t===`scene`||t===`dof`}function Ai(e){return!!e&&typeof e==`object`&&e.holoDev===1&&typeof e.values==`object`}var ji=e=>!!e&&typeof e==`object`&&Object.getPrototypeOf(e)===Object.prototype&&typeof e.x==`number`&&typeof e.y==`number`;function Mi(e){return ji(e)?{x:e.x,y:e.y}:e}var Ni=new Set;function U(e){Ni.has(e)||(Ni.add(e),console.warn(e))}var Pi=new Set([`prism`,`shatter`,`nebula`,`sparkle`,`vortex`,`emboss`]);function Fi(e){if(typeof e!=`string`)return null;let t=e.trim().toLowerCase();return/^#[0-9a-f]{6}$/.test(t)?t:/^#[0-9a-f]{3}$/.test(t)?`#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`:null}function Ii(e,t){let n=n=>{U(`HoloEffect: ${e.id} = ${JSON.stringify(t)} ${n}; ignored.`)},r=t=>{let n=e.min??-1/0,r=e.max??1/0,i=Math.min(Math.max(t,n),r);return i!==t&&U(`HoloEffect: ${e.id} = ${t} is outside ${e.min}–${e.max}; clamped to ${i}.`),i},i=e.default;switch(e.kind){case`slider`:return typeof t==`number`&&Number.isFinite(t)?r(t):n(`is not a number`);case`toggle`:return typeof t==`boolean`?t:n(`is not a boolean`);case`select`:return e.options&&!e.options.includes(String(t))?n(`is not one of ${e.options.join(`, `)}`):typeof i==`number`?Number(t):String(t);case`color`:return Fi(t)??n(`is not a #rgb / #rrggbb colour`);case`image`:return typeof t==`string`||typeof t==`object`&&!ji(t)?t:n(`is not a URL or an image`);case`pad`:return t&&typeof t==`object`&&Number.isFinite(t.x)&&Number.isFinite(t.y)?{x:r(t.x),y:r(t.y)}:n(`is not { x, y }`);default:return typeof t==typeof i||typeof i==`object`?t:n(`is not a ${typeof i}`)}}function Li(e,t){let n=e.split(`.`)[0];Pi.has(n)&&!(e in Ei)&&Oi.has(e)||Di.has(e)||(e in Ei?JSON.stringify(Ei[e])!==JSON.stringify(t)&&U(`HoloEffect: holo.spot setting ${e} is not supported by this port; ignored.`):U(`HoloEffect: unknown holo.spot setting ${e}; ignored.`))}function Ri(e,t,n){let r={},i=`${e}.`,a=e=>Oi.has(e)&&(ki(e)||e.startsWith(i));for(let e of ht)a(e.id)&&e.default!==null&&(r[e.id]=Mi(e.default));let o=(e,t,n)=>{if(!a(e)){n&&Li(e,t);return}let i=Oi.get(e),o=i?Ii(i,t):t;o!==void 0&&(r[e]=Mi(o))},s=t===`plain`?null:pt[t][e];if(s)for(let[e,t]of Object.entries(s.values))o(e,t,!1);let c=n[`studio.preset`];if(typeof c==`string`&&_t[c])for(let[e,t]of Object.entries(_t[c]))o(e,t,!1);for(let[e,t]of Object.entries(mt)){let r=n[e];if(e.startsWith(i)&&typeof r==`string`&&t[r])for(let[e,n]of Object.entries(t[r]))o(e,n,!1)}for(let[e,t]of Object.entries(n))t!=null&&o(e,t,!0);let l=s?.pose??{rx:0,ry:0},u=n[`motion.pose`]===void 0?null:r[`motion.pose`];return{material:e,values:r,pose:u&&typeof u==`object`?{rx:u.y,ry:u.x}:{rx:l.rx,ry:l.ry}}}function W(e,t,n){let r=e[t];return typeof r==`number`&&Number.isFinite(r)?r:n}function zi(e,t,n){let r=e[t];return typeof r==`boolean`?r:n}function Bi(e,t,n){let r=e[t];return typeof r==`string`?r:n}function G(e,t,n,r){let i=e[t];return typeof i==`string`&&n.includes(i)?i:r}function Vi(e,t,n){let r=e[t];return r&&typeof r==`object`&&typeof r.x==`number`?{x:r.x,y:r.y}:n}function K(e,t,n){return Math.min(Math.max(e,t),n)}function Hi(e,t,n){return{on:zi(e,`studio.${t}.on`,n.on),dir:Vi(e,`studio.${t}.dir`,n.dir),radiance:Math.max(W(e,`studio.${t}.radiance`,n.radiance),0),distanceM:W(e,`studio.${t}.distance`,n.distanceM),spd:G(e,`studio.${t}.spd`,H,`equal`)}}function Ui(e){return{panel:{...Hi(e,`panel`,{on:!0,dir:{x:-.48,y:.66},radiance:4,distanceM:.9}),widthDeg:W(e,`studio.panel.width`,14),lengthDeg:W(e,`studio.panel.length`,50)},spotA:{...Hi(e,`spotA`,{on:!0,dir:{x:-.04,y:-.1},radiance:1200,distanceM:1}),sizeDeg:W(e,`studio.spotA.size`,1.5)},spotB:{...Hi(e,`spotB`,{on:!0,dir:{x:-.25,y:-.68},radiance:600,distanceM:1.2}),sizeDeg:W(e,`studio.spotB.size`,2.5)},spotC:{...Hi(e,`spotC`,{on:!1,dir:{x:.21,y:-.37},radiance:1200,distanceM:1}),sizeDeg:W(e,`studio.spotC.size`,1)},ambient:{rims:W(e,`studio.ambient.rims`,3),fill:W(e,`studio.ambient.fill`,.4),scrim:W(e,`studio.ambient.scrim`,.4),cameraSide:W(e,`studio.ambient.cameraSide`,.004),cameraTexture:W(e,`studio.ambient.cameraTexture`,1),backdrop:W(e,`studio.ambient.backdrop`,1),rotationDeg:W(e,`studio.ambient.rotation`,0)},flash:{sizeMm:W(e,`studio.flash.size`,8.5),distanceM:W(e,`studio.flash.distance`,.3),radiance:Math.max(W(e,`studio.flash.radiance`,1500),0),spd:G(e,`studio.flash.spd`,H,`equal`)}}}function Wi(e){return{background:G(e,`scene.background`,[`black`,`white`,`colour`],`white`),bgColor:Bi(e,`scene.bgColor`,`#3a4458`),studio:Ui(e),display:{ev:W(e,`display.ev`,.5),tone:G(e,`display.tone`,[`neutral`,`agx`,`clamp`],`neutral`),glare:Math.max(W(e,`display.glare`,.03),0),glareRadiusPx:Math.max(W(e,`display.glareRadius`,8),.5)},lensMm:K(W(e,`dof.lens`,62),24,200),grain:{on:zi(e,`grain.on`,!0),amount:K(W(e,`grain.amount`,.07),0,.6),sizePx:K(W(e,`grain.size`,1),1,4),animated:zi(e,`grain.animated`,!0),colour:G(e,`grain.colour`,[`mono`,`rgb`],`mono`),onBackground:zi(e,`grain.onBackground`,!1)},card:{bowMm:W(e,`card.bow`,1.6),bowAxis:G(e,`card.bowAxis`,[`across`,`along`],`across`),emboss:G(e,`card.emboss`,[`none`,`lines`,`crosshatch`],`crosshatch`),embossPitchMm:Math.max(W(e,`card.embossPitch`,1.17),.01),embossHeightUm:Math.max(W(e,`card.embossHeight`,.5),0),embossLayer:G(e,`card.embossLayer`,[`foil`,`varnish`],`varnish`),wear:K(W(e,`card.wear`,.16),0,1)},motion:{pointer:G(e,`motion.pointer`,[`tilt`,`light`,`flash`,`none`],`tilt`),tiltRangeDeg:W(e,`motion.tiltRange`,25),wobble:zi(e,`motion.wobble`,!0),wobbleAmpDeg:W(e,`motion.wobbleAmp`,14)}}}function Gi(e){let t=/^#?([0-9a-f]{6})$/i.exec(e.trim()),n=t?Number.parseInt(t[1],16):0,r=e=>{let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4};return[r(n>>16&255),r(n>>8&255),r(n&255)]}function Ki(e,t){if(e!==`colour`)return+(e===`white`);let[n,r,i]=Gi(t);return K(.2126*n+.7152*r+.0722*i,0,1)}function qi(e,t){return 2**(e-.2*K(t,0,1))}var q={width:L.width,rows:L.rows,layers:L.layers,height:L.rows*L.layers,imageWidth:3*L.width,imageHeight:2*L.rows*L.layers},Ji={type:`clear`,edgeNm:550,widthNm:50,floor:1};function Yi(e,t){return!e||e.type!==t.type?!1:e.type===`clear`||e.edgeNm===t.edgeNm&&e.widthNm===t.widthNm&&e.floor===t.floor}var Xi=class{bytes=new Uint8ClampedArray(q.imageWidth*q.imageHeight*4).fill(255);specProj=new Float32Array(16*H.length);bins={6:{lambda:new Float32Array(6),W:new Float32Array(54),width:50},8:{lambda:new Float32Array(8),W:new Float32Array(72),width:37.5}};version=0;built=new Set([0]);tint=null;rho=Xn(Ji);constructor(e=Ji){this.setTint(e)}setTint(e){if(!Yi(this.tint,e)){this.tint={...e},this.rho=Xn(this.tint),H.forEach((e,t)=>{this.specProj.set(Or(e,this.rho),16*t)});for(let e of[6,8]){let t=Ar(e,this.rho);this.bins[e].lambda.set(t.lambda),this.bins[e].W.set(t.W),this.bins[e].width=t.width}for(let e of this.built)this.buildLayer(e);this.version++}}ensureLayer(e){let t=H.indexOf(e);t<0||this.built.has(t)||(this.built.add(t),this.buildLayer(t),this.version++)}buildLayer(e){let{conv:t,cum:n}=wr(H[e],this.rho);this.writeRows(t,e*q.rows),this.writeRows(n,q.height+e*q.rows)}writeRows(e,t){let n=q.width;for(let r=0;r<q.rows;r++){let i=(q.imageHeight-1-(t+r))*q.imageWidth*4;for(let t=0;t<n;t++)for(let a=0;a<3;a++)Jt(e[(r*n+t)*4+a],this.bytes,i+(3*t+a)*4)}}},Zi=/NVIDIA|GeForce|RTX|Quadro|Radeon RX|Radeon Pro|Arc A|Apple M\d|Apple GPU/i;function Qi(e){try{let t=e.getExtension(`WEBGL_debug_renderer_info`),n=t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):null;if(typeof n==`string`&&n.length>0)return n}catch{}let t=e.getParameter(e.RENDERER);return typeof t==`string`?t:``}function $i(e){let t=typeof matchMedia==`function`&&matchMedia(`(pointer: coarse)`).matches,n=typeof navigator<`u`&&navigator.maxTouchPoints>0,r=typeof screen<`u`&&Math.min(screen.width,screen.height)<900;return t&&n&&r?`low`:Zi.test(Qi(e))?`high`:`medium`}var ea={high:{tier:`high`,glareLevels:5,glareStartDiv:2,waves:{board:8,coat:16},defines:{RECT_EXACT:1,RECT_LTC:1,NB:8,IBL_ORDERS:1,DISCRETE_LIGHTS:4,DISCRETE_LIGHTS_B:2,FLAKE_ENV:1,WEAR_CELLS:3},trips:{maxOrder:3,ghB:4,vorR:2,flakeR:1,bCells:3,bBins:5,bLevels:2}},medium:{tier:`medium`,glareLevels:4,glareStartDiv:2,waves:{board:6,coat:8},defines:{RECT_EXACT:1,RECT_LTC:1,NB:6,IBL_ORDERS:1,DISCRETE_LIGHTS:4,DISCRETE_LIGHTS_B:2,FLAKE_ENV:1,WEAR_CELLS:3},trips:{maxOrder:2,ghB:4,vorR:2,flakeR:0,bCells:3,bBins:3,bLevels:2}},low:{tier:`low`,glareLevels:3,glareStartDiv:4,waves:{board:2,coat:2},defines:{RECT_EXACT:0,RECT_LTC:0,NB:0,IBL_ORDERS:0,DISCRETE_LIGHTS:2,DISCRETE_LIGHTS_B:1,FLAKE_ENV:0,WEAR_CELLS:2},trips:{maxOrder:2,ghB:2,vorR:1,flakeR:0,bCells:2,bBins:2,bLevels:1}}},ta={material:`prism`,settings:{},quality:`medium`,structureScale:1},na={holo:[],sourceChannel:`alpha`,ink:0,flat:!1,sizeMm:null,antialias:!0},ra=new Set([`material`,`quality`,`structureScale`]),ia=new Set([`exposure`,`tone`,`glare`,`grain`,`studio`,`background`,`bow`,`pose`,`lens`,`pointer`,`tiltRange`,`wobble`,`wobbleAmp`]);function aa(e){let t={...ta},n=Array.isArray(e)?e:e?[e]:[];for(let e of n)e&&typeof e==`object`&&pa(t,e);return t}var oa=new Set([`card`,`object`,`image`,`plain`]),sa=new Set([`emboss.x`,`emboss.y`,`emboss.width`]);function ca(e){let t={},n=(e,...n)=>{if(e!==void 0)for(let r of n)t[r]=e};if(n(e.exposure,`display.ev`),n(e.tone,`display.tone`),n(e.glare,`display.glare`),e.grain!==void 0&&(t[`grain.amount`]=e.grain,t[`grain.on`]=e.grain===null?null:e.grain>0),n(e.studio,`studio.preset`),e.background!==void 0){let n=e.background?.trim()??null;n===null||n===`black`||n===`white`?(t[`scene.background`]=n,t[`scene.bgColor`]=null):(t[`scene.background`]=`colour`,t[`scene.bgColor`]=n)}return n(e.bow,`card.bow`),n(e.pose&&{x:e.pose.x,y:e.pose.y},`motion.pose`),n(e.lens,`dof.lens`),n(e.pointer,`motion.pointer`),n(e.tiltRange,`motion.tiltRange`),n(e.wobble,`motion.wobble`),n(e.wobbleAmp,`motion.wobbleAmp`),t}function la(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e[n],t=Math.imul(t,16777619);return(t>>>0).toString(16)}var ua=e=>typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement,da=e=>typeof e==`string`&&e.trim()!==``||!!e&&typeof e==`object`,fa=e=>typeof e==`number`||typeof e==`boolean`||typeof e==`string`||!!e&&typeof e==`object`&&typeof e.x==`number`&&typeof e.y==`number`;function pa(e,t){let n={},r={...e.settings};if(Ai(t)){r={};let i=t.material;i!==void 0&&(ln(i)?e.material=i:U(`HoloEffect: the Copy settings' material "${i}" is not supported (one of ${cn.join(`, `)}); keeping "${e.material}".`));let a=t.entity;a!==void 0&&!oa.has(String(a))&&U(`HoloEffect: a holo.spot Copy settings of the "${String(a)}" object is drawn as a flat card (HoloEffect draws holo.spot's card, 3D object look and paper card, not its cloth, stickers or flag).`);for(let[e,r]of Object.entries(t.values))(e===`emboss.logo`||e===`emboss.print`)&&typeof r==`string`&&/^(\/logos\/|asset:)/.test(r.trim())?U(`HoloEffect: ${e} "${r}" of a holo.spot Copy settings is holo.spot's own image, which HoloEffect does not include; ignored. Set ${e} to an image or a URL.`):sa.has(e)?U(`HoloEffect: ${e} of a holo.spot Copy settings is in mm on holo.spot's card; ignored (HoloEffect's is in CSS px).`):fa(r)&&(n[e]=r);let o=t.pose;o&&typeof o.rx==`number`&&typeof o.ry==`number`&&(n[`motion.pose`]={x:o.ry,y:o.rx});let s=t.values[`object.structureScale`];typeof s==`number`&&(e.structureScale=s)}else{let{settings:r,...i}=t;Ai(r)?U("HoloEffect: a holo.spot Copy settings blob goes in `holo` itself (`holo: blob`, or an element of the list), not in `settings`; ignored."):r&&Object.assign(n,r),Object.assign(n,ca(i));for(let[t,n]of Object.entries(i))ra.has(t)?n!==void 0&&(e[t]=n):ia.has(t)||U(`HoloEffect: unknown key "${t}" in holo; ignored.${t in na?` ${t} is a param of its own: { holo, ${t} }.`:``}`)}let i=n[`studio.preset`];typeof i==`string`&&_t[i]&&Object.assign(r,_t[i]);for(let[e,t]of Object.entries(mt)){let i=n[e];typeof i==`string`&&t[i]&&Object.assign(r,t[i])}for(let[e,t]of Object.entries(n))t===null?delete r[e]:t!==void 0&&(r[e]=t);e.settings=Object.freeze(r)}function ma(e,t,n){let r={};for(let[,t]of e)Object.assign(r,t.values);let i=e[0][1].pose;return r[`motion.pose`]={x:i.ry,y:i.rx},Object.freeze({...n?{material:n}:{},quality:t,settings:Object.freeze(r)})}var ha=e=>Object.entries(pt[e]).filter(([e])=>e!==`emboss`),ga=25.4/96,_a=new Set(cn),va=.7;function ya(e){return!(e>0)||e===62?22:2*Math.atan(12/e)*180/Math.PI}function ba(e,t){let n=(1/va-1)/2;return[Math.ceil(e*n),Math.ceil(t*n)]}var xa={alpha:0,luminance:1,none:2},Sa=new Float32Array(128),Ca={neutral:0,agx:1,clamp:2};function wa(e,t,n){if(!e.on||!(e.amount>0))return{uGrain:0,uGrainCell:1,uGrainSeed:0,uGrainRgb:0,uGrainBg:0};let r=e.animated?(n*120%512+512)%512:0;return{uGrain:e.amount,uGrainCell:Math.max(e.sizePx*(t>0?t:1),1),uGrainSeed:Number.isFinite(r)?r:0,uGrainRgb:+(e.colour===`rgb`),uGrainBg:+!!e.onBackground}}function Ta(e,t=new Float32Array(9)){return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],t}var Ea=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
${Yt}
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 2, y), 0).rgb),
        1.0);
}
`,Da=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${Yt}
${en}`,Oa=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,ka=`${At}
${xt}
${Wt.slice(0,Wt.indexOf(`void main()`)).replace(`varying vec2 vUv;
`,``)}
in vec2 uv;
in vec2 uvContent;
in vec2 uvSrc;
uniform sampler2D src;
uniform sampler2D uBase;   // 3d view: the element mapped onto the card
uniform int uMask;
uniform int uPersp;
void main() {
  // flat view: the card target covers the element; 3d view: the whole (grown) output
  vec2 hu = uPersp == 1 ? uv : uvContent;
  vec4 s = uPersp == 1 ? (uMask == 1 ? texture(uBase, uv) : vec4(0.0)) : texture(src, uvSrc);
  if (uPersp == 0 && (uvContent.x < 0.0 || uvContent.x > 1.0 || uvContent.y < 0.0 || uvContent.y > 1.0)) {
    gl_FragColor = s;
    return;
  }
  vec4 P = textureLod(tHdr, clamp(hu, 0.0, 1.0), 0.0);
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 G = uGW0 * textureLod(tG0, hu * uG0Scale, 0.0).rgb;   // premultiplied linear glare
  vec3 card  = toDisplay(((1.0 - uGlare) * c + uGlare * G) * uExposure);
  vec3 spill = toDisplay(uGlare * G * uExposure);
  // The foil's coverage (the mask, applied by the material pass) is the card target's alpha, then the foil goes over
  // what is left of the element (luma mask) with the glare spill on it. holospot screens the spill onto the page: in
  // premultiplied output that is the spill with alpha = its largest channel (exact on black, invisible on white).
  float cov = a;
  vec4 base = uMask == 1 ? s : vec4(0.0);
  vec3 se = srgbOETF(spill);
  vec4 spillP = vec4(se, max3(se));
  base = spillP + (1.0 - spillP.a) * base;
  vec3 enc = srgbOETF(card);
  // A4.1 film grain in display space, after the tone curve and before the dither (output.frag).
  if (uGrain > 0.0) {
    vec2 fc = gl_FragCoord.xy;
    vec3 n = uGrainRgb == 1
      ? vec3(grainNoise(fc, uGrainSeed), grainNoise(fc, uGrainSeed + 171.0), grainNoise(fc, uGrainSeed + 342.0))
      : vec3(grainNoise(fc, uGrainSeed));
    enc += uGrain * n;
    if (uGrainBg == 1) base.rgb = clamp(base.rgb + uGrain * n * base.a, 0.0, 1.0);
  }
  if (cov > 0.0 || max3(spill) > 1e-4) enc += triangularDither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(clamp(enc, 0.0, 1.0), 1.0) * cov + base * (1.0 - cov);
}
`,Aa=class{params;#e={...ta};#t=Symbol(`unseen`);#n=null;#r=null;#i=null;#a=!0;#o=null;#s=-1;#c=null;#l=null;#u=null;#d=null;#f=null;#p=null;#m=new Float32Array(16);#h=null;#g=null;#_=null;#v=null;#y=null;#b=!1;#x=new Ut;#S=null;#C=null;#w=[1.28,1.28,1/800,1];#T=-1;#E=null;#D=-1;#O=null;#k=si();#A=null;#j=!1;#M=new Ci;#N=mi();#P=new Float32Array(12);#F=new Float32Array(9);#I=new Float32Array(9);#L=[0,0,.4];#R=[63,88];#z=[238,333];#B=[63,88];#V=new Float32Array([1,0,0,0,1,0,0,0,1]);#H=null;#U=null;#W={};#G=new Float32Array(8);#K=new Float32Array(72);#q=``;#J=null;#Y=!1;#X=!1;constructor(e={}){this.params={...na,...e},this.#Z()}setParams(e){Object.assign(this.params,e),this.#Z()}get material(){return this.#Z(),this.#e.material}#Z(){let e=this.params.holo;e!==this.#t&&(this.#t=e,this.#e=aa(e),this.#a=!0,this.#he=null,this.#Te++),this.params.sourceChannel!==this.#n&&(this.#n=this.params.sourceChannel,this.#a=!0)}get ready(){return this.#Z(),this.#ee()?Promise.resolve():new Promise(e=>this.#Q.push(e))}get errors(){return[...this.#pe?[this.#pe]:[],...this.#S?.errors??[],...this.#Le?[this.#Le]:[]]}#Q=[];#$=!1;#ee(){return this.#$&&!this.#a&&(this.#fe?.id===this.#e.material||this.#he===this.#e.material)&&(this.#e.material!==`emboss`||!this.#S?.busy&&!this.#Ie&&!this.#De)}#te(){if(this.#Q.length>0&&this.#ee()){let e=this.#Q;this.#Q=[];for(let t of e)t()}}static looks=Object.freeze({card:ma(ha(`card`),`medium`),object:ma(ha(`object`),`low`),image:ma([[`emboss`,pt.card.emboss]],`medium`,`emboss`)});static startingPoints=Object.freeze(Object.fromEntries(Object.entries(gt).map(([e,t])=>[e,Object.freeze(Object.fromEntries(Object.entries(t).map(([t,n])=>[t,Object.freeze({material:e,settings:Object.freeze({...n})})])))])));static settingSpecs(e){let t=t=>t.startsWith(`${e}.`),n=e=>!_a.has(e.split(`.`)[0]),r=ht.filter(e=>t(e.id)||n(e.id));return[...r.filter(e=>t(e.id)),...r.filter(e=>!t(e.id))]}resolvedSettings(){this.#Z();let e=Ri(this.#e.material,`plain`,this.#e.settings);return{...e.values,"motion.pose":{x:e.pose.ry,y:e.pose.rx}}}#ne=null;#re(){let e=this.#e.quality;return ea[e===`auto`?this.#ne??`medium`:e]??ea.medium}#ie=null;static preload(...e){return Promise.all(e.map(pn)).then(()=>{})}#ae=0;async init(e){let t=++this.#ae;this.#Z(),await this.#ge(this.#e.material),t===this.#ae&&(this.#ie=e.onContextRestored(()=>{this.#ne=$i(e.gl),this.#s=-1,this.#b=!1,this.#j=!1,this.#O=null,this.#T=this.#D=-1,this.#we=``,this.#Oe=!1,this.#ke++}),this.#oe(e))}#oe(e){this.#ne=$i(e.gl),this.#a=!0,this.#o=new Xi;let t=this.#ue(q.imageWidth,q.imageHeight);this.#c=t,this.#l=e.wrapTexture(t,{autoUpdate:!1,filter:`nearest`});let n={size:[q.width,q.height],float:!0,filter:`linear`};this.#u=e.createRenderTarget(n),this.#d=e.createRenderTarget(n),this.#ce(e),this.#h=e.createRenderTarget({size:[1,1],float:!0});let r=this.#ue(Zt.width,Zt.height);this.#de(r)?.putImageData(new ImageData($t(),Zt.width,Zt.height),0,0),this.#_=e.wrapTexture(r,{autoUpdate:!1,filter:`nearest`});let i={size:[64,64],float:!0,filter:`linear`};this.#v=e.createRenderTarget(i),this.#y=e.createRenderTarget(i),this.#g=e.createRenderTarget({size:[128,896],float:!0,filter:`linear`})}#se=1;#ce(e){let t=this.params.antialias?4:1;this.#f&&this.#se===t||(this.#f?.dispose(),this.#p?.dispose(),this.#p=null,this.#f=e.createRenderTarget({float:!0,filter:`nearest`,samples:t}),this.#se=t)}#le(e){return this.#p??=e.createRenderTarget({samples:this.#se}),this.#p}outputRect(e){if(this.params.flat)return;let[t,n]=e.elementPixel,[r,i]=ba(t,n);return[-r,-i,t+2*r,n+2*i]}#ue(e,t){let n=typeof document<`u`?document.createElement(`canvas`):new OffscreenCanvas(e,t);return n.width=e,n.height=t,n}#de(e){return e.getContext(`2d`)}#fe=null;#pe=null;#me=null;#he=null;#ge(e){if(this.#me?.m===e)return this.#me.p;let t=pn(e).then(()=>{this.#pe=null,this.#he=null},t=>{this.#he=e,this.#pe=`HoloEffect: could not load the "${e}" material: ${t instanceof Error?t.message:String(t)}`,console.warn(this.#pe)}).finally(()=>{this.#me?.p===t&&(this.#me=null),this.#a=!0});return this.#me={m:e,p:t},t}#_e(){let e=this.#e,t=fn(e.material);if(!t&&(this.#he!==e.material&&this.#ge(e.material),t=this.#fe??void 0,!t))return;this.#fe=t,this.#r=Ri(t.id,`plain`,e.settings),this.#i=Wi(this.#r.values),this.#W=t.uniforms(this.#r.values),this.#o?.setTint(t.gratingSummary(this.#r.values).tint);let n=this.#re(),r=this.#i.card;this.#A=ai(t.relief(this.#r.values),{emboss:r.emboss,pitchMm:r.embossPitchMm,heightUm:r.embossHeightUm,layer:r.embossLayer},n.waves),this.#q=Lt({...n.defines,...t.defines(n),[`MATERIAL_${t.id.toUpperCase()}`]:1,...this.#Se()?{HOLO_CLEAR_PAPER:1}:{},NSPD:5,MAX_LIGHTS:4,DEBUG_VIEW:0},t.extraChunks,t.fragmentMain),this.#a=!1}#ve(e,t,n){let r=1/n,i=.1*t,a=10*t,o=(a+i)/(i-a),s=2*a*i/(i-a),c=this.#m;c.fill(0),c[0]=r/e,c[5]=r,c[10]=o,c[11]=-1,c[14]=o*-t+s,c[15]=t}update(e){this.#Z(),(this.#a||!this.#r)&&this.#_e();let t=this.#r,n=this.#i;if(!t||!n)return;let[r,i]=e.dims.element,a=Math.max(e.dims.elementPixel[0],1),o=Math.max(e.dims.elementPixel[1],1),s=Math.max(r,1),c=Math.max(i,1),l=this.params.sizeMm,u=(l!==null&&Number.isFinite(l)&&l>0?l:Math.max(s,c)*ga)/Math.max(s,c);this.#R=[s*u,c*u],this.#z=[s,c];let d=Math.min(Math.max(this.#e.structureScale||1,.25),4);this.#B=[s*u*d,c*u*d];let f=ya(n.lensMm),p=Math.tan(f*Math.PI/360),m=!this.params.flat,h=wn(s/c,this.#R[0]/2e3,this.#R[1]/2e3,f);if(m){let[e,t]=ba(a,o),n=o+2*t;h=this.#R[1]/2e3/p*(n/Math.max(o,1)),this.#ve((a+2*e)/Math.max(n,1),h,p)}this.#L=[0,0,h],this.#J?(e.mouseViewport[0]!==this.#J[0]||e.mouseViewport[1]!==this.#J[1])&&(this.#Y=!0):this.#J=e.mouseViewport;let g=e.mouse[0]/Math.max(a,1)*2-1,_=e.mouse[1]/Math.max(o,1)*2-1,v=this.#Y&&Math.abs(g)<=1&&Math.abs(_)<=1,y=n.motion,b=Math.min(Math.max(e.deltaTime,0),.1),x={rx:t.pose.rx,ry:t.pose.ry};if(y.pointer===`tilt`&&v)x={rx:t.pose.rx-_*y.tiltRangeDeg,ry:t.pose.ry+g*y.tiltRangeDeg};else if(y.wobble){let n=Ti(e.time,y.wobbleAmpDeg);x={rx:t.pose.rx+n.rx,ry:t.pose.ry+n.ry}}this.#M.step(x,b);let S=Tn(this.#M.rx,this.#M.ry,0),C=m?S:[1,0,0,0,1,0,0,0,1],w=m?{x:0,y:0,z:0,w:1}:wi(this.#M.rx,this.#M.ry);this.#H=m?null:S,this.#X&&(this.#I.set(this.#F),this.#P.set(this.#N.pos)),Ta(C,this.#F),Ta(C,this.#V);let T=v?{x:g,y:_}:{x:0,y:0};Si(n.studio,{mode:y.pointer===`none`?`tilt`:y.pointer,pad:T},n.background,w,this.#L,this.#N);for(let e=0;e<4;e++)this.#N.type[e]!==0&&this.#o?.ensureLayer(H[this.#N.spd[e]]??`equal`);this.#X||=(this.#I.set(this.#F),this.#P.set(this.#N.pos),!0);let E=this.#fe?.emboss;if(E){this.#S??=E.createAssets();let e=t.values[`emboss.logo`];e!==`element`&&(this.#Ae=``,(this.#De||this.#Oe)&&(this.#De=!1,this.#Oe=!1,this.#ke++,this.#we=``,this.#Ee=0),this.#S.setLogo(e,this.#be(`ink`))),this.#S.setPaper(E.paperKey(t.values))}this.#U=Xr(this.#fe.gratingSummary(t.values),this.#N,C,this.#L)}render(e){let t=this.#o,n=this.#i;if(!t||!n||!this.#f||!this.#u||!this.#d||!this.#h||!this.#l||!this.#U){e.blit(e.src,e.target);return}if(this.#ce(e),this.#j||=(e.draw({frag:Oa,vert:k,target:this.#h}),!0),!this.#b&&this.#_&&this.#v&&this.#y){for(let[t,n]of[[this.#v,0],[this.#y,64]])e.draw({frag:Da,vert:k,target:t,uniforms:{uBytes:this.#_,uRowOffset:n}});this.#b=!0}this.#s!==t.version&&this.#Ue(e,t);let r=Ki(n.background,n.bgColor),i=Dn(n.studio.ambient,r);this.#g&&!li(this.#O,i)&&(e.draw({frag:ui,vert:k,target:this.#g,uniforms:{uRims:i.rims,uFill:i.fill,uScrim:i.scrim,uCameraSide:i.cameraSide,uCameraTexture:i.cameraTexture,uBehind:i.behind,uBlobs:this.#k.blobs,uBlobNorm:this.#k.norm}}),this.#O=i);let a=this.#A,o=this.#re(),s=o.trips,c=this.#N,l=t.bins[o.defines.NB===6?6:8],u=this.#G.fill(0);u.set(l.lambda);let d=this.#K.fill(0);d.set(l.W);let f=this.#fe?.emboss?this.#Be(e):{},p=!this.params.flat,m={uCardRot:this.#F,uPrevCardRot:this.#I,uCardSizeMm:this.#B,uCardWorldMm:this.#R,uVisRot:this.#V,uViewProj:this.#m,uPersp:+!!p},h=this.#fe?.id===`emboss`?xa.none:xa[this.params.sourceChannel]??0;if(p&&(e.clear(this.#f),h===1)){let t=this.#le(e);e.clear(t),e.draw({frag:zt,vert:Rt,target:t,uniforms:{...m,src:e.src}})}e.draw({frag:this.#q,vert:Rt,target:this.#f,uniforms:{...this.#W,...f,...m,cameraPosition:[...this.#L],uWrapMm:[0,0],uBowMm:n.card.bowMm,uBowAxis:+(n.card.bowAxis===`along`),uLightType:c.type,uLightOrder:c.order,uLightPos:c.pos,uPrevLightPos:this.#P,uLightU:c.u,uLightW:c.w,uLightRadius:c.radius,uLightRad:c.rad,uLightSpd:c.spd,uLightRGB:c.rgb,uEtaOrd:this.#U.ord,uEtaMir:this.#U.mir,uEtaEnv:this.#U.env,uKeyLight:c.key,uMaxOrder:s.maxOrder,uGhB:s.ghB,uVorR:s.vorR,uFlakeR:s.flakeR,uBCells:s.bCells,uBBins:s.bBins,uBLevels:s.bLevels,uEnv:this.#g??this.#h,uEnvMaxLod:6,uEnvIntensity:1,uEnvRot:ci(n.studio.ambient.rotationDeg,this.#H??void 0),uEnvUniform:0,uCmfConv:this.#u,uCmfCum:this.#d,uSpecProj:t.specProj,uBinLam:u,uBinW:d,uBinWidth:l.width,uLtc1:this.#v??this.#h,uLtc2:this.#y??this.#h,uWave:a?.data??Sa,uWaveBoard:a?.board??[0,0],uWaveCoat:a?.coat??[0,0],uBumpMode:0,uBumpMom:this.#h,uBumpCross:this.#h,uBumpScale:[1,1],uBumpK:[0,0],uWear:n.card.wear,uDebugLight:1,uPrintSrc:e.src,uMask:h,uInk:Math.min(Math.max(this.params.ink,0),1)}});let g=this.#f.width,_=this.#f.height,v=o.glareStartDiv,y=0,b=n.display.glare;b>0&&(this.#x.ensure(e,g,_,o.glareLevels,v),y=this.#x.render(e,this.#f,g,_,v,n.display.glareRadiusPx,e.pixelRatio));let x=b>0?this.#x.level0:null;e.draw({frag:ka,target:e.target,uniforms:{tHdr:this.#f,src:e.src,uExposure:qi(n.display.ev,r),uTone:Ca[n.display.tone],uP3:0,uMask:h,uPersp:+!!p,uBase:p&&h===1&&this.#p||this.#h,tG0:x??this.#h,uGW0:y,uGlare:x?b:0,uG0Scale:x?this.#x.outputScale(g,_,v):[1,1],...wa(n.grain,e.pixelRatio,e.time)}}),this.#$=!0,this.#te()}#ye(){let e=this.#r?.values??{},t=t=>{let n=e[t];return typeof n==`number`&&Number.isFinite(n)?n:null},[n,r]=this.#z,i=this.#B[0]/Math.max(n,1),a=t(`emboss.x`)??n/2,o=t(`emboss.y`)??r/2,s=t(`emboss.width`)??(e[`emboss.logo`]===`element`?n:n*36/63),c=(t(`emboss.rotation`)??0)*Math.PI/180;return{uLogoXf:[(a-n/2)*i,(r/2-o)*i,Math.cos(c),Math.sin(c)],uLogoW:Math.max(s,1)*i}}#be(e){let t=this.#r?.values[`emboss.threshold`];return{frame:e,read:this.params.sourceChannel===`luminance`?`luma`:`auto`,threshold:typeof t==`number`?t:.5}}#xe(){let e=this.#be(`full`);return`${e.read}|${e.threshold}`}#Se(){let e=this.#r?.values;return this.#fe?.id===`emboss`&&e?.[`emboss.logo`]===`element`&&!da(e[`emboss.print`])&&this.#e.settings[`emboss.paperColour`]===void 0}#Ce=null;#we=``;#Te=0;#Ee=0;#De=!1;#Oe=!1;#ke=0;#Ae=``;#je(e){let[n,r]=e.dims.elementPixel,i=Math.min(1,1024/Math.max(n,r,1)),a=Math.max(1,Math.round(n*i)),o=Math.max(1,Math.round(r*i)),s=`${a}x${o}|${this.#Te}|${this.#xe()}`;if(s===this.#we||this.#Oe)return;this.#De=!0,this.#Ce&&this.#Ce.width===a&&this.#Ce.height===o||(this.#Ce?.dispose(),this.#Ce=e.createRenderTarget({size:[a,o]})),t(e,this.#Ce),this.#Oe=!0;let c=this.#ke;e.readPixels(this.#Ce,{flipY:!0}).then(e=>{c===this.#ke&&(this.#Oe=!1,this.#Me(e,a,o,s))},()=>{c===this.#ke&&(this.#Oe=!1)})}#Me(e,t,n,r){let i=new Uint8ClampedArray(t*n*4),a=!1;for(let r=0;r<t*n*4;r+=4){let t=e[r+3],n=t>0?255/t:0;i[r]=e[r]*n,i[r+1]=e[r+1]*n,i[r+2]=e[r+2]*n,i[r+3]=t,a||=t>8}if(!a&&++this.#Ee<120)return;this.#we=r,this.#Ee=0,this.#De=!1;let o=`${t}x${n}|${this.#xe()}|${la(i)}`,s=this.#S;if(!s||o===this.#Ae)return;this.#Ae=o;let c=this.#ue(t,n);this.#de(c)?.putImageData(new ImageData(i,t,n),0,0),s.setLogo(a?c:``,this.#be(`full`))}#Ne=``;#Pe=null;#Fe=null;#Ie=!1;#Le=null;#Re=0;#ze(e){let t=this.#r?.values[`emboss.print`]??``;if(t!==this.#Ne){this.#Ne=t;let e=++this.#Re;this.#Fe?.dispose(),this.#Fe=null,this.#Pe=null,this.#Le=null,this.#Ie=!1;let n=null;if(typeof t==`string`&&t.trim()!==``?(n=new Image,n.crossOrigin=`anonymous`,n.src=t.trim()):ua(t)&&!(t.complete&&t.naturalWidth>0)?n=t:da(t)&&(this.#Pe=t),n){let r=n,i=typeof t==`string`?` ${t}`:``;this.#Ie=!0,r.decode().then(()=>{e===this.#Re&&(this.#Pe=r,this.#Ie=!1)},t=>{e===this.#Re&&(this.#Le=`HoloEffect: could not load emboss.print${i}: ${(t instanceof Error?t.message:String(t)).replace(/\.$/,``)}. A cross-origin image needs CORS.`,console.warn(this.#Le),this.#Ie=!1)})}}let n=this.#Pe;n&&!this.#Fe&&(this.#Fe=e.wrapTexture(n,{autoUpdate:!1}));let r=this.#r?.values??{},i=typeof r[`emboss.printInk`]==`number`?r[`emboss.printInk`]:1,a=[(da(t)?this.#Fe:r[`emboss.logo`]!==`element`)?1:0,Math.min(Math.max(i,0),1),0,0];if(!n||!this.#Fe)return{uPrintK:a,uPrintOwn:0,uPrintImg:this.#h??e.src,uPrintRect:[0,0,1,1]};let o=ua(n)?n.naturalWidth:n.width,s=ua(n)?n.naturalHeight:n.height,c=this.#z[0]/Math.max(this.#z[1],1),l=o/Math.max(s,1),u=l>c?c/l:1,d=l>c?1:l/c;return{uPrintK:a,uPrintOwn:1,uPrintImg:this.#Fe,uPrintRect:[(1-u)/2,(1-d)/2,u,d]}}#Be(e){let t=this.#S,n=this.#h;if(!t||!n)return{};this.#r?.values[`emboss.logo`]===`element`&&this.#je(e);let r=this.#ze(e);if(t.logoVersion!==this.#T){this.#T=t.logoVersion;let n=t.logo;if(n){let{w:t,h:r}=n.image;this.#C&&this.#C.width===t&&this.#C.height===r||(this.#C?.dispose(),this.#C=e.createRenderTarget({size:[t,r],float:!0,filter:`linear`,mipmap:!0,wrap:`clamp`})),this.#Ve(e,n.image,this.#C),this.#w=n.map}else this.#C?.dispose(),this.#C=null}if(t.paperVersion!==this.#D&&t.paper){this.#D=t.paperVersion;let n=t.paper.mom.w,r={size:[n,n],float:!0,filter:`linear`,mipmap:!0,wrap:`repeat`};this.#E??={mom:e.createRenderTarget(r),aux:e.createRenderTarget(r)},this.#Ve(e,t.paper.mom,this.#E.mom),this.#Ve(e,t.paper.aux,this.#E.aux)}return{...r,...this.#ye(),uLogoTex:this.#C??n,uLogoOn:+!!this.#C,uLogoMap:this.#w,uPaperMom:this.#E?.mom??n,uPaperAux:this.#E?.aux??n,uPaperOn:+!!this.#E}}#Ve(e,t,n){let r=this.#ue(4*t.w,t.h);this.#de(r)?.putImageData(new ImageData(t.bytes,4*t.w,t.h),0,0);let i=e.wrapTexture(r,{autoUpdate:!1,filter:`nearest`});e.draw({frag:Da,vert:k,target:n,uniforms:{uBytes:i,uRowOffset:0}}),i.dispose()}dispose(){this.#ae++,this.#ie?.(),this.#ie=null,this.#He(),this.#$=!1;let e=this.#Q;this.#Q=[];for(let t of e)t()}#He(){for(let e of[this.#u,this.#d,this.#f,this.#p,this.#h,this.#g,this.#v,this.#y,this.#Ce])e?.dispose();this.#l?.dispose(),this.#_?.dispose(),this.#x.dispose(),this.#S?.dispose(),this.#S=null,this.#C?.dispose(),this.#C=null,this.#E?.mom.dispose(),this.#E?.aux.dispose(),this.#E=null,this.#T=this.#D=-1,this.#u=this.#d=this.#f=this.#h=this.#g=null,this.#p=null,this.#v=this.#y=null,this.#l=this.#_=null,this.#s=-1,this.#b=!1,this.#j=!1,this.#O=null,this.#Ce=null,this.#we=``,this.#Ae=``,this.#Ee=0,this.#De=!1,this.#Oe=!1,this.#ke++,this.#Fe?.dispose(),this.#Fe=null,this.#Pe=null,this.#Ne=``,this.#Re++,this.#Ie=!1}#Ue(e,t){let n=this.#c,r=n?this.#de(n):null;r&&this.#l&&this.#u&&this.#d&&(r.putImageData(new ImageData(t.bytes,q.imageWidth,q.imageHeight),0,0),this.#l.update(),e.draw({frag:Ea,vert:k,target:this.#u,uniforms:{uBytes:this.#l,uRowOffset:0}}),e.draw({frag:Ea,vert:k,target:this.#d,uniforms:{uBytes:this.#l,uRowOffset:q.height}}),this.#s=t.version)}},ja=`#version 300 es
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
`,Ma={shift:.5},Na=class{params;constructor(e={}){this.params={...Ma,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:ja,uniforms:{src:e.src,shift:this.params.shift},target:e.target})}},Pa=.7,Fa=1.3,Ia=`
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
`,La=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),Ra=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,za=`#version 300 es
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
`,Ba=`#version 300 es
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
`;function Va(e){let t=Ha(e);return 2**Math.ceil(Math.log2(Math.sqrt(t)))}function Ha(e){return Number.isFinite(e)?Math.max(1,Math.floor(e)):1}function Ua(e){let t=e|0;return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}var Wa=.1;function Ga(e){return Math.min(Wa,Math.max(0,e))}var J=64,Y=4096,Ka=.1,qa=[J,J],Ja=new Float32Array(Y);for(let e=0;e<Y;e++)Ja[e]=e;var Ya=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`,Xa=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`,Za=`#version 300 es
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
`,Qa=`#version 300 es
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
`,$a=`#version 300 es
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
${Ia}

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
`,eo=`#version 300 es
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
`,to=`#version 300 es
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
`,no=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${Ra}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    // Un-premultiply; the particle shader multiplies by alpha.
    vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
    outColor = vec4(mix(rgb, color, colorMix), lifeJitter);
}
`,ro=`#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
}
`,io={count:1048576,birthRate:3e4,screenBirthRate:1e4,life:1,noiseSpeed:.3,emitSpeed:1,noiseDelay:.15,noiseScale:1,noiseAnimation:.3,pointSize:10,alpha:1,radius:300,speedDecay:1,alphaDecay:5,fadeIn:.05,alphaThreshold:.05,spawnOnIdle:!0,srcOpacity:0,trailFade:.75,fog:.5,color:16777215,colorMix:0,blend:`add`},ao=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o=!1;#s;#c;#l=new Float32Array(Y*4);#u=null;#d=null;#f=null;#p=null;#m=null;#h=null;#g=0;#_=0;#v=0;#y=null;#b=-1/0;constructor(e={}){this.#e={...io,...e},this.#e.count=Ha(this.#e.count),this.#s=Va(this.#e.count),this.#c=this.#s*this.#s}get maxCount(){return this.#c}setParam(e){let t=this.#e;for(let[n,r]of Object.entries(e))r!==void 0&&(t[n]=n===`count`?Ha(r):r)}init(e){this.#x(e),this.#i=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#a=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#p={attributes:{position:La}},this.#f={mode:`points`,attributes:{position:{data:Ja,itemSize:1}}},this.#m=e.gl,this.#w(e),this.#h=e.onContextRestored(()=>{this.#m=e.gl,this.#w(e),this.#o=!1})}#x(e){let t={size:[this.#s,this.#s],float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t),this.#r=e.createRenderTarget(t)}#S(){this.#t?.dispose(),this.#n?.dispose(),this.#r?.dispose(),this.#t=null,this.#n=null,this.#r=null}#C(e){let t=e.gl,n=t.createTexture();if(!n)throw Error(`[ParticleEffect] Failed to create spawn texture`);return t.bindTexture(t.TEXTURE_2D,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,J,J,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null),{raw:n,handle:e.wrapTexture(n,{size:[J,J],filter:`nearest`,wrap:`clamp`})}}#w(e){let t=this.#C(e);this.#u=t.raw,this.#d=t.handle}#T(e){if(!this.#u)return;let t=e.gl;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.bindTexture(t.TEXTURE_2D,this.#u),t.texSubImage2D(t.TEXTURE_2D,0,0,0,J,J,t.RGBA,t.FLOAT,this.#l),t.bindTexture(t.TEXTURE_2D,null)}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#p||!this.#f||!this.#d||!this.#u)return;let t=Va(this.params.count);t!==this.#s&&(this.#S(),this.#s=t,this.#c=t*t,this.#x(e),this.#g=0,this.#o=!1),this.#o||=(e.draw({frag:Ya,target:this.#t}),e.draw({frag:Xa,target:this.#n}),e.draw({frag:Xa,target:this.#r}),!0);let n=Ga(e.deltaTime),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]],i=[this.#s,this.#s],a=this.#E(e,n,r);a>0&&this.#T(e);let o=a===0;if(e.draw({frag:$a,uniforms:{posTex:this.#t,colorTex:this.#n,velTex:this.#r,elementPixel:r,time:e.time,dt:n,noiseSpeed:this.params.noiseSpeed,emitSpeed:this.params.emitSpeed,noiseDelay:this.params.noiseDelay,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,life:this.params.life},target:this.#t,swap:o}),a>0){let t={uSpawnTex:this.#d,uSpawnTexSize:qa,uSpawnCount:a,stateSize:i};e.draw({vert:eo,frag:to,geometry:this.#f,uniforms:{...t,src:e.src,alphaThreshold:this.params.alphaThreshold},target:this.#t,blend:`none`}),e.draw({vert:eo,frag:no,geometry:this.#f,uniforms:{...t,src:e.src,color:Ua(this.params.color),colorMix:this.params.colorMix,lifeJitterRange:[Pa,Fa]},target:this.#n,blend:`none`}),e.draw({vert:eo,frag:ro,geometry:this.#f,uniforms:t,target:this.#r,blend:`none`})}let s=this.#D();this.#p.instanceCount=s,e.clear(this.#i),e.draw({vert:Za,frag:za,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:i,pointSize:this.params.pointSize,elementPixel:r,particleCount:s,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fadeIn:this.params.fadeIn,fog:this.params.fog},geometry:this.#p,target:this.#i,blend:this.params.blend===`normal`?`premultiplied`:`additive`}),e.draw({frag:Ba,uniforms:{trailPrev:this.#a,particleStamp:this.#i,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#a}),e.draw({frag:Qa,uniforms:{src:e.src,trail:this.#a,srcOpacity:this.params.srcOpacity},target:e.target})}#E(e,t,n){let r=[e.mouse[0]/Math.max(1,n[0]),e.mouse[1]/Math.max(1,n[1])];(!this.#y||Math.abs(r[0]-this.#y[0])>1e-6||Math.abs(r[1]-this.#y[1])>1e-6)&&(this.#b=e.time),this.#y=r;let i=e.intersection>0,a=e.time-this.#b<Ka;this.#_=i&&(a||this.params.spawnOnIdle)?Math.min(this.#_+this.params.birthRate*t,Y):0,this.#v=i?Math.min(this.#v+this.params.screenBirthRate*t,Y):0;let o=Math.min(Y,Math.floor(this.#_)),s=Math.min(Y-o,Math.floor(this.#v));this.#_-=o,this.#v-=s;let c=o+s;if(c===0)return 0;let l=this.#D(),u=Math.max(1,n[0]),d=Math.max(1,n[1]),f=this.#l,p=0;for(;p<o;p++){let e=Math.sqrt(Math.random())*this.params.radius,t=Math.random()*Math.PI*2,n=Math.cos(t)*e,i=Math.sin(t)*e,a=p*4;f[a+0]=this.#g,f[a+1]=r[0]+n/u,f[a+2]=r[1]+i/d,f[a+3]=t,this.#g=(this.#g+1)%l}for(let e=0;e<s;e++,p++){let e=p*4;f[e+0]=this.#g,f[e+1]=Math.random(),f[e+2]=Math.random(),f[e+3]=-1,this.#g=(this.#g+1)%l}return c}#D(){return Math.max(1,Math.min(this.#c,Math.floor(this.params.count)))}dispose(){this.#h?.(),this.#h=null,this.#m&&this.#u&&this.#m.deleteTexture(this.#u),this.#u=null,this.#d=null,this.#f=null,this.#m=null,this.#S(),this.#i?.dispose(),this.#a?.dispose(),this.#i=null,this.#a=null,this.#p=null,this.#o=!1}outputRect(e){return e.canvasRect}},oo=`#version 300 es
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
${Ra}
${Ia}

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
        ${Pa.toFixed(4)},
        ${Fa.toFixed(4)},
        hash21(uv * 91.7 + 1.234)
    );
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`,so=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform vec3 color;
uniform float colorMix;
${Ra}

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
`,co=`#version 300 es
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
`,lo=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`,uo={count:1e5,duration:1,noiseSpeed:1.5,noiseScale:1,noiseAnimation:1,outwardBias:1,pointSize:3,alpha:1,alphaDecay:5,speedDecay:2,fog:0,trailFade:.5,color:16777215,colorMix:0,blend:`add`},fo=class{#e;get params(){return this.#e}#t=null;#n=null;#r=null;#i=null;#a=null;#o;#s=!1;#c=!1;#l=-1;#u=0;#d=0;constructor(e={}){this.#e={...uo,...e},this.#e.count=Ha(this.#e.count);let t=Va(this.#e.count);this.#o=[t,t]}trigger(){this.#s=!0,this.#c=!0,this.#l=-1,this.#u=0,this.#d=0}reset(){this.#s=!1,this.#c=!1,this.#l=-1,this.#u=0,this.#d=0}isDone(){return!this.#s||this.#u<this.params.duration?!1:this.#d>=this.#f()}#f(){let e=this.params.trailFade;return e<=0?1:e>=.999?600:Math.ceil(-Math.log(255)/Math.log(e))}init(e){this.#p(e),this.#r=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#i=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`}),this.#a={attributes:{position:La}}}#p(e){let t={size:this.#o,float:!0,wrap:`clamp`,filter:`nearest`};this.#t=e.createRenderTarget({...t,persistent:!0}),this.#n=e.createRenderTarget(t)}#m(){this.#t?.dispose(),this.#n?.dispose(),this.#t=null,this.#n=null}render(e){if(!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||e.intersection<=0)return;let t=Va(this.params.count),n=!this.#s||this.isDone();if(t!==this.#o[0]&&n&&(this.#m(),this.#o=[t,t],this.#p(e)),!this.#s){e.blit(e.src,e.target);return}this.#l<0&&(this.#l=e.time);let r=e.time-this.#l;this.#u=r;let i=r>=this.params.duration;if(i&&this.#d>=this.#f()){e.clear(e.target);return}let a=Ga(e.deltaTime),o=[e.dims.elementPixel[0],e.dims.elementPixel[1]];if(i)e.clear(this.#r),this.#d++;else{let t=+!!this.#c;this.#c=!1;let n=this.#h();e.draw({frag:oo,uniforms:{posTex:this.#t,stateSize:this.#o,elementPixel:o,time:e.time,dt:a,noiseSpeed:this.params.noiseSpeed,noiseScale:this.params.noiseScale,noiseAnimation:this.params.noiseAnimation,speedDecay:this.params.speedDecay,outwardBias:this.params.outwardBias,duration:this.params.duration,count:n,uBurst:t},target:this.#t}),t===1&&(e.draw({frag:so,uniforms:{src:e.src,stateSize:this.#o,count:n,color:Ua(this.params.color),colorMix:this.params.colorMix},target:this.#n}),e.clear(this.#i)),this.#a.instanceCount=n,e.clear(this.#r),e.draw({vert:co,frag:za,uniforms:{posTex:this.#t,colorTex:this.#n,stateSize:this.#o,pointSize:this.params.pointSize,elementPixel:o,particleCount:n,alpha:this.params.alpha,alphaDecay:this.params.alphaDecay,fog:this.params.fog},geometry:this.#a,target:this.#r,blend:this.params.blend===`normal`?`premultiplied`:`additive`})}e.draw({frag:Ba,uniforms:{trailPrev:this.#i,particleStamp:this.#r,trailFade:this.params.trailFade,blendMode:+(this.params.blend===`normal`)},target:this.#i}),e.draw({frag:lo,uniforms:{trail:this.#i},target:e.target})}#h(){let e=this.#o[0]*this.#o[1];return Math.max(1,Math.min(e,Math.floor(this.params.count)))}dispose(){this.#m(),this.#r?.dispose(),this.#i?.dispose(),this.#r=null,this.#i=null,this.#a=null}outputRect(e){return e.canvasRect}},po=`#version 300 es
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
`,mo={lenticular:0,waves:1,circular:2},ho={zero:0,clamp:1,repeat:2,mirror:3},go={pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},_o=class{params;constructor(e={}){this.params={...go,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:po,uniforms:{src:e.src,center:[t.centerX,t.centerY],pattern:mo[t.pattern]??0,edgeWrap:ho[t.edgeWrap]??0,strength:t.strength,smoothness:Math.min(1,Math.max(0,t.smoothness)),frost:Math.max(0,t.frost),dispersion:Math.max(0,t.dispersion),stripWidth:Math.min(1,Math.max(.001,t.stripWidth)),angle:t.angle,aspect:(n||1)/(r||1)},target:e.target})}},vo=`#version 300 es
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
`,yo={offset:0,reach:.1,smoothness:0,centerX:.5,centerY:.5,angle:45},bo=class{params;constructor(e={}){this.params={...yo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:vo,uniforms:{src:e.src,center:[t.centerX,t.centerY],angle:t.angle,offset:t.offset,reach:Math.max(0,t.reach),smoothness:Math.max(0,t.smoothness)},target:e.target})}},xo=`#version 300 es
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
`,So={speed:1,frequency:1},Co=class{params;constructor(e={}){this.params={...So,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:xo,uniforms:{src:e.src,time:e.time*this.params.speed,aspect:(t||1)/(n||1),frequency:this.params.frequency},target:e.target})}},wo=`#version 300 es
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
`,To={speed:1,amount:.05},Eo=class{params;constructor(e={}){this.params={...To,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:wo,uniforms:{src:e.src,time:e.time*this.params.speed,amount:this.params.amount},target:e.target})}},Do=`#version 300 es
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
`,Oo={speed:1,amount:10},ko=class{params;constructor(e={}){this.params={...Oo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:Do,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t},target:e.target})}},Ao=`#version 300 es
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
`,jo={spacing:4},Mo=class{params;constructor(e={}){this.params={...jo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Ao,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}},No=`#version 300 es
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
`,Po={speed:1,amount:20,frequency:7,blur:2},Fo=class{params;constructor(e={}){this.params={...Po,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=e.dims.element[0]||1;e.draw({frag:No,uniforms:{src:e.src,time:e.time*this.params.speed,amp:this.params.amount/t,frequency:this.params.frequency,blurDx:this.params.blur/t},target:e.target})}},Io=`#version 300 es
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
`,Lo={shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},Ro=class{params;constructor(e={}){this.params={...Lo,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:Io,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[n||1,r||1],angle:t.angle,size:Math.max(1,t.size),shift:t.shift,random:Math.min(1,Math.max(0,t.random))},target:e.target})}};function zo(e){return Object.freeze(e.map(e=>Object.freeze(e)))}var Bo=Object.freeze({nebula:zo([{offset:0,color:`#0e1554`},{offset:.45,color:`#3a50d4`},{offset:.8,color:`#c478e0`},{offset:1,color:`#f4e6ff`}]),ember:zo([{offset:0,color:`#2a0603`},{offset:.45,color:`#b0260c`},{offset:.8,color:`#ff9a2e`},{offset:1,color:`#fff3cf`}]),aurora:zo([{offset:0,color:`#03262a`},{offset:.45,color:`#0d8f72`},{offset:.8,color:`#5cf2b0`},{offset:1,color:`#e4fffb`}]),mono:zo([{offset:0,color:`#141519`},{offset:.45,color:`#4b4f58`},{offset:.8,color:`#b4b8c0`},{offset:1,color:`#ffffff`}]),sakura:zo([{offset:0,color:`#3b0d2f`},{offset:.45,color:`#a8357a`},{offset:.8,color:`#f5a3c7`},{offset:1,color:`#fff2f7`}]),ocean:zo([{offset:0,color:`#021a35`},{offset:.45,color:`#0a61a3`},{offset:.8,color:`#2fc6da`},{offset:1,color:`#e9fcff`}])}),X={count:65536,depth:.22,swirl:1,curl:.8,curlScale:2.2,speed:.14,attract:10,peel:.8,life:4,intro:1.5,pointSize:1.4,streak:.3,fireflyRatio:.01,fireflyIntensity:6,fireflyColor:`#ffd2ec`,bloom:.9,palette:`nebula`,sourceColor:0,lightDirection:[-.45,.75,.55],lightColor:`#ffffff`,lightIntensity:1,ambient:.25,occlusion:.7,glint:.7,shadow:!1,shadowOpacity:.35,shadowSoftness:14,shadowDistance:.15,shadowColor:`#1c2233`,yaw:0,pitch:0,orbit:23,fov:35,zoom:1,drag:!1,mouse:`none`,mouseRadius:120,mouseStrength:1,pad:200,antialias:!1},Vo=1<<20,Ho=3,Uo=120,Wo=.01,Go=5,Ko=6,qo=.85,Jo=1,Yo=256,Xo=1/30,Zo=3,Qo=90,$o=.3,es=.05/3.2,ts=2.875,Z=6,Q=Math.ceil(Math.sqrt(Z)),ns=Math.ceil(Z/Q),rs=1e9,is=1024,as=.05,os=6,ss=.1,cs=.15,ls=.06,us=4,ds=20,fs=.25,ps=Math.PI/180,ms=`
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
`,hs=`
uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
float rnd(uint v) {
    return float(pcg(v)) * (1.0 / 4294967296.0);
}
`,gs=`
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
`,_s=`#version 300 es
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

${hs}
${ms}
${fe}
${gs}

float lifeOf(uint id, float gen) {
    float life = lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
    // The first life after an intro is cut short at random, so the
    // particles born together die over a whole life, not together.
    if (gen >= ${is.toFixed(1)}) {
        life *= mix(${as.toFixed(2)}, 1.0, rnd(id * 40503u + 23u));
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
            float gen0 = ${is.toFixed(1)};
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
        gen = mod(gen + 1.0, ${is.toFixed(1)});
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
                target += (vec3(dir, 0.0) * viewRot) * (mouseForce * ${us.toFixed(1)} * radiusW * f);
            }
        }
    }

    v = mix(v, target, 1.0 - exp(-dt * 5.0));
    p += v * dt;

    outPos = vec4(p, ageN);
    outVel = vec4(v, gen);
}
`,vs=`#version 300 es
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

${hs}
${ms}
${fe}
${gs}

vec3 ramp(float t) {
    float u = (clamp(t, 0.0, 1.0) * ${255 .toFixed(1)} + 0.5) / ${Yo.toFixed(1)};
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
`;function ys(e){return`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define ${e.toUpperCase()}
#define TRAIL_SAMPLES ${Z}
#define HIST_COLS ${Q}

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

${hs}
${e===`body`?fe:``}

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
`}var bs=ys(`body`),xs=ys(`shadow`),Ss=ys(`firefly`),Cs=`#version 300 es
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
`,ws=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

void main() {
    vec2 q = vec2(max(abs(vLocal.x) - vShape.x, 0.0), vLocal.y);
    if (length(q) > max(vShape.y, 1e-3)) discard;
    outColor = vec4(1.0);
}
`,Ts=`#version 300 es
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
`,Es=`#version 300 es
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
`,Ds=`#version 300 es
in vec2 position;
uniform vec4 slotRect;
void main() {
    gl_Position = vec4(mix(slotRect.xy, slotRect.zw, position + 0.5), 0.0, 1.0);
}
`,Os=`#version 300 es
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
`,ks=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, -1.0);
}
`,As=`#version 300 es
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
`,js=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform vec2 texel;
out vec4 outColor;

const float threshold = ${Jo.toFixed(1)};
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
`,Ms=`#version 300 es
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
`,Ns=`#version 300 es
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
`,Ps={count:[1,Vo],depth:[.01,4],swirl:[-10,10],curl:[-10,10],curlScale:[.01,50],speed:[0,10],attract:[0,100],peel:[0,1],life:[.1,120],intro:[0,120],pointSize:[0,64],streak:[0,10],fireflyRatio:[0,1],fireflyIntensity:[0,1e3],bloom:[0,100],sourceColor:[0,1],lightIntensity:[0,100],ambient:[0,1],occlusion:[0,1],glint:[0,100],shadowOpacity:[0,1],shadowSoftness:[0,500],shadowDistance:[0,100],yaw:[-36e3,36e3],pitch:[-36e3,36e3],orbit:[-720,720],fov:[1,150],zoom:[.01,100],mouseRadius:[0,1e4],mouseStrength:[0,100]},Fs=Object.keys(Ps),Is=1e4;function $(e,t,n){return Math.min(Math.max(e,t),n)}function Ls(e){return e===`fullscreen`?e:typeof e==`number`&&Number.isFinite(e)?$(e,0,Is):X.pad}var Rs=/^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,zs=new Map;function Bs(e,t){let n=typeof e==`string`&&Rs.test(e)?e:t,r=zs.get(n);if(!r){zs.size>=64&&zs.clear();let[e,t,i]=f(n);r=[e,t,i],zs.set(n,r)}return r}function Vs(e,t){let n=Array.isArray(e)?e:[],[r,i,a]=[Number(n[0]),Number(n[1]),Number(n[2])],o=Math.hypot(r,i,a);!Number.isFinite(o)||o<1e-6?Vs(X.lightDirection,t):(t[0]=r/o,t[1]=i/o,t[2]=a/o)}function Hs(e,t){let n=t??{light:[0,0,1]};for(let t of Fs){let r=e[t],[i,a]=Ps[t];n[t]=typeof r==`number`&&Number.isFinite(r)?$(r,i,a):X[t]}return n.count=Math.floor(n.count),n.pad=Ls(e.pad),n.shadow=!!e.shadow,n.drag=!!e.drag,n.antialias=!!e.antialias,n.mouse=e.mouse===`repel`||e.mouse===`tilt`?e.mouse:`none`,Vs(e.lightDirection,n.light),n.lightColor=Bs(e.lightColor,X.lightColor),n.fireflyColor=Bs(e.fireflyColor,X.fireflyColor),n.shadowColor=Bs(e.shadowColor,X.shadowColor),n}function Us(e){let t=typeof e==`string`?Bo[e]:Array.isArray(e)?e.filter(e=>e&&typeof e==`object`):null;return t&&t.length>0?t:Bo.nebula}function Ws(e){let t=Us(e).map(e=>({offset:Number.isFinite(e.offset)?$(e.offset,0,1):0,rgb:Bs(e.color,`#000000`)})).sort((e,t)=>e.offset-t.offset),n=new Uint8Array(Yo*4),r=0;for(let e=0;e<Yo;e++){let i=e/255;for(;r<t.length-1&&t[r+1].offset<i;)r++;let a=t[r],o=t[Math.min(r+1,t.length-1)],s=0;s=i<=a.offset?0:i>=o.offset?1:(i-a.offset)/Math.max(o.offset-a.offset,1e-6);for(let t=0;t<3;t++){let r=a.rgb[t]+(o.rgb[t]-a.rgb[t])*s;n[e*4+t]=Math.round(r*255)}n[e*4+3]=255}return n}function Gs(e){let t=[-.5,-.5,.5,-.5,.5,.5,-.5,.5],n=new Float32Array(48),r=new Float32Array(24),i=new Uint16Array(36);for(let e=0;e<Z;e++){n.set(t,e*8),r.fill(e,e*4,e*4+4);let a=e*4;i.set([a,a+1,a+2,a,a+2,a+3],e*6)}return{attributes:{position:{data:n,itemSize:2},seg:{data:r,itemSize:1}},indices:i,instanceCount:e}}function Ks(e,t,n){let r=$((n-e)/(t-e),0,1);return r*r*(3-2*r)}var qs={bloom:null,shadow:null,shadowAmount:0},Js=class{params;#e;#t=!1;#n;#r=0;#i=`capture`;#a=0;#o=Ho;#s=[0,0];#c=0;#l=null;#u=null;#d=!0;#f=0;#p=0;#m=!1;#h=0;#g=[];#_=0;#v=null;#y=null;#b=null;#x=1;#S=null;#C=[0,0];#w=[];#T=[0,0];#E=null;#D=!1;#O=qs;#k=0;#A=null;#j=null;#M=null;#N=null;#P=Array(Z).fill(-1/0);#F=5;#I=-1/0;#L=null;#R=null;#z=null;#B=null;#V=null;#H=null;#U=null;#W=null;#G=[];#K=0;#q=null;#J=null;#Y=null;#X=-1;#Z=-1;#Q={attributes:{position:{data:La,itemSize:2}}};#$=0;#ee=0;#te=!1;#ne=[0,0];#re=null;#ie=null;#ae=[0,0];#oe=1;#se=[0,0];#ce=!1;#le=null;#ue=[0,0];#de=0;#fe=0;#pe=0;constructor(e={},t={}){this.params={...X,...e},this.#e=t.still??!1,this.#n=Hs(this.params)}setParams(e){Object.assign(this.params,e)}init(e){this.#L=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`);let t=Hs(this.params,this.#n);this.#he(e,Va(t.count),!1),this.#me(e),this.#ie=e.onContextRestored(()=>{this.#r++,this.#L=e.gl,this.#t=!e.gl.getExtension(`OES_texture_float_linear`),this.#R=null,this.#z=null,this.#B=null,this.#V=null,this.#H=null,this.#U=null,this.#W=null,this.#l=this.#l??this.#u,this.#i===`reading`&&(this.#i=`capture`,this.#a=0),this.#d=!0,this.#m=!1,this.#D=!1})}outputRect(e){return s(Ls(this.params.pad),e)}#me(e){let t=this.#n.antialias?4:1;this.#b?.dispose();let n=e.createRenderTarget({float:!0,depth:!0,samples:t});return this.#b=n,this.#x=t,n}#he(e,t,n){let r=this.#v,i=this.#y,a=this.#_,o={size:[t,t],float:!0,persistent:!0,filter:`nearest`},s=e.createRenderTarget(o),c=e.createRenderTarget(o);this.#_=t,n&&r&&i&&!this.#d&&this.#V&&this.#H?e.draw({frag:_s,uniforms:{...this.#Me(e),posTex:r,velTex:i,oldPosTex:r,oldVelTex:i,oldWidth:a,oldCount:a*a,reset:2,dt:0},target:[s,c]}):this.#d=!0,r?.dispose(),i?.dispose(),this.#j?.dispose(),this.#M?.dispose(),this.#N?.dispose(),this.#v=s,this.#y=c;let l={...o,persistent:!1};this.#j=e.createRenderTarget(l),this.#M=e.createRenderTarget(l),this.#N=e.createRenderTarget({...l,size:[t*Q,t*ns]}),this.#d||this.#Fe(e)}render(e){if(!this.#b||!this.#v||!this.#y)return;let t=Hs(this.params,this.#n);this.#_e(),this.#ae[0]=e.mouse[0]-e.mouseViewport[0],this.#ae[1]=e.mouse[1]-e.mouseViewport[1],this.#oe=e.pixelRatio,this.#se[0]=e.dims.elementPixel[0],this.#se[1]=e.dims.elementPixel[1];let n=(t.antialias?4:1)===this.#x?this.#b:this.#me(e);this.#i===`idle`&&!this.#l&&this.#xe(e),this.#i===`capture`&&this.#Se(e),this.#l&&this.#Ce(e,this.#l)&&((!this.#u||this.#e)&&(this.#d=!0),this.#u=this.#l,this.#l=null),this.#Ee(e);let r=!!(this.#u&&this.#V&&this.#H&&this.#U);if(!r)this.#O=qs;else{t.count>this.#_**2&&this.#he(e,Va(t.count),!0),this.#De(e),this.#e&&t.count!==this.#h&&(this.#d=!0);let r=this.#e&&this.#ge(e,n);if(!this.#e||!this.#m||this.#d||r){let t=Ga(e.deltaTime)||0;this.#Ae(e,t),this.#Ne(e,t),this.#A=this.#je(e);let r=this.#Re(e,n,this.#A);this.#O={bloom:this.#Ue(e,n),shadow:r?r.tex:null,shadowAmount:r?r.amount:0}}}let i=this.#O;e.draw({frag:Ns,uniforms:{scene:n,bloomTex:i.bloom??n,shadowTex:i.shadow??n,hasScene:+!!r,bloom:i.bloom?t.bloom:0,shadowAmount:i.shadow?i.shadowAmount:0,shadowColor:t.shadowColor},target:e.target})}#ge(e,t){let n=this.#n,r=this.#g,i=0,a=!1,o=e=>{r[i]!==e&&(r[i]=e,a=!0),i++};for(let e of Fs)o(n[e]);o(n.pad),o(n.shadow),o(n.light[0]),o(n.light[1]),o(n.light[2]),o(n.lightColor),o(n.fireflyColor),o(n.shadowColor),o(this.#K),o(this.#_),o(t.width),o(t.height),o(this.#x);let c=e.dims,[l,u]=s(n.pad,c);return o(c.elementPixel[0]),o(c.elementPixel[1]),o(l),o(u),a}#_e(){let e=this.#n,t=!this.#e&&typeof window<`u`;t&&e.drag?this.#ve():this.#re&&(this.#re(),this.#re=null,this.#te=!1),t&&e.mouse!==`none`?this.#ke():this.#le&&(this.#le(),this.#le=null,this.#ce=!1)}#ve(){if(this.#re)return;let e=e=>{this.#ye(e.clientX,e.clientY)&&(this.#te=!0,this.#ne=[e.clientX,e.clientY])},t=e=>{if(!this.#te)return;let t=e.clientX-this.#ne[0],n=e.clientY-this.#ne[1];this.#ne=[e.clientX,e.clientY],this.#$+=t*.006,this.#ee=$(this.#ee+n*.006,-1.2,1.2)},n=()=>{this.#te=!1};window.addEventListener(`pointerdown`,e),window.addEventListener(`pointermove`,t),window.addEventListener(`pointerup`,n),window.addEventListener(`pointercancel`,n),this.#re=()=>{window.removeEventListener(`pointerdown`,e),window.removeEventListener(`pointermove`,t),window.removeEventListener(`pointerup`,n),window.removeEventListener(`pointercancel`,n)}}#ye(e,t){let n=this.#oe,r=e*n+this.#ae[0],i=(window.innerHeight-t)*n+this.#ae[1],[a,o]=this.#se;return r>=0&&i>=0&&r<=a&&i<=o}refresh(){this.#be()}#be(){this.#i===`reading`&&this.#r++,this.#i=`capture`,this.#a=0,this.#o=Ho}#xe(e){let t=this.#u,[n,r]=e.dims.elementPixel;if(!t||!(n>=1&&r>=1))return;let i=n!==this.#s[0]||r!==this.#s[1];this.#s[0]=n,this.#s[1]=r,this.#c=i?0:this.#c+1,this.#c>=Go&&Math.abs(n/r/t.aspect-1)>Wo&&this.#be()}#Se(e){let[n,r]=e.dims.elementPixel;if(e.src.width===0||e.src.height===0||!(n>=1&&r>=1)||++this.#a<this.#o)return;let i=n/r,a=Math.max(1,i>=1?400:Math.round(400*i)),o=Math.max(1,i>=1?Math.round(400/i):400),s=e.createRenderTarget({size:[a,o]});t(e,s),this.#i=`reading`;let c=this.#r,l=this.#n.depth/2,u=e.readPixels(s);s.dispose();let d=e=>{this.#a=0,e&&(this.#o=Math.min(this.#o*2,Uo)),this.#i=`capture`};u.then(e=>{if(c!==this.#r)return;let t=ve(e,a,o,l,i);t?(this.#l=t,this.#i=`idle`):d(!0)},()=>{c===this.#r&&d(!1)})}#Ce(e,t){let n=e.gl;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let r=n.createTexture(),i=n.createTexture();return!r||!i?(n.deleteTexture(r),n.deleteTexture(i),e.resetState(),!1):(n.bindTexture(n.TEXTURE_2D,r),n.texImage2D(n.TEXTURE_2D,0,n.RGBA16F,t.sdfW,t.sdfH,0,n.RGBA,n.FLOAT,t.sdf),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,256,256,0,n.RGBA,n.FLOAT,t.spawn),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),this.#we(),this.#R=r,this.#z=i,this.#V=e.wrapTexture(r,{size:[t.sdfW,t.sdfH],filter:`linear`,wrap:`clamp`}),this.#H=e.wrapTexture(i,{size:[256,256],filter:`nearest`,wrap:`clamp`}),!0)}#we(){if(this.#L)for(let e of[this.#R,this.#z])e&&this.#L.deleteTexture(e);this.#R=null,this.#z=null,this.#V=null,this.#H=null}#Te(e){if(e!==this.#W)return!1;if(!Array.isArray(e))return!0;let t=this.#G;if(t.length!==e.length*2)return!1;for(let n=0;n<e.length;n++){let r=e[n];if(t[n*2]!==r?.offset||t[n*2+1]!==r?.color)return!1}return!0}#Ee(e){let t=this.params.palette;if(this.#U&&this.#Te(t))return;let n=e.gl,r=Ws(t);n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_ALIGNMENT,4);let i=this.#B;i?(n.bindTexture(n.TEXTURE_2D,i),n.texSubImage2D(n.TEXTURE_2D,0,0,0,Yo,1,n.RGBA,n.UNSIGNED_BYTE,r)):(i=n.createTexture(),n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,Yo,1,0,n.RGBA,n.UNSIGNED_BYTE,r),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)),n.bindTexture(n.TEXTURE_2D,null),e.resetState(),i&&(this.#U||=(this.#B=i,e.wrapTexture(i,{size:[Yo,1],filter:`linear`,wrap:`clamp`})),this.#W=t,this.#G=Array.isArray(t)?t.flatMap(e=>[e?.offset,e?.color]):[],this.#K++)}#De(e){let t=this.#n,n=Math.min(t.count,Math.round(t.count*t.fireflyRatio)),r=t.count-n;r!==this.#X&&(this.#q&&e.releaseGeometry(this.#q),this.#J&&e.releaseGeometry(this.#J),this.#q=Gs(r),this.#J={attributes:{position:{data:La,itemSize:2}},instanceCount:r},this.#X=r),n!==this.#Z&&(this.#Y&&e.releaseGeometry(this.#Y),this.#Y={mode:`points`,attributes:{},drawRange:{start:0,count:1},instanceCount:n},this.#Z=n)}#Oe(){let e=this.#n.depth/2,t={sdfRect:this.#u?.sdfRect??[0,0,1,1],halfDepth:e,rounding:Math.min(.025,e*.5),stateWidth:this.#_,spawnSize:256};return this.#V&&this.#H&&(t.sdfTex=this.#V,t.spawnTex=this.#H),t}#ke(){if(this.#le)return;let e=e=>{this.#ce=e.clientX>=0&&e.clientY>=0&&e.clientX<window.innerWidth&&e.clientY<window.innerHeight},t=e=>{e.relatedTarget||(this.#ce=!1)},n=()=>{this.#ce=!1};window.addEventListener(`pointermove`,e,{passive:!0}),window.addEventListener(`pointerout`,t,{passive:!0}),window.addEventListener(`blur`,n),this.#le=()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`pointerout`,t),window.removeEventListener(`blur`,n)}}#Ae(e,t){let n=this.#n,r=this.#e?`none`:n.mouse,i=this.#ce&&!this.#e,[a,o]=e.mouse,s=i&&r===`repel`;if(s){if(this.#de<=0)this.#ue=[a,o];else{let e=1-Math.exp(-t/ls);this.#ue[0]+=(a-this.#ue[0])*e,this.#ue[1]+=(o-this.#ue[1])*e}}let c=t/cs;this.#de=s?Math.min(this.#de+c,1):Math.max(this.#de-c,0);let l=0,u=0;if(i&&r===`tilt`){let[t,r]=e.dims.elementPixel,i=e.pixelRatio,s=typeof window<`u`?window.innerWidth*i:e.dims.canvasPixel[0],c=typeof window<`u`?window.innerHeight*i:e.dims.canvasPixel[1],d=$((a-t/2)/Math.max(s/2,1),-1,1),f=$((o-r/2)/Math.max(c/2,1),-1,1),p=ds*ps*n.mouseStrength;l=p*d,u=-p*f}let d=1-Math.exp(-t/fs);this.#fe+=(l-this.#fe)*d,this.#pe+=(u-this.#pe)*d}#je(e){let t=this.#n,n=this.#f,r=(t.yaw+t.orbit*Math.sin(n*.13))*ps+this.#$+this.#fe,i=(t.pitch+t.orbit*$o*Math.sin(n*.09+1.3))*ps+this.#ee+this.#pe,a=1/Math.tan(t.fov*Math.PI/360),o=e.dims,[c,l]=o.elementPixel,[u,d]=s(t.pad,o),f=Math.max(c,l)/2*t.zoom;return{viewRot:ye(r,i),camDist:a,focalPx:a*f,centerPx:[c/2-u,l/2-d],origin:[u,d]}}#Me(e){let t=this.#n,n=this.#H;return{...this.#Oe(),count:t.count,lifeMean:t.life,intro:this.#e?0:t.intro,swirl:t.swirl,curl:t.curl,curlScale:t.curlScale,speed:t.speed,attract:t.attract,peel:t.peel,time:this.#f,halfState:+!!this.#t,frameSeed:this.#p,...n?{oldPosTex:n,oldVelTex:n}:{},oldWidth:1,oldCount:0,...this.#Pe(e)}}#Ne(e,t){let n=this.#v,r=this.#y;if(!n||!r||!this.#V||!this.#H)return;let i,a;if(this.#e){if(this.#k=0,this.#m&&!this.#d)return;i=Qo,a=1/60}else this.#k=t,i=$(Math.ceil(t/Xo),1,Zo),a=t/i;let o=this.#Me(e);this.#d&&(e.draw({frag:_s,uniforms:{...o,posTex:n,velTex:r,reset:1,dt:0},target:[n,r]}),this.#Fe(e),this.#d=!1,this.#D=!1);for(let t=0;t<i;t++)this.#f+=a,this.#p=(this.#p+1)%1048576,e.draw({frag:_s,uniforms:{...o,posTex:n,velTex:r,reset:0,time:this.#f,frameSeed:this.#p,dt:a},target:[n,r]}),this.#Ie(e);this.#m=!0,this.#h=this.#n.count}#Pe(e){let t=this.#n,n=this.#A??this.#je(e);return{mouseForce:t.mouseRadius>0?this.#de*t.mouseStrength:0,mousePx:[this.#ue[0]-n.origin[0],this.#ue[1]-n.origin[1]],mouseRadiusPx:Math.max(t.mouseRadius*e.pixelRatio,1),viewRot:n.viewRot,camDist:n.camDist,focalPx:n.focalPx,centerPx:n.centerPx}}#Fe(e){this.#N&&e.draw({frag:ks,target:this.#N}),this.#P.fill(-1/0),this.#F=5,this.#I=-1/0}#Ie(e){let t=this.#N,n=this.#v,r=this.#y,i=this.#n.streak;if(!t||!n||!r||!(i>0))return;let a=i/5;if(this.#f-this.#I<a)return;let o=(this.#F+1)%Z,s=o%Q,c=Math.floor(o/Q),l=2*s/Q-1,u=2*c/ns-1,d=this.#_;e.draw({vert:Ds,frag:Os,geometry:this.#Q,uniforms:{posTex:n,velTex:r,slotRect:[l,u,l+2/Q,u+2/ns],slotOrigin:[s*d,c*d]},target:t}),this.#F=o,this.#P[o]=this.#f,this.#I=this.#f}#Le(){let e=[],t=[];for(let n=0;n<Z;n++){let r=(this.#F-n+12)%Z,i=this.#P[r];e.push(r),t.push(Number.isFinite(i)?this.#f-i:rs)}return{histSlot:e,histAgo:t}}#Re(e,t,n){let r=this.#v,i=this.#y,a=this.#u,o=this.#j,s=this.#M,c=this.#N,l=this.#q,u=this.#J,d=this.#Y;if(!r||!i||!a||!this.#U||!o||!s||!c||!l||!u||!d)return null;let f=this.#n,p=n.camDist,m={...this.#Oe(),posTex:r,viewRot:n.viewRot,camDist:p,camNear:p*es,camFar:p*ts,focalPx:n.focalPx,centerPx:n.centerPx,bufferPx:[t.width,t.height],pointPx:f.pointSize*e.pixelRatio};e.clear(t),this.#X>0&&e.draw({frag:vs,uniforms:{...m,velTex:i,count:f.count,time:this.#f,speed:f.speed,paletteTex:this.#U,src:e.src,shapeHalf:a.shapeHalf,sourceColor:f.sourceColor},target:[o,s]});let h={...m,...this.#Le(),velTex:i,histTex:c,attrA:o,idOffset:this.#Z,streak:f.streak};this.#X>0&&e.draw({vert:bs,frag:Cs,geometry:l,uniforms:{...h,attrB:s,lightDir:f.light,lightColor:f.lightColor,lightIntensity:f.lightIntensity,ambient:f.ambient,occlusion:f.occlusion,glintAmount:f.glint},target:t,depthTest:!0,blend:`none`}),this.#Z>0&&e.draw({vert:Ss,frag:As,geometry:d,uniforms:{...m,idOffset:0,time:this.#f,fireflyIntensity:f.fireflyIntensity,fireflyColor:f.fireflyColor},target:t,depthTest:!0,depthWrite:!1,blend:`additive`});let g=f.light,_=f.shadowOpacity*Ks(0,.25,g[2]);if(!f.shadow||!(_>0)||this.#X===0)return this.#Ve(),null;let v=this.#Be(e,t,u,{...h,shadowLight:[g[0],g[1],Math.max(g[2],.02)],shadowDepth:f.shadowDistance});return v?{tex:v,amount:_}:null}#ze(e,t){let n=this.#w;for(;n.length<=t;){let t=2**n.length,r={size:[Math.max(1,Math.floor(this.#T[0]/t)),Math.max(1,Math.floor(this.#T[1]/t))],float:!0,filter:`linear`};n.push({a:e.createRenderTarget(r),b:e.createRenderTarget(r)})}return n[t]}#Be(e,t,n,r){let i=Math.max(1,Math.floor(t.width/2)),a=Math.max(1,Math.floor(t.height/2));(i!==this.#T[0]||a!==this.#T[1])&&(this.#Ve(),this.#T=[i,a]),this.#E||=e.createRenderTarget({size:[i,a],float:!0,persistent:!0,filter:`linear`});let o=this.#E,s=this.#ze(e,0).a;e.clear(s),e.draw({vert:xs,frag:ws,geometry:n,uniforms:r,target:s,blend:`none`});let c=this.#D&&!this.#e?1-Math.exp(-this.#k/ss):1;e.draw({frag:Ts,uniforms:{curTex:s,histTex:o,amount:c},target:o}),this.#D=!0;let l=this.#n.shadowSoftness*e.pixelRatio,u=0;for(;u<3&&l/2**(u+1)>os;)u++;let d=t=>t===0?o:this.#ze(e,t).a;for(let t=1;t<=u;t++){let n=d(t-1);e.draw({frag:Ms,uniforms:{srcTex:n,texel:[1/n.width,1/n.height]},target:this.#ze(e,t).a})}let f=d(u),p=l/2**(u+1);if(p<.3)return f;let{a:m,b:h}=this.#ze(e,u),g=Math.min(Math.ceil(p*3),24);return e.draw({frag:Es,uniforms:{srcTex:f,dir:[1/f.width,0],sigma:p,radius:g},target:h}),e.draw({frag:Es,uniforms:{srcTex:h,dir:[0,1/h.height],sigma:p,radius:g},target:m}),m}#Ve(){for(let e of this.#w)e.a.dispose(),e.b.dispose();this.#E?.dispose(),this.#E=null,this.#D=!1,this.#w=[],this.#T=[0,0]}#He(){this.#S&&p(this.#S),this.#S=null,this.#C=[0,0]}#Ue(e,t){if(!(this.#n.bloom>0))return this.#He(),null;this.#S&&t.width===this.#C[0]&&t.height===this.#C[1]||(this.#He(),this.#S=g(e,t.width,t.height,Ko),this.#C=[t.width,t.height]);let n=this.#S.down;e.draw({frag:js,uniforms:{scene:t,texel:[1/t.width,1/t.height]},target:n[0]});for(let t=1;t<n.length;t++){let r=n[t-1];e.draw({frag:Ms,uniforms:{srcTex:r,texel:[1/r.width,1/r.height]},target:n[t]})}return u(e,this.#S,(e,t)=>({texelSize:[1/t.width,1/t.height],weightLarge:1,weightSmall:qo}))}dispose(){this.#re?.(),this.#re=null,this.#le?.(),this.#le=null,this.#ie?.(),this.#ie=null,this.#we(),this.#L&&this.#B&&this.#L.deleteTexture(this.#B),this.#B=null,this.#U=null,this.#L=null,this.#v?.dispose(),this.#y?.dispose(),this.#j?.dispose(),this.#M?.dispose(),this.#N?.dispose(),this.#b?.dispose(),this.#Ve(),this.#He(),this.#v=null,this.#y=null,this.#j=null,this.#M=null,this.#N=null,this.#b=null,this.#_=0,this.#q=null,this.#J=null,this.#Y=null,this.#X=-1,this.#Z=-1,this.#r++,this.#i=`capture`,this.#a=0,this.#o=Ho,this.#s.fill(0),this.#c=0,this.#l=null,this.#u=null,this.#d=!0,this.#f=0,this.#p=0,this.#m=!1,this.#h=0,this.#g=[],this.#O=qs,this.#k=0,this.#A=null,this.#P.fill(-1/0),this.#F=5,this.#I=-1/0,this.#W=null,this.#G=[],this.#$=0,this.#ee=0,this.#te=!1,this.#ae.fill(0),this.#se.fill(0),this.#ce=!1,this.#ue=[0,0],this.#de=0,this.#fe=0,this.#pe=0}},Ys=`#version 300 es
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
`,Xs={rectangle:0,ellipse:1,hexagon:2,triangle:3},Zs={shape:`rectangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},Qs=class{params;constructor(e={}){this.params={...Zs,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel,i=Math.max(1,t.size);e.draw({frag:Ys,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],shape:Xs[t.shape]??0,cellPx:[i*Math.max(.1,t.stretch),i],gap:Math.min(1,Math.max(0,t.gap)),colorTrim:Math.max(0,t.colorTrim),averageColor:Math.min(1,Math.max(0,t.averageColor)),dissolve:Math.min(1,Math.max(0,t.dissolve)),falloff:Math.min(1,Math.max(0,t.falloff)),knockout:+!!t.knockout},target:e.target})}},$s=`#version 300 es
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
`,ec={color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2},tc=class{params;constructor(e={}){this.params={...ec,...e}}setParams(e){Object.assign(this.params,e)}render(e){e.draw({frag:$s,uniforms:{src:e.src,time:e.time,color1:this.params.color1,color2:this.params.color2,color3:this.params.color3,speed:this.params.speed},target:e.target})}},nc=`#version 300 es
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
`,rc={intensity:.5,radius:1,power:2},ic=class{params;constructor(e={}){this.params={...rc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element;e.draw({frag:nc,uniforms:{src:e.src,aspect:(t||1)/(n||1),intensity:this.params.intensity,radius:this.params.radius,power:this.params.power},target:e.target})}},ac=`#version 300 es
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

${be}
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
`,oc={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`};function sc(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var cc=class{params;constructor(e={}){this.params={...oc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:ac,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:sc(a.bgColor)},target:e.target})}},lc=`#version 300 es
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
`,uc={"sine wave":0,twist:1,ripple:2},dc={type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},fc=class{params;constructor(e={}){this.params={...dc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:lc,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[e.dims.element[0]||1,e.dims.element[1]||1],mode:uc[t.type]??0,amp:t.amplitude,freq:t.frequency,time:e.time*t.speed},target:e.target})}},pc=[{name:`uvGradient`,media:`logo`},{name:`rainbow`,media:`logo`},{name:`glitch`,media:`logo`,props:{overflow:60}},{name:`rgbGlitch`,media:`logo`},{name:`rgbShift`,media:`logo`},{name:`shine`,media:`logo`},{name:`blink`,media:`logo`},{name:`spring`,media:`logo`},{name:`sinewave`,media:`logo`},{name:`pixelate`,media:`logo`},{name:`halftone`,media:`jellyfish`},{name:`invert`,media:`pigeon`},{name:`grayscale`,media:`pigeon`},{name:`duotone`,media:`jellyfish`,props:{uniforms:{color1:[1,0,0,1],color2:[0,0,1,1],speed:.2}}},{name:`tritone`,media:`jellyfish`,props:{uniforms:{color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1],speed:.2}}},{name:`hueShift`,media:`jellyfish`,props:{uniforms:{shift:.5}}},{name:`vignette`,media:`pigeon`,props:{uniforms:{intensity:.5,radius:.5,power:2}}},{name:`chromatic`,media:`pigeon`,props:{uniforms:{intensity:.3,radius:0,power:2}}}],mc=[`slitScanReveal`,`warpReveal`,`pixelateReveal`,`focusReveal`].map(e=>({name:e,media:`logo`,props:{intersection:{threshold:1}}})),hc=new WeakSet,gc=[{name:`AsciiEffect`,text:`ASCII mosaic from a dark-to-light character ramp.`,media:`pigeon`,create:()=>new i},{name:`BadJpegEffect`,text:`JPEG damage: chroma subsampling and blocky DCT.`,media:`pigeon`,create:()=>new l({quality:4})},{name:`BloomEffect`,text:`Bloom with a soft threshold. Draws outside the element.`,media:`jellyfish`,create:()=>new b({threshold:.2,intensity:4})},{name:`ChromaticEffect`,text:`Chromatic aberration.`,media:`pigeon`,create:()=>new T},{name:`ColoredEdgesEffect`,text:`Edge detection with two edge colors.`,media:`pigeon`,create:()=>new te},{name:`DatamoshEffect`,text:`Fake datamosh.`,media:`jellyfish`,create:()=>new r,hint:`Click to start or stop.`,onClick:e=>{let t=e;hc.has(t)?(hc.delete(t),t.disable()):(hc.add(t),t.enable())}},{name:`DitherEffect`,text:`Bayer or blue-noise dither with few colors.`,media:`pigeon`,create:()=>new v},{name:`DuotoneEffect`,text:`Two-color map.`,media:`pigeon`,create:()=>new h},{name:`FluidEffect`,text:`Fluid simulation driven by the pointer.`,media:`pigeon`,create:()=>new le,hint:`Move the pointer over it.`},{name:`GlassEffect`,text:`Dispersive glass in the shape of the silhouette.`,media:`logo`,create:()=>new ot({pad:40,zoom:.9})},{name:`GlitchEffect`,text:`Block shift and aberration glitch.`,media:`pigeon`,create:()=>new a},{name:`GradientMapEffect`,text:`Map brightness to a color gradient.`,media:`pigeon`,create:()=>new ft},{name:`HalftoneEffect`,text:`RGB or CMYK halftone screen.`,media:`pigeon`,create:()=>new d},{name:`HoloEffect`,text:`Holographic foil from holo.spot. Move the pointer over it to tilt.`,media:`logo`,create:()=>new Aa({holo:Aa.looks.card})},{name:`HueShiftEffect`,text:`Rotate the hue.`,media:`pigeon`,create:()=>new Na},{name:`JPEGGlitchEffect`,text:`Real JPEG glitch: breaks the encoded bytes.`,media:`pigeon`,create:()=>new n},{name:`LightStreakEffect`,text:`Anamorphic flare and starburst streaks.`,media:`jellyfish`,create:()=>new _},{name:`MatrixEffect`,text:`Digital rain of glyphs over the image.`,media:`pigeon`,create:()=>new m},{name:`ParticleEffect`,text:`GPU particles from the pointer.`,media:`pigeon`,create:()=>new ao,hint:`Move the pointer over it.`},{name:`ParticleExplodeEffect`,text:`One burst that shatters the element.`,media:`pigeon`,create:()=>new fo,hint:`Click to burst.`,zIndex:-1,onClick:e=>e.trigger()},{name:`PatternRefractionEffect`,text:`Refraction through ribbed glass.`,media:`pigeon`,create:()=>new _o},{name:`PixelateEffect`,text:`Pixelation. size is in CSS px.`,media:`pigeon`,create:()=>new y({size:8})},{name:`PixelSortEffect`,text:`Threshold pixel sort at any angle.`,media:`pigeon`,create:()=>new e},{name:`PixelStretchEffect`,text:`Smear one line across a band of the image.`,media:`pigeon`,create:()=>new bo},{name:`RainbowEffect`,text:`Moving rainbow gradient.`,media:`pigeon`,create:()=>new Co},{name:`RgbGlitchEffect`,text:`Block glitch with RGB split.`,media:`pigeon`,create:()=>new Eo},{name:`RgbShiftEffect`,text:`RGB channel shift.`,media:`pigeon`,create:()=>new ko},{name:`ScanlineEffect`,text:`CRT scanlines.`,media:`pigeon`,create:()=>new Mo},{name:`SinewaveEffect`,text:`Sine wave distortion.`,media:`pigeon`,create:()=>new Fo},{name:`SliceShiftEffect`,text:`Split into strips and shift each one.`,media:`pigeon`,create:()=>new Ro},{name:`SwirlParticleEffect`,text:`Particles curling over the extruded silhouette.`,media:`logo`,create:()=>new Js({pad:40,yaw:11.5})},{name:`TilePixelateEffect`,text:`Pixelate into shaped tiles.`,media:`pigeon`,create:()=>new Qs},{name:`TritoneEffect`,text:`Three-color map.`,media:`pigeon`,create:()=>new tc},{name:`VignetteEffect`,text:`Vignette.`,media:`pigeon`,create:()=>new ic},{name:`VoronoiEffect`,text:`Voronoi cells around the pointer.`,media:`pigeon`,create:()=>new cc,hint:`Move the pointer over it.`},{name:`WarpEffect`,text:`Sine wave, twist or ripple warp.`,media:`pigeon`,create:()=>new fc}];x(()=>{for(let e of[...pc,...mc]){let t=document.querySelector(`[data-preset="${e.name}"], [data-reveal-preset="${e.name}"]`);t&&S(t,()=>({shader:e.name,...e.props}))}for(let e of gc){let t=document.querySelector(`[data-effect="${e.name}"]`);if(!t)continue;let n;S(t,()=>(n=e.create(),{effect:n,zIndex:e.zIndex}));let r=e.onClick;r&&t.addEventListener(`click`,()=>{n&&r(n)})}let e=document.getElementById(`UniformsDemo`);e&&S(e,()=>({shader:`duotone`,uniforms:{color1:[0,0,1,1],color2:[0,1,0,1],speed:.2}}));let t=document.getElementById(`ChainDemo`);t&&S(t,()=>({effect:[new y({size:10}),new Mo({spacing:5}),new b({threshold:.01,intensity:10,pad:100})]}))});export{Jt as a,ht as c,Xn as i,H as n,Xt as o,ir as r,kt as s,Gi as t};