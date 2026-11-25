// Usage code for the effect pages. The server and the param pane both use it,
// so the code stays the same when the pane changes a param.
import type { EffectDemo } from "./effects-list";

/** Stands in for the constructor args until they are formatted. */
export const argsPlaceholder = "__ARGS__";

/** Usage code with the constructor args left as a placeholder. */
export function usageCode(demo: EffectDemo): string {
    return `
import { VFX } from "@vfx-js/core";
import { ${demo.name} } from "@vfx-js/effects";

const vfx = new VFX();
const effect = new ${demo.name}(${argsPlaceholder});
await vfx.add(img, { effect });
${demo.usage ?? ""}`;
}

/** How a param is written in code. */
export type ParamFormat = "hex" | undefined;

// Colors of the github-dark theme, same as the static part of the code.
const numberColor = "#79B8FF";
const stringColor = "#9ECBFF";

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function token(color: string, text: string): string {
    return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

function valueHtml(value: unknown, format: ParamFormat): string {
    if (typeof value === "number") {
        if (format === "hex") {
            return token(
                numberColor,
                `0x${Math.round(value).toString(16).padStart(6, "0")}`,
            );
        }
        return token(numberColor, String(Number(value.toFixed(4))));
    }
    if (typeof value === "string") {
        return token(stringColor, JSON.stringify(value));
    }
    if (typeof value === "boolean" || value === null) {
        return token(numberColor, String(value));
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => valueHtml(v, undefined)).join(", ")}]`;
    }
    if (typeof value === "object" && value) {
        const entries = Object.entries(value).map(
            ([k, v]) => `${escapeHtml(k)}: ${valueHtml(v, undefined)}`,
        );
        return `{ ${entries.join(", ")} }`;
    }
    return escapeHtml(String(value));
}

/** The name of a value from the demo's `choices`. */
export function choiceKeyOf(
    demo: EffectDemo,
    key: string,
    value: unknown,
): string | undefined {
    const values = demo.choices?.[key]?.values ?? {};
    return Object.keys(values).find((k) => sameValue(values[k], value));
}

export function sameValue(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Highlighted constructor args: the params that differ from the defaults.
 * Goes inside the parens of `new XEffect(...)`.
 */
export function argsHtml(
    demo: EffectDemo,
    values: Record<string, unknown>,
    defaults: Record<string, unknown>,
    formats: Record<string, ParamFormat>,
): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(values)) {
        if (key in defaults && sameValue(value, defaults[key])) {
            continue;
        }
        const choiceKey = choiceKeyOf(demo, key, value);
        const html =
            choiceKey !== undefined
                ? escapeHtml(demo.choices?.[key]?.code(choiceKey) ?? "")
                : valueHtml(value, formats[key]);
        lines.push(`${escapeHtml(key)}: ${html}`);
    }
    if (lines.length === 0) {
        return "";
    }
    const oneLine = `{ ${lines.join(", ")} }`;
    // Tags do not count toward the line length.
    if (oneLine.replace(/<[^>]*>/g, "").length <= 48) {
        return oneLine;
    }
    return `{\n${lines.map((l) => `    ${l},\n`).join("")}}`;
}
