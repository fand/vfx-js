import type { ShaderTransitionDef, TransitionUniforms } from "@vfx-js/core";
import { createGLTransition } from "@vfx-js/transitions";
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
};

export type Credit = { author: string; license: string; href: string };

export type SourceGroup = {
    label: string;
    options: { id: string; label: string; author?: string }[];
    /** Shaders from gl-transitions, not ours. They get their own tab. */
    thirdParty?: boolean;
};

const isShader = (def: object): def is ShaderTransitionDef => "frag" in def;

const presetDefs = Object.entries(presets).filter(
    (entry): entry is [string, ShaderTransitionDef] => isShader(entry[1]),
);

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
        return def && fromDef(id, name, def);
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
