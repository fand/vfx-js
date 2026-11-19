// Settings resolution: parameter defaults, the looks holo.spot ships, studio presets and holo.spot "Copy settings"
// blobs. Ported from holospot src/settings.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
import { LOOKS } from "./data/looks.js";
import { MATERIAL_PRESETS } from "./data/material-presets.js";
import { IGNORED_IDS, NOT_PORTED } from "./data/not-ported.js";
import { PARAM_SPECS } from "./data/params.js";
import { STUDIO_PRESETS } from "./data/studio-presets.js";
import type { ParamSpec } from "./settings-types.js";
import type {
    Background,
    HoloMaterialId,
    ParamValue,
    ParamValues,
    PointerMode,
    SpdId,
    StudioValues,
    ToneCurve,
    Vec2,
} from "./types.js";
import { SPD_IDS } from "./types.js";

export type LookId = "card" | "object" | "plain";

const SPECS = new Map<string, ParamSpec>(PARAM_SPECS.map((p) => [p.id, p]));

/** Whether `id` is a setting of the scene (not of a material). */
function isSceneId(id: string): boolean {
    const head = id.split(".")[0];
    return (
        head === "studio" ||
        head === "display" ||
        head === "grain" ||
        head === "card" ||
        head === "motion" ||
        head === "scene" ||
        head === "dof"
    );
}

/** A "Copy settings" blob from holo.spot (the `</>` button of the Object tab). */
export interface CopyBlob {
    readonly holoDev: 1;
    readonly material?: string;
    readonly values: Readonly<Record<string, unknown>>;
    readonly pose?: Readonly<{ rx: number; ry: number }>;
}

export function isCopyBlob(s: unknown): s is CopyBlob {
    return (
        !!s &&
        typeof s === "object" &&
        (s as CopyBlob).holoDev === 1 &&
        typeof (s as CopyBlob).values === "object"
    );
}

export interface Resolved {
    material: HoloMaterialId;
    /** Every supported scene parameter and every parameter of the material, by id. */
    values: Record<string, ParamValue>;
    /** Rest pose [deg] (rx tips the top edge toward the camera, ry turns the face toward +X). */
    pose: { rx: number; ry: number };
}

// a plain { x, y } (an <img> has numeric x / y too)
const isVec2 = (v: unknown): v is Vec2 =>
    !!v &&
    typeof v === "object" &&
    Object.getPrototypeOf(v) === Object.prototype &&
    typeof (v as Vec2).x === "number" &&
    typeof (v as Vec2).y === "number";

/** Copies a pad value; anything else (an `emboss.logo` image) is kept by reference. */
function clone(v: ParamValue | { type: string }): ParamValue {
    return isVec2(v) ? { x: v.x, y: v.y } : (v as ParamValue);
}

const warned = new Set<string>();
/** console.warn, once per message. */
export function warnOnce(msg: string): void {
    if (!warned.has(msg)) {
        warned.add(msg);
        console.warn(msg);
    }
}

const MATERIAL_HEADS = new Set([
    "prism",
    "shatter",
    "nebula",
    "sparkle",
    "vortex",
    "emboss",
]);

/** holospot's hexColour: `#rrggbb`, or `#rgb` expanded; otherwise null. */
export function hexColour(v: unknown): string | null {
    if (typeof v !== "string") {
        return null;
    }
    const s = v.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) {
        return s;
    }
    if (/^#[0-9a-f]{3}$/.test(s)) {
        return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    }
    return null;
}

/**
 * A given value checked against its spec: numbers clamped to the range, options and types checked. Returns the value
 * to use, or undefined to drop it; warns (once) about what it changed.
 */
