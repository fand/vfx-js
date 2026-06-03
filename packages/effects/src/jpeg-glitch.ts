// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// JPEG glitch via DCT simulation (approach "B").
//
// Rather than round-tripping the element through a real JPEG codec on the
// CPU, this reproduces the visible artifacts of lossy JPEG entirely on the
// GPU as a multipass pipeline:
//
//   1. convert   RGB → YCbCr (+ straight alpha)         src      → bufA
//   2. dctH      forward 1-D DCT-II over each 8px row    bufA     → bufB
//   3. dctV      forward 1-D DCT-II over each 8px column bufB     → bufA
//   4. quantize  per-coefficient quantization + glitch   bufA     → bufB
//   5. idctV     inverse 1-D DCT over each column         bufB     → bufA
//   6. idctH     inverse 1-D DCT over each row            bufA     → bufB
//   7. resolve   YCbCr → RGB, premultiply, write          bufB     → canvas
//
// The 2-D block DCT is separable, so each transform is two cheap 1-D passes
// (8 taps each) instead of a 64-tap convolution. Steps 2-6 run in the
// effect's own auto-sized render targets where `gl_FragCoord` maps 1:1 to
// texels (and therefore to the 8x8 block grid). The final `resolve` pass
// samples by `uv` only, so it is safe to draw into the offset element
// viewport of the last chain stage.
//
// Quantization (step 4) produces the classic blocky DCT artifacts. The
// glitch on top corrupts DC coefficients in horizontal segments — mimicking
// how a flipped bit in a JPEG entropy stream offsets every block to its
// right until the next restart — which reads as the familiar coloured
// horizontal smears.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// sqrt(1/8) and sqrt(2/8): the orthonormal DCT-II scale factors for the
// DC (k=0) and AC (k>0) coefficients respectively. Inlined so the forward
// and inverse passes compose to an exact identity at quality 1.
const C0 = "0.3535533906";
const CK = "0.5";

const YCBCR_GLSL = `
vec3 rgb2ycbcr(vec3 c) {
    float y  = dot(c, vec3( 0.299,     0.587,     0.114));
    float cb = dot(c, vec3(-0.168736, -0.331264,  0.5)) + 0.5;
    float cr = dot(c, vec3( 0.5,      -0.418688, -0.081312)) + 0.5;
    return vec3(y, cb, cr);
}

vec3 ycbcr2rgb(vec3 c) {
    float y = c.x;
    float cb = c.y - 0.5;
    float cr = c.z - 0.5;
    return vec3(
        y                 + 1.402    * cr,
        y - 0.344136 * cb - 0.714136 * cr,
        y + 1.772    * cb
    );
}
`;

// Pass 1 — sample the element capture, convert to YCbCr, carry straight
// alpha. Uses the `uvSrc` varying (content-correct sampling) and masks any
// texel that falls outside the captured content.
const FRAG_CONVERT = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
${YCBCR_GLSL}

void main() {
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float mask = inside.x * inside.y;
    vec4 c = texture(src, clamp(uvSrc, 0.0, 1.0));
    outColor = vec4(rgb2ycbcr(c.rgb), c.a * mask);
}
`;

// Pass 2 — forward DCT-II along the row, per 8px block.
const FRAG_DCT_H = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float blockX = floor(px / 8.0) * 8.0;
    float u = px - blockX;
    float cu = (u < 0.5) ? ${C0} : ${CK};
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 8; i++) {
        float xi = blockX + float(i) + 0.5;
        vec4 f = texture(src, vec2(xi / resolution.x, fc.y / resolution.y));
        sum += f * cos((2.0 * float(i) + 1.0) * u * PI / 16.0);
    }
    outColor = cu * sum;
}
`;

