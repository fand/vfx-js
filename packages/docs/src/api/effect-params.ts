// Params of an effect for its page: the docs table and the pane controls.

import type { ParamFormat } from "../effect-code";
import type { ControlOptions, EffectDemo } from "../effects-list";
import { type Api, membersOf, plainSummary } from "./model";
import { inlineMarkdownHtml, typeHtml } from "./render";
import { Kind, type Reflection, type Type } from "./types";

export type NumberControl = {
    type: "number";
    min: number;
    max: number;
    step: number;
};

export type ParamControl =
    | NumberControl
    | { type: "boolean" }
    | { type: "list"; options: string[] }
    | { type: "text" }
    /** "#rrggbb" string. */
    | { type: "color" }
    /** [r, g, b] or [r, g, b, a] in 0 to 1. */
    | { type: "colorArray" }
    /** 0xRRGGBB number. */
    | { type: "colorNumber" }
    /** A `{ x, y }` point. */
    | { type: "point"; range: NumberControl }
    /** Numbers in an array, one slider each. */
    | { type: "vector"; labels: string[]; items: NumberControl[] }
    /** "#rrggbb" strings in an array. */
    | { type: "colorList" }
    /** Colors by name, like { cyan: [r, g, b, a] }. */
    | { type: "colorRecord"; keys: string[] }
    /** Named values from the demo's `choices`. */
    | { type: "choice"; options: string[] };

/** What the browser needs to build the pane. */
export type ParamSpec = {
    name: string;
    /** Folder in the pane. */
    group?: string;
    control: ParamControl;
    /** The effect reads it only when it starts. Make a new one on change. */
    rebuild: boolean;
    /** The param that holds it, for nested params. */
    parent?: string;
};

export type ParamDoc = {
    name: string;
    group?: string;
    typeHtml: string;
    defaultValue: unknown;
    descriptionHtml: string;
};

export type EffectParams = {
    decl?: Reflection;
    docs: ParamDoc[];
    specs: ParamSpec[];
    defaults: Record<string, unknown>;
    formats: Record<string, ParamFormat>;
};

/** The params type of a constructor, e.g. BloomParams in Partial<BloomParams>. */
export function paramsDeclOf(
    api: Api,
    type: Type | undefined,
): Reflection | undefined {
    if (type?.type !== "reference") {
        return undefined;
    }
    if (typeof type.target === "number") {
        return api.byId.get(type.target);
    }
    // Partial<T> and other wrappers from TypeScript.
    return paramsDeclOf(api, type.typeArguments?.[0]);
}

/** Members of a params type. Follows `A & { ... }` and type aliases. */
function paramMembers(api: Api, decl: Reflection, depth = 0): Reflection[] {
    const direct = membersOf(decl);
    if (direct.length > 0 || depth > 5) {
        return direct;
    }
    const fromType = (type: Type | undefined): Reflection[] => {
        if (type?.type === "intersection" || type?.type === "union") {
            return type.types.flatMap(fromType);
        }
        if (type?.type === "reflection") {
            return membersOf(type.declaration);
        }
        if (type?.type === "reference" && typeof type.target === "number") {
            const target = api.byId.get(type.target);
            return target ? paramMembers(api, target, depth + 1) : [];
        }
        // Partial<T> and other wrappers from TypeScript.
        if (type?.type === "reference" && type.typeArguments?.[0]) {
            return fromType(type.typeArguments[0]);
        }
        return [];
    };
    return fromType(decl.type);
}

/**
 * String literals in a type, following unions and type aliases.
 * Other members, like `string` for an image URL, are skipped.
 */
function literalOptions(api: Api, type: Type | undefined, depth = 0): string[] {
    if (!type || depth > 5) {
        return [];
    }
    if (type.type === "literal") {
        return typeof type.value === "string" ? [type.value] : [];
    }
    if (type.type === "union") {
        return type.types.flatMap((t) => literalOptions(api, t, depth + 1));
    }
    if (type.type === "reference" && typeof type.target === "number") {
        const decl = api.byId.get(type.target);
        if (decl?.kind === Kind.TypeAlias) {
            return literalOptions(api, decl.type, depth + 1);
        }
    }
    return [];
}

