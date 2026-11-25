import type { Effect } from "@vfx-js/core";
import type { FolderApi } from "tweakpane";
import { Pane } from "tweakpane";
import type { NumberControl, ParamSpec } from "../api/effect-params";
import { choiceKeyOf } from "../effect-code";
import type { EffectDemo } from "../effects-list";

type Values = Record<string, unknown>;

/** Set params on a live effect. Effects take them in different ways. */
export function applyParams(effect: Effect, patch: Values): void {
    const target = effect as unknown as {
        setParams?: (p: Values) => void;
        setParam?: (p: Values) => void;
        params?: Values;
    };
    if (typeof target.setParams === "function") {
        target.setParams(patch);
    } else if (typeof target.setParam === "function") {
        target.setParam(patch);
    } else if (target.params) {
        Object.assign(target.params, patch);
    } else {
        Object.assign(target, patch);
    }
}

type Rgba = { r: number; g: number; b: number; a?: number };

function toRgba(v: number[]): Rgba {
    const [r, g, b, a] = v;
    return v.length === 4 ? { r, g, b, a } : { r, g, b };
}

function fromRgba(c: Rgba): number[] {
    return c.a === undefined ? [c.r, c.g, c.b] : [c.r, c.g, c.b, c.a];
}

function sliderOptions(control: NumberControl) {
    const { min, max, step } = control;
    return { min, max, step };
}

/**
 * A pane with one control per param. Writes to `values` and calls
 * `onChange` with the name of the param that changed.
 */
export function mountParamPane(
    container: HTMLElement,
    specs: ParamSpec[],
    values: Values,
    demo: EffectDemo,
    onChange: (name: string) => void,
): Pane {
    const pane = new Pane({ container, title: "Params" });

    // One folder per group.
    const folders = new Map<string, FolderApi>();
    const folderOf = (group: string) => {
        let folder = folders.get(group);
        if (!folder) {
            folder = pane.addFolder({ title: group });
            folders.set(group, folder);
        }
        return folder;
    };

    for (const spec of specs) {
        const { name, control } = spec;
        const parent = spec.group ? folderOf(spec.group) : pane;
        // Controls for parts of a param: an array item or a record entry.
        const addParts = (
            name: string,
            add: (folder: FolderApi, proxy: Values) => void,
        ) => {
            const folder = parent.addFolder({ title: name });
            const proxy: Values = {};
            add(folder, proxy);
        };
        const changed = () => onChange(name);
        switch (control.type) {
            case "number":
                parent
                    .addBinding(values, name, sliderOptions(control))
                    .on("change", changed);
                break;
            case "colorArray": {
                const proxy = { [name]: toRgba(values[name] as number[]) };
                parent
                    .addBinding(proxy, name, {
                        color: { type: "float" },
                    })
                    .on("change", (ev) => {
                        values[name] = fromRgba(ev.value as Rgba);
                        changed();
                    });
                break;
            }
            case "colorNumber":
                parent
                    .addBinding(values, name, { view: "color" })
                    .on("change", changed);
                break;
            case "list":
                parent
                    .addBinding(values, name, {
                        options: Object.fromEntries(
                            control.options.map((o) => [o, o]),
                        ),
                    })
                    .on("change", changed);
                break;
            case "choice": {
                const choices = demo.choices?.[name]?.values ?? {};
                const proxy = {
                    [name]:
                        choiceKeyOf(demo, name, values[name]) ??
                        control.options[0],
                };
                parent
                    .addBinding(proxy, name, {
                        options: Object.fromEntries(
                            control.options.map((o) => [o, o]),
                        ),
                    })
                    .on("change", (ev) => {
                        values[name] = choices[ev.value as string];
                        changed();
                    });
                break;
            }
            case "vector":
                addParts(name, (folder, proxy) => {
                    const items = values[name] as number[];
                    control.items.forEach((item, i) => {
                        const label = control.labels[i];
                        proxy[label] = items[i];
                        folder
                            .addBinding(proxy, label, sliderOptions(item))
                            .on("change", (ev) => {
                                const next = [...(values[name] as number[])];
                                next[i] = ev.value as number;
                                values[name] = next;
                                changed();
                            });
                    });
                });
                break;
            case "colorList":
                addParts(name, (folder, proxy) => {
                    (values[name] as string[]).forEach((color, i) => {
                        proxy[i] = color;
                        folder
                            .addBinding(proxy, String(i))
                            .on("change", (ev) => {
                                const next = [...(values[name] as string[])];
                                next[i] = ev.value as string;
                                values[name] = next;
                                changed();
                            });
                    });
                });
                break;
            case "colorRecord":
                addParts(name, (folder, proxy) => {
                    const record = values[name] as Record<string, number[]>;
                    for (const key of control.keys) {
                        proxy[key] = toRgba(record[key]);
                        folder
                            .addBinding(proxy, key, {
                                color: { type: "float" },
                            })
                            .on("change", (ev) => {
                                values[name] = {
                                    ...(values[name] as Record<
                                        string,
                                        number[]
                                    >),
                                    [key]: fromRgba(ev.value as Rgba),
                                };
                                changed();
                            });
                    }
                });
                break;
            default:
                parent.addBinding(values, name).on("change", changed);
        }
    }
    return pane;
}