// Pass 3 — forward DCT-II along the column, per 8px block.
const FRAG_DCT_V = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float py = floor(fc.y);
    float blockY = floor(py / 8.0) * 8.0;
    float v = py - blockY;
    float cv = (v < 0.5) ? ${C0} : ${CK};
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 8; i++) {
        float yi = blockY + float(i) + 0.5;
        vec4 f = texture(src, vec2(fc.x / resolution.x, yi / resolution.y));
        sum += f * cos((2.0 * float(i) + 1.0) * v * PI / 16.0);
    }
    outColor = cv * sum;
}
`;

// Pass 4 — quantize each coefficient (heavier for high frequency and for
// chroma, lighter for DC) then inject the glitch. The buffer now holds full
// per-block DCT coefficients in the natural frequency layout: the texel at
// the top-left of each 8x8 cell is that block's DC term.
const FRAG_QUANTIZE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
uniform float quality;
uniform float glitch;
uniform float shift;
uniform float corruption;
uniform float time;
uniform float seed;

float hash1(float x) {
    return fract(sin(x * 12.9898 + seed * 78.233) * 43758.5453);
}
float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7)) + seed) * 43758.5453);
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float py = floor(fc.y);
    float bx = floor(px / 8.0);
    float by = floor(py / 8.0);
    float u = px - bx * 8.0;
    float v = py - by * 8.0;
    bool isDC = (u < 0.5 && v < 0.5);

    vec4 coef = texture(src, fc / resolution);

    // --- quantization ---
    float freq = u + v;
    float base = mix(2.5, 0.02, clamp(quality, 0.0, 1.0));
    float lumaStep = base * (1.0 + freq * 0.35);
    float chromaStep = base * (2.0 + freq * 0.6);
    if (isDC) {
        // Protect the DC term so quantization alone does not wash the
        // image out — the DC glitch below is what should move it.
        lumaStep *= 0.25;
        chromaStep *= 0.25;
    }
    vec4 q = vec4(lumaStep, chromaStep, chromaStep, lumaStep);
    coef = floor(coef / q + 0.5) * q;

    // --- DC band glitch (entropy-stream corruption cascade) ---
    if (isDC) {
        // Each block row is "hit" with probability ~ glitch.
        float hit = step(1.0 - glitch * 0.6, hash1(by * 1.7 + floor(time)));
        // Constant offset across a run of blocks, restarting at random
        // segment boundaries — the propagating-error look.
        float segLen = 2.0 + 30.0 * hash1(by * 3.3);
        float seg = floor(bx / segLen);
        // DC of a flat block ~ value * 8, so scale the offset to match.
        coef.x += hit * (hash2(vec2(seg, by)) - 0.5) * shift * 8.0;
        coef.y += hit * (hash2(vec2(seg + 11.0, by)) - 0.5) * shift * 8.0;
        coef.z += hit * (hash2(vec2(seg + 23.0, by)) - 0.5) * shift * 8.0;
    }

    // --- high-frequency block corruption ---
    float cflag = step(
        1.0 - corruption * 0.5,
        hash2(vec2(bx, by) + floor(time * 0.7))
    );
    if (cflag > 0.5 && !isDC) {
        coef.xyz *= hash2(vec2(px, py)) * 6.0 - 1.0;
    }

    outColor = coef;
}
`;

// Pass 5 — inverse DCT along the column.
const FRAG_IDCT_V = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float py = floor(fc.y);
    float blockY = floor(py / 8.0) * 8.0;
    float y = py - blockY;
    vec4 sum = vec4(0.0);
    for (int k = 0; k < 8; k++) {
        float ck = (k == 0) ? ${C0} : ${CK};
        float yk = blockY + float(k) + 0.5;
        vec4 f = texture(src, vec2(fc.x / resolution.x, yk / resolution.y));
        sum += ck * f * cos((2.0 * y + 1.0) * float(k) * PI / 16.0);
    }
    outColor = sum;
}
`;

// Pass 6 — inverse DCT along the row.
const FRAG_IDCT_H = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 resolution;
#define PI 3.141592653589793

void main() {
    vec2 fc = gl_FragCoord.xy;
    float px = floor(fc.x);
    float blockX = floor(px / 8.0) * 8.0;
    float x = px - blockX;
    vec4 sum = vec4(0.0);
    for (int k = 0; k < 8; k++) {
        float ck = (k == 0) ? ${C0} : ${CK};
        float xk = blockX + float(k) + 0.5;
        vec4 f = texture(src, vec2(xk / resolution.x, fc.y / resolution.y));
        sum += ck * f * cos((2.0 * x + 1.0) * float(k) * PI / 16.0);
    }
    outColor = sum;
}
`;

