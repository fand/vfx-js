import{t as e}from"./esm.B47oQXna.js";import{n as t}from"./lifecycle.v3sQOfPt.js";var n=`#version 300 es
precision highp float;
in vec2 uv;
uniform vec2 resolution;
uniform vec2 center;
uniform float zoom;
uniform float exposure;
uniform float time;
uniform float dispersion;
uniform float blend;
uniform float bandsFront;
uniform float bandWidth;
uniform float bandIntensity;
uniform float spot;
uniform float chroma;
uniform float noise;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float noiseChroma;
uniform sampler2D accum;
out vec4 outColor;


float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Asymmetric gaussian used by the CIE fit below.
float lobe(float x, float mu, float s1, float s2) {
    float t = (x - mu) / (x < mu ? s1 : s2);
    return exp(-.5 * t * t);
}

// Linear sRGB response for a wavelength in nm (CIE 1931 fit by Wyman et al.).
vec3 spectrum(float nm) {
    vec3 xyz = vec3(
        1.056 * lobe(nm, 599.8, 37.9, 31.) + .362 * lobe(nm, 442., 16., 26.7) - .065 * lobe(nm, 501.1, 20.4, 26.2),
        .821 * lobe(nm, 568.8, 46.9, 40.5) + .286 * lobe(nm, 530.9, 16.3, 31.1),
        1.217 * lobe(nm, 437., 11.8, 36.) + .681 * lobe(nm, 459., 26., 13.8)
    );
    return mat3(
        3.2406, -.9689, .0557,
        -1.5372, 1.8758, -.204,
        -.4986, .0415, 1.057
    ) * xyz;
}


#define SPHERES 4
// Sphere layout and light bands change once per frame, so the CPU computes them (see layoutSpheres).
uniform vec4 spheres[SPHERES];
uniform vec3 bandAxes[4];

// Dark studio lit by 4 rotating light bands and an optional key light.
vec3 env(vec3 d) {
    float c = .02 + .1 * smoothstep(-.2, 1., d.y);
    // The camera sits on +z, so d.z > 0 is the half of each band in front of the scene.
    float front = mix(1., smoothstep(.15, -.15, d.z), bandsFront);
    for (int i = 0; i < 4; i++) {
        c += smoothstep(bandWidth, .0, abs(dot(d, bandAxes[i]))) * bandIntensity * front;
    }
    c += smoothstep(.9, .97, dot(d, normalize(vec3(-.5, .7, .4)))) * 4. * spot;
    return vec3(c);
}

// Smooth noise from 4 octaves of turned and warped sine waves. No hash, so no grain.
const mat3 OCTAVE_TURN = mat3(0, .8, .6, -.8, .36, -.48, -.6, -.48, .64);
float cyclicNoise(vec3 p) {
    float n = 0.;
    float amp = 1.;
    for (int i = 0; i < 4; i++) {
        p = OCTAVE_TURN * p;
        p += sin(p.yzx) * .7;
        n += dot(sin(p), cos(p.zxy)) * amp;
        amp = .55;
        p *= 1.7;
    }
    return n / 1.55;
}

// Cheap rainbow: red at 0, blue at 1. Shifted toward blue.
vec3 fakeSpectrum(float x) {
    x = x * .8 + .2;
    return cos((x - vec3(0, .5, 1)) * vec3(.6, 1, .5) * 3.14159265);
}

// Soft rainbow glow along the noise, like light split by glass.
vec3 fringes(vec2 frag) {
    vec2 q = (frag - resolution * .5) / resolution.y * noiseScale;
    float t = time * noiseSpeed;

    // Drift, turn 45 degrees and stretch, so the bands run diagonally.
    q.y -= t;
    q = vec2(q.x - q.y, q.x + q.y);
    q.x *= 2.;
    q.y -= t * .7;

    float v = cyclicNoise(vec3(q, t * .8));
    float x = clamp(v * .6 + .5 + sin(t) * .2, 0., 1.);

    // Fade out toward both ends of the spectrum.
    vec3 color = max(fakeSpectrum(x), 0.) * smoothstep(.7, 0., abs(.5 - x));
    color = mix(vec3(dot(color, vec3(.3, .6, .1))), color, noiseChroma);
    return color * noiseIntensity;
}

// XOR: a point is solid when it sits inside an odd number of spheres.
bool inside(vec3 p) {
    bool odd = false;
    for (int i = 0; i < SPHERES; i++) {
        if (length(p - spheres[i].xyz) < spheres[i].w) odd = !odd;
    }
    return odd;
}

// Nearest sphere boundary along the ray after tMin.
float nextBoundary(vec3 o, vec3 d, float tMin, out int hitIndex) {
    float best = 1e9;
    hitIndex = -1;
    for (int i = 0; i < SPHERES; i++) {
        vec3 oc = o - spheres[i].xyz;
        float b = dot(oc, d);
        float h = b * b - dot(oc, oc) + spheres[i].w * spheres[i].w;
        if (h < 0.) continue;
        h = sqrt(h);
        if (-b - h > tMin && -b - h < best) { best = -b - h; hitIndex = i; }
        if (-b + h > tMin && -b + h < best) { best = -b + h; hitIndex = i; }
    }
    return best;
}

// Walk the sphere boundaries until the solid's inside/outside state flips.
// Returns the distance (or -1) and the outward normal of the solid.
float nextSurface(vec3 o, vec3 d, out vec3 n) {
    bool startInside = inside(o + d * 1e-3);
    float t = 1e-3;
    for (int k = 0; k < SPHERES * 2; k++) {
        int hitIndex;
        t = nextBoundary(o, d, t, hitIndex);
        if (hitIndex < 0) return -1.;
        vec3 p = o + d * t;
        if (inside(p + d * 1e-3) != startInside) {
            n = normalize(p - spheres[hitIndex].xyz);
            if (inside(p + n * 1e-3)) n = -n;
            return t;
        }
        t += 1e-4;
    }
    return -1.;
}

// Follow one wavelength through the solid. It may leave and enter again, since the shape isn't convex.
vec3 trace(vec3 o, vec3 d, float ior) {
    for (int e = 0; e < 3; e++) {
        bool inGlass = inside(o + d * 1e-3);
        vec3 n;
        float t = nextSurface(o, d, n);
        if (t < 0.) return env(d);
        o += d * t;
        vec3 facing = inGlass ? -n : n;
        vec3 r = refract(d, facing, inGlass ? ior : 1. / ior);
        d = dot(r, r) > 0. ? r : reflect(d, facing);
    }
    return env(d);
}

void main() {
    vec2 frag = uv * resolution;

    // New random subpixel position and wavelengths every frame. Blending frames smooths edges and grain.
    vec2 seedPos = gl_FragCoord.xy + fract(time * vec2(61.7, 13.3)) * 100.;
    vec2 subpixel = vec2(hash(seedPos + 1.), hash(seedPos + 2.)) - .5;
    float jitter = hash(seedPos);

    // Zoom in more on wide screens so the spheres keep filling them.
    float aspectZoom = max(zoom, zoom * resolution.x / resolution.y / 1.6);
    vec2 p = (frag + subpixel - resolution * center) / (resolution.y * aspectZoom);
    vec3 ro = vec3(0, 0, 4.2);
    vec3 rd = normalize(vec3(p, -1.6));
    vec3 n;
    float t = nextSurface(ro, rd, n);

    vec4 current = vec4(0);
    if (t >= 0.) {
        vec3 pos = ro + rd * t;
        float fresnel = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
        vec3 reflected = env(reflect(rd, n));
        vec3 c = vec3(0);
        vec3 total = vec3(0);
        for (int i = 0; i <4; i++) {
            float nm = mix(400., 700., (float(i) + jitter) / 4.);
            float um = nm / 1000.;
            float ior = 1.5 + dispersion * 1.5 * ((.55 * .55) / (um * um) - 1.);
            // chroma 0 keeps the bend but drops the color, so strong dispersion stays soft.
            vec3 weight = mix(vec3(1), spectrum(nm), chroma);
            vec3 refracted = trace(pos, refract(rd, n, 1. / ior), ior);
            c += mix(refracted, reflected, fresnel) * weight;
            total += weight;
        }
        current = vec4(max(c / total, 0.) * exposure, 1);
    } else if (noise > .5) {
        // Premultiplied alpha, so the page pattern still shows through the dark parts.
        vec3 c = fringes(frag);
        current = vec4(c, max(c.r, max(c.g, c.b)));
    }

    vec4 previous = texture(accum, uv);
    outColor = mix(previous, current, blend);
}
`,r=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D accum;
out vec4 outColor;

