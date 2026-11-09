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
uniform float seed;
uniform float blend;
uniform float minOverlap;
uniform float bandsFront;
uniform float bandWidth;
uniform float bandIntensity;
uniform float spot;
uniform float chroma;
uniform sampler2D accum;
out vec4 outColor;

${SPECTRAL_LIB}

#define SPHERES 4
vec3 centers[SPHERES];
float radii[SPHERES];
const float SIZES[SPHERES] = float[SPHERES](.3, .4, .7, .6);
// Orbits loop every 120s: each axis moves at an integer multiple of the base speed.
// These speeds and phases were picked by simulating one loop to keep the screen as covered as
// possible at zoom 1.4: at least 40% of a 16:10 or 16:9 screen.
const float ORBIT_BASE = 6.2831853 / 128.;
const vec3 ORBIT_SPEED[SPHERES] = vec3[SPHERES](
    vec3(2, 2, 3), vec3(3, 2, 2), vec3(3, 2, 2), vec3(7, 7, 7)
);
const vec3 ORBIT_PHASE[SPHERES] = vec3[SPHERES](
    vec3(3.451, 4.592, 6.138), vec3(1.132, 5.169, .372), vec3(1.649, 1.475, 2.942), vec3(5.557, 1.123, 3.039)
);
vec3 bandAxes[4];

mat3 rotation(vec3 axis, float a) {
    axis = normalize(axis);
    float s = sin(a), c = cos(a), oc = 1. - c;
    return mat3(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
        oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z + axis.x * s,
        oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c
    );
}

float random(float n) {
    return fract(sin(n * 127.1 + seed * 311.7) * 43758.5453);
}

// Spheres drift on random paths while the whole set turns.
void setupSpheres() {
    // Each light band is a great circle around the scene. Its axis turns around a random axis.
    for (int i = 0; i < 4; i++) {
        float fi = float(i) + 30.;
        vec3 start = normalize(vec3(random(fi), random(fi + .1), random(fi + .2)) - .5);
        vec3 spin = normalize(vec3(random(fi + .3), random(fi + .4), random(fi + .5)) - .5);
        float speed = (.05 + .1 * random(fi + .6)) * (random(fi + .7) < .5 ? -1. : 1.);
        bandAxes[i] = rotation(spin, time * speed) * start;
    }

    // The whole set tumbles once per loop.
    mat3 group = rotation(vec3(.3, 1, .2), time * ORBIT_BASE) * rotation(vec3(1, 0, .3), time * ORBIT_BASE);
    for (int i = 0; i < SPHERES; i++) {
        centers[i] = group * (sin(time * ORBIT_SPEED[i] * ORBIT_BASE + ORBIT_PHASE[i]) * 0.7);
        radii[i] = SIZES[i];
    }

    // Pull pairs together until every pair overlaps by minOverlap of the smaller sphere's diameter.
    for (int iter = 0; iter < 8; iter++) {
        for (int i = 0; i < SPHERES; i++) {
            for (int j = i + 1; j < SPHERES; j++) {
                vec3 delta = centers[j] - centers[i];
                float dist = length(delta);
                float maxDist = radii[i] + radii[j] - minOverlap * 2. * min(radii[i], radii[j]);
                if (dist > maxDist) {
                    vec3 shift = delta / dist * (dist - maxDist) * .5;
                    centers[i] += shift;
                    centers[j] -= shift;
                }
            }
        }
    }

    // Keep the set centered, so it doesn't drift to one side of the screen.
    // Weight by size, so big spheres count more.
    vec3 middle = vec3(0);
    float weightSum = 0.;
    for (int i = 0; i < SPHERES; i++) {
        float weight = radii[i] * radii[i];
        middle += centers[i] * weight;
        weightSum += weight;
    }
    middle /= weightSum;
    for (int i = 0; i < SPHERES; i++) {
        centers[i] -= middle;
    }
}

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

// XOR: a point is solid when it sits inside an odd number of spheres.
bool inside(vec3 p) {
    bool odd = false;
    for (int i = 0; i < SPHERES; i++) {
        if (length(p - centers[i]) < radii[i]) odd = !odd;
    }
    return odd;
}

// Nearest sphere boundary along the ray after tMin.
float nextBoundary(vec3 o, vec3 d, float tMin, out int hitIndex) {
    float best = 1e9;
    hitIndex = -1;
    for (int i = 0; i < SPHERES; i++) {
        vec3 oc = o - centers[i];
        float b = dot(oc, d);
        float h = b * b - dot(oc, oc) + radii[i] * radii[i];
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
            n = normalize(p - centers[hitIndex]);
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
    setupSpheres();
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
export class SpheresEffect implements Effect {
    // Where the spheres sit in the element (0-1) and how large they are.
    center: [number, number];
    zoom: number;
    exposure: number;
    #accum: EffectRenderTarget | null = null;
    #seed = Math.random() * 100;

    constructor(
        opts: {
            center?: [number, number];
            zoom?: number;
            exposure?: number;
        } = {},
    ) {
        this.center = opts.center ?? [0.5, 0.5];
        this.zoom = opts.zoom ?? 1;
        this.exposure = opts.exposure ?? 1;
    }

    init(ctx: EffectContext): void {
        this.#accum = ctx.createRenderTarget({ float: true, persistent: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#accum) {
            return;
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
                seed: this.#seed,
                dispersion: 0.42,
                chroma: 0.7,
                blend: 0.15,
                minOverlap: 0.2,
                bandsFront: 1,
                spot: 0,
                bandWidth: 0.3,
                bandIntensity: 0.4,
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