function checked(spec: ParamSpec, v: ParamValue): ParamValue | undefined {
    const bad = (why: string) => {
        warnOnce(
            `HoloEffect: ${spec.id} = ${JSON.stringify(v)} ${why}; ignored.`,
        );
        return undefined;
    };
    const clampWarn = (x: number): number => {
        const lo = spec.min ?? Number.NEGATIVE_INFINITY;
        const hi = spec.max ?? Number.POSITIVE_INFINITY;
        const c = Math.min(Math.max(x, lo), hi);
        if (c !== x) {
            warnOnce(
                `HoloEffect: ${spec.id} = ${x} is outside ${spec.min}–${spec.max}; clamped to ${c}.`,
            );
        }
        return c;
    };
    const d = spec.default;
    switch (spec.kind) {
        case "slider":
            return typeof v === "number" && Number.isFinite(v)
                ? clampWarn(v)
                : bad("is not a number");
        case "toggle":
            return typeof v === "boolean" ? v : bad("is not a boolean");
        case "select":
            if (spec.options && !spec.options.includes(String(v))) {
                return bad(`is not one of ${spec.options.join(", ")}`);
            }
            // holo.spot keeps the option's type (some options are numbers written as strings)
            return typeof d === "number" ? Number(v) : String(v);
        case "color":
            return hexColour(v) ?? bad("is not a #rgb / #rrggbb colour");
        case "image":
            // a URL, or an image / canvas / ImageBitmap (emboss.logo)
            return typeof v === "string" ||
                (typeof v === "object" && !isVec2(v))
                ? v
                : bad("is not a URL or an image");
        case "pad":
            return v &&
                typeof v === "object" &&
                Number.isFinite((v as Vec2).x) &&
                Number.isFinite((v as Vec2).y)
                ? { x: clampWarn((v as Vec2).x), y: clampWarn((v as Vec2).y) }
                : bad("is not { x, y }");
        default:
            return typeof v === typeof d || typeof d === "object"
                ? v
                : bad(`is not a ${typeof d}`);
    }
}

/** Why an id that is not a setting of this material or the scene is dropped (warns when it matters). */
function dropped(id: string, v: ParamValue): void {
    const head = id.split(".")[0];
    if (MATERIAL_HEADS.has(head) && !(id in NOT_PORTED)) {
        // another material's id (a look or a blob carries every foil's)
        if (SPECS.has(id)) {
            return;
        }
    }
    if (IGNORED_IDS.has(id)) {
        return;
    }
    if (id in NOT_PORTED) {
        if (JSON.stringify(NOT_PORTED[id]) !== JSON.stringify(v)) {
            warnOnce(
                `HoloEffect: holo.spot setting ${id} is not supported by this port; ignored.`,
            );
        }
        return;
    }
    warnOnce(`HoloEffect: unknown holo.spot setting ${id}; ignored.`);
}

/**
 * Defaults, then the look's shipped values, then `studio.preset`, then the given values, each checked against its
 * spec. Ids of other materials are ignored; unknown ids and holo.spot ids the port does not render warn.
 */
export function resolveSettings(
    material: HoloMaterialId,
    look: LookId,
    given: Readonly<Record<string, ParamValue | undefined>>,
): Resolved {
    const values: Record<string, ParamValue> = {};
    const prefix = `${material}.`;
    for (const p of PARAM_SPECS) {
        if (isSceneId(p.id) || p.id.startsWith(prefix)) {
            values[p.id] = clone(p.default);
        }
    }
    const write = (id: string, v: ParamValue, strict: boolean) => {
        if (!(id in values)) {
            if (strict) {
                dropped(id, v);
            }
            return;
        }
        const spec = SPECS.get(id);
        const c = spec ? checked(spec, v) : v;
        if (c !== undefined) {
            values[id] = clone(c);
        }
    };
    const shipped = look === "plain" ? null : LOOKS[look][material];
    if (shipped) {
        for (const [id, v] of Object.entries(shipped.values)) {
            write(id, v, false);
        }
    }
    const preset = given["studio.preset"];
    if (typeof preset === "string" && STUDIO_PRESETS[preset]) {
        for (const [id, v] of Object.entries(STUDIO_PRESETS[preset])) {
            write(id, v, false);
        }
    }
    // a material's preset selects (the paper stock writes the paper's values), as choosing it on holo.spot does
    for (const [id, options] of Object.entries(MATERIAL_PRESETS)) {
        const choice = given[id];
        if (
            id.startsWith(prefix) &&
            typeof choice === "string" &&
            options[choice]
        ) {
            for (const [k, v] of Object.entries(options[choice])) {
                write(k, v, false);
            }
        }
    }
    for (const [id, v] of Object.entries(given)) {
        if (v !== undefined && v !== null) {
            write(id, v, true);
        }
    }
    const pose = shipped?.pose ?? { rx: 0, ry: 0 };
    // `motion.pose` overrides the look's pose (x = ry, y = rx)
    const mp =
        given["motion.pose"] !== undefined ? values["motion.pose"] : null;
    return {
        material,
        values,
        pose:
            mp && typeof mp === "object"
                ? { rx: (mp as Vec2).y, ry: (mp as Vec2).x }
                : { rx: pose.rx, ry: pose.ry },
    };
}

