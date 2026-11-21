// Shared by bloom.ts and swirl-particles.ts: the soft-knee threshold, the
// tent upsample and the pyramid's targets and upsample chain. Internal,
// not exported from index.ts.
//
// The two effects build their pyramids differently (BloomEffect: sRGB
// decode, edge fade and a 13-tap Karis downsample; SwirlParticles: an HDR
// box prefilter and a 5-tap downsample, which its shadow blur reuses), so
// those passes stay in each effect.
import type { EffectContext, EffectRenderTarget } from "@vfx-js/core";

// COD:AW (Jimenez 2014) / Unity HDRP soft-knee brightness response: the
// share of a pixel of brightness `br` that blooms. A quadratic ramp of
// half-width `knee` centred on `threshold`; knee 0 is a hard threshold.
export const GLSL_BLOOM_KNEE = `
float bloomKnee(float br, float threshold, float knee) {
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    return max(rq, br - threshold) / max(br, 1e-4);
}
`;

// 3×3 tent upsample of the smaller level, added to the larger one:
// srcLarge × weightLarge + tent(srcSmall) × weightSmall.
export const FRAG_BLOOM_UPSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`;

/**
 * Float targets of a bloom pyramid. `down[0]` is half the base size and
 * each level halves again; `up[i]` matches `down[i]`, and the coarsest
 * level has no `up`.
 */
export type BloomPyramid = {
    down: EffectRenderTarget[];
    up: EffectRenderTarget[];
};

/**
 * Allocate a pyramid for a `baseW` × `baseH` buffer: at most `maxLevels`
 * levels, fewer when both axes reach 1 px first.
 */
export function createBloomPyramid(
    ctx: EffectContext,
    baseW: number,
    baseH: number,
    maxLevels: number,
): BloomPyramid {
    const down: EffectRenderTarget[] = [];
    let w = Math.max(1, Math.floor(baseW / 2));
    let h = Math.max(1, Math.floor(baseH / 2));
    for (let i = 0; i < maxLevels; i++) {
        down.push(ctx.createRenderTarget({ size: [w, h], float: true }));
        const nw = Math.max(1, Math.floor(w / 2));
        const nh = Math.max(1, Math.floor(h / 2));
        if (nw === w && nh === h) {
            break;
        }
        w = nw;
        h = nh;
    }
    const up = down
        .slice(0, -1)
        .map((d) =>
            ctx.createRenderTarget({ size: [d.width, d.height], float: true }),
        );
    return { down, up };
}

export function disposeBloomPyramid(p: BloomPyramid): void {
    for (const rt of p.down) {
        rt.dispose();
    }
    for (const rt of p.up) {
        rt.dispose();
    }
    p.down.length = 0;
    p.up.length = 0;
}

/** Uniforms of one upsample step, from level `i + 1` (`small`) into `i`. */
export type BloomUpsampleStep = {
    texelSize: [number, number];
    weightLarge: number;
    weightSmall: number;
};

/**
 * Upsample and add from the coarsest level up: `up[i] = down[i] ×
 * weightLarge + tent(up[i + 1]) × weightSmall`, starting from the
 * coarsest `down`. Returns the finest result: `up[0]`, or `down[0]` with
 * a single level.
 */
export function upsampleBloomPyramid(
    ctx: EffectContext,
    p: BloomPyramid,
    step: (i: number, small: EffectRenderTarget) => BloomUpsampleStep,
): EffectRenderTarget {
    const n = p.down.length;
    let small = p.down[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        ctx.draw({
            frag: FRAG_BLOOM_UPSAMPLE,
            uniforms: {
                srcSmall: small,
                srcLarge: p.down[i],
                ...step(i, small),
            },
            target: p.up[i],
        });
        small = p.up[i];
    }
    return small;
}
