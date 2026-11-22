// Energy-conserving glare (holospot engine/render/glare.ts + glare_down/up.frag, MIT © 2026 Dmitry Kurash): no
// threshold; level 0 at ½ (low tier ¼) resolution decodes the card target per texel, levels 1…n−1 repeat the 13-tap
// downsample, then the progressive 3 × 3 tent upsample adds k_i·tent(level_i) into level_(i−1), so the output pass
// reads G = w_0·level_0 = Σ_i w_i·level_i with Σ w_i = 1. The levels are sized to the element exactly, so the active
// region of each is the whole target.
import type {
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import glareDown from "./glsl/glare-down.js";
import glareUp from "./glsl/glare-up.js";
import { FRAG_PREFIX, GLSL_COMMON, PLAIN_VERT } from "./shader.js";

/** w_i ∝ exp(−σ_i/r): σ_i = size of a level-i texel in CSS px (div·2^i/DPR), r = glare radius in CSS px. Σ w_i = 1. */
export function glareWeights(
    levels: number,
    startDiv: number,
    radiusCssPx: number,
    dpr: number,
): number[] {
    const r = Math.max(radiusCssPx, 1e-3);
    const w: number[] = [];
    for (let i = 0; i < levels; i++) {
        w.push(Math.exp(-(startDiv * 2 ** i) / Math.max(dpr, 1e-3) / r));
    }
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
}

const downFrag = (mode: number) =>
    `${FRAG_PREFIX}\n#define GLARE_MODE ${mode}\n${GLSL_COMMON}\n${glareDown}`;
const FRAG_UP = `${FRAG_PREFIX}\n${glareUp}`;

interface Level {
    rt: EffectRenderTarget;
    w: number;
    h: number;
}

export class HoloGlare {
    private levels: Level[] = [];
    private key = "";

    /** (Re)allocates the levels for a card target of srcW × srcH texels. */
    ensure(
        ctx: EffectContext,
        srcW: number,
        srcH: number,
        count: number,
        startDiv: 2 | 4,
    ): void {
        const key = `${srcW}x${srcH}/${count}/${startDiv}`;
        if (key === this.key) {
            return;
        }
        this.dispose();
        this.key = key;
        let w = Math.max(1, Math.ceil(srcW / startDiv));
        let h = Math.max(1, Math.ceil(srcH / startDiv));
        for (let i = 0; i < count; i++) {
            this.levels.push({
                rt: ctx.createRenderTarget({
                    size: [w, h],
                    float: true,
                    filter: "linear",
                }),
                w,
                h,
            });
            w = Math.max(1, Math.ceil(w / 2));
            h = Math.max(1, Math.ceil(h / 2));
        }
    }

    get level0(): EffectRenderTarget | null {
        return this.levels[0]?.rt ?? null;
    }

    /** Runs the chain on the card target `src` (srcW × srcH texels); leaves G/w_0 in level 0 and returns w_0. */
    render(
        ctx: EffectContext,
        src: EffectRenderTarget | EffectTexture,
        srcW: number,
        srcH: number,
        startDiv: 2 | 4,
        radiusCssPx: number,
        dpr: number,
    ): number {
        const n = this.levels.length;
        if (!n) {
            return 0;
        }
        const w = glareWeights(n, startDiv, radiusCssPx, dpr);
        for (let i = 0; i < n; i++) {
            const L = this.levels[i];
            if (i === 0) {
                ctx.draw({
                    frag: downFrag(startDiv === 4 ? 1 : 0),
                    vert: PLAIN_VERT,
                    target: L.rt,
                    uniforms: {
                        tSrc: src,
                        uSrcTexel: [1 / srcW, 1 / srcH],
                        uSrcSize: [srcW, srcH],
                        uSrcMin: [0, 0],
                        uSrcMax: [1, 1],
                    },
                });
            } else {
                const S = this.levels[i - 1];
                ctx.draw({
                    frag: downFrag(2),
                    vert: PLAIN_VERT,
                    target: L.rt,
                    uniforms: {
                        tSrc: S.rt,
                        uSrcTexel: [1 / S.w, 1 / S.h],
                        uSrcSize: [S.w, S.h],
                        uSrcMin: [0.5 / S.w, 0.5 / S.h],
                        uSrcMax: [(S.w - 0.5) / S.w, (S.h - 0.5) / S.h],
                    },
                });
            }
        }
        for (let i = n - 1; i >= 1; i--) {
            const S = this.levels[i];
            const D = this.levels[i - 1];
            ctx.draw({
                frag: FRAG_UP,
                vert: PLAIN_VERT,
                target: D.rt,
                blend: "additive",
                uniforms: {
                    tSrc: S.rt,
                    uSrcTexel: [1 / S.w, 1 / S.h],
                    uSrcMin: [0.5 / S.w, 0.5 / S.h],
                    uSrcMax: [(S.w - 0.5) / S.w, (S.h - 0.5) / S.h],
                    uK: w[i] / Math.max(w[i - 1], 1e-30),
                },
            });
        }
        return w[0];
    }

    /** vUv → level-0 uv scale, as holospot's outputMapping. */
    outputScale(
        srcW: number,
        srcH: number,
        startDiv: number,
    ): [number, number] {
        const L = this.levels[0];
        return L ? [srcW / startDiv / L.w, srcH / startDiv / L.h] : [1, 1];
    }

    dispose(): void {
        for (const L of this.levels) {
            L.rt.dispose();
        }
        this.levels = [];
        this.key = "";
    }
}
