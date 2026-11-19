import type { Meta, StoryObj } from "@storybook/html-vite";
import type { VFX } from "@vfx-js/core";
import {
    HoloEffect,
    type HoloLights,
    type HoloMask,
    type HoloMaterial,
    type HoloPointer,
    type HoloQuality,
    type HoloSettingSpec,
    type HoloSettingValue,
    type HoloTone,
    type HoloView,
} from "@vfx-js/effects";
import type { FolderApi, Pane } from "tweakpane";
import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import Pigeon from "./assets/pigeon.webp";
import "./preset.css";
import { initVFX, makePane } from "./utils";

export default {
    title: "Effect/Holo",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

const SOURCES = { Logo, Pigeon, Jellyfish };
const MATERIALS: HoloMaterial[] = [
    "prism",
    "shatter",
    "nebula",
    "sparkle",
    "vortex",
    "emboss",
];
const LIGHTS: HoloLights[] = [
    "studio",
    "spot",
    "softbox",
    "strip",
    "dark",
    "desk",
    "office",
    "raking",
];
const BUILTIN_LOGOS = ["rosette", "koru", "wordmark", "leaf", "facets"];

const opts = <T extends string>(xs: readonly T[]) =>
    Object.fromEntries(xs.map((x) => [x, x])) as Record<string, T>;

export const holo: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.cssText = "display:block;margin:120px auto;max-width:60vw";
        return img;
    },
    args: undefined,
};

holo.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await img.decode();
    const vfx = initVFX();
    const effect = new HoloEffect();
    await vfx.add(img, { effect });
    attachHoloPane(effect, img, vfx);
};

/**
 * Tweakpane for HoloEffect. The scene and material folders show the values in effect and are rebuilt when the
 * material, the look or the lights change. A look spreads one of `HoloEffect.looks` over a clean effect.
 */