function typeName(type: Type | undefined): string {
    return type?.type === "reference" ? type.name : "";
}

const numberPattern = String.raw`(-?\d+(?:\.\d+)?)`;
const rangePatterns = [
    new RegExp(String.raw`${numberPattern}\s*(?:\.\.|–)\s*${numberPattern}`),
    new RegExp(String.raw`\[\s*${numberPattern}\s*,\s*${numberPattern}\s*\]`),
];

/** A range written in the docs, like "0..1" or "[0, 1]". */
function rangeOf(text: string, values: number[]) {
    for (const pattern of rangePatterns) {
        const m = text.match(pattern);
        if (!m) {
            continue;
        }
        const min = Number(m[1]);
        const max = Number(m[2]);
        if (min < max && values.every((v) => v >= min && v <= max)) {
            return { min, max };
        }
    }
    return undefined;
}

/** The next of 1, 2, 5, 10, 20, ... at or above `x`. */
function niceCeil(x: number): number {
    const p = 10 ** Math.floor(Math.log10(x));
    return [1, 2, 5, 10].map((m) => m * p).find((n) => n >= x) ?? 10 * p;
}

/** Words of a camelCase name, in lower case: "tailFade" → ["tail", "fade"]. */
function wordsOf(name: string): string[] {
    return name.split(/(?=[A-Z])/).map((w) => w.toLowerCase());
}

function hasWord(name: string, words: string[]): boolean {
    return wordsOf(name).some((w) => words.includes(w));
}

// Names of params that are a fraction from 0 to 1.
const fractionWords = [
    "alpha",
    "opacity",
    "mix",
    "fade",
    "ratio",
    "threshold",
    "randomness",
    "softness",
    "dissolve",
    "ink",
];

// Names of params that are rarely whole numbers.
const floatWords = [
    "speed",
    "strength",
    "scale",
    "intensity",
    "amount",
    "power",
    "gain",
    "rate",
    "contrast",
    "brightness",
    "exposure",
    "zoom",
    "duration",
    "life",
];

// Names of params that are whole numbers.
const integerWords = [
    "seed",
    "count",
    "iterations",
    "layers",
    "levels",
    "steps",
    "samples",
    "bounces",
    "paths",
];

/** A range that holds the values, from the name or the size of the values. */
function guessRange(
    name: string,
    values: number[],
    text: string,
    isInteger: boolean,
) {
    const peak = Math.max(...values.map(Math.abs));
    if (hasWord(name, ["fov"])) {
        return { min: 10, max: 120 };
    }
    if (hasWord(name, ["zoom"])) {
        return { min: 0, max: Math.max(2, niceCeil(peak * 2)) };
    }
    if (
        hasWord(name, ["angle", "rotation", "yaw", "pitch"]) &&
        /degree|°/i.test(text)
    ) {
        return peak > 180 ? { min: 0, max: 360 } : { min: -180, max: 180 };
    }
    if (isInteger && hasWord(name, ["seed"])) {
        return { min: 0, max: Math.max(100, niceCeil(peak + 1)) };
    }
    if (isInteger && hasWord(name, ["count"])) {
        return { min: 1, max: niceCeil(peak * 2) };
    }
    if (peak === 0) {
        return hasWord(name, ["offset", "shift", "bias", "tilt"])
            ? { min: -1, max: 1 }
            : { min: 0, max: 1 };
    }
    let max: number;
    if (peak < 0.1) {
        max = niceCeil(peak * 10);
    } else if (peak < 1 || (peak === 1 && hasWord(name, fractionWords))) {
        max = 1;
    } else {
        max = niceCeil(peak * 4);
    }
    if (values.some((v) => v < 0)) {
        return { min: -max, max };
    }
    // Whole numbers like sizes and counts start at 1.
    const min = isInteger && values.every((v) => v >= 1) ? 1 : 0;
    return { min, max };
}

