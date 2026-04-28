// Stable Fluid simulation as a single Effect. Self-contained: allocates
// its own sim render targets in `init` and runs the full advect → curl →
// vorticity → divergence → pressure-jacobi → gradient-subtract pipeline
// per frame. State (velocity, dye) lives in `persistent: true, float: true`
// RTs so the host's automatic ping-pong handles read-during-write.
//
// Compared to the legacy `VFXPass[]` form in `stable-fluid.ts`, this
// version composes with other effects (`vfx.add(el, { effect: [fluid,
// bloom] })`), is reusable per element, and tracks its own mouse delta.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_CURL = `#version 300 es
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
`;

const FRAG_VORTICITY = `#version 300 es
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
`;

const FRAG_DIVERGENCE = `#version 300 es
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
`;

const FRAG_PRESSURE_INIT = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

const FRAG_PRESSURE = `#version 300 es
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
`;

const FRAG_GRADIENT = `#version 300 es
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
`;

const FRAG_ADVECT_VEL = `#version 300 es
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
`;

const FRAG_ADVECT_DYE = `#version 300 es
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
`;

const FRAG_DISPLAY = `#version 300 es
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
`;

export type FluidParams = {
    /** Simulation grid resolution in physical px. */
    simSize: [number, number];
    /** Jacobi iterations per frame (1 is the established default). */
    pressureIterations: number;
    /** Vorticity confinement strength. */
    curlStrength: number;
    /** Per-frame velocity decay. */
    velocityDissipation: number;
    /** Per-frame dye decay. */
    densityDissipation: number;
    /** Velocity injected per uv-unit of mouse motion. */
    splatForce: number;
    /** Velocity-splat falloff (uv² units). */
    splatRadius: number;
    /** Dye-splat falloff (uv² units). */
    dyeSplatRadius: number;
    /** Dye intensity per uv-unit/sec of mouse speed. */
    dyeSplatIntensity: number;
    /** When true, output is the raw dye buffer instead of advected src. */
    showDye: boolean;
};

const DEFAULT_PARAMS: FluidParams = {
    simSize: [256, 256],
    pressureIterations: 1,
    curlStrength: 13,
    velocityDissipation: 0.6,
    densityDissipation: 0.65,
    splatForce: 6000,
    splatRadius: 0.002,
    dyeSplatRadius: 0.001,
    dyeSplatIntensity: 0.005,
    showDye: false,
};

/**
 * Stable Fluid as a single Effect. Mutate `params` directly for runtime
 * tweaks; tracked sim state is owned by the effect and reset on dispose.
 */
export class FluidEffect implements Effect {
    params: FluidParams;

    #curl: EffectRenderTarget | null = null;
    #vortVel: EffectRenderTarget | null = null;
    #divergence: EffectRenderTarget | null = null;
    #pA: EffectRenderTarget | null = null;
    #pB: EffectRenderTarget | null = null;
    #projVel: EffectRenderTarget | null = null;
    #velocity: EffectRenderTarget | null = null;
    #dye: EffectRenderTarget | null = null;

    #prevMouseUv: [number, number] = [0, 0];
    #prevMouseValid = false;
    // Element render size in physical px. `ctx.src.width/height` for an
    // <img> returns naturalWidth/Height (intrinsic resolution, not the
    // rendered size), so it can't be used to normalize ctx.mouse into
    // element uv. Cached from outputRect, which the host re-queries
    // every frame before render.
    #elementPx: [number, number] = [1, 1];

    constructor(initial: Partial<FluidParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        const sim = this.params.simSize;
        const opts = { size: sim, float: true } as const;
        this.#curl = ctx.createRenderTarget(opts);
        this.#vortVel = ctx.createRenderTarget(opts);
        this.#divergence = ctx.createRenderTarget(opts);
        this.#pA = ctx.createRenderTarget(opts);
        this.#pB = ctx.createRenderTarget(opts);
        this.#projVel = ctx.createRenderTarget(opts);
        // Velocity persists across frames so curl/vorticity read prior
        // step. Dye persists so trails accumulate. Dye auto-resizes to
        // element size for crisp output.
        this.#velocity = ctx.createRenderTarget({
            size: sim,
            float: true,
            persistent: true,
        });
        this.#dye = ctx.createRenderTarget({ float: true, persistent: true });
    }

    render(ctx: EffectContext): void {
        if (
            !this.#curl ||
            !this.#vortVel ||
            !this.#divergence ||
            !this.#pA ||
            !this.#pB ||
            !this.#projVel ||
            !this.#velocity ||
            !this.#dye
        ) {
            return;
        }

        const {
            simSize,
            pressureIterations,
            curlStrength,
            velocityDissipation,
            densityDissipation,
            splatForce,
            splatRadius,
            dyeSplatRadius,
            dyeSplatIntensity,
            showDye,
        } = this.params;
        const simTexel: [number, number] = [1 / simSize[0], 1 / simSize[1]];

        const [elementW, elementH] = this.#elementPx;
        const aspect = elementW / elementH;
        const mouseUv: [number, number] = [
            ctx.mouse[0] / elementW,
            ctx.mouse[1] / elementH,
        ];
        const mouseDeltaUv: [number, number] = this.#prevMouseValid
            ? [
                  mouseUv[0] - this.#prevMouseUv[0],
                  mouseUv[1] - this.#prevMouseUv[1],
              ]
            : [0, 0];
        this.#prevMouseUv = mouseUv;
        this.#prevMouseValid = true;

        ctx.draw({
            frag: FRAG_CURL,
            uniforms: { velocity: this.#velocity, simTexel },
            target: this.#curl,
        });

        ctx.draw({
            frag: FRAG_VORTICITY,
            uniforms: {
                velocity: this.#velocity,
                curl: this.#curl,
                simTexel,
                aspect,
                mouseUv,
                mouseDeltaUv,
                curlStrength,
                splatForce,
                splatRadius,
            },
            target: this.#vortVel,
        });

        ctx.draw({
            frag: FRAG_DIVERGENCE,
            uniforms: { vortVel: this.#vortVel, simTexel },
            target: this.#divergence,
        });

        ctx.draw({ frag: FRAG_PRESSURE_INIT, target: this.#pA });

        // Jacobi: ping-pong pA ↔ pB; pCurr holds the latest pressure.
        let pCurr = this.#pA;
        let pNext = this.#pB;
        for (let i = 0; i < pressureIterations; i++) {
            ctx.draw({
                frag: FRAG_PRESSURE,
                uniforms: {
                    pressure: pCurr,
                    divergence: this.#divergence,
                    simTexel,
                },
                target: pNext,
            });
            const tmp = pCurr;
            pCurr = pNext;
            pNext = tmp;
        }

        ctx.draw({
            frag: FRAG_GRADIENT,
            uniforms: {
                vortVel: this.#vortVel,
                pressure: pCurr,
                simTexel,
            },
            target: this.#projVel,
        });

        ctx.draw({
            frag: FRAG_ADVECT_VEL,
            uniforms: {
                projVel: this.#projVel,
                simTexel,
                velocityDissipation,
            },
            target: this.#velocity,
        });

        ctx.draw({
            frag: FRAG_ADVECT_DYE,
            uniforms: {
                velocity: this.#velocity,
                dye: this.#dye,
                time: ctx.time,
                aspect,
                mouseUv,
                mouseDeltaUv,
                simSize,
                densityDissipation,
                dyeSplatRadius,
                dyeSplatIntensity,
            },
            target: this.#dye,
        });

        ctx.draw({
            frag: FRAG_DISPLAY,
            uniforms: {
                src: ctx.src,
                dye: this.#dye,
                velocity: this.#velocity,
                simSize,
                showDye: showDye ? 1 : 0,
                time: ctx.time,
            },
            target: ctx.target,
        });
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        // Cache element pixel size for mouse-uv normalization in render.
        this.#elementPx = [dims.elementPixel[0], dims.elementPixel[1]];
        return dims.contentRect;
    }

    dispose(): void {
        this.#curl = null;
        this.#vortVel = null;
        this.#divergence = null;
        this.#pA = null;
        this.#pB = null;
        this.#projVel = null;
        this.#velocity = null;
        this.#dye = null;
        this.#prevMouseValid = false;
    }
}
