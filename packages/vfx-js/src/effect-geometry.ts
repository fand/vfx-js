import type { Backend, BackendGeometry, BackendProgram } from "./backend.js";
import type { EffectGeometry, EffectQuad } from "./types.js";

/**
 * Singleton token returned as `ctx.quad`.
 *
 * All hosts share the same token — it always resolves to the backend's
 * fullscreen quad (NDC -1..1).
 * @internal
 */
export const EFFECT_QUAD_TOKEN: EffectQuad = Object.freeze({
    __brand: "EffectQuad",
});

/** @internal */
export function isEffectQuad(g: unknown): g is EffectQuad {
    return g === EFFECT_QUAD_TOKEN;
}

/**
 * Per-host cache of compiled geometries, keyed by (EffectGeometry, Program).
 *
 * The program dimension is required because attribute locations are
 * program-specific — caching only by geometry would break on a second
 * program whose attribute name → location assignment differs.
 *
 * Uses a `WeakMap` for primary lookup plus a parallel `Set` so
 * {@link dispose} can iterate every compiled entry the host owns.
 * @internal
 */
export class EffectGeometryCache {
    #backend: Backend;
    #map = new WeakMap<EffectGeometry, Map<BackendProgram, BackendGeometry>>();
    #all = new Set<BackendGeometry>();

    constructor(backend: Backend) {
        this.#backend = backend;
    }

    /** The shared fullscreen quad (resolves {@link EFFECT_QUAD_TOKEN}). */
    get quad(): BackendGeometry {
        return this.#backend.quad;
    }

    resolve(geo: EffectGeometry, program: BackendProgram): BackendGeometry {
        let byProgram = this.#map.get(geo);
        if (!byProgram) {
            byProgram = new Map();
            this.#map.set(geo, byProgram);
        }
        let compiled = byProgram.get(program);
        if (!compiled) {
            compiled = this.#backend.createGeometry(geo, program);
            byProgram.set(program, compiled);
            this.#all.add(compiled);
        }
        return compiled;
    }

    /** Free the compiled entries for one geometry (all programs). */
    release(geo: EffectGeometry): void {
        const byProgram = this.#map.get(geo);
        if (!byProgram) {
            return;
        }
        for (const c of byProgram.values()) {
            c.dispose();
            this.#all.delete(c);
        }
        this.#map.delete(geo);
    }

    dispose(): void {
        for (const c of this.#all) {
            c.dispose();
        }
        this.#all.clear();
        // WeakMap entries become unreachable naturally when the user
        // releases their geometry refs; the Programs are disposed by
        // the VFX-scoped ProgramCache.
    }
}
