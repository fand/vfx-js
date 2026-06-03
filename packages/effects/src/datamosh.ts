// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// Datamosh: simulates an H.264-style block codec to fake the classic
// "datamosh" smear. Each input frame is treated as a fresh source (an
// I-frame from the stream's view); the effect re-encodes consecutive
// inputs as motion + residual and decodes them onto a HELD reference.
//
// - disabled: every frame decoded as intra -> straight passthrough.
// - enabled: frames decoded as inter -> motion-compensate the held
//   accumulator + residual, never refreshing it from a clean frame, so
//   motion keeps dragging stale texture around (the mosh).
//
// Pipeline per frame (RGB path):
//   capture  ctx.src        -> curRT
//   ME       cur vs prev    -> mvRT   (one fragment per block)
//   residual cur - mc(prev) -> resRT
//   decode   intra ? cur : mc(accum, mv) + res -> accRT (persistent)
//   display  accRT          -> ctx.target
//   blit     cur            -> prevRT (persistent; next frame's reference)
//
// The YCbCr 4:2:0 path swaps decode for luma (full res) + chroma (half
// res, truncated MV); the truncation is what makes color drift off edges.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Copy ctx.src into curRT. `uvSrc` maps the content into the buffer
// (= uv when there is no pad).
const FRAG_CAPTURE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`;

// Premultiplied copy of an internal RT to the canvas. `uvContent` maps
// the content rect into the target buffer.
const FRAG_DISPLAY = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`;

// Motion estimation: one fragment per block. SAD block-matching searches
// the reference over a +/-uSearch px window and writes the displacement
// (px) that best matches the current block, into .rg of a float RT.
// A small length bias breaks ties toward (0,0) so flat blocks don't latch
// onto spurious large vectors.
const FRAG_ME = `#version 300 es
precision highp float;
out vec4 outMV;
uniform sampler2D uCur, uRef;
uniform vec2 uResolution;   // [w, h] in px
uniform float uBlock;       // block size in px
uniform float uSearch;      // search radius, in steps
uniform float uStep;        // px per step (coverage = uSearch * uStep px)
void main() {
    vec2 block = floor(gl_FragCoord.xy);
    vec2 base = block * uBlock;     // top-left pixel of this block

    // Cache the current block's 3x3 samples and their (offset, px) within
    // the block — the offsets are invariant across candidates.
    vec3 cs[9];
    vec2 off[9];
    for (int i = 0; i < 3; i++) {
      for (int j = 0; j < 3; j++) {
        int k = i * 3 + j;
        off[k] = vec2(1 + i * 2, 1 + j * 2) / 6.0 * uBlock;
        cs[k] = texture(uCur, (base + off[k] + 0.5) / uResolution).rgb;
      }
    }

    vec2 move = vec2(0.0);
    float bestSad = 1e9;
    for (float by = -uSearch; by <= uSearch; by++) {
      for (float bx = -uSearch; bx <= uSearch; bx++) {
        vec2 cand = vec2(bx, by) * uStep;   // candidate displacement, px
        float sad = 0.0;
        for (int k = 0; k < 9; k++) {
          vec3 cRef = texture(uRef, (base + off[k] + cand + 0.5) / uResolution).rgb;
          sad += dot(abs(cs[k] - cRef), vec3(1.0));
        }
        sad += length(cand) * 0.0025;   // prefer small motion on ties
        if (sad < bestSad) {
          bestSad = sad;
          move = cand;
        }
      }
    }

    outMV = vec4(move, 0.0, 1.0);
}
`;

// Residual = cur - motionComp(ref, mv). Signed -> needs a float RT.
const FRAG_RESIDUAL = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uResolution;
void main() {
    vec2 mv = texture(uMV, uv).rg; // px
    vec3 cur = texture(uCur, uv).rgb;
    vec3 pred = texture(uRef, uv + mv / uResolution).rgb;
    outColor = vec4(cur - pred, 1.0);
}
`;

// Decode. intra -> seed from the clean source. inter -> motion-comp the
// held accumulator and add the residual (this is where the mosh lives).
const FRAG_DECODE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    if (uIntra) {
        outColor = vec4(texture(uVideo, uv).rgb, 1.0);
        return;
    }
    vec2 mv = texture(uMV, uv).rg; // px
    vec3 pred = texture(uAccum, uv + mv / uResolution).rgb;
    vec3 res = uUseResidual ? texture(uResidual, uv).rgb : vec3(0.0);
    // Clamp like an 8-bit decoder so the feedback can't run away to white.
    outColor = vec4(clamp(pred + res, 0.0, 1.0), 1.0);
}
`;

