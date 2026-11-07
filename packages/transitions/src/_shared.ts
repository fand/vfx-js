import {
    type EffectContext,
    type EffectDims,
    type EffectRenderTarget,
    type EffectTexture,
    ShaderTransition,
    type Transition,
    type TransitionEffect,
    type TransitionEffectContext,
    type TransitionRun,
} from "@vfx-js/core";

/** Reads R, G and B at their own uvs from the old or new content. */
export const SPLIT_READ = `
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`;

/** Interleaved gradient noise: a per-pixel offset that hides the bands between blur taps. */
export const IGN = `
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`;

/** Mirrors reads past the edge, so a warp shows content instead of holes. */
export const MIRROR = `
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`;

/** Hard cut at halfway, under effects that draw the glitch on top. */
export class HardCut extends ShaderTransition {
    readonly name = "hard_cut";
    readonly frag = `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`;
}

const isActive = (stage: TransitionEffect) =>
    typeof stage.render === "function" && stage.enabled !== false;

// A ctx whose stage input and output are `src` and `buffer`.
function intoBuffer(
    ctx: TransitionEffectContext,
    src: EffectTexture,
    buffer: EffectRenderTarget,
): TransitionEffectContext {
    return {
        ...ctx,
        src,
        target: buffer,
        draw: (opts) => ctx.draw({ ...opts, target: opts.target ?? buffer }),
        blit: (source, target, opts) =>
            ctx.blit(source, target ?? buffer, opts),
        clear: (target) => ctx.clear(target ?? buffer),
    };
}

/**
 * A transition made of stages that run in order, like an effect chain.
 * Each stage but the last draws into an element-sized buffer, which the next stage reads as `src`.
 * Disabled stages are skipped. Only the last stage's `outputRect` is used.
 */
export abstract class StagedTransition<P extends object = object>
    implements Transition
{
    abstract readonly name: string;
    protected abstract readonly stages: readonly TransitionEffect[];
    params: P;
    #buffers: EffectRenderTarget[] = [];

    constructor(params: P = {} as P) {
        this.params = params;
    }

    async init(ctx: EffectContext): Promise<void> {
        this.#buffers = this.stages
            .slice(1)
            .map(() => ctx.createRenderTarget());
        for (const stage of this.stages) {
            await stage.init?.(ctx);
        }
    }

    start(run: TransitionRun): void {
        for (const stage of this.stages) {
            stage.start?.(run);
        }
    }

    update(ctx: TransitionEffectContext): void {
        for (const stage of this.stages) {
            stage.update?.(ctx);
        }
    }

    render(ctx: TransitionEffectContext): void {
        const active = this.stages.filter(isActive);
        if (active.length === 0) {
            ctx.blit(ctx.src);
            return;
        }
        let src = ctx.src;
        for (const [i, stage] of active.entries()) {
            if (i === active.length - 1) {
                stage.render?.({ ...ctx, src });
                return;
            }
            const buffer = this.#buffers[i];
            ctx.clear(buffer);
            stage.render?.(intoBuffer(ctx, src, buffer));
            // A render target reads as a texture.
            src = buffer as unknown as EffectTexture;
        }
    }

    end(): void {
        for (const stage of this.stages) {
            stage.end?.();
        }
    }

    outputRect(dims: EffectDims) {
        const active = this.stages.filter(isActive);
        return active[active.length - 1]?.outputRect?.(dims);
    }

    dispose(): void {
        for (const stage of this.stages) {
            stage.dispose?.();
        }
        for (const buffer of this.#buffers) {
            buffer.dispose();
        }
        this.#buffers = [];
    }
}
