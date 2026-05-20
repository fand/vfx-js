import type { GLContext } from "./gl/context.js";
import { type GlslVersion, Program } from "./gl/program.js";

/**
 * VFX-instance-scoped cache of compiled {@link Program}s keyed by
 * `${frag}\0${vert}`. Lifted out of {@link EffectHost} so multiple
 * hosts (one per attached Effect instance) sharing the same `GLContext`
 * compile each unique shader pair exactly once.
 *
 * Lifetime: programs live until {@link dispose} is called by the
 * owning `VFXPlayer`. Effects/hosts no longer dispose programs.
 *
 * @internal
 */
export class ProgramCache {
    #glCtx: GLContext;
    #programs = new Map<string, Program>();

    constructor(glCtx: GLContext) {
        this.#glCtx = glCtx;
    }

    get(vert: string, frag: string, glslVersion?: GlslVersion): Program {
        const key = `${frag}\0${vert}`;
        let p = this.#programs.get(key);
        if (!p) {
            p = new Program(this.#glCtx, vert, frag, glslVersion);
            this.#programs.set(key, p);
        }
        return p;
    }

    /** Test-only count of cached programs. @internal */
    get size(): number {
        return this.#programs.size;
    }

    dispose(): void {
        for (const p of this.#programs.values()) {
            p.dispose();
        }
        this.#programs.clear();
    }
}
