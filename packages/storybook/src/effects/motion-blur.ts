// Five-pass screen-space motion blur (McGuire 2012-style reconstruction
// filter, depthless, with Lucas-Kanade flow).
//
// Why LK over normal-flow: normal-flow `It·∇I/|∇I|` only recovers the
// motion component along the edge normal (aperture problem) — a circle
// moving horizontally produces radially-pointing flow at each edge, so
// the blur fans out concentrically instead of along the true motion.
// LK assumes flow is locally constant in a window and solves a 2×2
// system for the true 2D velocity, giving consistent vectors across an
// object's edges.
//
//   pass0 (FRAG_GRAD)   per-pixel (Ix, Iy, It) from src + prev frames.
//   pass1 (FRAG_LK)     Lucas-Kanade solve over a (2*lkRadius+1)²
//                       window. Output is in pixel-velocity units.
//   pass2 (FRAG_DILATE) separable max-magnitude dilation. LK is sparse
//                       (untextured interiors → det ≈ 0 → flow 0); the
//                       dilation propagates each moving feature's
//                       velocity into its surrounding halo so the
//                       gather pass has a velocity to follow there.
//   pass3 (FRAG_BLUR)   stochastic gather along the dilated velocity,
//                       with McGuire forward/backward cone + cylinder
//                       weighting (using the dilated flow as the per-
//                       sample velocity reference, since LK is sparse).
//   pass4 (FRAG_COPY)   stash this frame's src for next frame's It.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_GRAD = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;

void main() {
    vec2 t = 1.0 / vec2(textureSize(src, 0));
    vec2 ox = vec2(t.x, 0.0);
    vec2 oy = vec2(0.0, t.y);

    // Centred diff over both frames → twice the per-frame gradient,
    // halved below. Sampling both frames extends the sensitive zone
    // along the trajectory (single-frame gradient would only see the
    // new edge).
    vec4 sx = (texture(src,  uvSrc + ox) - texture(src,  uvSrc - ox))
            + (texture(prev, uvSrc + ox) - texture(prev, uvSrc - ox));
    vec4 sy = (texture(src,  uvSrc + oy) - texture(src,  uvSrc - oy))
            + (texture(prev, uvSrc + oy) - texture(prev, uvSrc - oy));
    vec4 d  =  texture(src,  uvSrc) - texture(prev, uvSrc);

    // RGB-summed (not luma): preserves single-channel features that
    // luma weights would attenuate (red ball on dark bg etc.).
    float Ix = (sx.r + sx.g + sx.b) * 0.5;
    float Iy = (sy.r + sy.g + sy.b) * 0.5;
    float It =  d.r + d.g + d.b;

    outColor = vec4(Ix, Iy, It, 0.0);
}
`;

const FRAG_LK = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;     // grad texture (Ix, Iy, It)
uniform int radius;
uniform float minDet;

const int MAX_RADIUS = 5;

void main() {
    vec2 t = 1.0 / vec2(textureSize(src, 0));

    // Structure-tensor sums over a (2r+1)² window.
    float a = 0.0;   // Σ Ix²
    float b = 0.0;   // Σ Iy²
    float c = 0.0;   // Σ IxIy
    float dx = 0.0;  // Σ IxIt
    float dy = 0.0;  // Σ IyIt

    for (int j = -MAX_RADIUS; j <= MAX_RADIUS; j++) {
        if (abs(j) > radius) continue;
        for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
            if (abs(i) > radius) continue;
            vec3 g = texture(src, uvSrc + vec2(i, j) * t).xyz;
            a  += g.x * g.x;
            b  += g.y * g.y;
            c  += g.x * g.y;
            dx += g.x * g.z;
            dy += g.y * g.z;
        }
    }

    // [a c; c b] v = -[dx; dy]. Det threshold drops untextured /
    // ill-conditioned windows (single-edge → aperture, flat → noise).
    float det = a * b - c * c;
    vec2 flow = vec2(0.0);
    if (det > minDet) {
        flow.x = (-b * dx + c * dy) / det;
        flow.y = ( c * dx - a * dy) / det;
    }
    outColor = vec4(flow, 0.0, 1.0);
}
`;

