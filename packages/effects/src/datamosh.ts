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

// Motion estimation: one fragment per block, output = best motion
// vector for that block in source pixels (stored in .rg of a float RT).
//
// STUB: returns zero motion. Implement a per-block SAD search of `uRef`
// against `uCur` over a [-uSearch, +uSearch] window and write the
// displacement that minimises the block difference.
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

    vec2 move = vec2(0);
    float bestSad = 1e9;

    // 9-point sample
    vec3 cs[9];
    for (int i = 0; i < 3; i++) {
      for (int j = 0; j < 3; j++) {
        cs[i * 3 + j] = texture(uCur, (base + vec2(1 + i * 2, 1 + j * 2) / 6. * uBlock) / uResolution).rgb;
      }
    }

    for (float by = -uSearch; by <= uSearch; by++) {
      for (float bx = -uSearch; bx <= uSearch; bx++) {
        vec2 blockOffset = vec2(bx, by);
        float sad = 0.0;

        // 9-point sample
        for (int i = 0; i < 3; i++) {
          for (int j = 0; j < 3; j++) {
            vec3 cCur = cs[i * 3 + j];
            vec3 cRef = texture(uRef, (base + vec2(1 + i * 2, 1 + j * 2) / 6. * uBlock + blockOffset) / uResolution).rgb;
            sad += dot(abs(cCur - cRef), vec3(1));
          }
        }

        if (sad < bestSad) {
          bestSad = sad;
          move = blockOffset;
        }
      }
    }

    outMV = vec4(move, 0, 1);
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
    vec2 mv = texture(uMV, uv).rg;          // px
    vec3 cur = texture(uCur, uv).rgb;
    // TODO(datamosh): predict from the motion-compensated reference.
    vec3 pred = texture(uRef, uv).rgb;      // STUB: ignores mv
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
    vec2 mv = texture(uMV, uv).rg;          // px
    // TODO(datamosh): predict from the motion-compensated accumulator.
    vec3 pred = texture(uAccum, uv).rgb;    // STUB: ignores mv
    vec3 res = uUseResidual ? texture(uResidual, uv).rgb : vec3(0.0);
    outColor = vec4(pred + res, 1.0);
}
`;

export type DatamoshColorSpace = "rgb" | "ycbcr";

export type DatamoshParams = {
    /** Motion-estimation block size in px. */
    blockSize: number;
    /** Motion search radius in px. */
    searchRange: number;
    /** Add the residual during decode (off = pure motion). */
    useResidual: boolean;
    /** Color model. `"ycbcr"` is not implemented yet. */
    colorSpace: DatamoshColorSpace;
};

const DEFAULT_PARAMS: DatamoshParams = {
    blockSize: 16,
    searchRange: 12,
    useResidual: true,
    colorSpace: "rgb",
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

        if (!this.#enabled) {
            // Passthrough; keep buffers warm for a clean first mosh frame.
            ctx.draw({
                frag: FRAG_DISPLAY,
                uniforms: { tex: cur },
                target: ctx.target,
            });
            ctx.draw({
                frag: FRAG_CAPTURE,
                uniforms: { src: ctx.src },
                target: prev,
            });
            this.#seed = true;
            return;
        }

        // Encode: motion estimation + residual.
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

        ctx.draw({
            frag: FRAG_DISPLAY,
            uniforms: { tex: acc },
            target: ctx.target,
        });

        // Reference for next frame's motion estimation.
        ctx.draw({
            frag: FRAG_CAPTURE,
            uniforms: { src: ctx.src },
            target: prev,
        });
    }

    dispose(): void {
        this.#disposeTargets();
        this.#w = 0;
        this.#h = 0;
        this.#block = 0;
        this.#seed = true;
    }
}
