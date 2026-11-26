import type { Backend, BackendProgram } from "./backend.js";
import type { GlslVersion } from "./glsl-version.js";

/**
 * VFX-instance-scoped cache of compiled GLSL programs keyed by
 * `${frag}\0${vert}\0${glslVersion}`. Lifted out of {@link EffectHost}
 * so multiple hosts (one per attached Effect instance) sharing the
 * same backend compile each unique shader triple exactly once.
 *
 * Lifetime: programs live until {@link dispose} is called by the
 * owning `VFXPlayer`.
 *
 * @internal
 */
export class ProgramCache {
    #backend: Backend;
    #programs = new Map<string, BackendProgram>();

    constructor(backend: Backend) {
        this.#backend = backend;
    }

    get(vert: string, frag: string, glslVersion?: GlslVersion): BackendProgram {
        const key = `${frag}\0${vert}\0${glslVersion ?? ""}`;
        let p = this.#programs.get(key);
        if (!p) {
            p = this.#backend.createProgram({
                language: "glsl",
                vert,
                frag,
                glslVersion,
            });
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