// Separable max-magnitude dilation. Two passes (axis = (1,0), (0,1))
// fill each pixel with the largest velocity vector inside a
// (2r+1)×(2r+1) box.
const FRAG_DILATE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 axis;
uniform int radius;

const int MAX_RADIUS = 64;

void main() {
    vec2 t = 1.0 / vec2(textureSize(src, 0));
    vec2 stepUV = axis * t;

    vec2 best = vec2(0.0);
    float bestSq = -1.0;

    for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
        if (abs(i) > radius) continue;
        vec2 v = texture(src, uvSrc + stepUV * float(i)).xy;
        float l = dot(v, v);
        if (l > bestSq) {
            bestSq = l;
            best = v;
        }
    }
    outColor = vec4(best, 0.0, 1.0);
}
`;

const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D flow;
uniform sampler2D flowMax;
uniform float strength;
uniform int samples;
uniform int debug;
uniform float debugScale;

const int MAX_SAMPLES = 64;
const float HALF_VEL = 0.5;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float cone(float T, float v) {
    return clamp(1.0 - T / max(v, HALF_VEL), 0.0, 1.0);
}

float cylinder(float v, float vMax) {
    return 1.0 - smoothstep(0.95 * vMax, 1.05 * vMax, v);
}

void main() {
    vec2 srcTexel = 1.0 / vec2(textureSize(src, 0));
    // flow / flowMax are in pixel-velocity units (px/frame). Strength
    // is a blur exaggeration multiplier on top.
    vec2 vMax    = texture(flowMax, uv).xy * strength;
    vec2 vCenter = texture(flowMax, uv).xy * strength;
    float vMaxLen = length(vMax);
    float vCenterLen = vMaxLen;

    if (debug == 1) {
        vec2 raw = texture(flow, uv).xy;
        outColor = vec4(abs(raw.x) * debugScale, abs(raw.y) * debugScale,
                        0.0, 1.0);
        return;
    }
    if (debug == 2) {
        vec2 raw = texture(flowMax, uv).xy;
        outColor = vec4(abs(raw.x) * debugScale, abs(raw.y) * debugScale,
                        0.0, 1.0);
        return;
    }

    int n = max(1, min(samples, MAX_SAMPLES));

    if (vMaxLen < HALF_VEL) {
        outColor = texture(src, uvSrc);
        return;
    }

    float jitter = hash(gl_FragCoord.xy) - 0.5;

    vec4 sumColor = texture(src, uvSrc);
    float sumWeight = 1.0;

    for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= n) break;
        float t = (float(i) + 0.5 + jitter) / float(n) - 0.5;
        vec2 offUV = vMax * t * srcTexel;
        float T = abs(t) * vMaxLen;

        // Use dilated flow for the per-sample velocity reference. LK is
        // sparse (zero in untextured interiors), so reading the raw
        // flow there would give cone=0 and we would lose the
        // contribution from a moving feature passing through a uniform
        // region. Dilation hallucinates a dense velocity field
        // consistent with the dominant nearby motion.
        vec2 vS = texture(flowMax, uv + offUV).xy * strength;
        float vSLen = length(vS);

        // Forward cone — does S's velocity reach D within one frame.
        float wf = cone(T, vSLen);
        // Backward cone — does D's velocity reach S (D moving through S).
        float wb = cone(T, vCenterLen);
        float wc = cylinder(vSLen, vMaxLen);

        float w = wf + wb * 0.5 + wc * 2.0;

        sumColor += texture(src, uvSrc + offUV) * w;
        sumWeight += w;
    }

    outColor = sumColor / sumWeight;
}
`;

