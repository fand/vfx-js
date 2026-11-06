import type {
    ShaderTransitionDef,
    TransitionDef,
    TransitionUniforms,
} from "@vfx-js/core";
import {
    createDatamosh,
    createGLTransition,
    createJpegGlitch,
    createLensDistortion,
    createPixelScan,
    createPixelsort,
    createSwipe,
    createTile,
    type SwipeDirection,
    type TileDirection,
    type TileShape,
} from "@vfx-js/transitions";
import transitions from "gl-transitions";
import { presets } from "../_lib/presets";
import { examples, type UniformSpec } from "./examples";

/** Code and uniforms the lab loads into the editor. */
export type Source = {
    id: string;
    label: string;
    frag: string;
    sliders: UniformSpec[];
    uniforms: TransitionUniforms;
    ease?: ShaderTransitionDef["ease"];
    overflow?: ShaderTransitionDef["overflow"];
    /** Set for shaders from gl-transitions, which keep their author's license. */
    credit?: Credit;
    factory?: Factory;
    /** Set for presets that run effects, not a shader. They have no GLSL to edit. */
    effect?: boolean;
};

/** A factory option of a preset. */
export type ParamSpec =
    | { name: string; kind: "select"; options: string[]; value: string }
    | {
          name: string;
          kind: "range";
          min: number;
          max: number;
          step: number;
          value: number;
      };

export type ParamValues = Record<string, string | number>;

/** A preset built by a factory. Changing a param builds it again. */
export type Factory = {
    params: ParamSpec[];
    build: (values: ParamValues) => TransitionDef;
};

const directions = ["left", "right", "up", "down"];

// Factory options of the presets. Shader presets bake them into GLSL constants, so they have no uniforms.
const factories: Record<string, Factory> = {
    swipe: {
        params: [
            {
                name: "direction",
                kind: "select",
                options: directions,
                value: "left",
            },
        ],
        build: (v) => createSwipe({ direction: v.direction as SwipeDirection }),
    },
    tile: {
        params: [
            {
                name: "direction",
                kind: "select",
                options: ["center", ...directions],
                value: "center",
            },
            {
                name: "shape",
                kind: "select",
                options: ["hex", "square"],
                value: "hex",
            },
            {
                name: "count",
                kind: "range",
                min: 2,
                max: 40,
                step: 1,
                value: 12,
            },
        ],
        build: (v) =>
            createTile({
                direction: v.direction as TileDirection,
                shape: v.shape as TileShape,
                count: Number(v.count),
            }),
    },
    lensDistortion: {
        params: [
            {
                name: "strength",
                kind: "range",
                min: 0,
                max: 3,
                step: 0.05,
                value: 1,
            },
            {
                name: "dispersion",
                kind: "range",
                min: 0,
                max: 2,
                step: 0.05,
                value: 0.6,
            },
        ],
        build: (v) =>
            createLensDistortion({
                strength: Number(v.strength),
                dispersion: Number(v.dispersion),
            }),
    },
    pixelsort: {
        params: [
            {
                name: "direction",
                kind: "select",
                options: ["up", "down", "left", "right"],
                value: "up",
            },
        ],
        build: (v) =>
            createPixelsort({
                direction: v.direction as "up" | "down" | "left" | "right",
            }),
    },
    datamosh: {
        params: [
            {
                name: "blockSize",
                kind: "range",
                min: 2,
                max: 128,
                step: 1,
                value: 32,
            },
        ],
        build: (v) => createDatamosh({ blockSize: Number(v.blockSize) }),
    },
    pixelScan: {
        params: [
            {
                name: "blackout",
                kind: "select",
                options: ["true", "false"],
                value: "true",
            },
        ],
        build: (v) => createPixelScan({ blackout: v.blackout === "true" }),
    },
    jpegGlitch: {
        params: [
            {
                name: "iterations",
                kind: "range",
                min: 1,
                max: 256,
                step: 1,
                value: 64,
            },
            {
                name: "quality",
                kind: "range",
                min: 0,
                max: 1,
                step: 0.05,
                value: 0.3,
            },
        ],
        build: (v) =>
            createJpegGlitch({
                iterations: Number(v.iterations),
                quality: Number(v.quality),
            }),
    },
};

