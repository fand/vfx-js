import{n as e}from"./chunk-BneVvdWh.js";import{a as t,i as n,n as r,o as i,r as a,t as o}from"./utils-BLrKilFH.js";import{n as s,r as c,t as l}from"./preset-hB8Fk8QM.js";import{n as u,t as d}from"./jellyfish-D2xsay8i.js";var f,p,m,h,g,_,v,ee=e((()=>{f=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;
uniform float edgeFade;

void main() {
    // Hard-gate sampling to uvSrc in [0,1]: a bare clamp would smear
    // src's edge pixels into the pad (visible as a stretched image
    // when edgeFade x pad reaches past the src buffer). The clamp on
    // texture() keeps the sampler happy; srcMask zeroes what lies
    // outside the actual src content.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec3 srgb = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * srcMask;
    vec3 lin = pow(srgb, vec3(2.2));

    // COD:AW (Jimenez 2014) / Unity HDRP soft-knee brightness
    // response. Quadratic ramp of half-width (threshold * softness)
    // centred on the cutoff — softness gates mid-luma pixels on
    // BOTH sides of threshold, so raising it *widens* the bloom
    // (the previous one-sided smoothstep did the opposite).
    // softness=0 collapses to a hard threshold; softness=1 extends
    // the knee down to zero. br uses max-channel (COD convention)
    // so saturated primaries still trigger bloom where a Rec.709
    // luma would have hidden them.
    float br = max(max(lin.r, lin.g), lin.b);
    float knee = threshold * softness;
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    float contribution = max(rq, br - threshold) / max(br, 1e-4);

    // Chebyshev distance outside the inner rect in uvContent units;
    // 0 inside, positive in the pad region.
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float mask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    float f = contribution * mask;

    outColor = vec4(lin * f, f);
}
`,p=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 texelSize;
uniform int karis;

vec4 s(vec2 o) { return texture(src, uv + o); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 t = texelSize;
    vec4 a = s(vec2(-2.0 * t.x, -2.0 * t.y));
    vec4 b = s(vec2( 0.0,       -2.0 * t.y));
    vec4 c = s(vec2( 2.0 * t.x, -2.0 * t.y));
    vec4 d = s(vec2(-2.0 * t.x,  0.0));
    vec4 e = s(vec2( 0.0,        0.0));
    vec4 f = s(vec2( 2.0 * t.x,  0.0));
    vec4 g = s(vec2(-2.0 * t.x,  2.0 * t.y));
    vec4 h = s(vec2( 0.0,        2.0 * t.y));
    vec4 i = s(vec2( 2.0 * t.x,  2.0 * t.y));
    vec4 j = s(vec2(-1.0 * t.x, -1.0 * t.y));
    vec4 k = s(vec2( 1.0 * t.x, -1.0 * t.y));
    vec4 l = s(vec2(-1.0 * t.x,  1.0 * t.y));
    vec4 m = s(vec2( 1.0 * t.x,  1.0 * t.y));

    vec4 box1 = (a + b + d + e) * 0.25;
    vec4 box2 = (b + c + e + f) * 0.25;
    vec4 box3 = (d + e + g + h) * 0.25;
    vec4 box4 = (e + f + h + i) * 0.25;
    vec4 box5 = (j + k + l + m) * 0.25;

    vec4 color;
    if (karis == 1) {
        float w1 = 1.0 / (1.0 + luma(box1.rgb));
        float w2 = 1.0 / (1.0 + luma(box2.rgb));
        float w3 = 1.0 / (1.0 + luma(box3.rgb));
        float w4 = 1.0 / (1.0 + luma(box4.rgb));
        float w5 = 1.0 / (1.0 + luma(box5.rgb));
        color = (box1 * w1 + box2 * w2 + box3 * w3 + box4 * w4 + box5 * w5)
              / (w1 + w2 + w3 + w4 + w5);
    } else {
        color = box1 * 0.125 + box2 * 0.125 + box3 * 0.125 + box4 * 0.125
              + box5 * 0.5;
    }
    outColor = color;
}
`,m=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`,h=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform vec2 texelSize;
uniform float intensity;
uniform float dither;
uniform float edgeFade;

// Interleaved gradient noise (Jimenez 2014). Cheap, high-quality,
// spatially decorrelated — perfect for breaking 8-bit quantisation
// bands in the gamma-encoded bloom halo.
float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5×5 binomial gaussian ([1,4,6,4,1]/16 outer-producted) via 9
    // bilinear taps at ±1.2 source texels. Each bilinear fetch
    // integrates a tap-pair perfectly, so result ≡ 25-tap convolution.
    vec2 t = texelSize * 1.2;
    vec4 b = vec4(0.0);
    b += texture(bloom, uv + vec2(-t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0, -t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2(-t.x,  0.0)) * 30.0;
    b += texture(bloom, uv                  ) * 36.0;
    b += texture(bloom, uv + vec2( t.x,  0.0)) * 30.0;
    b += texture(bloom, uv + vec2(-t.x,  t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0,  t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x,  t.y)) * 25.0;
    b *= (1.0 / 256.0);

    // Same soft edge-fade as threshold so base and bloom share a
    // coverage footprint — base alpha tapers into the pad instead of
    // stepping from 1 to 0. The hard srcMask (same shape as the
    // threshold pass) kills anything outside src's valid [0,1] so
    // bloom pad extending past the src buffer doesn't repeat edge
    // pixels.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec4 baseColor = texture(src, clamp(uvSrc, 0.0, 1.0)) * srcMask;
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float baseMask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    baseColor.a *= baseMask;

    // Linear composite: decode base, add linear bloom, single pow out.
    vec3 baseLin = pow(baseColor.rgb, vec3(2.2));
    vec3 lin = baseLin + max(b.rgb, vec3(0.0)) * intensity;
    vec3 rgb = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));

    // TPDF dither just before 8-bit quantisation. Two IGN samples
    // summed give a triangular PDF in [-1, 1], which decorrelates the
    // quantisation error from the signal (uniform dither doesn't).
    // Independent per channel to avoid tinted bands.
    vec3 n1 = vec3(
        ign(gl_FragCoord.xy),
        ign(gl_FragCoord.xy + 17.0),
        ign(gl_FragCoord.xy + 41.0)
    );
    vec3 n2 = vec3(
        ign(gl_FragCoord.xy + 113.0),
        ign(gl_FragCoord.xy + 131.0),
        ign(gl_FragCoord.xy + 149.0)
    );
    vec3 n = n1 + n2 - 1.0;
    rgb += n * dither / 255.0;

    // Premultiply with the union coverage of base and bloom. At pad
    // edges both feed zero so rgb × a → 0 and the halo dissolves
    // instead of leaving a gamma-boosted floor behind.
    float a = clamp(max(baseColor.a, b.a * intensity), 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`,g={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},_=.5,v=class{params;#e=null;#t=[];#n=[];#r=!1;#i=0;#a=0;constructor(e={}){this.params={...g,...e}}setParams(e){Object.assign(this.params,e)}init(e){this.#e=e.createRenderTarget({float:!0})}render(e){if(!this.#e)return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(this.#e.width!==this.#i||this.#e.height!==this.#a)&&(this.#t.length=0,this.#n.length=0,this.#r=!1,this.#i=this.#e.width,this.#a=this.#e.height),this.#o(e,this.#e.width,this.#e.height);let s=this.#t.length;if(s===0)return;e.draw({frag:f,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:this.#e}),e.draw({frag:p,uniforms:{src:this.#e,texelSize:[1/this.#e.width,1/this.#e.height],karis:1},target:this.#t[0]});for(let t=1;t<s;t++){let n=this.#t[t-1];e.draw({frag:p,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:this.#t[t]})}let c=this.#e.width,l=this.#e.height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?this.#t[s-1]:this.#n[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:m,uniforms:{srcSmall:n,srcLarge:this.#t[t],texelSize:[_*r/c,_*r/l],weightLarge:d(t),weightSmall:i},target:this.#n[t]})}let g=s>=2?this.#n[0]:this.#t[0],v=r/Math.max(1,u);e.draw({frag:h,uniforms:{src:e.src,bloom:g,texelSize:[_*2/c,_*2/l],intensity:v,dither:a,edgeFade:o},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){this.#e=null,this.#t.length=0,this.#n.length=0,this.#r=!1,this.#i=0,this.#a=0}#o(e,t,n){if(this.#r)return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){this.#t.push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<this.#t.length-1;t++)this.#n.push(e.createRenderTarget({size:[this.#t[t].width,this.#t[t].height],float:!0}));this.#r=!0}}})),y,te,ne,re,ie,ae,oe,b,se,ce,x,S,C,w,le=e((()=>{y=256,te=`#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(-1.0, -1.0, -1.0, 0.0);
}
`,ne=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
void main() {
    // Random initial age stagger first respawns across the lifespan.
    float h = fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453);
    outColor = vec4(0.0, 0.0, 1.0, h);
}
`,re=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D spawn;     // .w: age
uniform vec2 mouseUv;
uniform float radius;        // radius in element px
uniform vec2 elementPixel;
uniform float time;          // sec
uniform float dt;            // sec
uniform float speed;         // uv per sec at full strength
uniform float noiseScale;
uniform float noiseAnimation;  // morph rate on the 4th (time) axis
uniform float aliveFraction;
uniform float speedDecay;      // life-taper curve exponent

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT).
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
    const vec2 C = vec2(0.138196601125010504,    // (5 - sqrt(5))/20  G4
                        0.309016994374947451);   // (sqrt(5) - 1)/4   F4
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

// 3D curl of a vector noise potential field. Time enters as the 4th
// simplex axis so the field morphs in place.
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

void main() {
    vec4 s = texture(state, uv);
    vec3 pos = s.xyz;
    float age = texture(spawn, uv).w;
    bool justRespawned = age >= 1.0;

    float shortAxis = min(elementPixel.x, elementPixel.y);

    if (justRespawned) {
        // Uniform 3D ball: cbrt(radius hash), isotropic direction.
        float r = pow(
            hash21(uv + vec2(time * 0.317, 0.123)), 1.0 / 3.0
        ) * radius;
        float theta = hash21(uv + vec2(0.0, time * 0.413)) * 6.28318530718;
        float cosPhi = hash21(uv + vec2(time * 0.521, 0.789)) * 2.0 - 1.0;
        float sinPhi = sqrt(max(0.0, 1.0 - cosPhi * cosPhi));
        vec3 dir = vec3(cos(theta) * sinPhi, sin(theta) * sinPhi, cosPhi);
        vec3 offsetPx = dir * r;
        // z normalized by shortAxis so the ball stays isotropic.
        pos = vec3(
            mouseUv + offsetPx.xy / elementPixel,
            offsetPx.z / shortAxis
        );
    } else {
        // Stretch xy so noise cells are pixel-isotropic.
        vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
        vec3 noiseInput = pos * stretch * noiseScale;
        vec3 vIn = curl3D(noiseInput, time * noiseAnimation);
        vec3 v = vIn / stretch;
        // Life taper: full speed at spawn, zero at end of visible life.
        // speedDecay > 1 holds high speed longer; < 1 decays fast early.
        float lifeRemaining = clamp(1.0 - age / max(aliveFraction, 1e-3), 0.0, 1.0);
        float lifeSpeed = pow(lifeRemaining, speedDecay);
        pos += v * speed * dt * lifeSpeed;
    }

    outColor = vec4(pos, justRespawned ? 1.0 : 0.0);
}
`,ie=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D prevSpawn;
uniform float dt;
uniform float time;
uniform float lifespan;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    float age = texture(prevSpawn, uv).w;

    vec4 s = texture(state, uv);
    bool justRespawned = s.w > 0.5;
    if (justRespawned) {
        // Negative age = pre-spawn delay so siblings desync.
        age = -hash21(uv + vec2(time * 0.123, 0.456)) * 0.7;
    } else {
        // Per-particle lifespan jitter to permanently desync particles.
        float lifespanScale = 0.6 + hash21(uv * 91.7 + 1.234) * 0.8;
        age += dt / (lifespan * lifespanScale);
    }

    outColor = vec4(0.0, 0.0, 0.0, age);
}
`,ae=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D prevColor;
uniform sampler2D src;

void main() {
    vec4 s = texture(state, uv);
    bool justRespawned = s.w > 0.5;
    if (justRespawned) {
        vec2 spawnUv = clamp(s.xy, 0.0, 1.0);
        outColor = texture(src, spawnUv);
    } else {
        outColor = texture(prevColor, uv);
    }
}
`,oe=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D state;
uniform sampler2D color;
uniform sampler2D spawn;  // .w: per-particle age (sin envelope drives alpha)
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float aliveFraction;
uniform float alpha;
uniform float fog;  // 0 = none, 1 = full depth fade

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
    vec4 s = texture(state, stateUv);
    vec4 c = texture(color, stateUv);
    float age = texture(spawn, stateUv).w;

    vec2 pos = s.xy;

    // Sin envelope on age.
    // age < 0: pre-spawn (queued)
    // alivePhase > 1: dead
    float alivePhase = age / max(aliveFraction, 1e-3);
    float lifeAlpha = (age >= 0.0 && alivePhase < 1.0)
        ? sin(alivePhase * 3.14159)
        : 0.0;

    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    // Depth fog
    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, s.z), fog);

    // Map pos to buffer-uv
    vec2 bufferUv = contentRectUv.xy + pos * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    // Calculate position from pointSize
    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha * fogFactor);
}
`,b=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,se=`#version 300 es
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
`,ce=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform sampler2D particleStamp;
uniform float trailFade;

void main() {
    vec4 prev = texture(trailPrev, uv);
    vec4 stamp = texture(particleStamp, uv);
    vec4 faded = prev * trailFade;
    outColor = vec4(
        faded.rgb + stamp.rgb,
        clamp(faded.a + stamp.a, 0.0, 1.0)
    );
}
`,x=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D trail;
uniform float backgroundOpacity;

void main() {
    // Mask src to [0,1] — trail buffer is canvas-sized.
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = inside.x * inside.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0))
              * backgroundOpacity * srcMask;
    vec4 t = texture(trail, uv);
    outColor = vec4(base.rgb * (1.0 - t.a) + t.rgb, max(base.a, t.a));
}
`,S={count:y*y,lifespan:3,aliveFraction:.7,speed:.15,noiseScale:2,noiseAnimation:.3,pointSize:2,alpha:.5,radius:30,speedDecay:1,backgroundOpacity:1,trailFade:.9,fog:.5},C=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),w=class{params;#e=null;#t=null;#n=null;#r=null;#i=null;#a=!1;#o=null;constructor(e={}){this.params={...S,...e}}init(e){let t={size:[y,y],float:!0,persistent:!0,wrap:`clamp`,filter:`nearest`};this.#e=e.createRenderTarget(t),this.#t=e.createRenderTarget(t),this.#n=e.createRenderTarget(t),this.#r=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`}),this.#i=e.createRenderTarget({float:!1,persistent:!0,wrap:`clamp`,filter:`linear`});let n=Math.max(1,Math.min(y*y,Math.floor(this.params.count)));this.#o={attributes:{position:C},instanceCount:n}}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r||!this.#i||!this.#o)return;let{lifespan:t,speed:n,noiseScale:r,pointSize:i,radius:a}=this.params,o=Math.min(.1,Math.max(0,e.deltaTime)),s=e.time,c=[e.dims.elementPixel[0],e.dims.elementPixel[1]],l=[e.mouse[0]/Math.max(1,c[0]),e.mouse[1]/Math.max(1,c[1])];this.#a||=(e.draw({frag:te,target:this.#e}),e.draw({frag:ne,target:this.#t}),!0),e.draw({frag:re,uniforms:{state:this.#e,spawn:this.#t,mouseUv:l,radius:a,elementPixel:c,time:s,dt:o,speed:n,noiseScale:r,noiseAnimation:this.params.noiseAnimation,aliveFraction:this.params.aliveFraction,speedDecay:this.params.speedDecay},target:this.#e}),e.draw({frag:ie,uniforms:{state:this.#e,prevSpawn:this.#t,dt:o,time:s,lifespan:t},target:this.#t}),e.draw({frag:ae,uniforms:{state:this.#e,prevColor:this.#n,src:e.src},target:this.#n}),e.draw({frag:b,target:this.#r}),e.draw({vert:oe,frag:se,uniforms:{state:this.#e,color:this.#n,spawn:this.#t,stateSize:[y,y],pointSize:i,elementPixel:c,particleCount:Math.min(y*y,Math.max(1,Math.floor(this.params.count))),aliveFraction:this.params.aliveFraction,alpha:this.params.alpha,fog:this.params.fog},geometry:this.#o,target:this.#r,blend:`additive`}),e.draw({frag:ce,uniforms:{trailPrev:this.#i,particleStamp:this.#r,trailFade:this.params.trailFade},target:this.#i}),e.draw({frag:x,uniforms:{src:e.src,trail:this.#i,backgroundOpacity:this.params.backgroundOpacity},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null,this.#i=null,this.#a=!1,this.#o=null}outputRect(e){return e.canvasRect}}})),T,E,D,O,k,A,j,M,N,P,F,I,ue=e((()=>{T=256,E=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform vec2 stateSize;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    // Texel-cell jitter to avoid a visible grid; small z seed so curl3D
    // and outward bias have non-zero z to amplify.
    vec2 jitter = (vec2(hash21(uv * 17.31), hash21(uv * 23.79)) - 0.5)
                  / stateSize;
    float z0 = (hash21(uv * 53.7 + 0.81) - 0.5) * 0.02;
    outColor = vec4(uv + jitter, z0, 0.0);
}
`,D=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D src;
uniform vec4 srcRectUv;

void main() {
    vec4 s = texture(state, uv);
    vec2 elementUv = clamp(s.xy, 0.0, 1.0);
    vec2 sampleUv = srcRectUv.xy + elementUv * srcRectUv.zw;
    outColor = texture(src, sampleUv);
}
`,O=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform float dt;
uniform float speed;
uniform float noiseScale;
uniform float outwardBias;
uniform float time;
uniform float duration;
uniform vec2 elementPixel;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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
    vec4 m = max(
        0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
        0.0
    );
    m = m * m;
    return 42.0 * dot(
        m * m,
        vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))
    );
}