function numberControl(
    name: string,
    values: number[],
    text: string,
    fullText: string,
    options: ControlOptions | undefined,
): NumberControl {
    const allIntegers = values.every((v) => Number.isInteger(v));
    const isInteger =
        allIntegers &&
        (hasWord(name, integerWords) ||
            (values.every((v) => Math.abs(v) >= 2) &&
                !hasWord(name, floatWords)));
    const range =
        rangeOf(text, values) ?? guessRange(name, values, fullText, isInteger);
    const step = isInteger
        ? 1
        : Math.min(
              1,
              10 ** Math.floor(Math.log10((range.max - range.min) / 100)),
          );
    return { type: "number", ...range, step, ...(options || {}) };
}

const vectorLabels = ["x", "y", "z", "w"];

function controlOf(
    api: Api,
    member: Reflection,
    value: unknown,
    demoValue: unknown,
    text: string,
    fullText: string,
    demo: EffectDemo,
): ParamControl | undefined {
    const options = demo.controls?.[member.name];
    if (options === false) {
        return undefined;
    }
    if (demo.choices?.[member.name]) {
        return {
            type: "choice",
            options: Object.keys(demo.choices[member.name].values),
        };
    }
    const name = member.name;
    const isColorName =
        /colou?r|rgba?|palette/i.test(typeName(member.type)) ||
        /colou?r|tint|background|palette/i.test(name);
    const isNumbers = (v: unknown): v is number[] =>
        Array.isArray(v) && v.every((n) => typeof n === "number");
    const isUnit = (v: number[]) => v.every((n) => n >= 0 && n <= 1);
    const isHex = (v: unknown) =>
        typeof v === "string" && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);

    if (typeof value === "boolean") {
        return { type: "boolean" };
    }
    if (typeof value === "number") {
        if (/0xRRGGBB/i.test(text)) {
            return { type: "colorNumber" };
        }
        const values =
            typeof demoValue === "number" ? [value, demoValue] : [value];
        return numberControl(name, values, text, fullText, options);
    }
    if (typeof value === "string") {
        const list = literalOptions(api, member.type);
        if (list.length > 1 && list.includes(value)) {
            return { type: "list", options: list };
        }
        return isHex(value) ? { type: "color" } : { type: "text" };
    }
    if (isNumbers(value)) {
        if (
            (value.length === 3 || value.length === 4) &&
            isUnit(value) &&
            isColorName
        ) {
            return { type: "colorArray" };
        }
        if (value.length >= 2 && value.length <= 4) {
            const labels =
                /range/i.test(name) && value.length === 2
                    ? ["min", "max"]
                    : vectorLabels.slice(0, value.length);
            // One range for all items, so they scale alike.
            const shared = numberControl(name, value, text, fullText, options);
            return { type: "vector", labels, items: value.map(() => shared) };
        }
        return undefined;
    }
    if (
        value &&
        typeof value === "object" &&
        Object.keys(value).join() === "x,y" &&
        isNumbers(Object.values(value))
    ) {
        const range = numberControl(
            name,
            Object.values(value),
            text,
            fullText,
            options,
        );
        return { type: "point", range };
    }
    if (Array.isArray(value) && value.length > 0 && value.every(isHex)) {
        return { type: "colorList" };
    }
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every(
            (v) =>
                isNumbers(v) && (v.length === 3 || v.length === 4) && isUnit(v),
        )
    ) {
        return { type: "colorRecord", keys: Object.keys(value) };
    }
    return undefined;
}

/** First paragraph of a comment. */
function summaryParts(member: Reflection) {
    const parts = member.comment?.summary ?? [];
    const end = parts.findIndex(
        (p) => p.kind === "text" && /\n\s*\n/.test(p.text),
    );
    if (end < 0) {
        return parts;
    }
    const cut = parts[end];
    return [
        ...parts.slice(0, end),
        { ...cut, text: cut.text.split(/\n\s*\n/)[0] },
    ];
}