const FRAG_COPY = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() { outColor = texture(src, uvSrc); }
`;

export type MotionBlurParams = {
    /**
     * Blur exaggeration multiplier on the per-pixel pixel-velocity from
     * LK. 1.0 ≈ realistic per-frame motion blur, >1 stretches the trail.
     */
    strength: number;
    /** Tap count along the flow direction. Clamped to [1, 64]. */
    samples: number;
    /**
     * Half-width (px) of the LK solve window. Bigger window → more
     * stable flow vectors and better aperture-problem mitigation, but
     * blurs flow across motion boundaries. Clamped to [1, 5].
     */
    lkRadius: number;
    /**
     * Half-width (px) of the separable max-magnitude dilation.
     * Untextured interiors and halos within this many pixels of a
     * moving feature inherit that feature's velocity. Should be at
     * least as large as the typical blur span (≈ strength × motion).
     * Clamped to [0, 64].
     */
    dilateRadius: number;
    /**
     * 0 = normal blur. 1 = raw LK flow visualisation. 2 = dilated flow.
     */
    debug: number;
    /** Brightness multiplier for the debug visualisation. */
    debugScale: number;
};

const DEFAULT_PARAMS: MotionBlurParams = {
    strength: 5,
    samples: 16,
    lkRadius: 3,
    dilateRadius: 24,
    debug: 0,
    debugScale: 0.2,
};

export class MotionBlurEffect implements Effect {
    params: MotionBlurParams;

    #prev: EffectRenderTarget | null = null;
    #grad: EffectRenderTarget | null = null;
    #flow: EffectRenderTarget | null = null;
    #flowH: EffectRenderTarget | null = null;
    #flowMax: EffectRenderTarget | null = null;

    constructor(initial: Partial<MotionBlurParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        this.#prev = ctx.createRenderTarget({ persistent: true });
        this.#grad = ctx.createRenderTarget({ float: true });
        this.#flow = ctx.createRenderTarget({ float: true });
        this.#flowH = ctx.createRenderTarget({ float: true });
        this.#flowMax = ctx.createRenderTarget({ float: true });
    }

    render(ctx: EffectContext): void {
        if (
            !this.#prev ||
            !this.#grad ||
            !this.#flow ||
            !this.#flowH ||
            !this.#flowMax
        ) {
            return;
        }

        const lkRadius = Math.max(
            1,
            Math.min(5, Math.round(this.params.lkRadius)),
        );
        const dilateRadius = Math.max(
            0,
            Math.min(64, Math.round(this.params.dilateRadius)),
        );

        ctx.draw({
            frag: FRAG_GRAD,
            uniforms: { src: ctx.src, prev: this.#prev },
            target: this.#grad,
        });

        ctx.draw({
            frag: FRAG_LK,
            uniforms: {
                src: this.#grad,
                radius: lkRadius,
                minDet: 1e-3,
            },
            target: this.#flow,
        });

        ctx.draw({
            frag: FRAG_DILATE,
            uniforms: { src: this.#flow, axis: [1, 0], radius: dilateRadius },
            target: this.#flowH,
        });

        ctx.draw({
            frag: FRAG_DILATE,
            uniforms: { src: this.#flowH, axis: [0, 1], radius: dilateRadius },
            target: this.#flowMax,
        });

        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: {
                src: ctx.src,
                flow: this.#flow,
                flowMax: this.#flowMax,
                strength: Math.max(0, this.params.strength),
                samples: Math.max(
                    1,
                    Math.min(64, Math.round(this.params.samples)),
                ),
                debug: Math.max(0, Math.min(2, Math.round(this.params.debug))),
                debugScale: Math.max(0, this.params.debugScale),
            },
            target: ctx.target,
        });

        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { src: ctx.src },
            target: this.#prev,
        });
    }

    dispose(): void {
        this.#prev = null;
        this.#grad = null;
        this.#flow = null;
        this.#flowH = null;
        this.#flowMax = null;
    }
}