// 3D curl with time as slow drift on the noise input.
vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec3 dx = vec3(eps, 0.0, 0.0);
    vec3 dy = vec3(0.0, eps, 0.0);
    vec3 dz = vec3(0.0, 0.0, eps);
    vec3 ts = vec3(t * 0.3);
    vec3 pa = p + ts;
    vec3 pb = p + vec3(31.341, 47.853, 19.287) + ts;
    vec3 pc = p + vec3(83.519, 71.523, 53.819) + ts;
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}

void main() {
    vec4 s = texture(state, uv);
    vec3 pos = s.xyz;
    float age = s.w;

    // Per-particle lifespan jitter so deaths stagger.
    float lifespanScale = 0.7 + hash21(uv * 91.7 + 1.234) * 0.6;
    age += dt / (duration * lifespanScale);

    if (age >= 0.0 && age < 1.0) {
        // Stretch xy so noise cells are pixel-isotropic.
        float shortAxis = min(elementPixel.x, elementPixel.y);
        vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
        vec3 noiseInput = pos * stretch * noiseScale;
        vec3 vNoise = curl3D(noiseInput, time) / stretch;
        // Outward from element center (xy from 0.5, z from spawn plane).
        vec3 outward = vec3(pos.xy - vec2(0.5), pos.z) * outwardBias;
        pos += (vNoise + outward) * speed * dt;
    }

    outColor = vec4(pos, age);
}
`,k=`#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D state;
uniform sampler2D color;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
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
    vec4 s = texture(state, stateUv);
    vec4 c = texture(color, stateUv);

    float age = s.w;
    // Quarter-cosine envelope: full alpha at trigger, 0 at age=1.
    float lifeAlpha = (age >= 0.0 && age <= 1.0)
        ? cos(age * 1.5707963)
        : 0.0;
    // Depth fog
    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, s.z), fog);

    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    // Map pos to buffer-uv
    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    // Calculate position from pointSize
    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * fogFactor);
}
`,A=`#version 300 es
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
`,j=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D particles;

void main() {
    vec4 p = texture(particles, uv);
    outColor = vec4(p.rgb, p.a);
}
`,M=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,N=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,P=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),F={count:T*T,duration:1.5,speed:.4,noiseScale:3,outwardBias:1.5,pointSize:3,fog:.5},I=class{params;#e=null;#t=null;#n=null;#r=null;#i;#a=!1;#o=-1;#s=!1;#c=0;constructor(e={},t){this.#i=t?[Math.max(1,t[0]),Math.max(1,t[1])]:[T,T];let n=this.#i[0]*this.#i[1];this.params={...F,count:n,...e}}trigger(){this.#a=!0,this.#o=-1,this.#s=!1}reset(){this.#a=!1,this.#o=-1,this.#s=!1,this.#c=0}isDone(){return this.#a&&this.#c>=this.params.duration}init(e){let t={size:this.#i,float:!0,persistent:!0,wrap:`clamp`,filter:`nearest`};this.#e=e.createRenderTarget(t),this.#t=e.createRenderTarget(t),this.#n=e.createRenderTarget({float:!1,wrap:`clamp`,filter:`linear`});let n=Math.max(1,Math.min(this.#i[0]*this.#i[1],Math.floor(this.params.count)));this.#r={attributes:{position:P},instanceCount:n}}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r)return;if(!this.#a){e.draw({frag:M,uniforms:{src:e.src},target:e.target});return}this.#o<0&&(this.#o=e.time);let t=e.time-this.#o;if(this.#c=t,t>=this.params.duration){e.draw({frag:N,target:e.target});return}let n=Math.min(.1,Math.max(0,e.deltaTime)),r=[e.dims.elementPixel[0],e.dims.elementPixel[1]];this.#s||=(e.draw({frag:E,uniforms:{stateSize:this.#i},target:this.#e}),e.draw({frag:D,uniforms:{state:this.#e,src:e.src},target:this.#t}),!0),e.draw({frag:O,uniforms:{state:this.#e,dt:n,speed:this.params.speed,noiseScale:this.params.noiseScale,outwardBias:this.params.outwardBias,time:e.time,duration:this.params.duration,elementPixel:r},target:this.#e}),e.draw({frag:N,target:this.#n}),e.draw({vert:k,frag:A,uniforms:{state:this.#e,color:this.#t,stateSize:this.#i,pointSize:this.params.pointSize,elementPixel:r,particleCount:Math.min(this.#i[0]*this.#i[1],Math.max(1,Math.floor(this.params.count))),fog:this.params.fog},geometry:this.#r,target:this.#n,blend:`additive`}),e.draw({frag:j,uniforms:{particles:this.#n},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null}outputRect(e){return e.canvasRect}}})),L,R,z,B,V,H,U,W,de,fe,pe,me=e((()=>{L=`#version 300 es
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
`,R=`#version 300 es
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
`,z=`#version 300 es
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
`,B=`#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`,V=`#version 300 es
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
`,H=`#version 300 es
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
`,U=`#version 300 es
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
`,W=`#version 300 es
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
`,de=`#version 300 es
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
`,fe={simSize:[256,256],pressureIterations:1,curlStrength:13,velocityDissipation:.6,densityDissipation:.65,splatForce:6e3,splatRadius:.002,dyeSplatRadius:.001,dyeSplatIntensity:.005,showDye:!1},pe=class{params;#e=null;#t=null;#n=null;#r=null;#i=null;#a=null;#o=null;#s=null;#c=[0,0];#l=!1;constructor(e={}){this.params={...fe,...e}}init(e){let t=this.params.simSize,n={size:t,float:!0};this.#e=e.createRenderTarget(n),this.#t=e.createRenderTarget(n),this.#n=e.createRenderTarget(n),this.#r=e.createRenderTarget(n),this.#i=e.createRenderTarget(n),this.#a=e.createRenderTarget(n),this.#o=e.createRenderTarget({size:t,float:!0,persistent:!0}),this.#s=e.createRenderTarget({float:!0,persistent:!0})}render(e){if(!this.#e||!this.#t||!this.#n||!this.#r||!this.#i||!this.#a||!this.#o||!this.#s)return;let{simSize:t,pressureIterations:n,curlStrength:r,velocityDissipation:i,densityDissipation:a,splatForce:o,splatRadius:s,dyeSplatRadius:c,dyeSplatIntensity:l,showDye:u}=this.params,d=[1/t[0],1/t[1]],[f,p]=e.dims.elementPixel,m=f/p,h=[e.mouse[0]/f,e.mouse[1]/p],g=this.#l?[h[0]-this.#c[0],h[1]-this.#c[1]]:[0,0];this.#c=h,this.#l=!0,e.draw({frag:L,uniforms:{velocity:this.#o,simTexel:d},target:this.#e}),e.draw({frag:R,uniforms:{velocity:this.#o,curl:this.#e,simTexel:d,aspect:m,mouseUv:h,mouseDeltaUv:g,curlStrength:r,splatForce:o,splatRadius:s},target:this.#t}),e.draw({frag:z,uniforms:{vortVel:this.#t,simTexel:d},target:this.#n}),e.draw({frag:B,target:this.#r});let _=this.#r,v=this.#i;for(let t=0;t<n;t++){e.draw({frag:V,uniforms:{pressure:_,divergence:this.#n,simTexel:d},target:v});let t=_;_=v,v=t}e.draw({frag:H,uniforms:{vortVel:this.#t,pressure:_,simTexel:d},target:this.#a}),e.draw({frag:U,uniforms:{projVel:this.#a,simTexel:d,velocityDissipation:i},target:this.#o}),e.draw({frag:W,uniforms:{velocity:this.#o,dye:this.#s,time:e.time,aspect:m,mouseUv:h,mouseDeltaUv:g,simSize:t,densityDissipation:a,dyeSplatRadius:c,dyeSplatIntensity:l},target:this.#s}),e.draw({frag:de,uniforms:{src:e.src,dye:this.#s,velocity:this.#o,simSize:t,showDye:+!!u,time:e.time},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=null,this.#r=null,this.#i=null,this.#a=null,this.#o=null,this.#s=null,this.#l=!1}}}));function he(e={}){let t=e.size??10;return{render(e){let n=e.src.width||1,r=e.src.height||1;e.draw({frag:ge,uniforms:{src:e.src,cellUv:[t/n,t/r]},target:e.target})}}}var ge,_e=e((()=>{ge=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 cellUv;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Snap to cell centers in dst inner UV, then remap into src
        // inner region via srcRectUv so sampling is correct whether
        // src is capture or a prior stage's padded intermediate.
        vec2 cell = (floor(uvContent / cellUv) + 0.5) * cellUv;
        vec2 uv = srcRectUv.xy + clamp(cell, 0.0, 1.0) * srcRectUv.zw;
        c = texture(src, uv);
    }
    outColor = c;
}
`})),ve,ye,be,xe,Se,Ce=e((()=>{ve=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    // Strong central blob + scattered weak seeds → richer pattern
    // evolution than a single blob (which radiates symmetrically).
    vec2 c = uv - 0.5;
    float blob = smoothstep(0.12, 0.06, length(c));
    float sprinkle = step(0.997, hash(floor(uv * 64.0))) * 0.6;
    float b = max(blob, sprinkle);
    outColor = vec4(1.0, b, 0.0, 1.0);
}
`,ye=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D state;
uniform sampler2D srcImg;
uniform vec2 texel;
uniform float feed;
uniform float kill;
uniform float diffA;
uniform float diffB;
uniform float dt;
uniform int sourceMode;     // 0=alpha, 1=luminance
uniform int scaleEnabled;
uniform vec2 scaleRange;

float readSource(vec2 sampleUv) {
    vec4 s = texture(srcImg, sampleUv);
    return sourceMode == 0
        ? s.a
        : dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec2 c = texture(state, uv).rg;

    float texelMul = 1.0;
    if (scaleEnabled == 1) {
        float sv = readSource(uv);
        texelMul = mix(scaleRange.x, scaleRange.y, sv);
    }
    vec2 t = texel * texelMul;

    vec2 N  = texture(state, uv + vec2( 0.0,  t.y)).rg;
    vec2 S  = texture(state, uv + vec2( 0.0, -t.y)).rg;
    vec2 E  = texture(state, uv + vec2( t.x, 0.0)).rg;
    vec2 W  = texture(state, uv + vec2(-t.x, 0.0)).rg;
    vec2 NE = texture(state, uv + vec2( t.x,  t.y)).rg;
    vec2 NW = texture(state, uv + vec2(-t.x,  t.y)).rg;
    vec2 SE = texture(state, uv + vec2( t.x, -t.y)).rg;
    vec2 SW = texture(state, uv + vec2(-t.x, -t.y)).rg;

    vec2 lap = (N + S + E + W) * 0.2 + (NE + NW + SE + SW) * 0.05 - c;

    float a = c.r;
    float b = c.g;
    float reaction = a * b * b;
    float dA = diffA * lap.x - reaction + feed * (1.0 - a);
    float dB = diffB * lap.y + reaction - (kill + feed) * b;

    outColor = vec4(
        clamp(a + dA * dt, 0.0, 1.0),
        clamp(b + dB * dt, 0.0, 1.0),
        0.0,
        1.0
    );
}
`,be=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D pattern;
uniform float intensity;
uniform int mode;
uniform int sourceMode;

vec3 spectrum(float x) {
    return cos((x - vec3(0.0, 0.5, 1.0)) * vec3(0.6, 1.0, 0.5) * 3.14);
}

float readSource(vec4 s) {
    return sourceMode == 0
        ? s.a
        : dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec4 base = texture(src, uvSrc);
    float sv = readSource(base);
    float p = texture(pattern, uv).g;
    float pi = clamp(p * intensity, 0.0, 1.0);
    vec3 tint = 0.5 + 0.5 * spectrum(p * 1.2);

    if (mode == 0) {
        outColor = vec4(tint * pi, pi * sv);
    } else {
        outColor = vec4(mix(base.rgb, tint, pi), base.a);
    }
}
`,xe={simMaxDim:256,feed:.0367,kill:.0649,diffA:1,diffB:.5,dt:1,stepsPerFrame:8,intensity:1,source:`alpha`,mode:`mask`,scaleRange:[.5,3]},Se=class{params;#e=null;#t=null;#n=!1;constructor(e={}){this.params={...xe,...e}}init(e){}reseed(){this.#n=!1}render(e){let t=this.#r(e);if(!t||((!this.#e||!this.#t||this.#e.width!==t[0]||this.#e.height!==t[1])&&this.#i(e,t),!this.#e||!this.#t))return;let{feed:n,kill:r,diffA:i,diffB:a,dt:o,stepsPerFrame:s,intensity:c,source:l,mode:u,scaleRange:d}=this.params,f=[1/this.#e.width,1/this.#e.height],p=l===`alpha`?0:1,m=+(u===`scale`),h=u===`mask`?0:1;this.#n||=(e.draw({frag:ve,target:this.#e}),!0);let g=this.#e,_=this.#t;for(let t=0;t<s;t++){e.draw({frag:ye,uniforms:{state:g,srcImg:e.src,texel:f,feed:n,kill:r,diffA:i,diffB:a,dt:o,sourceMode:p,scaleEnabled:m,scaleRange:d},target:_});let t=g;g=_,_=t}e.draw({frag:be,uniforms:{src:e.src,pattern:g,intensity:c,mode:h,sourceMode:p},target:e.target})}dispose(){this.#e=null,this.#t=null,this.#n=!1}#r(e){let[t,n]=e.dims.elementPixel;if(t<1||n<1)return null;let r=t/n,i=Math.max(16,Math.floor(this.params.simMaxDim));return[r>=1?i:Math.max(16,Math.round(i*r)),r>=1?Math.max(16,Math.round(i/r)):i]}#i(e,t){let n={size:t,float:!0,persistent:!0,wrap:`clamp`,filter:`linear`};this.#e=e.createRenderTarget(n),this.#t=e.createRenderTarget(n),this.#n=!1}}}));function we(e={}){let t=e.spacing??4;return{render(e){e.draw({frag:Te,uniforms:{src:e.src,innerHeight:e.src.height||1,spacing:t},target:e.target})}}}var Te,Ee=e((()=>{Te=`#version 300 es
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
`}));function De(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var Oe,ke,Ae,je=e((()=>{Oe=`#version 300 es
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

    outColor = mix(bgColor, base, visibleMask);
}
`,ke={cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},Ae=class{params;constructor(e={}){this.params={...ke,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.elementPixel,r=Math.max(1,t),i=Math.max(1,n),a=this.params;e.draw({frag:Oe,uniforms:{src:e.src,mouseUv:[e.mouse[0]/r,e.mouse[1]/i],elementPx:[r,i],cellSize:a.cellSize,pressRadius:a.pressRadius,press:a.press,flatCells:+!!a.flatCells,seed:a.seed,time:e.time,speed:Math.max(0,a.speed),breathe:Math.max(0,a.breathe),breatheSpeed:Math.max(0,a.breatheSpeed),breatheScale:Math.max(1,a.breatheScale),bgColor:De(a.bgColor)},target:e.target})}}}));function Me(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
        <h1 style="font-family: serif; font-weight: normal;
                   border-bottom: 1px solid #a2a9b1;
                   padding-bottom: 4px; margin: 0 0 4px;">
            Voronoi diagram
        </h1>
        <div style="font-size: 0.85em; color: #54595d; margin-bottom: 16px;">
            From Wikipedia, the free encyclopedia
        </div>
        <p>
            In mathematics, a <b>Voronoi diagram</b> is a partition of a
            plane into regions close to each of a given set of objects.
            It is named after Georgy Voronoy and is also known as a
            Dirichlet tessellation or Thiessen polygons.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <polygon points="0,0 110,0 100,55 0,70" fill="#fce5cd" stroke="#54595d"/>
            <polygon points="110,0 240,0 220,75 100,55" fill="#d9ead3" stroke="#54595d"/>
            <polygon points="240,0 400,0 400,80 220,75" fill="#cfe2f3" stroke="#54595d"/>
            <polygon points="0,70 100,55 130,140 0,160" fill="#ead1dc" stroke="#54595d"/>
            <polygon points="100,55 220,75 240,150 130,140" fill="#fff2cc" stroke="#54595d"/>
            <polygon points="220,75 400,80 400,170 240,150" fill="#d0e0e3" stroke="#54595d"/>
            <polygon points="0,160 130,140 145,240 0,240" fill="#f4cccc" stroke="#54595d"/>
            <polygon points="130,140 240,150 250,240 145,240" fill="#d9d2e9" stroke="#54595d"/>
            <polygon points="240,150 400,170 400,240 250,240" fill="#fff2cc" stroke="#54595d"/>
            <circle cx="50" cy="30" r="3" fill="#202122"/>
            <circle cx="170" cy="30" r="3" fill="#202122"/>
            <circle cx="320" cy="35" r="3" fill="#202122"/>
            <circle cx="50" cy="110" r="3" fill="#202122"/>
            <circle cx="170" cy="105" r="3" fill="#202122"/>
            <circle cx="320" cy="120" r="3" fill="#202122"/>
            <circle cx="65" cy="200" r="3" fill="#202122"/>
            <circle cx="190" cy="195" r="3" fill="#202122"/>
            <circle cx="320" cy="205" r="3" fill="#202122"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 1. A Voronoi diagram with 9 sites in the plane.
            </figcaption>
        </figure>
        <h2 style="${t}">Definition</h2>
        <p>
            For each seed there is a corresponding region, called a
            <i>Voronoi cell</i>, consisting of all points of the plane
            closer to that seed than to any other. Cell boundaries are
            segments of the perpendicular bisectors between pairs of
            neighbouring sites.
        </p>
        <h2 style="${t}">History</h2>
        <p>
            Informal use dates back to Descartes (<i>Principia
            Philosophiae</i>, 1644). Lejeune Dirichlet studied the 2D
            and 3D cases in 1850, and Georgy Voronoy generalized the
            construction to higher dimensions in 1908. In meteorology,
            Alfred Thiessen rediscovered the planar version in 1911 to
            estimate rainfall over a region.
        </p>
        <h2 style="${t}">Properties</h2>
        <ul>
            <li>Each Voronoi cell is a convex polygon (or polytope).</li>
            <li>The number of edges of an unbounded cell equals the
                number of its Voronoi neighbours.</li>
            <li>For sites in general position, each Voronoi vertex is
                the centre of a circle that passes through three sites
                and contains no other site in its interior.</li>
            <li>The diagram has at most <i>2n − 5</i> vertices and
                <i>3n − 6</i> edges for <i>n</i> sites.</li>
        </ul>
        <h2 style="${t}">Dual: Delaunay triangulation</h2>
        <p>
            The dual graph of a Voronoi diagram is the <b>Delaunay
            triangulation</b>: connect two sites by an edge whenever
            their cells share a boundary segment. The Delaunay
            triangulation maximizes the minimum interior angle of all
            triangles, avoiding sliver triangles.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <g fill="none" stroke="#54595d" stroke-width="1.2">
                <line x1="60" y1="40" x2="180" y2="60"/>
                <line x1="180" y1="60" x2="320" y2="35"/>
                <line x1="60" y1="40" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="340" y2="140"/>
                <line x1="220" y1="150" x2="340" y2="140"/>
                <line x1="80" y1="140" x2="220" y2="150"/>
            </g>
            <circle cx="60" cy="40" r="4" fill="#cc0000"/>
            <circle cx="180" cy="60" r="4" fill="#cc0000"/>
            <circle cx="320" cy="35" r="4" fill="#cc0000"/>
            <circle cx="80" cy="140" r="4" fill="#cc0000"/>
            <circle cx="220" cy="150" r="4" fill="#cc0000"/>
            <circle cx="340" cy="140" r="4" fill="#cc0000"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 2. Delaunay triangulation of 6 sites.
            </figcaption>
        </figure>
        <h2 style="${t}">Algorithms</h2>
        <p>
            Several algorithms construct Voronoi diagrams in
            <i>O(n log n)</i> time, matching the lower bound:
        </p>
        <ul>
            <li><b>Fortune's algorithm</b> (1987) — sweepline approach
                using a parabolic beach line.</li>
            <li><b>Bowyer–Watson algorithm</b> — incremental
                construction of the dual Delaunay triangulation.</li>
            <li><b>Lloyd's relaxation</b> — iterative method that moves
                each site to its cell's centroid, producing centroidal
                Voronoi tessellations.</li>
            <li><b>Divide and conquer</b> — Shamos and Hoey, 1975.</li>
        </ul>
        <h2 style="${t}">Applications</h2>
        <p>
            Voronoi diagrams have practical and theoretical uses in
            many fields, mainly in science and technology, but also in
            visual art:
        </p>
        <ul>
            <li>Computational geometry — nearest-neighbour search,
                largest empty circle, motion planning.</li>
            <li>Solid-state physics — Wigner–Seitz cells of crystal
                lattices.</li>
            <li>Cellular biology — modelling tissue packing and
                epithelial cell shapes.</li>
            <li>Networking and infrastructure — service-area
                assignment, cellphone tower coverage, school
                catchments.</li>
            <li>Procedural graphics — texture synthesis, terrain
                generation, stylized shading.</li>
            <li>Astronomy — analysing galaxy distribution and the
                cosmic web.</li>
        </ul>
        <h2 style="${t}">See also</h2>
        <ul>
            <li>Centroidal Voronoi tessellation</li>
            <li>Power diagram (weighted Voronoi)</li>
            <li>Apollonius diagram</li>
            <li>Worley noise</li>
        </ul>
        <h2 style="${t}">References</h2>
        <ol style="font-size: 0.9em; color: #202122;">
            <li>Voronoy, G. (1908). "Nouvelles applications des
                paramètres continus à la théorie des formes
                quadratiques." <i>J. Reine Angew. Math.</i> 133.</li>
            <li>Aurenhammer, F. (1991). "Voronoi diagrams — a survey of
                a fundamental geometric data structure." <i>ACM
                Computing Surveys</i> 23 (3): 345–405.</li>
            <li>Fortune, S. (1987). "A sweepline algorithm for Voronoi
                diagrams." <i>Algorithmica</i> 2: 153–174.</li>
            <li>Okabe, A.; Boots, B.; Sugihara, K.; Chiu, S. N. (2000).
                <i>Spatial Tessellations: Concepts and Applications of
                Voronoi Diagrams</i> (2nd ed.). Wiley.</li>
        </ol>
    `,e}function G(e){let t=Math.round(window.innerWidth/2),n=Math.round(window.innerHeight/2),r=Math.min(t,n)*.4,i=0,a=window.setInterval(()=>{let o=i/60*Math.PI*2;e.dispatchEvent(new MouseEvent(`pointermove`,{clientX:t+Math.cos(o)*r,clientY:n+Math.sin(o)*r,bubbles:!0})),i++,i>120&&clearInterval(a)},16)}var Ne,K,q,J,Y,X,Z,Q,$;e((()=>{d(),s(),ee(),le(),ue(),me(),_e(),Ce(),Ee(),je(),l(),i(),Ne={title:`Effect`,parameters:{layout:`fullscreen`}},K={render:()=>{let e=document.createElement(`img`);return e.src=c,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},K.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=t(),i=new v({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await r.add(n,{effect:i}),o(`Bloom`,i)},q={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},q.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=t(),i=new v({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await r.add(n,{effect:[he({size:10}),we({spacing:5}),i]}),o(`CRT Bloom`,i)},J={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},J.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=t(),a=new pe;await i.add(n,{effect:a}),r(`Fluid`,a),G(e)},Y={render:()=>{let e=document.createElement(`img`);return e.src=c,e},args:void 0},Y.play=async({canvasElement:e})=>{let r=e.querySelector(`img`);await new Promise(e=>{r.onload=e});let i=t({autoplay:!1}),a=new Se;await i.add(r,{effect:a}),n(`Reaction-Diffusion`,a);for(let e=0;e<120;e++)i.render();i.play()},X={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},X.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=t(),i=new w,o=new I;await r.add(n,{effect:[i,o]}),a(`Particles`,i,o,{img:n,sources:{Jellyfish:u,Logo:c}}),G(e)},Z={render:()=>{let e=document.createElement(`img`);return e.src=c,e},args:void 0},Z.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e}),await new Promise(e=>requestAnimationFrame(()=>e(void 0)));let r=window.devicePixelRatio||1,i=2048,o=Math.min(i,Math.max(1,Math.round((n.clientWidth||n.naturalWidth)*r))),s=Math.min(i,Math.max(1,Math.round((n.clientHeight||n.naturalHeight)*r))),l=t(),d=new w({pointSize:1}),f=new I({},[o,s]);await l.add(n,{effect:[d,f]}),a(`Particles`,d,f,{img:n,sources:{Logo:c,Jellyfish:u}}),G(e)},Q={render:e=>{let{src:n,...r}=e,i=t(),a=new Ae(r);if(n===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=Me();return t.appendChild(n),i.addHTML(n,{effect:a}),t}let o=document.createElement(`img`);return o.src=n===`Jellyfish`?u:c,i.add(o,{effect:a}),o},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...effectArgs
    } = args;
    const vfx = initVFX();
    const effect = new VoronoiEffect(effectArgs);
    if (src === "Webpage") {
      // Webpage is taller than the viewport — switch storybook-root
      // from its default flex-centred layout (preset.css) to block
      // so the article anchors at the top and the page scrolls.
      const root = document.getElementById("storybook-root");
      if (root) {
        root.style.height = "auto";
        root.style.display = "block";
      }

      // wrapElement needs a parentNode at addHTML time so it can
      // splice the canvas wrapper between parent and target.
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      const article = createVoronoiWebpage();
      wrapper.appendChild(article);
      vfx.addHTML(article, {
        effect
      });
      return wrapper;
    }
    const img = document.createElement("img");
    img.src = src === "Jellyfish" ? Jellyfish : Logo;
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Webpage",
    cellSize: 40,
    pressRadius: 200,
    press: 1,
    flatCells: false,
    seed: 0,
    speed: 0,
    breathe: 0,
    breatheSpeed: 0,
    breatheScale: 40,
    bgColor: "#00000000"
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Logo", "Jellyfish", "Webpage"]
    },
    cellSize: {
      control: {
        type: "range",
        min: 5,
        max: 200,
        step: 1
      }
    },
    pressRadius: {
      control: {
        type: "range",
        min: 0,
        max: 800,
        step: 10
      }
    },
    press: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    flatCells: {
      control: {
        type: "boolean"
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 1000,
        step: 1
      }
    },
    speed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breathe: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    breatheSpeed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breatheScale: {
      control: {
        type: "range",
        min: 10,
        max: 500,
        step: 5
      }
    },
    bgColor: {
      control: {
        type: "color"
      }
    }
  }
}`,...Q.parameters?.docs?.source}}},$=[`bloom`,`crtBloom`,`fluid`,`reactionDiffusion`,`curlParticles`,`curlParticlesExplode`,`voronoi`]}))();export{$ as __namedExportsOrder,K as bloom,q as crtBloom,X as curlParticles,Z as curlParticlesExplode,Ne as default,J as fluid,Y as reactionDiffusion,Q as voronoi};