export const defaultParams = (f: Factory | undefined): ParamValues =>
    Object.fromEntries(f?.params.map((p) => [p.name, p.value]) ?? []);

export type Credit = { author: string; license: string; href: string };

export type SourceGroup = {
    label: string;
    options: { id: string; label: string; author?: string }[];
    /** Shaders from gl-transitions, not ours. They get their own tab. */
    thirdParty?: boolean;
};

const isShader = (def: object): def is ShaderTransitionDef => "frag" in def;

const presetDefs = Object.entries(presets);

// "Name <mail>" → "Name", for a tidy list. The license and link keep full credit.
const authorOf = (author: string) =>
    author.replace(/\s*<[^>]*>/, "").trim() || author;

// Transitions that need extra textures are not supported.
const glEntries = transitions.filter((e) => e.textures.length === 0);

export const groups: SourceGroup[] = [
    {
        label: "Examples",
        options: examples.map((e) => ({
            id: `example:${e.id}`,
            label: e.label,
        })),
    },
    {
        label: "Presets",
        options: presetDefs.map(([name]) => ({
            id: `preset:${name}`,
            label: name,
        })),
    },
    {
        label: "gl-transitions",
        options: glEntries.map((e) => ({
            id: `gl:${e.name}`,
            label: e.name,
            author: authorOf(e.author),
        })),
        thirdParty: true,
    },
];

// Guess a slider range from the default value.
function sliderOf(name: string, value: number, isInt = false): UniformSpec {
    const max = value === 0 ? 1 : Math.abs(value) * 2;
    return {
        name,
        min: value < 0 ? -max : 0,
        max,
        step: isInt ? 1 : Number((max / 100).toPrecision(1)),
        value,
    };
}

function slidersOf(
    uniforms: TransitionUniforms,
    types: Record<string, string> = {},
): UniformSpec[] {
    return Object.entries(uniforms).flatMap(([name, value]) =>
        typeof value === "number"
            ? [sliderOf(name, value, types[name] === "int")]
            : [],
    );
}

function fromDef(
    id: string,
    label: string,
    def: ShaderTransitionDef,
    types?: Record<string, string>,
): Source {
    return {
        id,
        label,
        frag: def.frag.trim(),
        sliders: slidersOf(def.uniforms, types),
        uniforms: def.uniforms,
        ease: def.ease,
        overflow: def.overflow,
    };
}

export function sourceOf(id: string): Source | undefined {
    const [kind, name] = [
        id.slice(0, id.indexOf(":")),
        id.slice(id.indexOf(":") + 1),
    ];
    if (kind === "example") {
        const e = examples.find((e) => e.id === name);
        return (
            e && {
                id,
                label: e.label,
                frag: e.frag,
                sliders: e.uniforms,
                uniforms: Object.fromEntries(
                    e.uniforms.map((u) => [u.name, u.value]),
                ),
            }
        );
    }
    if (kind === "preset") {
        const def = presetDefs.find(([n]) => n === name)?.[1];
        if (!def) {
            return undefined;
        }
        const factory = factories[name];
        if (!isShader(def)) {
            return {
                id,
                label: name,
                frag: "",
                sliders: [],
                uniforms: {},
                ease: def.ease,
                factory,
                effect: true,
            };
        }
        return { ...fromDef(id, name, def), factory };
    }
    if (kind === "gl") {
        const entry = glEntries.find((e) => e.name === name);
        return (
            entry && {
                ...fromDef(
                    id,
                    name,
                    createGLTransition(entry),
                    entry.paramsTypes,
                ),
                credit: {
                    author: authorOf(entry.author),
                    license: entry.license,
                    href: `https://gl-transitions.com/editor/${entry.name}`,
                },
            }
        );
    }
    return undefined;
}
