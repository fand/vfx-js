// The foil materials, loaded on demand: HoloEffect imports a material's code (its shaders, and for emboss the logo and
// paper builders) the first time it is used, so a page only downloads the materials it draws. The static entry
// (holo-static.ts, `@vfx-js/effects/holo/static`) registers all of them up front instead.
import type { HoloMaterialId } from "../types.js";
import type { MaterialDef } from "./build.js";

const loaders: Readonly<Record<HoloMaterialId, () => Promise<MaterialDef>>> = {
    prism: () => import("./prism.js").then((m) => m.prism),
    shatter: () => import("./shatter.js").then((m) => m.shatter),
    nebula: () => import("./nebula.js").then((m) => m.nebula),
    sparkle: () => import("./sparkle.js").then((m) => m.sparkle),
    vortex: () => import("./vortex.js").then((m) => m.vortex),
    emboss: () => import("./emboss.js").then((m) => m.emboss),
};

/** Every material id, without loading any material. */
export const MATERIAL_NAMES: readonly HoloMaterialId[] = Object.keys(
    loaders,
) as HoloMaterialId[];

export const isMaterialName = (m: unknown): m is HoloMaterialId =>
    typeof m === "string" && Object.hasOwn(loaders, m);

const loaded = new Map<HoloMaterialId, MaterialDef>();
const loading = new Map<HoloMaterialId, Promise<MaterialDef>>();

/** Makes materials available without loading them (the static entry). */
export function registerMaterials(defs: readonly MaterialDef[]): void {
    for (const def of defs) {
        loaded.set(def.id as HoloMaterialId, def);
    }
}

/** The material's code if it is loaded, else undefined. */
export function loadedMaterial(m: HoloMaterialId): MaterialDef | undefined {
    return loaded.get(m);
}

/** Loads a material's code once; later calls share the same promise. */
export function loadMaterial(m: HoloMaterialId): Promise<MaterialDef> {
    const def = loaded.get(m);
    if (def) {
        return Promise.resolve(def);
    }
    let p = loading.get(m);
    if (!p) {
        const load = Object.hasOwn(loaders, m) ? loaders[m] : undefined;
        if (!load) {
            return Promise.reject(new Error(`unknown material "${m}"`));
        }
        p = load().then(
            (d) => {
                loaded.set(m, d);
                loading.delete(m);
                return d;
            },
            (e: unknown) => {
                loading.delete(m); // a later call tries again
                throw e;
            },
        );
        loading.set(m, p);
    }
    return p;
}