/**
 * Members of a nested params type, without the top-level names.
 * A name in two members of a union takes the later one.
 */
function nestedMembers(
    api: Api,
    typeName: string,
    topMembers: Reflection[],
): Reflection[] {
    const decl = api.pages.find((p) => p.decl.name === typeName)?.decl;
    if (!decl) {
        throw new Error(`No API page for ${typeName}`);
    }
    const byName = new Map<string, Reflection>();
    for (const m of paramMembers(api, decl)) {
        byName.set(m.name, m);
    }
    const topLevel = new Set(topMembers.map((m) => m.name));
    return [...byName.values()].filter((m) => !topLevel.has(m.name));
}

export function effectParams(
    api: Api,
    demo: EffectDemo,
    decl: Reflection,
): EffectParams {
    const ctor = membersOf(decl).find((m) => m.kind === Kind.Constructor);
    const paramsDecl = paramsDeclOf(
        api,
        ctor?.signatures?.[0]?.parameters?.[0]?.type,
    );

    // Effects keep their params in `params`, or as fields on the effect.
    const instance = demo.createDefault() as unknown as Record<string, unknown>;
    const source = (instance.params ?? instance) as Record<string, unknown>;

    // The defaults list params in an order that makes sense. Follow it.
    // TypeDoc sorts them by name.
    const order = [...Object.keys(source), ...Object.keys(demo.defaults ?? {})];
    const rank = (m: Reflection) => {
        const i = order.indexOf(m.name);
        return i < 0 ? order.length + (m.sources?.[0]?.line ?? 0) : i;
    };
    // Params in a group follow the group's order. The rest come first.
    const groupOf = new Map<string, string>();
    const groupRank = new Map<string, number>();
    for (const [title, names] of Object.entries(demo.groups ?? {})) {
        for (const name of names) {
            groupOf.set(name, title);
            groupRank.set(name, groupRank.size);
        }
    }
    const sortKey = (m: Reflection) =>
        groupRank.has(m.name)
            ? order.length * 2 + (groupRank.get(m.name) ?? 0)
            : rank(m);
    const members = (paramsDecl ? paramMembers(api, paramsDecl) : []).sort(
        (a, b) => sortKey(a) - sortKey(b),
    );

    const result: EffectParams = {
        decl: paramsDecl,
        docs: [],
        specs: [],
        defaults: {},
        formats: {},
    };
    const add = (m: Reflection, value: unknown, parent?: string) => {
        const text = plainSummary(m);
        result.docs.push({
            name: m.name,
            group: groupOf.get(m.name),
            typeHtml: typeHtml(api, m.type),
            defaultValue: value,
            descriptionHtml: inlineMarkdownHtml(api, summaryParts(m)),
        });
        if (value === undefined) {
            return;
        }
        result.defaults[m.name] = value;
        const fullText = (m.comment?.summary ?? []).map((p) => p.text).join("");
        const control = controlOf(
            api,
            m,
            value,
            parent ? undefined : demo.params[m.name],
            text,
            fullText,
            demo,
        );
        if (control?.type === "colorNumber") {
            result.formats[m.name] = "hex";
        }
        if (control) {
            result.specs.push({
                name: m.name,
                group: groupOf.get(m.name),
                control,
                rebuild:
                    demo.rebuild?.includes(m.name) ??
                    /construct|init\(\)|re-add|baked/i.test(fullText),
                ...(parent ? { parent } : {}),
            });
        }
    };
    for (const m of members) {
        add(m, source[m.name] ?? demo.defaults?.[m.name]);
    }
    const nested = demo.nested;
    if (nested) {
        const nestedSorted = nestedMembers(api, nested.type, members)
            .filter((m) => m.name in nested.values)
            .sort((a, b) => sortKey(a) - sortKey(b));
        for (const m of nestedSorted) {
            add(m, nested.values[m.name], nested.param);
        }
    }
    return result;
}
