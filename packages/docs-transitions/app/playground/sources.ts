import {
    ShaderTransition,
    type Transition,
    type TransitionEase,
    type TransitionEffectContext,
    type TransitionUniforms,
} from "@vfx-js/core";
import {
    createGLTransition,
    Datamosh,
    JpegGlitch,
    LensDistortion,
    PixelScan,
    type PixelScanDirection,
    Pixelsort,
    Swipe,
    type SwipeDirection,
    Tile,
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
    ease?: TransitionEase;
    overflow?: true | number;
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

/** A preset with constructor params. Changing a param builds it again. */
export type Factory = {
    params: ParamSpec[];
    build: (values: ParamValues) => Transition;
};

/** GLSL from the editor as a transition. Its params are the uniforms. */
export class LabShader extends ShaderTransition<TransitionUniforms> {
    readonly name = "custom";
    readonly frag: string;

    constructor(
        frag: string,
        opts: { ease?: TransitionEase; overflow?: true | number } = {},
    ) {
        super({});
        this.frag = frag;
        this.ease = opts.ease;
        this.overflow = opts.overflow;
    }

    uniforms(): TransitionUniforms {
        return this.params;
    }
}

// The lab reads uniforms outside a run, where no context exists.
const noContext = {} as TransitionEffectContext;

/** The GLSL and uniforms of a shader preset, for the editor. */
export function shaderOf(transition: Transition) {
    if (!(transition instanceof ShaderTransition)) {
        return undefined;
    }
    return {
        frag: transition.frag.trim(),
        uniforms: transition.uniforms(noContext),
    };
}

const directions = ["left", "right", "up", "down"];

// Constructor params of the presets, shown as selects and sliders.
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
        build: (v) => new Swipe({ direction: v.direction as SwipeDirection }),
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
            {
                name: "shadow",
                kind: "range",
                min: 0,
                max: 1,
                step: 0.05,
                value: 0.5,
            },
        ],
        build: (v) =>
            new Tile({
                direction: v.direction as TileDirection,
                shape: v.shape as TileShape,
                count: Number(v.count),
                shadow: Number(v.shadow),
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
            {
                name: "zoom",
                kind: "range",
                min: 0,
                max: 6,
                step: 0.1,
                value: 3,
            },
        ],
        build: (v) =>
            new LensDistortion({
                strength: Number(v.strength),
                dispersion: Number(v.dispersion),
                zoom: Number(v.zoom),
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
            new Pixelsort({
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
        build: (v) => new Datamosh({ blockSize: Number(v.blockSize) }),
    },
    pixelScan: {
        params: [
            {
                name: "direction",
                kind: "select",
                options: ["right", "left", "up", "down", "center"],
                value: "right",
            },
            {
                name: "blackout",
                kind: "select",
                options: ["true", "false"],
                value: "true",
            },
        ],
        build: (v) =>
            new PixelScan({
                direction: v.direction as PixelScanDirection,
                blackout: v.blackout === "true",
            }),
    },
    jpegGlitch: {
        params: [
            {
                name: "iterations",
                kind: "range",
                min: 1,
                max: 256,
                step: 1,
                value: 4,
            },
            {
                name: "quality",
                kind: "range",
                min: 0,
                max: 1,
                step: 0.05,
                value: 0.1,
            },
        ],
        build: (v) =>
            new JpegGlitch({
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

const presetClasses = Object.entries(presets);

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
        options: presetClasses.map(([name]) => ({
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

function fromShader(
    id: string,
    label: string,
    transition: Transition,
    types?: Record<string, string>,
): Source | undefined {
    const shader = shaderOf(transition);
    return (
        shader && {
            id,
            label,
            frag: shader.frag,
            sliders: slidersOf(shader.uniforms, types),
            uniforms: shader.uniforms,
            ease: transition.ease,
            overflow: transition.overflow,
        }
    );
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
        const Class = presetClasses.find(([n]) => n === name)?.[1];
        if (!Class) {
            return undefined;
        }
        const factory = factories[name];
        const transition = factory
            ? factory.build(defaultParams(factory))
            : new Class();
        const shader = fromShader(id, name, transition);
        if (!shader) {
            return {
                id,
                label: name,
                frag: "",
                sliders: [],
                uniforms: {},
                ease: transition.ease,
                factory,
                effect: true,
            };
        }
        // Params drive the uniforms of a preset with params, so it gets no extra sliders.
        return factory ? { ...shader, sliders: [], factory } : shader;
    }
    if (kind === "gl") {
        const entry = glEntries.find((e) => e.name === name);
        if (!entry) {
            return undefined;
        }
        const Class = createGLTransition(entry);
        const shader = fromShader(id, name, new Class(), entry.paramsTypes);
        return (
            shader && {
                ...shader,
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