// Pass 7 — YCbCr → RGB, clamp, premultiply for the canvas blend.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
${YCBCR_GLSL}

void main() {
    vec4 c = texture(src, uv);
    vec3 rgb = clamp(ycbcr2rgb(c.rgb), 0.0, 1.0);
    float a = clamp(c.a, 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`;

export type JPEGGlitchParams = {
    /**
     * JPEG quality, `0`..`1`. `1` is near-lossless; lower values widen the
     * quantization step and produce the blocky 8x8 DCT artifacts.
     */
    quality: number;

    /**
     * Amount of DC-coefficient glitch, `0`..`1`. Drives how many block rows
     * get hit by the propagating-error cascade. `0` disables it.
     */
    glitch: number;

    /** Magnitude of the per-segment colour / brightness shift the glitch adds. */
    shift: number;

    /**
     * High-frequency block corruption, `0`..`1`. Randomly scrambles the AC
     * coefficients of some blocks, scattering bright DCT garbage.
     */
    corruption: number;

    /** Animation speed of the glitch. `0` freezes it to a static frame. */
    speed: number;

    /** Random seed. */
    seed: number;
};

const DEFAULT_PARAMS: JPEGGlitchParams = {
    quality: 0.3,
    glitch: 0.5,
    shift: 0.4,
    corruption: 0.15,
    speed: 1,
    seed: 0,
};

/**
 * JPEG-glitch effect. Simulates lossy-JPEG block DCT compression on the GPU
 * and corrupts the coefficients for a datamosh look.
 *
 * Mutate `params` directly or via `setParams` — uniforms are read live each
 * frame, so a reactive UI (e.g. Tweakpane) can bind to `effect.params`.
 */
export class JPEGGlitchEffect implements Effect {
    params: JPEGGlitchParams;

    #bufA: EffectRenderTarget | null = null;
    #bufB: EffectRenderTarget | null = null;

    constructor(initial: Partial<JPEGGlitchParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<JPEGGlitchParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        // Float storage: DCT coefficients leave the [0,1] range (the DC term
        // of a flat block is ~value x 8), so 8-bit targets would clip them.
        // Nearest filtering keeps the per-texel coefficient reads exact.
        this.#bufA = ctx.createRenderTarget({ float: true, filter: "nearest" });
        this.#bufB = ctx.createRenderTarget({ float: true, filter: "nearest" });
    }

    render(ctx: EffectContext): void {
        const a = this.#bufA;
        const b = this.#bufB;
        if (!a || !b) {
            return;
        }

        const resolution: [number, number] = [a.width, a.height];
        const { quality, glitch, shift, corruption, seed } = this.params;
        const time = ctx.time * this.params.speed;

        // 1. element capture → YCbCr (+ alpha)
        ctx.draw({ frag: FRAG_CONVERT, uniforms: { src: ctx.src }, target: a });

        // 2-3. forward separable DCT
        ctx.draw({
            frag: FRAG_DCT_H,
            uniforms: { src: a, resolution },
            target: b,
        });
        ctx.draw({
            frag: FRAG_DCT_V,
            uniforms: { src: b, resolution },
            target: a,
        });

        // 4. quantize + glitch
        ctx.draw({
            frag: FRAG_QUANTIZE,
            uniforms: {
                src: a,
                resolution,
                quality,
                glitch,
                shift,
                corruption,
                time,
                seed,
            },
            target: b,
        });

        // 5-6. inverse separable DCT
        ctx.draw({
            frag: FRAG_IDCT_V,
            uniforms: { src: b, resolution },
            target: a,
        });
        ctx.draw({
            frag: FRAG_IDCT_H,
            uniforms: { src: a, resolution },
            target: b,
        });

        // 7. YCbCr → RGB → canvas (or this stage's assigned target)
        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { src: b },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#bufA?.dispose();
        this.#bufB?.dispose();
        this.#bufA = null;
        this.#bufB = null;
    }
}