// ---- typed readers

export function num(v: ParamValues, id: string, fallback: number): number {
    const x = v[id];
    return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
export function bool(v: ParamValues, id: string, fallback: boolean): boolean {
    const x = v[id];
    return typeof x === "boolean" ? x : fallback;
}
export function str(v: ParamValues, id: string, fallback: string): string {
    const x = v[id];
    return typeof x === "string" ? x : fallback;
}
export function pick<T extends string>(
    v: ParamValues,
    id: string,
    options: readonly T[],
    fallback: T,
): T {
    const x = v[id];
    return typeof x === "string" && (options as readonly string[]).includes(x)
        ? (x as T)
        : fallback;
}
export function vec(v: ParamValues, id: string, fallback: Vec2): Vec2 {
    const x = v[id];
    return x && typeof x === "object" && typeof x.x === "number"
        ? { x: x.x, y: x.y }
        : fallback;
}
export function clamp(x: number, lo: number, hi: number): number {
    return Math.min(Math.max(x, lo), hi);
}

/** Spec of a parameter (range, options), or undefined. */
export function paramSpec(id: string): ParamSpec | undefined {
    return SPECS.get(id);
}

function light(
    v: ParamValues,
    key: string,
    d: { on: boolean; dir: Vec2; radiance: number; distanceM: number },
) {
    return {
        on: bool(v, `studio.${key}.on`, d.on),
        dir: vec(v, `studio.${key}.dir`, d.dir),
        radiance: Math.max(num(v, `studio.${key}.radiance`, d.radiance), 0),
        distanceM: num(v, `studio.${key}.distance`, d.distanceM),
        spd: pick<SpdId>(v, `studio.${key}.spd`, SPD_IDS, "equal"),
    };
}

export function studioFromValues(v: ParamValues): StudioValues {
    return {
        panel: {
            ...light(v, "panel", {
                on: true,
                dir: { x: -0.48, y: 0.66 },
                radiance: 4,
                distanceM: 0.9,
            }),
            widthDeg: num(v, "studio.panel.width", 14),
            lengthDeg: num(v, "studio.panel.length", 50),
        },
        spotA: {
            ...light(v, "spotA", {
                on: true,
                dir: { x: -0.04, y: -0.1 },
                radiance: 1200,
                distanceM: 1,
            }),
            sizeDeg: num(v, "studio.spotA.size", 1.5),
        },
        spotB: {
            ...light(v, "spotB", {
                on: true,
                dir: { x: -0.25, y: -0.68 },
                radiance: 600,
                distanceM: 1.2,
            }),
            sizeDeg: num(v, "studio.spotB.size", 2.5),
        },
        spotC: {
            ...light(v, "spotC", {
                on: false,
                dir: { x: 0.21, y: -0.37 },
                radiance: 1200,
                distanceM: 1,
            }),
            sizeDeg: num(v, "studio.spotC.size", 1),
        },
        ambient: {
            rims: num(v, "studio.ambient.rims", 3),
            fill: num(v, "studio.ambient.fill", 0.4),
            scrim: num(v, "studio.ambient.scrim", 0.4),
            cameraSide: num(v, "studio.ambient.cameraSide", 0.004),
            cameraTexture: num(v, "studio.ambient.cameraTexture", 1),
            backdrop: num(v, "studio.ambient.backdrop", 1),
            rotationDeg: num(v, "studio.ambient.rotation", 0),
        },
        flash: {
            sizeMm: num(v, "studio.flash.size", 8.5),
            distanceM: num(v, "studio.flash.distance", 0.3),
            radiance: Math.max(num(v, "studio.flash.radiance", 1500), 0),
            spd: pick<SpdId>(v, "studio.flash.spd", SPD_IDS, "equal"),
        },
    };
}

export interface SceneState {
    background: Background;
    bgColor: string;
    studio: StudioValues;
    display: {
        ev: number;
        tone: ToneCurve;
        glare: number;
        glareRadiusPx: number;
    };
    /** holo.spot's camera: focal length on a 36 × 24 mm sensor (`dof.lens`; 62 mm = the 22° camera). */
    lensMm: number;
    grain: {
        on: boolean;
        amount: number;
        sizePx: number;
        animated: boolean;
        colour: "mono" | "rgb";
        onBackground: boolean;
    };
    card: {
        bowMm: number;
        bowAxis: "across" | "along";
        emboss: "none" | "lines" | "crosshatch";
        embossPitchMm: number;
        embossHeightUm: number;
        embossLayer: "foil" | "varnish";
        wear: number;
    };
    motion: {
        pointer: PointerMode | "none";
        tiltRangeDeg: number;
        wobble: boolean;
        wobbleAmpDeg: number;
    };
}

export function sceneStateFrom(v: ParamValues): SceneState {
    return {
        background: pick<Background>(
            v,
            "scene.background",
            ["black", "white", "colour"],
            "white",
        ),
        bgColor: str(v, "scene.bgColor", "#3a4458"),
        studio: studioFromValues(v),
        display: {
            ev: num(v, "display.ev", 0.5),
            tone: pick<ToneCurve>(
                v,
                "display.tone",
                ["neutral", "agx", "clamp"],
                "neutral",
            ),
            glare: Math.max(num(v, "display.glare", 0.03), 0),
            glareRadiusPx: Math.max(num(v, "display.glareRadius", 8), 0.5),
        },
        lensMm: clamp(num(v, "dof.lens", 62), 24, 200),
        grain: {
            on: bool(v, "grain.on", true),
            amount: clamp(num(v, "grain.amount", 0.07), 0, 0.6),
            sizePx: clamp(num(v, "grain.size", 1), 1, 4),
            animated: bool(v, "grain.animated", true),
            colour: pick<"mono" | "rgb">(
                v,
                "grain.colour",
                ["mono", "rgb"],
                "mono",
            ),
            onBackground: bool(v, "grain.onBackground", false),
        },
        card: {
            bowMm: num(v, "card.bow", 1.6),
            bowAxis: pick<"across" | "along">(
                v,
                "card.bowAxis",
                ["across", "along"],
                "across",
            ),
            emboss: pick<"none" | "lines" | "crosshatch">(
                v,
                "card.emboss",
                ["none", "lines", "crosshatch"],
                "crosshatch",
            ),
            embossPitchMm: Math.max(num(v, "card.embossPitch", 1.17), 0.01),
            embossHeightUm: Math.max(num(v, "card.embossHeight", 0.5), 0),
            embossLayer: pick<"foil" | "varnish">(
                v,
                "card.embossLayer",
                ["foil", "varnish"],
                "varnish",
            ),
            wear: clamp(num(v, "card.wear", 0.16), 0, 1),
        },
        motion: {
            pointer: pick<PointerMode | "none">(
                v,
                "motion.pointer",
                ["tilt", "light", "flash", "none"],
                "tilt",
            ),
            tiltRangeDeg: num(v, "motion.tiltRange", 25),
            wobble: bool(v, "motion.wobble", true),
            wobbleAmpDeg: num(v, "motion.wobbleAmp", 14),
        },
    };
}

/** Linear sRGB of a #rrggbb colour. */
export function linearOfHex(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    const n = m ? Number.parseInt(m[1], 16) : 0;
    const lin = (c: number) => {
        const x = c / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}
export function backgroundLinear(
    bg: Background,
    hex: string,
): [number, number, number] {
    return bg === "white"
        ? [1, 1, 1]
        : bg === "colour"
          ? linearOfHex(hex)
          : [0, 0, 0];
}
/** Lightness of the page for the lighting adaptation: 0 on black, 1 on white, a colour's luminance between. */
export function backgroundTone(bg: Background, hex: string): number {
    if (bg !== "colour") {
        return bg === "white" ? 1 : 0;
    }
    const [r, g, b] = linearOfHex(hex);
    return clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1);
}
/** Linear exposure multiplier for the output pass: 2^(EV − 0.2·tone). */
export function exposureMultiplier(ev: number, tone: number): number {
    return 2 ** (ev - 0.2 * clamp(tone, 0, 1));
}
