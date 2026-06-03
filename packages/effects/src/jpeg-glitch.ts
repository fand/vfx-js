// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// JPEG glitch via DCT simulation (approach "B").
//
// Rather than round-tripping the element through a real JPEG codec on the
// CPU, this reproduces the visible artifacts of lossy JPEG entirely on the
// GPU as a multipass pipeline:
//
//   1. convert    RGB → YCbCr (+ straight alpha)       src      → bufA
//   2. dctH       forward 1-D DCT-II over each 8px row  bufA     → bufB
//   3. dctV       forward 1-D DCT-II over each 8px col  bufB     → bufA
//   4. cascadeRow row-local prefix sum of DC impulses   (proc.)  → rowScan
//   5. cascade    full scan-order prefix sum + desync   rowScan  → cascade
//   6. quantize   per-coefficient quantization + glitch bufA     → bufB
//   7. idctV      inverse 1-D DCT over each column       bufB     → bufA
//   8. idctH      inverse 1-D DCT over each row          bufA     → bufB
//   9. resolve    YCbCr → RGB, premultiply, write        bufB     → canvas
//
// The 2-D block DCT is separable, so each transform is two cheap 1-D passes
// (8 taps each) instead of a 64-tap convolution. Steps 2-8 run in the
// effect's own auto-sized render targets where `gl_FragCoord` maps 1:1 to
// texels (and therefore to the 8x8 block grid). The final `resolve` pass
// samples by `uv` only, so it is safe to draw into the offset element
// viewport of the last chain stage.
//
// Quantization (step 6) produces the classic blocky DCT artifacts. The
// glitch on top is the part that makes it read as a *real* JPEG byte-glitch
// (think `sed`-ing a .jpg). In baseline JPEG the DC coefficient of every
// block is differentially coded against the previous block in raster scan
// order — across row boundaries, with no per-row reset — so one corrupted
// DC delta shifts the brightness/colour of *every* block after it, to the
// end of the scan. Reproducing that needs a running sum in scan order, not
// a per-row effect, so the cascade is computed on a small block-resolution
// buffer (steps 4-5) as a two-pass prefix sum:
//   - step 4 sums DC impulses left-to-right within each block row, and
//     tracks the latest "desync" trigger block in that row;
//   - step 5 folds in all the rows above to get the true scan-order running
//     sum (the propagating DC offset) and running-max trigger.
// The desync trigger emulates entropy-stream loss: from a trigger block, a
// run of following blocks collapses to flat DC (the melted / smeared look)
// until the decoder would resync.
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

// Shared block-impulse model (block-resolution passes). `scan` is the
// raster block index `by * bw + bx`. Most blocks emit nothing; a sparse
// few inject a signed DC delta (the corrupted differential) or flag a
// desync trigger. `floor(time)` makes the corruption re-roll discretely so
// `speed > 0` animates without smearing.
const IMPULSE_GLSL = `
uniform float glitch;
uniform float corruption;
uniform float shift;
uniform float time;
uniform float seed;

float h11(float x) {
    return fract(sin(x * 0.1031 + seed * 17.13) * 43758.5453);
}

// Signed DC delta injected at this block (zero for most blocks).
vec3 dcImpulse(float scan, float tt) {
    if (h11(scan * 1.7 + tt * 131.0) >= glitch * 0.012) {
        return vec3(0.0);
    }
    vec3 d = vec3(
        h11(scan * 2.3 + tt * 7.0),
        h11(scan * 3.1 + tt * 9.0),
        h11(scan * 4.7 + tt * 11.0)
    ) - 0.5;
    // DC of a flat block ~ value x 8; scale the offset into that range.
    return d * shift * 16.0;
}

// 1.0 when this block flips the decoder into a desync (garbage) run.
float desyncImpulse(float scan, float tt) {
    return h11(scan * 5.9 + tt * 53.0 + 99.0) < corruption * 0.010 ? 1.0 : 0.0;
}
`;

// Pass 4 — row-local prefix. For block (bx, by): the inclusive sum of DC
// impulses from column 0..bx in this row (rgb), and the largest desync
// trigger scan-index seen so far in this row (a, -1 if none). Reading this
// buffer at the last column therefore gives each row's full total / max.
const FRAG_CASCADE_ROW = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 grid; // [bw, bh] in blocks
${IMPULSE_GLSL}

void main() {
    float bw = grid.x;
    float bx = floor(gl_FragCoord.x);
    float by = floor(gl_FragCoord.y);
    float tt = floor(time);

    vec3 dc = vec3(0.0);
    float trig = -1.0;
    for (int i = 0; i < 4096; i++) {
        if (float(i) > bx) break;
        float scan = by * bw + float(i);
        dc += dcImpulse(scan, tt);
        if (desyncImpulse(scan, tt) > 0.5) {
            trig = scan;
        }
    }
    outColor = vec4(dc, trig);
}
`;

// Pass 5 — fold in every row above to finish the scan-order prefix sum.
// finalDC(bx,by) = (sum of all full rows j<by) + rowPrefix(bx,by); the
// trigger is the running max over the same scan range. The result is the
// true raster-order running DC offset that floods across row boundaries.
const FRAG_CASCADE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D rowScan;
uniform vec2 grid; // [bw, bh] in blocks

void main() {
    float bw = grid.x;
    float bh = grid.y;
    float bx = floor(gl_FragCoord.x);
    float by = floor(gl_FragCoord.y);
    float lastCol = (bw - 0.5) / bw;

    vec3 dc = vec3(0.0);
    float trig = -1.0;
    for (int j = 0; j < 4096; j++) {
        if (float(j) >= by) break;
        vec4 row = texture(rowScan, vec2(lastCol, (float(j) + 0.5) / bh));
        dc += row.rgb;
        trig = max(trig, row.a);
    }
    vec4 here = texture(rowScan, vec2((bx + 0.5) / bw, (by + 0.5) / bh));
    outColor = vec4(dc + here.rgb, max(trig, here.a));
}
`;

