import type { Meta, StoryObj } from "@storybook/html-vite";
import type { VFX } from "@vfx-js/core";
import {
    HoloEffect,
    type HoloMask,
    type HoloMaterial,
    type HoloPointer,
    type HoloQuality,
    type HoloSettingSpec,
    type HoloSettingValue,
    type HoloStartingPoint,
    type HoloStudio,
    type HoloTone,
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
const STUDIOS: HoloStudio[] = [
    "studio",
    "spot",
    "softbox",
    "strip",
    "dark",
    "desk",
    "office",
    "raking",
];
// emboss logos: none by default, or the story's own artwork
const LOGOS: Record<string, string> = {
    "(none)": "",
    "the element": "element",
    "vfx-js logo": Logo,
};
// emboss.print: the ground when the element is the logo (none: transparent, unless emboss.paperColour is set)
const PRINTS: Record<string, string> = { "(none)": "", pigeon: Pigeon };

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
 * material, the look or the lights change. A look is applied with `setParams(look, { resetSettings: true })`.
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
            flat: params.flat,
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
            options: opts<LookName>(["(none)", "card", "object", "image"]),
        }).on("change", (ev) => {
            // a look starts clean: the settings go back to holo.spot's defaults, then the look applies
            const look = ev.value as LookName;
            effect.setParams(look === "(none)" ? {} : HoloEffect.looks[look], {
                resetSettings: true,
            });
            rebuild();
        });
        // holospot's "Starting points" of the material: its settings replace the material's (the scene stays)
        const points = HoloEffect.startingPoints[params.material] as Record<
            string,
            HoloStartingPoint
        >;
        fx.addBinding(ui, "preset", {
            options: opts(["(none)", ...Object.keys(points)]),
        }).on("change", (ev) => {
            const own = `${params.material}.`;
            // remove the material's ids (null), then apply the starting point
            const clear = Object.fromEntries(
                Object.keys(effect.params.settings)
                    .filter((id) => id.startsWith(own))
                    .map((id) => [id, null]),
            );
            effect.setParams({ settings: clear });
            if (ev.value !== "(none)") {
                effect.setParams(points[ev.value]);
            }
            rebuild();
        });
        fx.addBinding(general, "quality", {
            options: opts<HoloQuality>(["auto", "low", "medium", "high"]),
        }).on("change", (ev) =>
            effect.setParams({ quality: ev.value as HoloQuality }),
        );
        fx.addBinding(general, "mask", {
            options: opts<HoloMask>(["alpha", "luma", "none"]),
        }).on("change", (ev) =>
            effect.setParams({ mask: ev.value as HoloMask }),
        );
        // flat: the card stays and the light rig turns; otherwise the card turns, seen through the lens
        fx.addBinding(general, "flat").on("change", (ev) => {
            effect.setParams({ flat: ev.value });
            rebuild();
        });
        if (!params.flat) {
            fx.addBinding(general, "lens", { min: 24, max: 200, step: 1 }).on(
                "change",
                (ev) => effect.setParams({ lens: ev.value }),
            );
            fx.addBinding(general, "msaa").on("change", (ev) =>
                effect.setParams({ msaa: ev.value }),
            );
        }
        fx.addBinding(general, "structureScale", {
            min: 0.25,
            max: 4,
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
            studio: String(v["studio.preset"] ?? "studio"),
            background:
                bg === "colour"
                    ? String(v["scene.bgColor"])
                    : String(bg ?? "white"),
            bow: num("card.bow", 1.6),
            pose: { ...(v["motion.pose"] as { x: number; y: number }) },
            pointer: (v["motion.pointer"] ?? "tilt") as HoloPointer,
            tiltRange: num("motion.tiltRange", 25),
            wobble: v["motion.wobble"] !== false,
            wobbleAmp: num("motion.wobbleAmp", 14),
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
        sc.addBinding(scene, "studio", { options: opts(STUDIOS) }).on(
            "change",
            (ev) => {
                effect.setParams({ studio: ev.value as HoloStudio });
                rebuild(); // the single lights below follow the rig
            },
        );
        sc.addBinding(scene, "background", {
            options: { black: "black", white: "white", grey: "#3a4458" },
        }).on("change", (ev) => effect.setParams({ background: ev.value }));
        sc.addBinding(scene, "bow", { min: 0, max: 2, step: 0.05 }).on(
            "change",
            (ev) => effect.setParams({ bow: ev.value }),
        );
        sc.addBinding(scene, "pose", {
            x: { min: -35, max: 35 },
            y: { min: -35, max: 35, inverted: true },
        }).on("change", (ev) =>
            effect.setParams({ pose: { x: ev.value.x, y: ev.value.y } }),
        );
        sc.addBinding(scene, "pointer", {
            options: opts<HoloPointer>(["tilt", "light", "flash", "none"]),
        }).on("change", (ev) =>
            effect.setParams({ pointer: ev.value as HoloPointer }),
        );
        sc.addBinding(scene, "tiltRange", { min: 5, max: 35, step: 1 }).on(
            "change",
            (ev) => effect.setParams({ tiltRange: ev.value }),
        );
        sc.addBinding(scene, "wobble").on("change", (ev) =>
            effect.setParams({ wobble: ev.value }),
        );
        sc.addBinding(scene, "wobbleAmp", { min: 0, max: 25, step: 0.5 }).on(
            "change",
            (ev) => effect.setParams({ wobbleAmp: ev.value }),
        );
        sc.addButton({ title: "Reset scene" }).on("click", () => {
            ui.look = "(none)";
            effect.setParams({}, { resetSettings: true });
            rebuild();
        });

        // ---- every holo.spot setting of the material, then the single lights
        const specs = HoloEffect.settingSpecs(params.material);
        const own = specs.filter((s) => s.id.startsWith(`${params.material}.`));
        // the emboss logo's px placement has no default (centre, 36/63 of the width): show what is drawn
        const placed = {
            "emboss.x": Math.round(img.clientWidth / 2),
            "emboss.y": Math.round(img.clientHeight / 2),
            "emboss.width": Math.round((img.clientWidth * 36) / 63),
            ...v,
        };
        addSettings(
            p.addFolder({ title: `${params.material}.*`, expanded: false }),
            own,
            placed,
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

/** One control per holo.spot setting, writing `settings` by id. */
function addSettings(
    folder: FolderApi,
    specs: readonly HoloSettingSpec[],
    v: ReturnType<HoloEffect["resolvedSettings"]>,
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
    v: ReturnType<HoloEffect["resolvedSettings"]>,
    effect: HoloEffect,
) {
    {
        // an image given as emboss.logo has no option in the select: show the default
        const raw = v[s.id] ?? s.default;
        const cur = (
            typeof raw === "object" && s.kind === "image" ? s.default : raw
        ) as HoloSettingValue;
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
                    options: s.id === "emboss.print" ? PRINTS : LOGOS,
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
