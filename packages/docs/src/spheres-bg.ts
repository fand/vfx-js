import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Glass spheres for the docs background.
// Wavelength sampling and color helpers shared by the glass shaders.
const SPECTRAL_LIB = `
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
`;

const spheresShader = `#version 300 es
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

${SPECTRAL_LIB}

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
`;

const outputShader = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D accum;
out vec4 outColor;

void main() {
    outColor = texture(accum, uv);
}
`;

/**
 * Glass spheres, ray-traced in the shader.
 * Each frame blends into a persistent buffer to smooth edges and color grain.
 * Ignores its source, so it works on an empty element.
 */
type Vec3 = [number, number, number];

const SPHERES = 4;
const SIZES = [0.3, 0.4, 0.7, 0.6];
// Orbits loop every 128s: each axis moves at an integer multiple of the base speed.
// These speeds and phases were picked by simulating one loop to keep the screen as covered as
// possible at zoom 1.4: at least 40% of a 16:10 or 16:9 screen.
const ORBIT_BASE = (Math.PI * 2) / 128;
const ORBIT_SPEED: Vec3[] = [
    [2, 2, 3],
    [3, 2, 2],
    [3, 2, 2],
    [7, 7, 7],
];
const ORBIT_PHASE: Vec3[] = [
    [3.451, 4.592, 6.138],
    [1.132, 5.169, 0.372],
    [1.649, 1.475, 2.942],
    [5.557, 1.123, 3.039],
];
const MIN_OVERLAP = 0.2;

function normalize([x, y, z]: Vec3): Vec3 {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
}

/** Turn v around axis by angle a (right hand). */
function rotate(axis: Vec3, a: number, v: Vec3): Vec3 {
    const [x, y, z] = normalize(axis);
    const s = Math.sin(a);
    const c = Math.cos(a);
    const along = (x * v[0] + y * v[1] + z * v[2]) * (1 - c);
    return [
        v[0] * c + (y * v[2] - z * v[1]) * s + x * along,
        v[1] * c + (z * v[0] - x * v[2]) * s + y * along,
        v[2] * c + (x * v[1] - y * v[0]) * s + z * along,
    ];
}

function random(n: number, seed: number): number {
    const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
}

/** Light band axes. Each band is a great circle; its axis turns around a random axis. */
function bandMotions(seed: number) {
    return [0, 1, 2, 3].map((i) => {
        const n = i + 30;
        const r = (k: number) => random(n + k, seed) - 0.5;
        return {
            start: normalize([r(0), r(0.1), r(0.2)]),
            spin: normalize([r(0.3), r(0.4), r(0.5)]) as Vec3,
            speed:
                (0.05 + 0.1 * random(n + 0.6, seed)) *
                (random(n + 0.7, seed) < 0.5 ? -1 : 1),
        };
    });
}

/** Spheres drift on looping paths while the whole set turns. Writes xyz + radius per sphere. */
function layoutSpheres(time: number, out: Float32Array): void {
    const turn = time * ORBIT_BASE;
    const centers = SIZES.map((_, i) => {
        const p = ORBIT_SPEED[i].map(
            (speed, k) =>
                Math.sin(time * speed * ORBIT_BASE + ORBIT_PHASE[i][k]) * 0.7,
        ) as Vec3;
        // The whole set tumbles once per loop.
        return rotate([0.3, 1, 0.2], turn, rotate([1, 0, 0.3], turn, p));
    });

    // Pull pairs together until every pair overlaps by MIN_OVERLAP of the smaller sphere's diameter.
    for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < SPHERES; i++) {
            for (let j = i + 1; j < SPHERES; j++) {
                const a = centers[i];
                const b = centers[j];
                const delta = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                const dist = Math.hypot(delta[0], delta[1], delta[2]);
                const maxDist =
                    SIZES[i] +
                    SIZES[j] -
                    MIN_OVERLAP * 2 * Math.min(SIZES[i], SIZES[j]);
                if (dist > maxDist) {
                    const k = ((dist - maxDist) * 0.5) / dist;
                    for (let c = 0; c < 3; c++) {
                        a[c] += delta[c] * k;
                        b[c] -= delta[c] * k;
                    }
                }
            }
        }
    }

    // Keep the set centered, weighted by size, so it doesn't drift to one side of the screen.
    const middle = [0, 0, 0];
    let weightSum = 0;
    for (let i = 0; i < SPHERES; i++) {
        const weight = SIZES[i] * SIZES[i];
        for (let c = 0; c < 3; c++) {
            middle[c] += centers[i][c] * weight;
        }
        weightSum += weight;
    }
    for (let i = 0; i < SPHERES; i++) {
        for (let c = 0; c < 3; c++) {
            out[i * 4 + c] = centers[i][c] - middle[c] / weightSum;
        }
        out[i * 4 + 3] = SIZES[i];
    }
}

export class SpheresEffect implements Effect {
    // Where the spheres sit in the element (0-1) and how large they are.
    center: [number, number];
    zoom: number;
    exposure: number;
    // Soft rainbow glow where the spheres aren't.
    noise: boolean;
    noiseIntensity: number;
    noiseScale: number;
    noiseSpeed: number;
    noiseChroma: number;
    #accum: EffectRenderTarget | null = null;
    #bands = bandMotions(Math.random() * 100);
    #spheres = new Float32Array(SPHERES * 4);
    #bandAxes = new Float32Array(4 * 3);

    constructor(
        opts: {
            center?: [number, number];
            zoom?: number;
            exposure?: number;
            noise?: boolean;
            noiseIntensity?: number;
            noiseScale?: number;
            noiseSpeed?: number;
            noiseChroma?: number;
        } = {},
    ) {
        this.center = opts.center ?? [0.5, 0.5];
        this.zoom = opts.zoom ?? 1;
        this.exposure = opts.exposure ?? 1;
        this.noise = opts.noise ?? true;
        this.noiseIntensity = opts.noiseIntensity ?? 0.2;
        this.noiseScale = opts.noiseScale ?? 0.4;
        this.noiseSpeed = opts.noiseSpeed ?? 0.05;
        this.noiseChroma = opts.noiseChroma ?? 0.6;
    }

    init(ctx: EffectContext): void {
        this.#accum = ctx.createRenderTarget({ float: true, persistent: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#accum) {
            return;
        }
        layoutSpheres(ctx.time, this.#spheres);
        for (const [i, band] of this.#bands.entries()) {
            this.#bandAxes.set(
                rotate(band.spin, ctx.time * band.speed, band.start),
                i * 3,
            );
        }
        ctx.draw({
            frag: spheresShader,
            uniforms: {
                accum: this.#accum,
                resolution: [...ctx.dims.elementPixel],
                center: this.center,
                zoom: this.zoom,
                exposure: this.exposure,
                time: ctx.time,
                spheres: this.#spheres,
                bandAxes: this.#bandAxes,
                dispersion: 0.42,
                chroma: 0.7,
                blend: 0.15,
                bandsFront: 1,
                spot: 0,
                bandWidth: 0.3,
                bandIntensity: 0.4,
                noise: this.noise ? 1 : 0,
                noiseIntensity: this.noiseIntensity,
                noiseScale: this.noiseScale,
                noiseSpeed: this.noiseSpeed,
                noiseChroma: this.noiseChroma,
            },
            target: this.#accum,
        });
        ctx.draw({
            frag: outputShader,
            uniforms: { accum: this.#accum },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#accum = null;
    }
}