// Debug view: motion field as HSV (hue = direction, value = magnitude).
const FRAG_VIEW_MOTION = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uMV;
uniform float uMvScale;     // magnitude normalization, px
vec3 hsv(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
    vec2 mv = texture(uMV, uvContent).rg;
    float ang = atan(mv.y, mv.x) / 6.28318 + 0.5;
    float mag = clamp(length(mv) / max(uMvScale, 1.0), 0.0, 1.0);
    outColor = vec4(hsv(vec3(ang, 0.9, 0.15 + 0.85 * mag)), 1.0);
}
`;

// Debug view: signed residual remapped to gray (0.5 = zero).
const FRAG_VIEW_RESIDUAL = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uResidual;
void main() {
    vec3 r = texture(uResidual, uvContent).rgb;
    outColor = vec4(clamp(r * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`;

// BT.601 luma / chroma. Both are linear, so the residual planes are
// derived from the shared RGB residual: luma(res) and chroma(res) - 0.5.
const Y601 = `
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`;

// Chroma residual (half res), zero-centered (Cb,Cr). Built with the SAME
// truncated chroma MV as the decode prediction, so the two cancel when
// residual is on — leaving the truncation drift to show only in pure-motion.
const FRAG_RESIDUAL_C = `#version 300 es
precision highp float;
${Y601}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uCur, uRef, uMV;
uniform vec2 uChromaRes;
void main() {
    vec2 mvc = floor(texture(uMV, uv).rg * 0.5);
    vec2 pred = chroma(texture(uRef, uv + mvc / uChromaRes).rgb);
    outColor = vec4(chroma(texture(uCur, uv).rgb) - pred, 0.0, 1.0);
}
`;

// Luma decode (full res). Writes Y into .r of the shared accumulator.
const FRAG_DECODE_Y = `#version 300 es
precision highp float;
${Y601}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uAccum, uMV, uVideo, uResidual;
uniform vec2 uResolution;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra) {
        outColor = vec4(luma(texture(uVideo, uv).rgb), 0.0, 0.0, 1.0);
        return;
    }

    // P-frame: compose luma from acc + residual
    vec2 mv = texture(uMV, uv).rg; // px
    float pred = texture(uAccum, uv + mv / uResolution).r;
    float res = uUseResidual ? luma(texture(uResidual, uv).rgb) : 0.0;
    float Y = clamp(pred + res, 0.0, 1.0);

    outColor = vec4(Y, 0.0, 0.0, 1.0);
}
`;

// Chroma decode (half res). Writes (Cb,Cr) into .rg of the chroma plane.
// The truncated chroma MV (mvc = floor(mv * 0.5)) is the datamosh color
// drift: chroma is dragged by half the luma motion, rounded down, so color
// slides off the luma edges.
const FRAG_DECODE_C = `#version 300 es
precision highp float;
${Y601}
in vec2 uv;
out vec4 outColor;
uniform sampler2D uChromaAcc, uMV, uVideo, uResidualC;
uniform vec2 uChromaRes;
uniform bool uIntra;
uniform bool uUseResidual;
void main() {
    // I-frame: passthrough the input
    if (uIntra) {
        outColor = vec4(chroma(texture(uVideo, uv).rgb), 0.0, 1.0);
        return;
    }

    // P-frame: compose chroma from acc + residual. uResidualC is the
    // zero-centered chroma residual (built with the SAME truncated MV as
    // the prediction below, so they cancel when residual is on).
    vec2 mv = texture(uMV, uv).rg; // px (luma units)
    vec2 mvc = floor(mv * 0.5);
    vec2 pred = texture(uChromaAcc, uv + mvc / uChromaRes).rg;
    vec2 res = uUseResidual ? texture(uResidualC, uv).rg : vec2(0);
    vec2 C = clamp(pred + res, 0.0, 1.0);

    outColor = vec4(C, 0.0, 1.0);
}
`;

