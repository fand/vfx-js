import type { EffectContext, EffectProgram } from "@vfx-js/core";

/** Run Saber's shader selection without allocating or drawing GPU resources. */
export class SaberPrograms {
    #key = "";
    #programs: EffectProgram[] = [];

    prepare(
        ctx: EffectContext,
        key: string,
        size: readonly [number, number],
        render: (ctx: EffectContext) => void,
    ): void {
        if (key === this.#key) {
            return;
        }
        const programs = new Set<EffectProgram>();
        const planning: EffectContext = {
            ...ctx,
            createRenderTarget: (opts) => ({
                __brand: "EffectRenderTarget",
                width: Math.max(1, Math.round(opts?.size?.[0] ?? size[0])),
                height: Math.max(1, Math.round(opts?.size?.[1] ?? size[1])),
                dispose() {},
                generateMipmaps() {},
            }),
            draw: (opts) => {
                programs.add(opts.program ?? ctx.createProgram(opts));
            },
            clear() {},
            releaseGeometry() {},
            // The probe is disposed before this settles. Reveal's later splat/arc
            // shaders are explicitly included by the caller, without tracing pixels.
            readPixels: async () => new Uint8Array(0),
        };
        render(planning);
        this.#key = key;
        this.#programs = [...programs];
    }

    get isReady(): boolean {
        // Check all programs, so completed links can finish in the same frame.
        return this.#programs.map((p) => p.isReady).every(Boolean);
    }

    async ready(): Promise<void> {
        await Promise.all(this.#programs.map((p) => p.ready));
    }

    clear(): void {
        // Programs belong to the VFX cache, not to the effect.
        this.#key = "";
        this.#programs = [];
    }
}
