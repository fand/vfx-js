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
// SHADER STUBS: the ME / residual / decode shader bodies below are
// minimal placeholders marked `STUB`. They compile and run (enabling
// shows a zero-motion feedback smear, proving the wiring), but the real
// H.264-like math is left to fill in.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Copy ctx.src into curRT. `uvSrc` maps the content into the buffer
// (= uv when there is no pad). Plumbing — complete as-is.
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
// the content rect into the target buffer. Plumbing — complete as-is.
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
uniform float uSearch;      // search radius in px
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
        vec2 cand = vec2(bx, by);   // candidate displacement, px
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
//
// STUB: zero-motion residual (cur - ref). Sample `uMV` and offset the
// reference by `mv / uResolution` for the real motion-compensated form.
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
//
// STUB: zero-motion prediction. Offset the accumulator read by
// `mv / uResolution` to drag texture along the motion field.
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
    outColor = vec4(pred + res, 1.0);
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
    /** Motion search radius in px. */
    searchRange: number;
    /** Add the residual during decode (off = pure motion). */
    useResidual: boolean;
    /** Color model. `"ycbcr"` is not implemented yet. */
    colorSpace: DatamoshColorSpace;
    /** Stage shown on the canvas. */
    view: DatamoshView;
};

const DEFAULT_PARAMS: DatamoshParams = {
    blockSize: 16,
    searchRange: 12,
    useResidual: true,
    colorSpace: "rgb",
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
    #w = 0;
    #h = 0;
    #block = 0;

    constructor(initial: Partial<DatamoshParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
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
        this.#curRT = null;
        this.#prevRT = null;
        this.#mvRT = null;
        this.#resRT = null;
        this.#accRT = null;
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
        if (!cur || !prev || !mv || !res || !acc) {
            return;
        }

        // TODO(datamosh): YCbCr 4:2:0 path (truncated chroma MV is what
        // gives real datamosh its color drift). RGB only for now.

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
            // Decode onto the held accumulator. First mosh frame seeds intra.
            ctx.draw({
                frag: FRAG_DECODE,
                uniforms: {
                    uAccum: acc,
                    uMV: mv,
                    uVideo: cur,
                    uResidual: res,
                    uResolution: resolution,
                    uIntra: this.#seed,
                    uUseResidual: this.params.useResidual,
                },
                target: acc,
            });
            this.#seed = false;
        } else {
            // Never refresh acc while disabled; re-seed on the next mosh frame.
            this.#seed = true;
        }

        this.#display(ctx, cur, prev, mv, res, acc);

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
    ): void {
        switch (this.params.view) {
            case "motion":
                ctx.draw({
                    frag: FRAG_VIEW_MOTION,
                    uniforms: { uMV: mv, uMvScale: this.params.searchRange },
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
                ctx.draw({
                    frag: FRAG_DISPLAY,
                    uniforms: { tex: this.#enabled ? acc : cur },
                    target: ctx.target,
                });
        }
    }

    dispose(): void {
        this.#disposeTargets();
        this.#w = 0;
        this.#h = 0;
        this.#block = 0;
        this.#seed = true;
    }
}
