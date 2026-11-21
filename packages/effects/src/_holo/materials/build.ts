// Shared helpers of the material definitions (holospot engine/materials/build.ts, MIT © 2026 Dmitry Kurash).

import type { EffectUniformValue } from "@vfx-js/core";
import type { EmbossAssets } from "../emboss-assets.js";
import type {
    GratingSummary,
    ParamValues,
    ReliefInputs,
    TierConfig,
    TintInputs,
    TintType,
} from "../types.js";

export const DEG = Math.PI / 180;

export type Uniforms = Record<string, EffectUniformValue>;

/** A holo material: the shader main and the CPU conversions of its panel values (holospot MaterialDef). */
export interface MaterialDef {
    id: string;
    fragmentMain: string;
    extraChunks: readonly string[];
    /** Material uniforms for these values. */
    uniforms(values: ParamValues): Uniforms;
    defines(tier: TierConfig): Record<string, string | number>;
    gratingSummary(values: ParamValues): GratingSummary;
    relief(values: ParamValues): ReliefInputs;
    /** Foil Emboss only: its textures (logo and paper maps, built in a worker) and the paper maps' key. */
    emboss?: {
        createAssets(): EmbossAssets;
        paperKey(values: ParamValues): {
            stock: number;
            fibreAmount: number;
            fibreScale: number;
            seed: number;
        };
    };
}

/** Numeric value of `id`, or `fallback` when it is missing or not a finite number. */
export function numParam(
    values: ParamValues,
    id: string,
    fallback: number,
): number {
    const v = values[id];
    const x =
        typeof v === "number"
            ? v
            : typeof v === "string" && v.trim() !== ""
              ? Number(v)
              : Number.NaN;
    return Number.isFinite(x) ? x : fallback;
}

/** Select value of `id` if it is one of `allowed`, else `fallback`. */
export function selectParam<T extends string>(
    values: ParamValues,
    id: string,
    allowed: readonly T[],
    fallback: T,
): T {
    const v = values[id];
    return typeof v === "string" && (allowed as readonly string[]).includes(v)
        ? (v as T)
        : fallback;
}

const TINT_TYPES: readonly TintType[] = ["clear", "longpass", "shortpass"];

/** The tint inputs of a material panel (`<prefix>.tint`, `.tintEdge`, `.tintWidth`, `.tintFloor`, §4.2.6). */
export function tintParam(
    values: ParamValues,
    prefix: string,
    d: TintInputs,
): TintInputs {
    return {
        type: selectParam(values, `${prefix}.tint`, TINT_TYPES, d.type),
        edgeNm: numParam(values, `${prefix}.tintEdge`, d.edgeNm),
        widthNm: Math.max(
            numParam(values, `${prefix}.tintWidth`, d.widthNm),
            1e-3,
        ),
        floor: Math.min(
            Math.max(numParam(values, `${prefix}.tintFloor`, d.floor), 0),
            1,
        ),
    };
}