void main() {
    outColor = texture(accum, uv);
}
`,i=4,a=[.3,.4,.7,.6],o=Math.PI*2/128,s=[[2,2,3],[3,2,2],[3,2,2],[7,7,7]],c=[[3.451,4.592,6.138],[1.132,5.169,.372],[1.649,1.475,2.942],[5.557,1.123,3.039]],l=.2;function u([e,t,n]){let r=Math.hypot(e,t,n);return[e/r,t/r,n/r]}function d(e,t,n){let[r,i,a]=u(e),o=Math.sin(t),s=Math.cos(t),c=(r*n[0]+i*n[1]+a*n[2])*(1-s);return[n[0]*s+(i*n[2]-a*n[1])*o+r*c,n[1]*s+(a*n[0]-r*n[2])*o+i*c,n[2]*s+(r*n[1]-i*n[0])*o+a*c]}function f(e,t){let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)}function p(e){return[0,1,2,3].map(t=>{let n=t+30,r=t=>f(n+t,e)-.5;return{start:u([r(0),r(.1),r(.2)]),spin:u([r(.3),r(.4),r(.5)]),speed:(.05+.1*f(n+.6,e))*(f(n+.7,e)<.5?-1:1)}})}function m(e,t){let n=e*o,r=a.map((t,r)=>{let i=s[r].map((t,n)=>Math.sin(e*t*o+c[r][n])*.7);return d([.3,1,.2],n,d([1,0,.3],n,i))});for(let e=0;e<8;e++)for(let e=0;e<i;e++)for(let t=e+1;t<i;t++){let n=r[e],i=r[t],o=[i[0]-n[0],i[1]-n[1],i[2]-n[2]],s=Math.hypot(o[0],o[1],o[2]),c=a[e]+a[t]-l*2*Math.min(a[e],a[t]);if(s>c){let e=(s-c)*.5/s;for(let t=0;t<3;t++)n[t]+=o[t]*e,i[t]-=o[t]*e}}let u=[0,0,0],f=0;for(let e=0;e<i;e++){let t=a[e]*a[e];for(let n=0;n<3;n++)u[n]+=r[e][n]*t;f+=t}for(let e=0;e<i;e++){for(let n=0;n<3;n++)t[e*4+n]=r[e][n]-u[n]/f;t[e*4+3]=a[e]}}var h=class{center;zoom;exposure;noise;noiseIntensity;noiseScale;noiseSpeed;noiseChroma;#e=null;#t=p(Math.random()*100);#n=new Float32Array(16);#r=new Float32Array(12);constructor(e={}){this.center=e.center??[.5,.5],this.zoom=e.zoom??1,this.exposure=e.exposure??1,this.noise=e.noise??!0,this.noiseIntensity=e.noiseIntensity??.2,this.noiseScale=e.noiseScale??.4,this.noiseSpeed=e.noiseSpeed??.05,this.noiseChroma=e.noiseChroma??.6}init(e){this.#e=e.createRenderTarget({float:!0,persistent:!0})}render(e){if(this.#e){m(e.time,this.#n);for(let[t,n]of this.#t.entries())this.#r.set(d(n.spin,e.time*n.speed,n.start),t*3);e.draw({frag:n,uniforms:{accum:this.#e,resolution:[...e.dims.elementPixel],center:this.center,zoom:this.zoom,exposure:this.exposure,time:e.time,spheres:this.#n,bandAxes:this.#r,dispersion:.42,chroma:.7,blend:.15,bandsFront:1,spot:0,bandWidth:.3,bandIntensity:.4,noise:+!!this.noise,noiseIntensity:this.noiseIntensity,noiseScale:this.noiseScale,noiseSpeed:this.noiseSpeed,noiseChroma:this.noiseChroma},target:this.#e}),e.draw({frag:r,uniforms:{accum:this.#e},target:e.target})}}dispose(){this.#e=null}},g=new e({pixelRatio:1,zIndex:-3,scrollPadding:!1});g.canvas.classList.add(`BGCanvas`);var _=`data-astro-transition-persist`;g.canvas.setAttribute(_,`bg-canvas`),document.addEventListener(`astro:before-swap`,e=>{let t=e.newDocument.createElement(`div`);t.setAttribute(_,`bg-canvas`),e.newDocument.body.append(t)});var v=new h({center:[.65,.5],zoom:1.4,noiseIntensity:.2,noiseScale:1,noiseSpeed:.1,noiseChroma:.4}),y;function b(){return y??=x(),y}async function x(){let e=document.getElementById(`BG`);if(!e)return;let n=0,r=()=>{n=n*.97+(t()?.scrollTop??0)*.03,v.center=[.65,.5+n*.1/window.innerHeight],requestAnimationFrame(r)};r(),await g.add(e,{effect:[v]})}export{g as n,b as r,v as t};