// Pass 6 — quantize each coefficient (heavier for high frequency and for
// chroma, lighter for DC), then apply the cascade. The buffer holds full
// per-block DCT coefficients in the natural frequency layout: the texel at
// the top-left of each 8x8 cell is that block's DC term.
const FRAG_QUANTIZE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D cascade; // block-res: rgb = DC offset, a = last trigger
uniform vec2 resolution;
uniform vec2 grid; // [bw, bh] in blocks
uniform float quality;
uniform float seed;

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
        // image out — the cascade below is what should move it.
        lumaStep *= 0.25;
        chromaStep *= 0.25;
    }
    vec4 q = vec4(lumaStep, chromaStep, chromaStep, lumaStep);
    coef = floor(coef / q + 0.5) * q;

    // --- scan-order cascade ---
    vec4 casc = texture(cascade, vec2((bx + 0.5) / grid.x, (by + 0.5) / grid.y));
    vec3 dcOffset = casc.rgb;
    float trig = casc.a;

    // Desync run: from the trigger block, the next runLen blocks (scan
    // order) lose entropy sync and collapse to flat DC — solid blocks that
    // read as the melted / smeared region of a JPEG byte-glitch.
    float scan = by * grid.x + bx;
    float runLen = 4.0 + 60.0 * fract(sin(trig * 0.137 + seed) * 43758.5453);
    bool desync = trig >= 0.0 && (scan - trig) >= 0.0 && (scan - trig) < runLen;

    if (isDC) {
        coef.xyz += dcOffset;
    } else if (desync) {
        coef = vec4(0.0); // drop AC → block flattens to its (shifted) DC
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
     * Density of DC corruption events, `0`..`1`. Each event injects a
     * differential error that — like a real baseline-JPEG DC desync —
     * accumulates in raster scan order and shifts every following block to
     * the end of the image. `0` disables the cascade.
     */
    glitch: number;

    /** Magnitude of each DC corruption's colour / brightness shift. */
    shift: number;

    /**
     * Entropy-desync corruption, `0`..`1`. Density of triggers that flip the
     * decoder into a garbage run: from each trigger, a run of following
     * blocks (scan order) collapses to flat DC — the melted / smeared look.
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
    // Block-resolution buffers for the scan-order DC cascade. Sized to the
    // 8x8 block grid, so they are reallocated when the element resizes.
    #rowScan: EffectRenderTarget | null = null;
    #cascade: EffectRenderTarget | null = null;
    #blocksW = 0;
    #blocksH = 0;

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

        const [rowScan, cascade] = this.#ensureBlockBuffers(ctx, a);
        const grid: [number, number] = [this.#blocksW, this.#blocksH];

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

        // 4-5. scan-order DC cascade (two-pass prefix sum at block res)
        const impulse = { glitch, corruption, shift, time, seed };
        ctx.draw({
            frag: FRAG_CASCADE_ROW,
            uniforms: { grid, ...impulse },
            target: rowScan,
        });
        ctx.draw({
            frag: FRAG_CASCADE,
            uniforms: { rowScan, grid },
            target: cascade,
        });

        // 6. quantize + cascade application
        ctx.draw({
            frag: FRAG_QUANTIZE,
            uniforms: { src: a, cascade, resolution, grid, quality, seed },
            target: b,
        });

        // 7-8. inverse separable DCT
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

        // 9. YCbCr → RGB → canvas (or this stage's assigned target)
        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { src: b },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#bufA?.dispose();
        this.#bufB?.dispose();
        this.#rowScan?.dispose();
        this.#cascade?.dispose();
        this.#bufA = null;
        this.#bufB = null;
        this.#rowScan = null;
        this.#cascade = null;
        this.#blocksW = 0;
        this.#blocksH = 0;
    }

    // Allocate (or resize) the block-resolution cascade buffers to match the
    // current coefficient buffer's 8x8 block grid.
    #ensureBlockBuffers(
        ctx: EffectContext,
        coef: EffectRenderTarget,
    ): [EffectRenderTarget, EffectRenderTarget] {
        const bw = Math.max(1, Math.ceil(coef.width / 8));
        const bh = Math.max(1, Math.ceil(coef.height / 8));
        if (
            !this.#rowScan ||
            !this.#cascade ||
            bw !== this.#blocksW ||
            bh !== this.#blocksH
        ) {
            this.#rowScan?.dispose();
            this.#cascade?.dispose();
            const opts = {
                size: [bw, bh] as const,
                float: true,
                filter: "nearest" as const,
            };
            this.#rowScan = ctx.createRenderTarget(opts);
            this.#cascade = ctx.createRenderTarget(opts);
            this.#blocksW = bw;
            this.#blocksH = bh;
        }
        return [this.#rowScan, this.#cascade];
    }
}