// YCbCr 4:2:0 -> RGB. Luma full res, chroma upsampled (bilinear) from the
// half-res plane. `uChromaGain` boosts saturation. Premultiplied for the
// canvas.
const FRAG_DISPLAY_YCBCR = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D uLumaAcc;
uniform sampler2D uChromaAcc;
uniform float uChromaGain;
void main() {
    float Y = texture(uLumaAcc, uvContent).r;
    vec2 cbcr = (texture(uChromaAcc, uvContent).rg - 0.5) * uChromaGain;
    vec3 rgb = vec3(
        Y + 1.402 * cbcr.y,
        Y - 0.344136 * cbcr.x - 0.714136 * cbcr.y,
        Y + 1.772 * cbcr.x
    );
    outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
`;

export type DatamoshColorSpace = "rgb" | "ycbcr";

/** Stage routed to the canvas; non-`output` views are for debugging. */
export type DatamoshView =
    | "output"
    | "motion"
    | "residual"
    | "current"
    | "previous";

export type DatamoshParams = {
    /** Motion-estimation block size in px. */
    blockSize: number;
    /** Motion search radius, in steps. Coverage = searchRange * searchStep px. */
    searchRange: number;
    /** Pixels per search step. Widens coverage at a fixed candidate count. */
    searchStep: number;
    /** Add the residual during decode (off = pure motion). */
    useResidual: boolean;
    /**
     * P-frame duplication: re-apply the frame's motion this many extra
     * times per frame, dragging the accumulator further along the field
     * (the bloom/smear amplifier). 0 = one normal application.
     */
    dup: number;
    /** Color model. `"ycbcr"` is 4:2:0 (half-res chroma w/ truncated MV). */
    colorSpace: DatamoshColorSpace;
    /** Chroma saturation boost (YCbCr output). 1 = unchanged. */
    chromaGain: number;
    /** Stage shown on the canvas. */
    view: DatamoshView;
};

const DEFAULT_PARAMS: DatamoshParams = {
    blockSize: 16,
    searchRange: 5,
    searchStep: 2,
    useResidual: true,
    dup: 0,
    colorSpace: "ycbcr",
    chromaGain: 1,
    view: "output",
};

/**
 * Pseudo-datamosh via a faked H.264 block codec. Passes the input
 * through until `enable()`, then holds a motion-compensated accumulator
 * so motion smears stale texture around. Mutate `params` directly or via
 * `setParams`; toggle the mosh with `enable()` / `disable()`.
 */
export class DatamoshEffect implements Effect {
    params: DatamoshParams;

    #enabled = false;
    // Re-seed the accumulator from a clean frame on the next mosh frame.
    #seed = true;

    #curRT: EffectRenderTarget | null = null;
    #prevRT: EffectRenderTarget | null = null;
    #mvRT: EffectRenderTarget | null = null;
    #resRT: EffectRenderTarget | null = null;
    #accRT: EffectRenderTarget | null = null;
    // Half-res chroma accumulator (YCbCr path). Luma reuses #accRT (.r).
    #chromaAccRT: EffectRenderTarget | null = null;
    // Half-res chroma residual (YCbCr path). Luma reuses #resRT (.r).
    #chromaResRT: EffectRenderTarget | null = null;
    #w = 0;
    #h = 0;
    #cw = 0;
    #ch = 0;
    #block = 0;
    // Re-seed when the color model flips (accumulators change meaning).
    #lastColorSpace: DatamoshColorSpace;

    constructor(initial: Partial<DatamoshParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        this.#lastColorSpace = this.params.colorSpace;
    }

    setParams(partial: Partial<DatamoshParams>): void {
        Object.assign(this.params, partial);
    }

    enable(): void {
        this.#enabled = true;
    }

    disable(): void {
        this.#enabled = false;
        this.#seed = true;
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    #disposeTargets(): void {
        this.#curRT?.dispose();
        this.#prevRT?.dispose();
        this.#mvRT?.dispose();
        this.#resRT?.dispose();
        this.#accRT?.dispose();
        this.#chromaAccRT?.dispose();
        this.#chromaResRT?.dispose();
        this.#curRT = null;
        this.#prevRT = null;
        this.#mvRT = null;
        this.#resRT = null;
        this.#accRT = null;
        this.#chromaAccRT = null;
        this.#chromaResRT = null;
    }

    #ensureSize(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const block = Math.max(2, this.params.blockSize);
        if (this.#w === w && this.#h === h && this.#block === block) {
            return;
        }
        this.#disposeTargets();
        this.#w = w;
        this.#h = h;
        this.#cw = Math.ceil(w / 2);
        this.#ch = Math.ceil(h / 2);
        this.#block = block;
        this.#seed = true;

        const cols = Math.ceil(w / block);
        const rows = Math.ceil(h / block);
        // Full-res content buffers; residual/accumulator are float to
        // hold signed values and accumulation overflow.
        this.#curRT = ctx.createRenderTarget({ size: [w, h] });
        this.#prevRT = ctx.createRenderTarget({
            size: [w, h],
            persistent: true,
        });
        this.#resRT = ctx.createRenderTarget({ size: [w, h], float: true });
        this.#accRT = ctx.createRenderTarget({
            size: [w, h],
            float: true,
            persistent: true,
        });
        // Half-res chroma accumulator (4:2:0). RG = (Cb, Cr).
        this.#chromaAccRT = ctx.createRenderTarget({
            size: [this.#cw, this.#ch],
            float: true,
            persistent: true,
        });
        // Half-res chroma residual (zero-centered, truncated-MV).
        this.#chromaResRT = ctx.createRenderTarget({
            size: [this.#cw, this.#ch],
            float: true,
        });
        // Motion field: one texel per block, nearest so reads snap to the
        // block's vector.
        this.#mvRT = ctx.createRenderTarget({
            size: [cols, rows],
            float: true,
            filter: "nearest",
        });
    }

    render(ctx: EffectContext): void {
        this.#ensureSize(ctx);
        const cur = this.#curRT;
        const prev = this.#prevRT;
        const mv = this.#mvRT;
        const res = this.#resRT;
        const acc = this.#accRT;
        const chromaAcc = this.#chromaAccRT;
        const chromaResidual = this.#chromaResRT;
        if (
            !cur ||
            !prev ||
            !mv ||
            !res ||
            !acc ||
            !chromaAcc ||
            !chromaResidual
        ) {
            return;
        }

        // Flipping the color model repurposes the accumulators, so re-seed.
        if (this.params.colorSpace !== this.#lastColorSpace) {
            this.#lastColorSpace = this.params.colorSpace;
            this.#seed = true;
        }

        const resolution: [number, number] = [this.#w, this.#h];

        // Capture the current frame into uv-space.
        ctx.draw({
            frag: FRAG_CAPTURE,
            uniforms: { src: ctx.src },
            target: cur,
        });

        // ME + residual feed both the decoder and the debug views, so run
        // them whenever moshing OR inspecting an intermediate stage.
        const debug = this.params.view !== "output";
        if (this.#enabled || debug) {
            ctx.draw({
                frag: FRAG_ME,
                uniforms: {
                    uCur: cur,
                    uRef: prev,
                    uResolution: resolution,
                    uBlock: this.#block,
                    uSearch: this.params.searchRange,
                    uStep: this.params.searchStep,
                },
                target: mv,
            });
            ctx.draw({
                frag: FRAG_RESIDUAL,
                uniforms: {
                    uCur: cur,
                    uRef: prev,
                    uMV: mv,
                    uResolution: resolution,
                },
                target: res,
            });
        }

        if (this.#enabled) {
            // Decode onto the held accumulator. First mosh frame seeds
            // intra (1 pass); inter re-applies the motion 1 + dup times,
            // chaining through the persistent RT's ping-pong to compound
            // the smear. Residual lands on the first pass only.
            const reps = this.#seed ? 1 : 1 + this.params.dup;
            const chromaRes: [number, number] = [this.#cw, this.#ch];
            if (this.params.colorSpace === "ycbcr") {
                // Chroma residual with the truncated MV (matches DECC's
                // prediction so it cancels when residual is on).
                ctx.draw({
                    frag: FRAG_RESIDUAL_C,
                    uniforms: {
                        uCur: cur,
                        uRef: prev,
                        uMV: mv,
                        uChromaRes: chromaRes,
                    },
                    target: chromaResidual,
                });
            }
            for (let r = 0; r < reps; r++) {
                const useResidual = this.params.useResidual && r === 0;
                if (this.params.colorSpace === "ycbcr") {
                    ctx.draw({
                        frag: FRAG_DECODE_Y,
                        uniforms: {
                            uAccum: acc,
                            uMV: mv,
                            uVideo: cur,
                            uResidual: res,
                            uResolution: resolution,
                            uIntra: this.#seed,
                            uUseResidual: useResidual,
                        },
                        target: acc,
                    });
                    ctx.draw({
                        frag: FRAG_DECODE_C,
                        uniforms: {
                            uChromaAcc: chromaAcc,
                            uMV: mv,
                            uVideo: cur,
                            uResidualC: chromaResidual,
                            uChromaRes: chromaRes,
                            uIntra: this.#seed,
                            uUseResidual: useResidual,
                        },
                        target: chromaAcc,
                    });
                } else {
                    ctx.draw({
                        frag: FRAG_DECODE,
                        uniforms: {
                            uAccum: acc,
                            uMV: mv,
                            uVideo: cur,
                            uResidual: res,
                            uResolution: resolution,
                            uIntra: this.#seed,
                            uUseResidual: useResidual,
                        },
                        target: acc,
                    });
                }
            }
            this.#seed = false;
        } else {
            // Never refresh acc while disabled; re-seed on the next mosh frame.
            this.#seed = true;
        }

        this.#display(ctx, cur, prev, mv, res, acc, chromaAcc);

        // Reference for next frame's motion estimation.
        ctx.draw({
            frag: FRAG_CAPTURE,
            uniforms: { src: ctx.src },
            target: prev,
        });
    }

    // Route the selected stage to the canvas. "output" shows the decoded
    // accumulator while moshing, the live frame otherwise.
    #display(
        ctx: EffectContext,
        cur: EffectRenderTarget,
        prev: EffectRenderTarget,
        mv: EffectRenderTarget,
        res: EffectRenderTarget,
        acc: EffectRenderTarget,
        chromaAcc: EffectRenderTarget,
    ): void {
        switch (this.params.view) {
            case "motion":
                ctx.draw({
                    frag: FRAG_VIEW_MOTION,
                    uniforms: {
                        uMV: mv,
                        uMvScale:
                            this.params.searchRange * this.params.searchStep,
                    },
                    target: ctx.target,
                });
                return;
            case "residual":
                ctx.draw({
                    frag: FRAG_VIEW_RESIDUAL,
                    uniforms: { uResidual: res },
                    target: ctx.target,
                });
                return;
            case "current":
                ctx.draw({
                    frag: FRAG_DISPLAY,
                    uniforms: { tex: cur },
                    target: ctx.target,
                });
                return;
            case "previous":
                ctx.draw({
                    frag: FRAG_DISPLAY,
                    uniforms: { tex: prev },
                    target: ctx.target,
                });
                return;
            default:
                // "output": decoded result while moshing, live frame otherwise.
                if (this.#enabled && this.params.colorSpace === "ycbcr") {
                    ctx.draw({
                        frag: FRAG_DISPLAY_YCBCR,
                        uniforms: {
                            uLumaAcc: acc,
                            uChromaAcc: chromaAcc,
                            uChromaGain: this.params.chromaGain,
                        },
                        target: ctx.target,
                    });
                } else {
                    ctx.draw({
                        frag: FRAG_DISPLAY,
                        uniforms: { tex: this.#enabled ? acc : cur },
                        target: ctx.target,
                    });
                }
        }
    }

    dispose(): void {
        this.#disposeTargets();
        this.#w = 0;
        this.#h = 0;
        this.#cw = 0;
        this.#ch = 0;
        this.#block = 0;
        this.#seed = true;
    }
}