function attachHoloPane(effect: HoloEffect, img: HTMLImageElement, vfx: VFX) {
    let pane: Pane | null = null;
    const ui = {
        source: "Logo" as keyof typeof SOURCES,
        look: "(none)" as LookName,
        preset: "(none)",
    };

    // rebuilding inside a control's own change event would dispose it mid-event: defer it
    const rebuild = () => setTimeout(build, 0);
    const build = () => {
        pane?.dispose();
        const p = makePane("Holo");
        pane = p;
        const params = effect.params;
        const v = effect.resolvedSettings();

        p.addBinding(ui, "source", { options: opts(Object.keys(SOURCES)) }).on(
            "change",
            async (ev) => {
                img.src = SOURCES[ev.value as keyof typeof SOURCES];
                await img.decode();
                await vfx.update(img);
            },
        );

        // ---- the effect
        const fx = p.addFolder({ title: "Effect" });
        const general = {
            material: params.material,
            quality: params.quality,
            mask: params.mask,
            view: params.view,
            lens: typeof v["dof.lens"] === "number" ? v["dof.lens"] : 62,
            msaa: params.msaa,
            structureScale: params.structureScale,
            ink: params.ink,
        };
        fx.addBinding(general, "material", { options: opts(MATERIALS) }).on(
            "change",
            (ev) => {
                ui.preset = "(none)";
                effect.setParams({ material: ev.value as HoloMaterial });
                rebuild();
            },
        );
        fx.addBinding(ui, "look", {
            options: opts<LookName>(["(none)", "card", "object", "paperCard"]),
        }).on("change", (ev) => {
            // a look starts clean: what was set before goes, then HoloEffect.looks.<name> is spread over it
            const look = ev.value as LookName;
            effect.params.settings = {};
            effect.setParams({
                ...CLEAR_SCENE,
                ...(look === "(none)" ? {} : HoloEffect.looks[look]),
            });
            rebuild();
        });
        // holospot's "Starting points" of the material: its settings replace the material's (the scene stays)
        const presets = HoloEffect.presets[params.material] as Record<
            string,
            { settings: Record<string, HoloSettingValue | undefined> }
        >;
        fx.addBinding(ui, "preset", {
            options: opts(["(none)", ...Object.keys(presets)]),
        }).on("change", (ev) => {
            const own = `${params.material}.`;
            const kept = Object.fromEntries(
                Object.entries(effect.params.settings).filter(
                    ([id]) => !id.startsWith(own),
                ),
            );
            effect.params.settings = {
                ...kept,
                ...(ev.value === "(none)" ? {} : presets[ev.value].settings),
            };
            effect.setParams({});
            rebuild();
        });
        fx.addBinding(general, "quality", {
            options: opts<HoloQuality>(["low", "medium", "high"]),
        }).on("change", (ev) =>
            effect.setParams({ quality: ev.value as HoloQuality }),
        );
        fx.addBinding(general, "mask", {
            options: opts<HoloMask>(["alpha", "luma", "none"]),
        }).on("change", (ev) =>
            effect.setParams({ mask: ev.value as HoloMask }),
        );
        // flat: the card stays and the light rig turns; 3d: the card turns, seen through the lens
        fx.addBinding(general, "view", {
            options: opts<HoloView>(["flat", "3d"]),
        }).on("change", (ev) => {
            effect.setParams({ view: ev.value as HoloView });
            rebuild();
        });
        if (params.view === "3d") {
            fx.addBinding(general, "lens", { min: 24, max: 200, step: 1 }).on(
                "change",
                (ev) => effect.setParams({ lens: ev.value }),
            );
            fx.addBinding(general, "msaa").on("change", (ev) =>
                effect.setParams({ msaa: ev.value }),
            );
        }
        fx.addBinding(general, "structureScale", {
            min: 0.1,
            max: 10,
            step: 0.05,
        }).on("change", (ev) => effect.setParams({ structureScale: ev.value }));
        if (params.material !== "emboss") {
            fx.addBinding(general, "ink", { min: 0, max: 1, step: 0.01 }).on(
                "change",
                (ev) => effect.setParams({ ink: ev.value }),
            );
        }

        // ---- the scene (typed params, shown at their current values)
        const sc = p.addFolder({ title: "Scene" });
        const num = (id: string, d: number) => {
            const x = v[id];
            return typeof x === "number" ? x : d;
        };
        const bg = v["scene.background"];
        const scene = {
            exposure: num("display.ev", 0.5),
            tone: (v["display.tone"] as HoloTone) ?? "neutral",
            glare: num("display.glare", 0.03),
            grain: v["grain.on"] === false ? 0 : num("grain.amount", 0.07),
            lights: params.lights ?? "(default)",
            background:
                bg === "colour"
                    ? String(v["scene.bgColor"])
                    : String(bg ?? "white"),
            bow: num("card.bow", 1.6),
            pose: { ...(v["motion.pose"] as { x: number; y: number }) },
            pointer: (params.pointer ??
                v["motion.pointer"] ??
                "tilt") as HoloPointer,
            tiltRange: num("motion.tiltRange", 25),
            wobble:
                v["motion.wobble"] === false ? 0 : num("motion.wobbleAmp", 14),
        };
        sc.addBinding(scene, "exposure", { min: -3, max: 3, step: 0.05 }).on(
            "change",
            (ev) => effect.setParams({ exposure: ev.value }),
        );
        sc.addBinding(scene, "tone", {
            options: opts<HoloTone>(["neutral", "agx", "clamp"]),
        }).on("change", (ev) =>
            effect.setParams({ tone: ev.value as HoloTone }),
        );
        sc.addBinding(scene, "glare", { min: 0, max: 0.1, step: 0.001 }).on(
            "change",
            (ev) => effect.setParams({ glare: ev.value }),
        );
        sc.addBinding(scene, "grain", { min: 0, max: 0.6, step: 0.005 }).on(
            "change",
            (ev) => effect.setParams({ grain: ev.value }),
        );
        sc.addBinding(scene, "lights", {
            options: opts(["(default)", ...LIGHTS]),
        }).on("change", (ev) => {
            effect.setParams({
                lights:
                    ev.value === "(default)" ? null : (ev.value as HoloLights),
            });
            rebuild(); // the single lights below follow the rig
        });
        sc.addBinding(scene, "background", {
            options: { black: "black", white: "white", grey: "#3a4458" },
        }).on("change", (ev) => effect.setParams({ background: ev.value }));
        sc.addBinding(scene, "bow", { min: 0, max: 2, step: 0.05 }).on(
            "change",
            (ev) => effect.setParams({ bow: ev.value }),
        );
        sc.addBinding(scene, "pose", {
            x: { min: -45, max: 45 },
            y: { min: -45, max: 45, inverted: true },
        }).on("change", (ev) =>
            effect.setParams({ pose: { x: ev.value.x, y: ev.value.y } }),
        );
        sc.addBinding(scene, "pointer", {
            options: opts<HoloPointer>(["tilt", "light", "flash", "none"]),
        }).on("change", (ev) =>
            effect.setParams({ pointer: ev.value as HoloPointer }),
        );
        sc.addBinding(scene, "tiltRange", { min: 0, max: 45, step: 1 }).on(
            "change",
            (ev) => effect.setParams({ tiltRange: ev.value }),
        );
        sc.addBinding(scene, "wobble", { min: 0, max: 25, step: 0.5 }).on(
            "change",
            (ev) => effect.setParams({ wobble: ev.value }),
        );
        sc.addButton({ title: "Reset scene" }).on("click", () => {
            ui.look = "(none)";
            effect.params.settings = {};
            effect.setParams(CLEAR_SCENE);
            rebuild();
        });

        // ---- every holo.spot setting of the material, then the single lights
        const specs = HoloEffect.settingSpecs(params.material);
        const own = specs.filter((s) => s.id.startsWith(`${params.material}.`));
        addSettings(
            p.addFolder({ title: `${params.material}.*`, expanded: false }),
            own,
            v,
            effect,
        );
        addSettings(
            p.addFolder({ title: "studio.* (lights)", expanded: false }),
            specs.filter(
                (s) => s.id.startsWith("studio.") && s.id !== "studio.preset",
            ),
            v,
            effect,
        );
    };
    build();
}

type LookName = "(none)" | keyof typeof HoloEffect.looks;

const CLEAR_SCENE = {
    exposure: null,
    tone: null,
    glare: null,
    grain: null,
    lights: null,
    background: null,
    bow: null,
    pose: null,
    lens: null,
    pointer: null,
    tiltRange: null,
    wobble: null,
} as const;

/** One control per holo.spot setting, writing `settings` by id. */
function addSettings(
    folder: FolderApi,
    specs: readonly HoloSettingSpec[],
    v: Readonly<Record<string, HoloSettingValue>>,
    effect: HoloEffect,
) {
    const state: Record<string, HoloSettingValue> = {};
    for (const s of specs) {
        try {
            addSetting(folder, s, state, v, effect);
        } catch (e) {
            console.warn(`Holo pane: no control for ${s.id}`, e);
        }
    }
}

function addSetting(
    folder: FolderApi,
    s: HoloSettingSpec,
    state: Record<string, HoloSettingValue>,
    v: Readonly<Record<string, HoloSettingValue>>,
    effect: HoloEffect,
) {
    {
        const cur = v[s.id] ?? s.default;
        const key = s.id.split(".").slice(1).join(".");
        state[key] =
            typeof cur === "object"
                ? { ...(cur as { x: number; y: number }) }
                : cur;
        const set = (value: HoloSettingValue) =>
            effect.setParams({ settings: { [s.id]: value } });
        if (s.kind === "select") {
            folder
                .addBinding(state, key, { options: opts(s.options ?? []) })
                .on("change", (ev) => set(ev.value as string));
        } else if (s.kind === "image") {
            state[key] = String(cur);
            folder
                .addBinding(state, key, {
                    options: Object.fromEntries(
                        BUILTIN_LOGOS.map((n) => [n, `/logos/${n}.svg`]),
                    ),
                })
                .on("change", (ev) => set(ev.value as string));
        } else if (s.kind === "pad") {
            const r = { min: s.min ?? -1, max: s.max ?? 1 };
            folder
                .addBinding(state, key, { x: r, y: { ...r, inverted: true } })
                .on("change", (ev) => {
                    const p = ev.value as { x: number; y: number };
                    set({ x: p.x, y: p.y });
                });
        } else if (s.kind === "slider") {
            folder
                .addBinding(state, key, {
                    min: s.min,
                    max: s.max,
                    step: s.step,
                })
                .on("change", (ev) => set(ev.value as number));
        } else {
            // toggle (boolean) and color (#rrggbb string) bind as they are
            folder
                .addBinding(state, key)
                .on("change", (ev) => set(ev.value as boolean | string));
        }
    }
}
