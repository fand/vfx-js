// Holographic foil on the element: the physically based diffraction foils of holospot
// (https://github.com/dmitrykurash/holospot, MIT © 2026 Dmitry Kurash; the renderer of https://www.holo.spot),
// ported to a vfx-js effect. The element is a flat card under holo.spot's spectral studio lights; the pointer tilts it.
// The port keeps holospot's physics (grating equation, order efficiencies, η renormalisation, material- and
// SPD-convolved spectral tables, coat, environment, tone curve); the class doc comment says what differs.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import { captureContent } from "./_capture.js";
import { LOOKS } from "./_holo/data/looks.js";
import { MATERIAL_PRESETS } from "./_holo/data/material-presets.js";
import type { HoloSettingId } from "./_holo/data/params.js";
import { PARAM_SPECS } from "./_holo/data/params.js";
import {
    type HoloStartingPointNames,
    STARTING_POINTS,
} from "./_holo/data/starting-points.js";
import { STUDIO_PRESETS } from "./_holo/data/studio-presets.js";
import type { EmbossAssets, LogoImage } from "./_holo/emboss-assets.js";
import { HoloGlare } from "./_holo/glare.js";
import outputFrag from "./_holo/glsl/output.js";
import {
    FRAG_DECODE_RGBA_MAIN,
    LTC_IMAGE,
    LTC_SIZE,
    ltcImageBytes,
} from "./_holo/ltc.js";
import type { MaterialDef, Uniforms } from "./_holo/materials/build.js";
import {
    isMaterialName,
    loadedMaterial,
    loadMaterial,
    MATERIAL_NAMES,
} from "./_holo/materials/registry.js";
import {
    type EnvLevels,
    envLevels,
    eulerXYZ,
    framingDistance,
} from "./_holo/physics/geometry.js";
import { etaFrame } from "./_holo/physics/grating.js";
import {
    cameraSideBlobs,
    ENV_LEVELS,
    ENV_SIZE,
    envRotation,
    FRAG_ENV_PREFILTER,
    sameLevels,
} from "./_holo/scene/env.js";
import { computeLights, emptyLightSet } from "./_holo/scene/lights.js";
import type { LogoReadOpts } from "./_holo/scene/logo.js";
import {
    inversePoseQuat,
    PoseSpring,
    wobbleOffset,
} from "./_holo/scene/pose.js";
import { buildWaves, type WaveSet } from "./_holo/scene/relief.js";
import {
    backgroundTone,
    exposureMultiplier,
    isCopyBlob,
    type Resolved,
    resolveSettings,
    type SceneState,
    sceneStateFrom,
    warnOnce,
} from "./_holo/settings.js";
import {
    assembleMaterial,
    CARD_VERT,
    FRAG_CARD_BASE,
    FRAG_PREFIX,
    GLSL_COMMON,
    PLAIN_VERT,
} from "./_holo/shader.js";
import { ATLAS, SpectralAtlas } from "./_holo/spectral/atlas.js";
import { GLSL_DECODE_FLOAT24 } from "./_holo/spectral/float24.js";
import { detectTier, TIERS } from "./_holo/tier.js";
import {
    type Mat3,
    type ParamValue,
    SPD_IDS,
    type Tier,
    type TierConfig,
    type Vec3,
} from "./_holo/types.js";

/** Foil materials of holo.spot. */
export type HoloMaterial =
    | "prism"
    | "shatter"
    | "nebula"
    | "sparkle"
    | "vortex"
    | "emboss";
/**
 * The artwork of the `emboss` material's foil logo (`emboss.logo`): an image, a canvas, an `ImageBitmap`, or the URL of an SVG or PNG
 * (fetched, so a cross-origin URL needs CORS; an `<img>` from another origin needs `crossOrigin`). Transparent areas
 * carry no foil; an opaque image is read by its contrast against its border (see `mask`), cut at `emboss.threshold`.
 * `""` is no logo. `"element"` makes the element itself the logo (read back once, and again on a resize or when
 * `emboss.logo` is given again, so a still element): the paper is then plain, and without `emboss.print` and
 * `emboss.paperColour` the ground is transparent, so only the foil logo is drawn.
 *
 * `emboss.print` takes the same kinds of image (or a URL): it is printed on the paper instead of the element, in
 * either mode, fitted like `background-size: cover`. While it loads, and if it fails, the paper is plain.
 */
export type HoloLogo =
    | string
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | OffscreenCanvas;
/**
 * Quality tier (holospot's tiers: orders, rect-light model, environment diffraction, glitter search radii). `"auto"`
 * picks one from the device as holospot does: `low` on phones, `high` on discrete and Apple GPUs, else `medium`.
 */
export type HoloQuality = "auto" | "low" | "medium" | "high";
/** Where the foil is: where the element is opaque, where it is bright, or the whole element rect. */
export type HoloMask = "alpha" | "luma" | "none";
/** A 2D value of a holo.spot setting (pads such as `studio.panel.dir`, `motion.pose`). */
export type HoloVec2 = { x: number; y: number };
/**
 * A holo.spot setting this effect understands, for building controls: its id, the kind of control holo.spot shows
 * (`slider`, `select`, `toggle`, `color` (`#rrggbb`), `pad` (`{ x, y }`) or `image` (a URL)), its default, and the
 * range, step or options.
 */
export type HoloSettingSpec = {
    readonly id: string;
    readonly kind: "slider" | "select" | "toggle" | "color" | "pad" | "image";
    /**
     * `null`: depends on the element (`emboss.x` / `emboss.y`: its centre; `emboss.width`: 36/63 of its width for an
     * image logo, its whole width when the element is the logo).
     */
    readonly default: HoloSettingValue | null;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly options?: readonly string[];
};

/** Tone curve: Khronos PBR Neutral (hue-stable), AgX, or a plain clamp. */
export type HoloTone = "neutral" | "agx" | "clamp";
/** What the pointer does over the element. */
export type HoloPointer = "tilt" | "light" | "flash" | "none";
/** holo.spot's light rigs (`studio.preset`). */
export type HoloStudio =
    | "studio"
    | "spot"
    | "softbox"
    | "strip"
    | "dark"
    | "desk"
    | "office"
    | "raking";
/** A holo.spot setting value. */
export type HoloSettingValue = number | boolean | string | HoloVec2;
/**
 * holo.spot settings by id, as on holo.spot and in holospot's docs: material ids (`prism.pitch`, `shatter.size`, …)
 * and scene ids (`studio.*` lights, `display.*`, `grain.*`, `card.*`, `motion.*`, `scene.*`, `dof.lens`). `null`
 * removes an id given earlier, so the default (or the look's value) applies again.
 */
export type HoloSettings = Readonly<{
    [K in HoloSettingId]?:
        | (K extends "emboss.logo" | "emboss.print"
              ? HoloLogo
              : HoloSettingValue)
        | null;
}>;
/**
 * What holo.spot's "Copy settings" button (`</>` in the Object tab) puts on the clipboard: the whole scene and
 * material. Pass it as `settings` to reproduce it; its `material` applies unless `material` is given with it.
 */
export type HoloCopyBlob = Readonly<{
    holoDev: 1;
    material?: string;
    values: Readonly<Record<string, unknown>>;
    pose?: Readonly<{ rx: number; ry: number }>;
    [key: string]: unknown;
}>;

/** The effect's params, as `effect.params` holds them. */
export type HoloParams = {
    /** Foil material. */
    material: HoloMaterial;
    /**
     * holo.spot settings by id over holo.spot's parameter defaults: everything given so far, merged by id (the
     * scene shorthands, `exposure`, `studio`, …, write here too).
     */
    settings: HoloSettings;
    /**
     * Physical size of the element's largest side in mm (the foil has a real grain). `null` (or a value that is not
     * a positive number): the element's CSS size at 96 dpi (1 px = 0.2646 mm).
     */
    sizeMm: number | null;
    /**
     * Quality tier (holospot's `quality` option). Default `"medium"`, what holospot ships without a look; the looks
     * set their own (`object` is `"low"`).
     */
    quality: HoloQuality;
    /**
     * Where the foil is. For `emboss`, whose paper is the whole card, how the logo image is read instead: `"alpha"`
     * (holospot's: its alpha, or an opaque image's contrast against its border) or `"luma"` (its brightness).
     */
    mask: HoloMask;
    /**
     * How much the element's colour tints the foil as a translucent ink, in [0, 1]. 0: bare foil. All materials but
     * `emboss`, whose element is printed on the paper instead (`emboss.printInk`).
     */
    ink: number;
    /**
     * Keep the card flat (default `false`). Both are scenes holospot can draw.
     *
     * - `false`: the card turns with the pose, seen by holospot's camera (`lens`). The output grows by about 21 % of
     *   the element's size on each side, so the tilted card and its glare fit (holospot's framing: the card at rest
     *   fills 70 % of the view, exactly the element's rect).
     * - `true`: the card stays facing the viewer, exactly where the element is, and the pose (pointer tilt, wobble,
     *   `pose`) turns the light rig the other way instead, as holospot's light-rig rotation does. The light meets the
     *   card as if it were tilted; the view does not change, so the rainbows travel about half as far.
     */
    flat: boolean;
    /**
     * Scale of the foil's structure, 0.25–4 (holo.spot `object.structureScale`; 1 = as designed): shards (`shatter`),
     * flakes (`nebula`), dots (`sparkle`), the paper's tooth and the logo's relief (`emboss`), the relief waves. Above
     * 1 they get smaller, below 1 larger. The gratings keep their pitch: the colours do not change, and the emboss
     * logo keeps its size and place (`emboss.x` / `emboss.y` / `emboss.width`, in px).
     */
    structureScale: number;
    /**
     * 4× multisampling of the card target (half float), as holospot renders. Smooths the card's outline when it
     * turns. Default `true`.
     */
    msaa: boolean;
};

/**
 * Shorthands for holo.spot scene settings: each writes its id(s) into `settings` where it is given, so later values
 * win, whichever way they are written. `null` removes the id (the default or the look's value applies again). Values
 * are checked like any setting: out of range is clamped, with a warning.
 */
export type HoloSceneParams = {
    /** Exposure in stops (EV), −3 to 3: `display.ev`. */
    exposure: number | null;
    /** Tone curve: `display.tone`. */
    tone: HoloTone | null;
    /** Glow around bright points: the share of the light spread into it, 0–0.1: `display.glare`. */
    glare: number | null;
    /** Film grain amplitude in display code values, 0–0.6; 0 turns it off: `grain.amount` and `grain.on`. */
    grain: number | null;
    /** Light rig: `studio.preset`. Its lights go over the earlier ones; single lights given later win. */
    studio: HoloStudio | null;
    /** The page behind the element, which the lighting adapts to: `"black"`, `"white"` or a `#rgb` / `#rrggbb` colour: `scene.background`, `scene.bgColor`. */
    background: string | null;
    /** The card's bow in mm, 0–2 (the sheet sags, so the light sweeps across it): `card.bow`. */
    bow: number | null;
    /** Rest pose in degrees, −35 to 35: `x` turns the face to the right, `y` tips the top edge toward the viewer: `motion.pose`. */
    pose: HoloVec2 | null;
    /**
     * holospot's camera lens: focal length in mm on a 36 × 24 mm sensor, 24–200: `dof.lens`. It sets the field of
     * view (62 mm is the 22° camera; shorter is wider with stronger perspective); there is no blur.
     */
    lens: number | null;
    /**
     * What the pointer does over the element: `"tilt"` tilts the card, `"light"` moves a flashlight over it, `"flash"`
     * puts the flashlight at the camera, `"none"` (the port's) ignores the pointer: `motion.pointer`.
     */
    pointer: HoloPointer | null;
    /** How far the pointer tilts the card, in degrees at the element's edge, 5–35: `motion.tiltRange`. */
    tiltRange: number | null;
    /** Slow automatic tilt while the pointer is away: `motion.wobble`. */
    wobble: boolean | null;
    /** The wobble's amplitude in degrees, 0–25: `motion.wobbleAmp`. */
    wobbleAmp: number | null;
};

/**
 * What the constructor and `setParams` take: any of the params, the scene shorthands, and `settings` as ids or a
 * holo.spot Copy settings blob.
 */
export type HoloInput = Partial<Omit<HoloParams, "settings">> &
    Partial<HoloSceneParams> & {
        settings?: HoloSettings | HoloCopyBlob;
    };

const DEFAULT_PARAMS: HoloParams = {
    material: "prism",
    settings: {},
    sizeMm: null,
    quality: "medium",
    mask: "alpha",
    ink: 0,
    flat: false,
    structureScale: 1,
    msaa: true,
};

const PARAM_KEYS = new Set(Object.keys(DEFAULT_PARAMS));
/** The emboss logo's placement: CSS px here, mm on holo.spot's card in a Copy settings blob. */
const MM_PLACEMENT = new Set(["emboss.x", "emboss.y", "emboss.width"]);

/** The ids a scene shorthand writes (`null` for each removes it). */
function sceneWrites(
    p: Partial<HoloSceneParams>,
): Record<string, HoloSettingValue | null> {
    const o: Record<string, HoloSettingValue | null> = {};
    const set = (
        v: HoloSettingValue | null | undefined,
        ...ids: readonly string[]
    ) => {
        if (v !== undefined) {
            for (const id of ids) {
                o[id] = v;
            }
        }
    };
    set(p.exposure, "display.ev");
    set(p.tone, "display.tone");
    set(p.glare, "display.glare");
    if (p.grain !== undefined) {
        o["grain.amount"] = p.grain;
        o["grain.on"] = p.grain === null ? null : p.grain > 0;
    }
    set(p.studio, "studio.preset");
    if (p.background !== undefined) {
        const b = p.background?.trim() ?? null;
        if (b === null || b === "black" || b === "white") {
            o["scene.background"] = b;
            o["scene.bgColor"] = null;
        } else {
            o["scene.background"] = "colour";
            o["scene.bgColor"] = b;
        }
    }
    set(p.bow, "card.bow");
    set(p.pose && { x: p.pose.x, y: p.pose.y }, "motion.pose");
    set(p.lens, "dof.lens");
    set(p.pointer, "motion.pointer");
    set(p.tiltRange, "motion.tiltRange");
    set(p.wobble, "motion.wobble");
    set(p.wobbleAmp, "motion.wobbleAmp");
    return o;
}

/** FNV-1a hash of bytes (32 bit, hex). */
function fnv1a(b: ArrayLike<number>): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < b.length; i++) {
        h ^= b[i];
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
}

/** An <img> (false where the DOM has none, such as a worker or a test). */
const isImgElement = (v: unknown): v is HTMLImageElement =>
    typeof HTMLImageElement !== "undefined" && v instanceof HTMLImageElement;

/** An image setting that is set: a non-empty URL, or an image object. */
const givenImage = (v: unknown): boolean =>
    (typeof v === "string" && v.trim() !== "") ||
    (!!v && typeof v === "object");

const isSettingValue = (v: unknown): v is HoloSettingValue =>
    typeof v === "number" ||
    typeof v === "boolean" ||
    typeof v === "string" ||
    (!!v &&
        typeof v === "object" &&
        typeof (v as HoloVec2).x === "number" &&
        typeof (v as HoloVec2).y === "number");

/**
 * Applies one input to the params, in place. A Copy settings blob replaces the settings (it is a whole scene) and
 * brings its material; everything else merges by id. A light rig (`studio.preset`) or a material preset select
 * (`emboss.stock`) writes its values where it is given, so ids given after it win and ids given before it lose.
 */
function applyInput(st: HoloParams, input: HoloInput): void {
    const { settings, ...rest } = input;
    const writes: Record<string, HoloSettingValue | null> = {};
    let next: Record<string, HoloSettingValue> = { ...st.settings } as Record<
        string,
        HoloSettingValue
    >;
    if (isCopyBlob(settings)) {
        next = {};
        const m = settings.material;
        if (rest.material === undefined && m !== undefined) {
            if (isMaterialName(m)) {
                st.material = m as HoloMaterial;
            } else {
                warnOnce(
                    `HoloEffect: the Copy settings' material "${m}" is not supported (one of ${MATERIAL_NAMES.join(", ")}); keeping "${st.material}".`,
                );
            }
        }
        for (const [id, v] of Object.entries(settings.values)) {
            if (
                (id === "emboss.logo" || id === "emboss.print") &&
                typeof v === "string" &&
                /^(\/logos\/|asset:)/.test(v.trim())
            ) {
                // holo.spot's own logo marks and its uploaded images do not come with a blob
                warnOnce(
                    `HoloEffect: ${id} "${v}" of a holo.spot Copy settings is holo.spot's own image, which HoloEffect does not include; ignored. Set ${id} to an image or a URL.`,
                );
            } else if (MM_PLACEMENT.has(id)) {
                // mm on holo.spot's 63 × 88 mm card; the port's are px of the element
                warnOnce(
                    `HoloEffect: ${id} of a holo.spot Copy settings is in mm on holo.spot's card; ignored (HoloEffect's is in CSS px).`,
                );
            } else if (isSettingValue(v)) {
                writes[id] = v;
            }
        }
        const pose = settings.pose;
        if (
            pose &&
            typeof pose.rx === "number" &&
            typeof pose.ry === "number"
        ) {
            writes["motion.pose"] = { x: pose.ry, y: pose.rx };
        }
        const ss = settings.values["object.structureScale"];
        if (rest.structureScale === undefined && typeof ss === "number") {
            st.structureScale = ss;
        }
    } else if (settings) {
        Object.assign(writes, settings);
    }
    Object.assign(writes, sceneWrites(rest));
    for (const [k, v] of Object.entries(rest)) {
        if (PARAM_KEYS.has(k) && v !== undefined) {
            (st as Record<string, unknown>)[k] = v;
        }
    }
    // presets first, so the ids given with them win
    const rig = writes["studio.preset"];
    if (typeof rig === "string" && STUDIO_PRESETS[rig]) {
        Object.assign(next, STUDIO_PRESETS[rig]);
    }
    for (const [id, options] of Object.entries(MATERIAL_PRESETS)) {
        const choice = writes[id];
        if (typeof choice === "string" && options[choice]) {
            Object.assign(next, options[choice]);
        }
    }
    for (const [id, v] of Object.entries(writes)) {
        if (v === null) {
            delete next[id];
        } else if (v !== undefined) {
            next[id] = v;
        }
    }
    st.settings = Object.freeze(next) as HoloSettings;
}

/**
 * A look holo.spot ships, as params: all of it in `settings` (lights `studio.*`, exposure, glare, grain, card finish,
 * pose, material values) plus its quality, so whatever comes after it wins.
 */
function lookParams(
    entries: readonly (readonly [
        string,
        {
            values: Readonly<Record<string, ParamValue>>;
            pose: { rx: number; ry: number };
        },
    ])[],
    quality: Exclude<HoloQuality, "auto">,
    material?: HoloMaterial,
): HoloInput {
    const values: Record<string, ParamValue> = {};
    for (const [, e] of entries) {
        Object.assign(values, e.values);
    }
    // the look's rest pose as holo.spot's motion.pose (x = ry, y = rx)
    const pose = entries[0][1].pose;
    values["motion.pose"] = { x: pose.ry, y: pose.rx };
    return Object.freeze({
        ...(material ? { material } : {}),
        quality,
        settings: Object.freeze(values) as HoloSettings,
    });
}

/** A holospot material starting point: `material` and its `settings`. */
export type HoloStartingPoint = Readonly<{
    material: HoloMaterial;
    settings: HoloSettings;
}>;

/** holospot's material "Starting points", by material and name (see `HoloEffect.startingPoints`). */
export type HoloStartingPoints = {
    readonly [M in keyof HoloStartingPointNames]: {
        readonly [N in HoloStartingPointNames[M]]: HoloStartingPoint;
    };
};

/** A look's entries: the foils share its scene values, each adds its own material values. */
const lookEntries = (name: "card" | "object") =>
    Object.entries(LOOKS[name]).filter(([m]) => m !== "emboss") as [
        string,
        {
            values: Readonly<Record<string, ParamValue>>;
            pose: { rx: number; ry: number };
        },
    ][];

const MM_PER_CSS_PX = 25.4 / 96;
const MATERIAL_PREFIXES = new Set<string>(MATERIAL_NAMES);
/** holospot's framing: the card at rest fills this share of the view (camera FOV 22°). */
const FRAMING = 0.7;
/** Vertical field of view [deg] of a focal length (holospot physics/lens.ts lensFovDeg: exactly 22° at 62 mm). */
function lensFovDeg(fMm: number): number {
    if (!(fMm > 0) || fMm === 62) {
        return 22;
    }
    return (2 * Math.atan(12 / fMm) * 180) / Math.PI;
}

/** Perspective-mode margin [physical px] on each side of the element. */
function perspectiveMargin(w: number, h: number): [number, number] {
    const k = (1 / FRAMING - 1) / 2;
    return [Math.ceil(w * k), Math.ceil(h * k)];
}
const MASKS: Record<HoloMask, number> = { alpha: 0, luma: 1, none: 2 };
/** uWave without relief waves. */
const NO_WAVES = new Float32Array(128);
const TONES = { neutral: 0, agx: 1, clamp: 2 } as const;

/** The output pass's grain uniforms (holospot render/grain.ts): off at amount 0. */
function grainUniforms(
    g: SceneState["grain"],
    dpr: number,
    timeS: number,
): Record<string, number> {
    if (!g.on || !(g.amount > 0)) {
        return {
            uGrain: 0,
            uGrainCell: 1,
            uGrainSeed: 0,
            uGrainRgb: 0,
            uGrainBg: 0,
        };
    }
    const seed = g.animated ? (((timeS * 120) % 512) + 512) % 512 : 0;
    return {
        uGrain: g.amount,
        uGrainCell: Math.max(g.sizePx * (dpr > 0 ? dpr : 1), 1),
        uGrainSeed: Number.isFinite(seed) ? seed : 0,
        uGrainRgb: g.colour === "rgb" ? 1 : 0,
        uGrainBg: g.onBackground ? 1 : 0,
    };
}

/** Row-major Mat3 → column-major Float32Array (GLSL mat3). */
function colMajor(m: Mat3, out = new Float32Array(9)): Float32Array {
    out[0] = m[0];
    out[1] = m[3];
    out[2] = m[6];
    out[3] = m[1];
    out[4] = m[4];
    out[5] = m[7];
    out[6] = m[2];
    out[7] = m[5];
    out[8] = m[8];
    return out;
}

const FRAG_DECODE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
${GLSL_DECODE_FLOAT24}
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(3 * t.x + 2, y), 0).rgb),
        1.0);
}
`;

/** Decodes a float24 byte image (4 values per output texel) into an RGBA float target: the LTC tables, the logo and the paper maps. */
const FRAG_DECODE_RGBA = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${GLSL_DECODE_FLOAT24}
${FRAG_DECODE_RGBA_MAIN}`;

const FRAG_ZERO = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// output.frag's helpers (tone curves, gamut map, sRGB transfer, dither, grain) with a main for the element: decode
// the card target, expose, tone-map, encode, then composite with the element by the foil mask.
const OUTPUT_HELPERS = outputFrag
    .slice(0, outputFrag.indexOf("void main()"))
    .replace("varying vec2 vUv;\n", "");
const FRAG_OUTPUT = `${FRAG_PREFIX}
${GLSL_COMMON}
${OUTPUT_HELPERS}
in vec2 uv;
in vec2 uvContent;
in vec2 uvSrc;
uniform sampler2D src;
uniform sampler2D uBase;   // 3d view: the element mapped onto the card
uniform int uMask;
uniform int uPersp;
void main() {
  // flat view: the card target covers the element; 3d view: the whole (grown) output
  vec2 hu = uPersp == 1 ? uv : uvContent;
  vec4 s = uPersp == 1 ? (uMask == 1 ? texture(uBase, uv) : vec4(0.0)) : texture(src, uvSrc);
  if (uPersp == 0 && (uvContent.x < 0.0 || uvContent.x > 1.0 || uvContent.y < 0.0 || uvContent.y > 1.0)) {
    gl_FragColor = s;
    return;
  }
  vec4 P = textureLod(tHdr, clamp(hu, 0.0, 1.0), 0.0);
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 G = uGW0 * textureLod(tG0, hu * uG0Scale, 0.0).rgb;   // premultiplied linear glare
  vec3 card  = toDisplay(((1.0 - uGlare) * c + uGlare * G) * uExposure);
  vec3 spill = toDisplay(uGlare * G * uExposure);
  // The foil's coverage (the mask, applied by the material pass) is the card target's alpha, then the foil goes over
  // what is left of the element (luma mask) with the glare spill on it. holospot screens the spill onto the page: in
  // premultiplied output that is the spill with alpha = its largest channel (exact on black, invisible on white).
  float cov = a;
  vec4 base = uMask == 1 ? s : vec4(0.0);
  vec3 se = srgbOETF(spill);
  vec4 spillP = vec4(se, max3(se));
  base = spillP + (1.0 - spillP.a) * base;
  vec3 enc = srgbOETF(card);
  // A4.1 film grain in display space, after the tone curve and before the dither (output.frag).
  if (uGrain > 0.0) {
    vec2 fc = gl_FragCoord.xy;
    vec3 n = uGrainRgb == 1
      ? vec3(grainNoise(fc, uGrainSeed), grainNoise(fc, uGrainSeed + 171.0), grainNoise(fc, uGrainSeed + 342.0))
      : vec3(grainNoise(fc, uGrainSeed));
    enc += uGrain * n;
    if (uGrainBg == 1) base.rgb = clamp(base.rgb + uGrain * n * base.a, 0.0, 1.0);
  }
  if (cov > 0.0 || max3(spill) > 1e-4) enc += triangularDither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(clamp(enc, 0.0, 1.0), 1.0) * cov + base * (1.0 - cov);
}
`;

/**
 * Holographic foil: the diffraction foils of holo.spot (Prism Rainbow and friends) on an element, ported from
 * [holospot](https://github.com/dmitrykurash/holospot) (MIT). The element is lit as a card by holo.spot's spectral
 * studio lights and tilts toward the pointer. Settings use holo.spot's ids, so a look copied from holo.spot carries
 * over.
 *
 * @example
 * ```ts
 * vfx.add(el, {
 *     effect: new HoloEffect(HoloEffect.looks.card, {
 *         material: "prism",
 *         settings: { "prism.pitch": 1200, "prism.pattern": "radial" },
 *     }),
 * });
 * ```
 *
 * @remarks
 * ### The model
 *
 * The element is a card of real size (`sizeMm`, else its CSS size at 96 dpi), lit by holo.spot's studio rig and
 * seen by holospot's camera (`lens`). By default the card turns in 3D with the pose (pointer tilt, idle wobble,
 * `pose`), and the output grows by about 21 % per side so the turned card and its glare fit. With `flat: true` the
 * card stays in place and the light rig turns the other way instead.
 *
 * holospot's physics is kept: the grating equation, order efficiencies, η renormalisation, material- and
 * SPD-convolved spectral tables, LTC rect lights, the studio environment, coat, wear, glare, grain and tone curves.
 * Its GLSL is used as is, without comments. What differs:
 *
 * - The environment is a prefiltered octahedral atlas (an importance-sampled GGX lobe per level) instead of three's
 *   PMREM.
 * - The pose is the port's: a spring toward the rest pose plus the pointer tilt, and an idle wobble.
 * - The foil's coverage comes from the element (`mask`), and `ink` tints the foil with its colours.
 *
 * ### Inputs and settings
 *
 * The constructor takes any number of inputs and `setParams` applies one more. They apply in order, and later
 * values win. `settings` are holo.spot ids (`HoloSettingId`), merged by id. `null` removes an id, so the default or
 * the look's value applies again. `setParams(input, { resetSettings: true })` starts the settings over.
 *
 * - **Looks:** `HoloEffect.looks` are the looks holo.spot ships: their scene in `settings`, and the quality holospot
 *   ships each with. Pass a look as its own argument, not spread into an object that has its own `settings`.
 * - **Starting points:** `HoloEffect.startingPoints` are holospot's material starting points.
 * - **Presets:** a light rig (`studio.preset`) or `emboss.stock` writes its values where it is given. Ids given
 *   after it win; ids given before it lose.
 * - **Copy settings:** a holo.spot "Copy settings" blob (`HoloCopyBlob`) replaces the settings and brings its
 *   material, pose and structure scale.
 * - **Checks:** values are checked against holo.spot's ranges. Out-of-range values are clamped, and bad values
 *   and unknown ids are dropped, each with one console warning. holo.spot ids the port does not render (depth of
 *   field blur, bump maps, card borders) warn when set away from holospot's default.
 *
 * The scene shorthands write holo.spot ids with holospot's units and ranges:
 *
 * | Shorthand | holo.spot id |
 * | --- | --- |
 * | `exposure` (EV, ±3), `tone` | `display.ev`, `display.tone` |
 * | `glare` (0–0.1), `grain` (0–0.6, 0 = off) | `display.glare`, `grain.amount` |
 * | `studio` | `studio.preset` |
 * | `background` (`black`, `white`, `#rgb`, `#rrggbb`) | `scene.background`, `scene.bgColor` |
 * | `bow` (mm, 0–2), `pose` (±35°) | `card.bow`, `motion.pose` |
 * | `lens` (mm, 24–200: the field of view, no blur) | `dof.lens` |
 * | `pointer`, `tiltRange` (5–35°) | `motion.pointer`, `motion.tiltRange` |
 * | `wobble`, `wobbleAmp` (0–25°) | `motion.wobble`, `motion.wobbleAmp` |
 *
 * ### Foil Emboss
 *
 * `material: "emboss"` is a paper card with a foil logo pressed into it, and the whole element is the paper.
 *
 * - **Logo:** `emboss.logo` takes a URL, an `<img>`, a canvas or an `ImageBitmap`. Without one there is no logo.
 *   The logo is cut into foil / no foil: `mask` picks how the image is read (`"alpha"` or `"luma"`), and
 *   `emboss.threshold` sets where it is cut. A photo becomes a one-tone stamp.
 * - **Placement:** in CSS px of the element. `emboss.x` and `emboss.y` are the logo's centre from the top left,
 *   and `emboss.width` its width. Unset, the logo is centred at 36/63 of the element's width.
 * - **Print:** by default the element is printed on the paper. `emboss.print` prints an image instead, fitted like
 *   `background-size: cover`. While it loads, and if it fails, the paper is plain.
 * - **The element as the logo:** `"emboss.logo": "element"` presses the element itself in foil, 1:1. It is read
 *   back once, and again on a resize or when `emboss.logo` is given again, so it suits a still element. The ground
 *   is `emboss.print` or `emboss.paperColour`, and transparent without both, so CSS can show what is behind.
 * - **Loading:** the logo, paper and print load in the background. `ready` resolves after a frame with them, and
 *   `errors` lists what failed (a cross-origin image needs CORS).
 *
 * ### Code loading
 *
 * Each material's code (its shaders; for `emboss` also the logo and paper builders) is a separate chunk, loaded
 * when the material is first used. `init` waits for it. After `setParams({ material })` the effect keeps drawing
 * the previous material until the new one has loaded, and `ready` waits for it. `HoloEffect.preload(...)` loads
 * materials ahead. `@vfx-js/effects/holo/static` exports the same class with every material built in, for
 * CommonJS, pages without a bundler, or when a material change must not wait.
 *
 * ### Differences from holo.spot
 *
 * - **Port-only params:** `flat`, `mask`, `ink`, `sizeMm`, `msaa`, the `"none"` pointer, `emboss.threshold` and the
 *   element as the emboss logo.
 * - **Changed defaults:** grain is 0.07 (the value holo.spot's looks use), and there is no default emboss logo
 *   (holo.spot's marks are not included). A blob's references to holo.spot's marks or uploaded images
 *   (`emboss.logo`, `emboss.print`) are ignored with a warning.
 * - **Changed units:** the emboss placement is in px, not mm on holo.spot's 63 × 88 mm card. A blob's mm placement
 *   is ignored.
 * - **Different names:** `studio` instead of `lights`, `startingPoints`, and `flat`, because holospot uses
 *   `lights` and `View` for other things.
 * - **Not ported:** the Volume Hologram and the emboss hologram stickers, multi-element emboss cards
 *   (`emboss.doc`), depth of field blur, bump maps, and card borders and thickness.
 *
 * Rendered next to holospot in Chromium, the foils differ by about 1 per channel (0–255) on average. Glitter
 * glints differ per pixel, but match within 1 after a slight blur. holospot's and three.js's MIT notices ship in
 * the package's `THIRD_PARTY_NOTICES.md`.
 */
export class HoloEffect implements Effect {
    #p: HoloParams = { ...DEFAULT_PARAMS };

    #resolved: Resolved | null = null;
    #scene: SceneState | null = null;
    #dirty = true;

    #atlas: SpectralAtlas | null = null;
    #atlasUploaded = -1;
    #bytesCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    #bytesTex: EffectTexture | null = null;
    #conv: EffectRenderTarget | null = null;
    #cum: EffectRenderTarget | null = null;
    #hdr: EffectRenderTarget | null = null;
    #base: EffectRenderTarget | null = null;
    #viewProj = new Float32Array(16);
    #black: EffectRenderTarget | null = null;
    #env: EffectRenderTarget | null = null;
    #ltcTex: EffectTexture | null = null;
    #ltc1: EffectRenderTarget | null = null;
    #ltc2: EffectRenderTarget | null = null;
    #ltcReady = false;
    #glare = new HoloGlare();
    // Foil Emboss: the logo distance field and the paper maps (built on demand)
    #emboss: EmbossAssets | null = null;
    #logoRt: EffectRenderTarget | null = null;
    #logoMap: [number, number, number, number] = [1.28, 1.28, 1 / 800, 1];
    #logoUp = -1;
    #paperRt: { mom: EffectRenderTarget; aux: EffectRenderTarget } | null =
        null;
    #paperUp = -1;
    #envDrawn: EnvLevels | null = null;
    #blobs = cameraSideBlobs();
    #waves: WaveSet | null = null;
    #blackReady = false;

    #pose = new PoseSpring();
    #lights = emptyLightSet();
    #prevLightPos = new Float32Array(12);
    #cardRot = new Float32Array(9);
    #prevCardRot = new Float32Array(9);
    #camPos: Vec3 = [0, 0, 0.4];
    #cardSizeMm: [number, number] = [63, 88];
    /** The element's CSS size [px] (the emboss logo's placement frame). */
    #elemCss: [number, number] = [238, 333];
    /** The card's surface domain [mm]: its size × `structureScale` (the structure's frame, not the geometry's). */
    #domainMm: [number, number] = [63, 88];
    /** The drawn card's rotation (3d view: the pose; flat: identity). */
    #visRot = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    /** Flat view: the inverse of the light rig's rotation (= the pose), row-major; null in 3d. */
    #rigInv: Mat3 | null = null;
    #eta: { ord: Float32Array; mir: Float32Array; env: Float32Array } | null =
        null;
    #matUniforms: Uniforms = {};
    /** Per-frame uniform buffers, reused. */
    #binLam = new Float32Array(8);
    #binW = new Float32Array(72);
    #frag = "";
    #mouseStart: readonly [number, number] | null = null;
    #pointerSeen = false;
    #started = false;

    /**
     * Takes any number of inputs, applied in order: later ones win, and `settings` merge by id. So a look, a material
     * starting point and your own values compose:
     * `new HoloEffect(HoloEffect.looks.card, HoloEffect.startingPoints.prism.compactDisc, { exposure: 1 })`.
     */
    constructor(...inputs: HoloInput[]) {
        for (const input of inputs) {
            applyInput(this.#p, input);
        }
    }

    /** The params in effect (read-only; change them with `setParams`). Scene shorthands are in `settings`. */
    get params(): Readonly<HoloParams> {
        return this.#p;
    }

    /**
     * Applies an input over the current params, as one more constructor argument would: later values win, `settings`
     * merge by id. With `{ resetSettings: true }` the settings start over from holo.spot's defaults first (to switch
     * looks, for example).
     */
    setParams(input: HoloInput, opts?: { resetSettings?: boolean }): void {
        if (opts?.resetSettings) {
            this.#p.settings = {};
        }
        applyInput(this.#p, input);
        this.#dirty = true;
        this.#defFailed = null; // a material that failed to load is tried again
        // the element as the logo is read again when emboss.logo is given again (after the element changed)
        const settings = input.settings as Record<string, unknown> | undefined;
        if (settings && "emboss.logo" in settings) {
            this.#capGen++;
        }
    }

    /**
     * Resolves once the effect has drawn a frame with everything it loads in place: the material's code, and for
     * `emboss` the logo, the paper maps and `emboss.print`, which load in the background (until then the card is
     * drawn without them). A load that fails does not reject it; see `errors`. It also resolves when the effect is
     * disposed.
     */
    get ready(): Promise<void> {
        if (this.#readyNow()) {
            return Promise.resolve();
        }
        return new Promise((resolve) => this.#readyWaiters.push(resolve));
    }

    /** Loading errors (a logo that could not be fetched or read, …), newest last; cleared when the input changes. */
    get errors(): readonly string[] {
        return [
            ...(this.#defError ? [this.#defError] : []),
            ...(this.#emboss?.errors ?? []),
            ...(this.#printError ? [this.#printError] : []),
        ];
    }

    #readyWaiters: (() => void)[] = [];
    #drawnOnce = false;
    #readyNow(): boolean {
        return (
            this.#drawnOnce &&
            !this.#dirty &&
            // the material asked for is drawn, or failed to load (see errors)
            (this.#renderDef?.id === this.#p.material ||
                this.#defFailed === this.#p.material) &&
            (this.#p.material !== "emboss" ||
                (!this.#emboss?.busy && !this.#printBusy && !this.#capPending))
        );
    }
    #settleReady(): void {
        if (this.#readyWaiters.length > 0 && this.#readyNow()) {
            const w = this.#readyWaiters;
            this.#readyWaiters = [];
            for (const f of w) {
                f();
            }
        }
    }

    /**
     * The looks holo.spot ships, as inputs: `card` (its holographic card), `object` (its 3D object), `image` (its
     * Foil Emboss paper card; sets `material: "emboss"`). Each sets the scene (lights, pose, exposure, …, all in
     * `settings`) and the `quality` holospot ships it with. Without one, the effect starts from holo.spot's parameter
     * defaults. Pass a look as its own argument, not spread, so the `settings` after it merge by id.
     *
     * @example
     * ```ts
     * new HoloEffect(HoloEffect.looks.card, { material: "shatter", studio: "softbox" });
     * ```
     */
    static readonly looks: Readonly<{
        card: HoloInput;
        object: HoloInput;
        image: HoloInput;
    }> = Object.freeze({
        card: lookParams(lookEntries("card"), "medium"),
        object: lookParams(lookEntries("object"), "low"),
        image: lookParams(
            [
                [
                    "emboss",
                    LOOKS.card.emboss as NonNullable<
                        (typeof LOOKS.card)["emboss"]
                    >,
                ],
            ],
            "medium",
            "emboss",
        ),
    });

    /**
     * The "Starting points" of holospot's material docs, as inputs (`material` and `settings`). They set the material
     * only, not the lights or the pose, so combine them with a look:
     * `new HoloEffect(HoloEffect.looks.card, HoloEffect.startingPoints.prism.compactDisc)`.
     */
    static readonly startingPoints: HoloStartingPoints = Object.freeze(
        Object.fromEntries(
            Object.entries(STARTING_POINTS).map(([m, ps]) => [
                m,
                Object.freeze(
                    Object.fromEntries(
                        Object.entries(ps).map(([name, settings]) => [
                            name,
                            Object.freeze({
                                material: m as HoloMaterial,
                                settings: Object.freeze({
                                    ...settings,
                                }) as HoloSettings,
                            }),
                        ]),
                    ),
                ),
            ]),
        ),
    ) as HoloStartingPoints;

    /**
     * The holo.spot settings a material understands (its own ids, then the scene's), for building controls. Ids, ranges
     * and meanings follow holospot's docs (`docs/materials/<material>.md`, `docs/scene-settings.md`).
     */
    static settingSpecs(material: HoloMaterial): readonly HoloSettingSpec[] {
        const own = (id: string) => id.startsWith(`${material}.`);
        const scene = (id: string) => !MATERIAL_PREFIXES.has(id.split(".")[0]);
        const specs = PARAM_SPECS.filter((p) => own(p.id) || scene(p.id));
        return [
            ...specs.filter((p) => own(p.id)),
            ...specs.filter((p) => !own(p.id)),
        ] as readonly HoloSettingSpec[];
    }

    /**
     * The settings in effect, by holo.spot id: holo.spot's defaults with `settings` over them, checked (clamped to
     * the ranges, invalid values dropped). Useful to show a control's current value.
     */
    resolvedSettings(): Readonly<Record<string, HoloSettingValue | HoloLogo>> {
        // the settings alone: no material code is needed (it may not be loaded yet)
        const r = resolveSettings(
            this.#p.material,
            "plain",
            this.#p.settings as Readonly<Record<string, ParamValue>>,
        );
        // the rest pose in effect (motion.pose / pose when given): x = ry, y = rx
        return { ...r.values, "motion.pose": { x: r.pose.ry, y: r.pose.rx } };
    }

    /** The tier `quality: "auto"` picks, detected once from the GL context. */
    #autoTier: Tier | null = null;
    #tier(): TierConfig {
        const q = this.params.quality;
        const t = q === "auto" ? (this.#autoTier ?? "medium") : q;
        return TIERS[t] ?? TIERS.medium;
    }

    #restoreUnsub: (() => void) | null = null;

    /**
     * Loads materials' code ahead of use, so switching `material` later draws at once. HoloEffect loads a material's
     * code (its shaders, and for `emboss` the logo and paper builders) when it is first used; `@vfx-js/effects/holo/static`
     * has every material built in instead.
     */
    static preload(...materials: HoloMaterial[]): Promise<void> {
        return Promise.all(materials.map(loadMaterial)).then(() => {});
    }

    /** Counts init / dispose, so an init that awaited across a dispose stops. */
    #life = 0;

    async init(ctx: EffectContext): Promise<void> {
        const life = ++this.#life;
        // the material's code, before the first frame
        await this.#requestDef(this.#p.material);
        if (life !== this.#life) {
            return; // disposed (or initialised again) while loading
        }
        // after a context loss the render targets come back empty (wrapped canvases are re-uploaded): fill them
        // again from the CPU-side data, which survives
        this.#restoreUnsub = ctx.onContextRestored(() => {
            this.#autoTier = detectTier(ctx.gl);
            this.#atlasUploaded = -1;
            this.#ltcReady = false;
            this.#blackReady = false;
            this.#envDrawn = null;
            this.#logoUp = this.#paperUp = -1;
            this.#capKey = "";
            this.#capInFlight = false;
            this.#capToken++;
        });
        this.#setup(ctx);
    }

    #setup(ctx: EffectContext): void {
        this.#autoTier = detectTier(ctx.gl);
        this.#dirty = true; // resolve again: the new atlas takes the material's tint
        this.#atlas = new SpectralAtlas();
        const canvas = this.#makeCanvas(ATLAS.imageWidth, ATLAS.imageHeight);
        this.#bytesCanvas = canvas;
        this.#bytesTex = ctx.wrapTexture(canvas, {
            autoUpdate: false,
            filter: "nearest",
        });
        const tableOpts = {
            size: [ATLAS.width, ATLAS.height] as const,
            float: true,
            filter: "linear" as const,
        };
        this.#conv = ctx.createRenderTarget(tableOpts);
        this.#cum = ctx.createRenderTarget(tableOpts);
        this.#ensureHdr(ctx);
        this.#black = ctx.createRenderTarget({ size: [1, 1], float: true });
        const ltcCanvas = this.#makeCanvas(LTC_IMAGE.width, LTC_IMAGE.height);
        this.#ctx2d(ltcCanvas)?.putImageData(
            new ImageData(ltcImageBytes(), LTC_IMAGE.width, LTC_IMAGE.height),
            0,
            0,
        );
        this.#ltcTex = ctx.wrapTexture(ltcCanvas, {
            autoUpdate: false,
            filter: "nearest",
        });
        const ltcOpts = {
            size: [LTC_SIZE, LTC_SIZE] as const,
            float: true,
            filter: "linear" as const,
        };
        this.#ltc1 = ctx.createRenderTarget(ltcOpts);
        this.#ltc2 = ctx.createRenderTarget(ltcOpts);
        this.#env = ctx.createRenderTarget({
            size: [ENV_SIZE, ENV_SIZE * ENV_LEVELS],
            float: true,
            filter: "linear",
        });
    }

    #samples: 1 | 4 = 1;

    /** The card target (float, the output's size) and the 3d view's base layer, with `msaa` (4× half float). */
    #ensureHdr(ctx: EffectContext): void {
        const samples = this.params.msaa ? 4 : 1;
        if (this.#hdr && this.#samples === samples) {
            return;
        }
        this.#hdr?.dispose();
        this.#base?.dispose();
        this.#base = null;
        this.#hdr = ctx.createRenderTarget({
            float: true,
            filter: "nearest",
            samples,
        });
        this.#samples = samples;
    }

    #ensureBase(ctx: EffectContext): EffectRenderTarget {
        this.#base ??= ctx.createRenderTarget({ samples: this.#samples });
        return this.#base;
    }

    /** Perspective mode grows the output so the tilted card and its glare fit. */
    outputRect(
        dims: EffectDims,
    ): readonly [number, number, number, number] | undefined {
        if (this.params.flat) {
            return undefined;
        }
        const [w, h] = dims.elementPixel;
        const [mx, my] = perspectiveMargin(w, h);
        return [-mx, -my, w + 2 * mx, h + 2 * my];
    }

    #makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
        const c =
            typeof document !== "undefined"
                ? document.createElement("canvas")
                : new OffscreenCanvas(w, h);
        c.width = w;
        c.height = h;
        return c;
    }

    #ctx2d(
        c: HTMLCanvasElement | OffscreenCanvas,
    ): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
        return c.getContext("2d") as
            | CanvasRenderingContext2D
            | OffscreenCanvasRenderingContext2D
            | null;
    }

    /** The material code the current render state was built with. */
    #renderDef: MaterialDef | null = null;
    #defError: string | null = null;
    /** The material whose code is loading, and the one that failed to load (tried again on the next setParams). */
    #defPending: { m: HoloMaterial; p: Promise<void> } | null = null;
    #defFailed: HoloMaterial | null = null;

    /** Loads a material's code once; a failure warns once, is listed in `errors`, and the effect keeps drawing what it drew. */
    #requestDef(m: HoloMaterial): Promise<void> {
        if (this.#defPending?.m === m) {
            return this.#defPending.p;
        }
        const p = loadMaterial(m)
            .then(
                () => {
                    this.#defError = null;
                    this.#defFailed = null;
                },
                (e: unknown) => {
                    this.#defFailed = m;
                    this.#defError = `HoloEffect: could not load the "${m}" material: ${e instanceof Error ? e.message : String(e)}`;
                    console.warn(this.#defError);
                },
            )
            .finally(() => {
                if (this.#defPending?.p === p) {
                    this.#defPending = null;
                }
                this.#dirty = true; // resolve again: with the new material, or settle on the failure
            });
        this.#defPending = { m, p };
        return p;
    }

    #resolve(): void {
        const p = this.#p;
        let def = loadedMaterial(p.material);
        if (!def) {
            // not loaded yet (or failed): load it, and meanwhile draw the material drawn so far with the current settings
            if (this.#defFailed !== p.material) {
                void this.#requestDef(p.material);
            }
            def = this.#renderDef ?? undefined;
            if (!def) {
                return; // nothing drawn yet
            }
        }
        this.#renderDef = def;
        this.#resolved = resolveSettings(
            def.id as HoloMaterial,
            "plain",
            p.settings as Readonly<Record<string, ParamValue>>,
        );
        this.#scene = sceneStateFrom(this.#resolved.values);
        this.#matUniforms = def.uniforms(this.#resolved.values);
        this.#atlas?.setTint(def.gratingSummary(this.#resolved.values).tint);
        const tier = this.#tier();
        const c = this.#scene.card;
        this.#waves = buildWaves(
            def.relief(this.#resolved.values),
            {
                emboss: c.emboss,
                pitchMm: c.embossPitchMm,
                heightUm: c.embossHeightUm,
                layer: c.embossLayer,
            },
            tier.waves,
        );
        this.#frag = assembleMaterial(
            {
                ...tier.defines,
                ...def.defines(tier),
                [`MATERIAL_${def.id.toUpperCase()}`]: 1,
                ...(this.#clearPaper() ? { HOLO_CLEAR_PAPER: 1 } : {}),
                NSPD: 5,
                MAX_LIGHTS: 4,
                DEBUG_VIEW: 0,
            },
            def.extraChunks,
            def.fragmentMain,
        );
        this.#dirty = false;
    }

    /** holospot's camera: vertical FOV from the lens, at (0, 0, D) looking down −Z (column-major projection × view). */
    #setViewProj(aspect: number, D: number, tanHalf: number): void {
        const f = 1 / tanHalf;
        const near = 0.1 * D;
        const far = 10 * D;
        const a = (far + near) / (near - far);
        const b = (2 * far * near) / (near - far);
        const m = this.#viewProj;
        m.fill(0);
        m[0] = f / aspect;
        m[5] = f;
        m[10] = a;
        m[11] = -1;
        m[14] = a * -D + b; // view = translate(0, 0, −D)
        m[15] = D;
    }

    update(ctx: EffectContext): void {
        if (this.#dirty || !this.#resolved) {
            this.#resolve();
        }
        const r = this.#resolved;
        const s = this.#scene;
        if (!r || !s) {
            return;
        }
        const [ew, eh] = ctx.dims.element;
        // a zero-size element (not laid out yet, display: none) is treated as 1 px, so the geometry stays finite
        const pw = Math.max(ctx.dims.elementPixel[0], 1);
        const ph = Math.max(ctx.dims.elementPixel[1], 1);
        const w = Math.max(ew, 1);
        const h = Math.max(eh, 1);
        const given = this.params.sizeMm;
        const largest =
            given !== null && Number.isFinite(given) && given > 0
                ? given
                : Math.max(w, h) * MM_PER_CSS_PX;
        const k = largest / Math.max(w, h);
        this.#cardSizeMm = [w * k, h * k];
        this.#elemCss = [w, h];
        // the surface's domain, as holospot's models.ts: size × structureScale (a larger one lays more structure over the card)
        const ss = Math.min(Math.max(this.params.structureScale || 1, 0.25), 4);
        this.#domainMm = [w * k * ss, h * k * ss];
        const fov = lensFovDeg(s.lensMm);
        const tanHalf = Math.tan((fov * Math.PI) / 360);
        const view3d = !this.params.flat;
        let D = framingDistance(
            w / h,
            this.#cardSizeMm[0] / 2000,
            this.#cardSizeMm[1] / 2000,
            fov,
        );
        if (view3d) {
            // the card at rest maps exactly onto the element inside the grown output
            const [mx, my] = perspectiveMargin(pw, ph);
            const oh = ph + 2 * my;
            D = (this.#cardSizeMm[1] / 2000 / tanHalf) * (oh / Math.max(ph, 1));
            this.#setViewProj((pw + 2 * mx) / Math.max(oh, 1), D, tanHalf);
        }
        this.#camPos = [0, 0, D];

        // pointer: normalised element position, active once the pointer has moved and while it is over the element
        if (!this.#mouseStart) {
            this.#mouseStart = ctx.mouseViewport;
        } else if (
            ctx.mouseViewport[0] !== this.#mouseStart[0] ||
            ctx.mouseViewport[1] !== this.#mouseStart[1]
        ) {
            this.#pointerSeen = true;
        }
        const nx = (ctx.mouse[0] / Math.max(pw, 1)) * 2 - 1;
        const ny = (ctx.mouse[1] / Math.max(ph, 1)) * 2 - 1;
        const over =
            this.#pointerSeen && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;

        const m = s.motion;
        const dt = Math.min(Math.max(ctx.deltaTime, 0), 0.1);
        let target = { rx: r.pose.rx, ry: r.pose.ry };
        if (m.pointer === "tilt" && over) {
            target = {
                rx: r.pose.rx - ny * m.tiltRangeDeg,
                ry: r.pose.ry + nx * m.tiltRangeDeg,
            };
        } else if (m.wobble) {
            const o = wobbleOffset(ctx.time, m.wobbleAmpDeg);
            target = { rx: r.pose.rx + o.rx, ry: r.pose.ry + o.ry };
        }
        this.#pose.step(target, dt);

        // 3d: the card turns. flat: the card stays and the light rig turns the other way (holospot's Q_L).
        const pose = eulerXYZ(this.#pose.rx, this.#pose.ry, 0);
        const rot: Mat3 = view3d ? pose : [1, 0, 0, 0, 1, 0, 0, 0, 1];
        const rig = view3d
            ? { x: 0, y: 0, z: 0, w: 1 }
            : inversePoseQuat(this.#pose.rx, this.#pose.ry);
        this.#rigInv = view3d ? null : pose; // mat3(conj(Q_L)) for the environment
        if (this.#started) {
            this.#prevCardRot.set(this.#cardRot);
            this.#prevLightPos.set(this.#lights.pos);
        }
        colMajor(rot, this.#cardRot);
        colMajor(rot, this.#visRot);

        const pad = over ? { x: nx, y: ny } : { x: 0, y: 0 };
        computeLights(
            s.studio,
            {
                mode: m.pointer === "none" ? "tilt" : m.pointer,
                pad,
            },
            s.background,
            rig,
            this.#camPos,
            this.#lights,
        );
        for (let i = 0; i < 4; i++) {
            if (this.#lights.type[i] !== 0) {
                this.#atlas?.ensureLayer(
                    SPD_IDS[this.#lights.spd[i]] ?? "equal",
                );
            }
        }
        if (!this.#started) {
            this.#prevCardRot.set(this.#cardRot);
            this.#prevLightPos.set(this.#lights.pos);
            this.#started = true;
        }
        const embossDef = this.#renderDef?.emboss;
        if (embossDef) {
            this.#emboss ??= embossDef.createAssets();
            // a URL, or an image given in settings (kept by reference); "element" is read back in render
            const logo = r.values["emboss.logo"];
            if (logo !== "element") {
                this.#capHash = ""; // the next element readback installs its logo again
                if (this.#capPending || this.#capInFlight) {
                    // a readback of the element (still blank, or on its way) is no longer wanted
                    this.#capPending = false;
                    this.#capInFlight = false;
                    this.#capToken++;
                    this.#capKey = "";
                    this.#capTries = 0;
                }
                this.#emboss.setLogo(
                    logo as unknown as HoloLogo | undefined,
                    this.#logoReadOpts("ink"),
                );
            }
            this.#emboss.setPaper(embossDef.paperKey(r.values));
        }
        this.#eta = etaFrame(
            (this.#renderDef as MaterialDef).gratingSummary(r.values),
            this.#lights,
            rot,
            this.#camPos,
        );
    }

    render(ctx: EffectContext): void {
        const atlas = this.#atlas;
        const s = this.#scene;
        if (
            !atlas ||
            !s ||
            !this.#hdr ||
            !this.#conv ||
            !this.#cum ||
            !this.#black ||
            !this.#bytesTex ||
            !this.#eta
        ) {
            ctx.blit(ctx.src, ctx.target);
            return;
        }
        this.#ensureHdr(ctx);
        if (!this.#blackReady) {
            ctx.draw({
                frag: FRAG_ZERO,
                vert: PLAIN_VERT,
                target: this.#black,
            });
            this.#blackReady = true;
        }
        if (!this.#ltcReady && this.#ltcTex && this.#ltc1 && this.#ltc2) {
            for (const [target, row] of [
                [this.#ltc1, 0],
                [this.#ltc2, LTC_SIZE],
            ] as const) {
                ctx.draw({
                    frag: FRAG_DECODE_RGBA,
                    vert: PLAIN_VERT,
                    target,
                    uniforms: { uBytes: this.#ltcTex, uRowOffset: row },
                });
            }
            this.#ltcReady = true;
        }
        if (this.#atlasUploaded !== atlas.version) {
            this.#uploadAtlas(ctx, atlas);
        }
        const tone = backgroundTone(s.background, s.bgColor);
        const levels = envLevels(s.studio.ambient, tone);
        if (this.#env && !sameLevels(this.#envDrawn, levels)) {
            ctx.draw({
                frag: FRAG_ENV_PREFILTER,
                vert: PLAIN_VERT,
                target: this.#env,
                uniforms: {
                    uRims: levels.rims,
                    uFill: levels.fill,
                    uScrim: levels.scrim,
                    uCameraSide: levels.cameraSide,
                    uCameraTexture: levels.cameraTexture,
                    uBehind: levels.behind,
                    uBlobs: this.#blobs.blobs,
                    uBlobNorm: this.#blobs.norm,
                },
            });
            this.#envDrawn = levels;
        }
        const waves = this.#waves;

        const tier = this.#tier();
        const tr = tier.trips;
        const L = this.#lights;
        const bins = atlas.bins[tier.defines.NB === 6 ? 6 : 8];
        // the uniforms take 8 bins; the low tier's 6 leave the rest zero
        const binLam = this.#binLam.fill(0);
        binLam.set(bins.lambda);
        const binW = this.#binW.fill(0);
        binW.set(bins.W);

        const emb = this.#renderDef?.emboss ? this.#embossUniforms(ctx) : {};
        const persp = !this.params.flat;
        const card = {
            uCardRot: this.#cardRot,
            uPrevCardRot: this.#prevCardRot,
            uCardSizeMm: this.#domainMm,
            uCardWorldMm: this.#cardSizeMm,
            uVisRot: this.#visRot,
            uViewProj: this.#viewProj,
            uPersp: persp ? 1 : 0,
        };
        // the emboss paper is the whole card
        const mask =
            this.#renderDef?.id === "emboss"
                ? MASKS.none
                : (MASKS[this.params.mask] ?? 0);
        if (persp) {
            ctx.clear(this.#hdr);
            if (mask === 1) {
                const base = this.#ensureBase(ctx);
                ctx.clear(base);
                ctx.draw({
                    frag: FRAG_CARD_BASE,
                    vert: CARD_VERT,
                    target: base,
                    uniforms: { ...card, src: ctx.src },
                });
            }
        }
        ctx.draw({
            frag: this.#frag,
            vert: CARD_VERT,
            target: this.#hdr,
            uniforms: {
                ...this.#matUniforms,
                ...emb,
                ...card,
                cameraPosition: [...this.#camPos],
                uWrapMm: [0, 0],
                uBowMm: s.card.bowMm,
                uBowAxis: s.card.bowAxis === "along" ? 1 : 0,
                uLightType: L.type,
                uLightOrder: L.order,
                uLightPos: L.pos,
                uPrevLightPos: this.#prevLightPos,
                uLightU: L.u,
                uLightW: L.w,
                uLightRadius: L.radius,
                uLightRad: L.rad,
                uLightSpd: L.spd,
                uLightRGB: L.rgb,
                uEtaOrd: this.#eta.ord,
                uEtaMir: this.#eta.mir,
                uEtaEnv: this.#eta.env,
                uKeyLight: L.key,
                uMaxOrder: tr.maxOrder,
                uGhB: tr.ghB,
                uVorR: tr.vorR,
                uFlakeR: tr.flakeR,
                uBCells: tr.bCells,
                uBBins: tr.bBins,
                uBLevels: tr.bLevels,
                uEnv: this.#env ?? this.#black,
                uEnvMaxLod: ENV_LEVELS - 1,
                uEnvIntensity: 1,
                uEnvRot: envRotation(
                    s.studio.ambient.rotationDeg,
                    this.#rigInv ?? undefined,
                ),
                uEnvUniform: 0,
                uCmfConv: this.#conv,
                uCmfCum: this.#cum,
                uSpecProj: atlas.specProj,
                uBinLam: binLam,
                uBinW: binW,
                uBinWidth: bins.width,
                uLtc1: this.#ltc1 ?? this.#black,
                uLtc2: this.#ltc2 ?? this.#black,
                uWave: waves?.data ?? NO_WAVES,
                uWaveBoard: waves?.board ?? [0, 0],
                uWaveCoat: waves?.coat ?? [0, 0],
                uBumpMode: 0,
                uBumpMom: this.#black,
                uBumpCross: this.#black,
                uBumpScale: [1, 1],
                uBumpK: [0, 0],
                uWear: s.card.wear,
                uDebugLight: 1,
                uPrintSrc: ctx.src,
                uMask: mask,
                uInk: Math.min(Math.max(this.params.ink, 0), 1),
            },
        });

        const hw = this.#hdr.width;
        const hh = this.#hdr.height;
        const div = tier.glareStartDiv;
        let gw0 = 0;
        const glare = s.display.glare;
        if (glare > 0) {
            this.#glare.ensure(ctx, hw, hh, tier.glareLevels, div);
            gw0 = this.#glare.render(
                ctx,
                this.#hdr,
                hw,
                hh,
                div,
                s.display.glareRadiusPx,
                ctx.pixelRatio,
            );
        }
        const g0 = glare > 0 ? this.#glare.level0 : null;

        ctx.draw({
            frag: FRAG_OUTPUT,
            target: ctx.target,
            uniforms: {
                tHdr: this.#hdr,
                src: ctx.src,
                uExposure: exposureMultiplier(s.display.ev, tone),
                uTone: TONES[s.display.tone],
                uP3: 0,
                uMask: mask,
                uPersp: persp ? 1 : 0,
                uBase: (persp && mask === 1 && this.#base) || this.#black,
                tG0: g0 ?? this.#black,
                uGW0: gw0,
                uGlare: g0 ? glare : 0,
                uG0Scale: g0 ? this.#glare.outputScale(hw, hh, div) : [1, 1],
                ...grainUniforms(s.grain, ctx.pixelRatio, ctx.time),
            },
        });
        this.#drawnOnce = true;
        this.#settleReady();
    }

    /**
     * The logo's placement in the card's surface frame [mm]: `emboss.x` / `emboss.y` / `emboss.width` are CSS px of the
     * element (centre and 36/63 of the width when unset), converted with the frame's mm per px.
     */
    #logoPlacement(): Uniforms {
        const v = this.#resolved?.values ?? {};
        const px = (id: string) => {
            const x = v[id];
            return typeof x === "number" && Number.isFinite(x) ? x : null;
        };
        const [ew, eh] = this.#elemCss;
        const mmPerPx = this.#domainMm[0] / Math.max(ew, 1);
        const x = px("emboss.x") ?? ew / 2;
        const y = px("emboss.y") ?? eh / 2;
        // the element as the logo fills the element; an image logo is 36/63 of its width (holo.spot's proportion)
        const w =
            px("emboss.width") ??
            (v["emboss.logo"] === "element" ? ew : (ew * 36) / 63);
        const rot = ((px("emboss.rotation") ?? 0) * Math.PI) / 180;
        return {
            uLogoXf: [
                (x - ew / 2) * mmPerPx,
                (eh / 2 - y) * mmPerPx, // CSS y runs down, the card frame's up
                Math.cos(rot),
                Math.sin(rot),
            ],
            uLogoW: Math.max(w, 1) * mmPerPx,
        };
    }

    /** How the logo image is read: `mask` picks alpha (holospot's coverage) or luma, `emboss.threshold` the cut. */
    #logoReadOpts(frame: "ink" | "full"): LogoReadOpts {
        const t = this.#resolved?.values["emboss.threshold"];
        return {
            frame,
            read: this.#p.mask === "luma" ? "luma" : "auto",
            threshold: typeof t === "number" ? t : 0.5,
        };
    }

    /** What decides how the element logo is read (its cache key). */
    #readOptsKey(): string {
        const o = this.#logoReadOpts("full");
        return `${o.read}|${o.threshold}`;
    }

    /** emboss with the element as its logo, and neither `emboss.print` nor `emboss.paperColour`: no ground. */
    #clearPaper(): boolean {
        const v = this.#resolved?.values;
        return (
            this.#renderDef?.id === "emboss" &&
            v?.["emboss.logo"] === "element" &&
            !givenImage(v["emboss.print"]) &&
            this.#p.settings["emboss.paperColour"] === undefined
        );
    }

    // ---- the element as the logo: read back once per size / setParams (a still element)
    #capRt: EffectRenderTarget | null = null;
    #capKey = "";
    #capGen = 0;
    #capTries = 0;
    #capPending = false;
    /** A readback is on its way; the token drops one that arrives after #release or a restore. */
    #capInFlight = false;
    #capToken = 0;
    /** Hash of the last pixels read back, so an unchanged element does not rebuild the logo. */
    #capHash = "";
    #captureElementLogo(ctx: EffectContext): void {
        const [pw, ph] = ctx.dims.elementPixel;
        const k = Math.min(1, 1024 / Math.max(pw, ph, 1));
        const w = Math.max(1, Math.round(pw * k));
        const h = Math.max(1, Math.round(ph * k));
        const key = `${w}x${h}|${this.#capGen}|${this.#readOptsKey()}`;
        if (key === this.#capKey || this.#capInFlight) {
            return;
        }
        this.#capPending = true;
        if (
            !this.#capRt ||
            this.#capRt.width !== w ||
            this.#capRt.height !== h
        ) {
            this.#capRt?.dispose();
            this.#capRt = ctx.createRenderTarget({ size: [w, h] });
        }
        captureContent(ctx, this.#capRt);
        // read back without stalling the GPU: 8 bit, premultiplied, rows top-down; it resolves a frame or so later
        this.#capInFlight = true;
        const token = this.#capToken;
        ctx.readPixels(this.#capRt, { flipY: true }).then(
            (raw) => {
                if (token === this.#capToken) {
                    this.#capInFlight = false;
                    this.#useElementLogo(raw, w, h, key);
                }
            },
            () => {
                // disposed or context lost: #release / the restore start over
                if (token === this.#capToken) {
                    this.#capInFlight = false;
                }
            },
        );
    }

    /** Turns the element read back (premultiplied, top-down) into the logo. */
    #useElementLogo(
        raw: Uint8Array | Float32Array,
        w: number,
        h: number,
        key: string,
    ): void {
        const px = new Uint8ClampedArray(w * h * 4);
        let visible = false;
        for (let i = 0; i < w * h * 4; i += 4) {
            const al = raw[i + 3];
            const u = al > 0 ? 255 / al : 0;
            px[i] = raw[i] * u;
            px[i + 1] = raw[i + 1] * u;
            px[i + 2] = raw[i + 2] * u;
            px[i + 3] = al;
            visible ||= al > 8;
        }
        // the element may not be drawn yet on the first frames: read it again for a while
        if (!visible && ++this.#capTries < 120) {
            return;
        }
        this.#capKey = key;
        this.#capTries = 0;
        this.#capPending = false;
        const hash = `${w}x${h}|${this.#readOptsKey()}|${fnv1a(px)}`;
        const a = this.#emboss;
        if (!a || hash === this.#capHash) {
            return;
        }
        this.#capHash = hash;
        const canvas = this.#makeCanvas(w, h);
        this.#ctx2d(canvas)?.putImageData(new ImageData(px, w, h), 0, 0);
        a.setLogo(
            visible ? (canvas as LogoImage) : "",
            this.#logoReadOpts("full"),
        );
    }

    // ---- emboss.print: an image printed on the paper instead of the element
    #printWant: unknown = "";
    #printImg: LogoImage | null = null;
    #printTex: EffectTexture | null = null;
    #printBusy = false;
    #printError: string | null = null;
    #printToken = 0;
    #printUniforms(ctx: EffectContext): Uniforms {
        const want = this.#resolved?.values["emboss.print"] ?? "";
        if (want !== this.#printWant) {
            this.#printWant = want;
            const token = ++this.#printToken;
            this.#printTex?.dispose();
            this.#printTex = null;
            this.#printImg = null;
            this.#printError = null;
            this.#printBusy = false;
            // a URL, or an <img> that has not loaded yet: decode it first (a texture of an unloaded image would stay
            // 0 × 0); a loaded image, a canvas or an ImageBitmap is used at once
            let pending: HTMLImageElement | null = null;
            if (typeof want === "string" && want.trim() !== "") {
                pending = new Image();
                pending.crossOrigin = "anonymous";
                pending.src = want.trim();
            } else if (
                isImgElement(want) &&
                !(want.complete && want.naturalWidth > 0)
            ) {
                pending = want;
            } else if (givenImage(want)) {
                this.#printImg = want as LogoImage;
            }
            if (pending) {
                const img = pending;
                const label = typeof want === "string" ? ` ${want}` : "";
                this.#printBusy = true;
                img.decode().then(
                    () => {
                        if (token === this.#printToken) {
                            this.#printImg = img;
                            this.#printBusy = false;
                        }
                    },
                    (e: unknown) => {
                        if (token === this.#printToken) {
                            this.#printError = `HoloEffect: could not load emboss.print${label}: ${(e instanceof Error ? e.message : String(e)).replace(/\.$/, "")}. A cross-origin image needs CORS.`;
                            console.warn(this.#printError);
                            this.#printBusy = false;
                        }
                    },
                );
            }
        }
        const img = this.#printImg;
        if (img && !this.#printTex) {
            this.#printTex = ctx.wrapTexture(img, { autoUpdate: false });
        }
        // the print: emboss.print once it is loaded (none while it loads or after it fails, not the element), else
        // the element, unless the element is the logo
        const v = this.#resolved?.values ?? {};
        const ink =
            typeof v["emboss.printInk"] === "number" ? v["emboss.printInk"] : 1;
        const printOn = givenImage(want)
            ? !!this.#printTex
            : v["emboss.logo"] !== "element";
        const uPrintK = [printOn ? 1 : 0, Math.min(Math.max(ink, 0), 1), 0, 0];
        if (!img || !this.#printTex) {
            return {
                uPrintK,
                uPrintOwn: 0,
                uPrintImg: this.#black ?? ctx.src,
                uPrintRect: [0, 0, 1, 1],
            };
        }
        // cover the element, as CSS background-size: cover
        const iw = isImgElement(img) ? img.naturalWidth : img.width;
        const ih = isImgElement(img) ? img.naturalHeight : img.height;
        const ae = this.#elemCss[0] / Math.max(this.#elemCss[1], 1);
        const ai = iw / Math.max(ih, 1);
        const sx = ai > ae ? ae / ai : 1;
        const sy = ai > ae ? 1 : ai / ae;
        return {
            uPrintK,
            uPrintOwn: 1,
            uPrintImg: this.#printTex,
            uPrintRect: [(1 - sx) / 2, (1 - sy) / 2, sx, sy],
        };
    }

    /** Uploads the Foil Emboss textures when they change and returns their uniforms. */
    #embossUniforms(ctx: EffectContext): Uniforms {
        const a = this.#emboss;
        const black = this.#black;
        if (!a || !black) {
            return {};
        }
        if (this.#resolved?.values["emboss.logo"] === "element") {
            this.#captureElementLogo(ctx);
        }
        const print = this.#printUniforms(ctx);
        if (a.logoVersion !== this.#logoUp) {
            this.#logoUp = a.logoVersion;
            const l = a.logo;
            if (l) {
                const { w, h } = l.image;
                if (
                    !this.#logoRt ||
                    this.#logoRt.width !== w ||
                    this.#logoRt.height !== h
                ) {
                    this.#logoRt?.dispose();
                    this.#logoRt = ctx.createRenderTarget({
                        size: [w, h],
                        float: true,
                        filter: "linear",
                        mipmap: true,
                        wrap: "clamp",
                    });
                }
                this.#upload(ctx, l.image, this.#logoRt);
                this.#logoMap = l.map;
            } else {
                this.#logoRt?.dispose();
                this.#logoRt = null;
            }
        }
        if (a.paperVersion !== this.#paperUp && a.paper) {
            this.#paperUp = a.paperVersion;
            const n = a.paper.mom.w;
            const opts = {
                size: [n, n] as const,
                float: true,
                filter: "linear" as const,
                mipmap: true,
                wrap: "repeat" as const,
            };
            this.#paperRt ??= {
                mom: ctx.createRenderTarget(opts),
                aux: ctx.createRenderTarget(opts),
            };
            this.#upload(ctx, a.paper.mom, this.#paperRt.mom);
            this.#upload(ctx, a.paper.aux, this.#paperRt.aux);
        }
        return {
            ...print,
            ...this.#logoPlacement(),
            uLogoTex: this.#logoRt ?? black,
            uLogoOn: this.#logoRt ? 1 : 0,
            uLogoMap: this.#logoMap,
            uPaperMom: this.#paperRt?.mom ?? black,
            uPaperAux: this.#paperRt?.aux ?? black,
            uPaperOn: this.#paperRt ? 1 : 0,
        };
    }

    /** One float RGBA byte image (emboss-assets.ts) → a float target, through a canvas and the decode pass. */
    #upload(
        ctx: EffectContext,
        img: { w: number; h: number; bytes: Uint8ClampedArray<ArrayBuffer> },
        target: EffectRenderTarget,
    ): void {
        const canvas = this.#makeCanvas(4 * img.w, img.h);
        this.#ctx2d(canvas)?.putImageData(
            new ImageData(img.bytes, 4 * img.w, img.h),
            0,
            0,
        );
        const tex = ctx.wrapTexture(canvas, {
            autoUpdate: false,
            filter: "nearest",
        });
        ctx.draw({
            frag: FRAG_DECODE_RGBA,
            vert: PLAIN_VERT,
            target,
            uniforms: { uBytes: tex, uRowOffset: 0 },
        });
        tex.dispose();
    }

    dispose(): void {
        this.#life++;
        this.#restoreUnsub?.();
        this.#restoreUnsub = null;
        this.#release();
        // a pending ready resolves: nothing more is drawn until the next init
        this.#drawnOnce = false;
        const w = this.#readyWaiters;
        this.#readyWaiters = [];
        for (const f of w) {
            f();
        }
    }

    /** Frees the GPU resources and forgets what was drawn into them (dispose, and a restored context). */
    #release(): void {
        for (const rt of [
            this.#conv,
            this.#cum,
            this.#hdr,
            this.#base,
            this.#black,
            this.#env,
            this.#ltc1,
            this.#ltc2,
            this.#capRt,
        ]) {
            rt?.dispose();
        }
        this.#bytesTex?.dispose();
        this.#ltcTex?.dispose();
        this.#glare.dispose();
        this.#emboss?.dispose();
        this.#emboss = null;
        this.#logoRt?.dispose();
        this.#logoRt = null;
        this.#paperRt?.mom.dispose();
        this.#paperRt?.aux.dispose();
        this.#paperRt = null;
        this.#logoUp = this.#paperUp = -1;
        this.#conv = this.#cum = this.#hdr = this.#black = this.#env = null;
        this.#base = null;
        this.#ltc1 = this.#ltc2 = null;
        this.#bytesTex = this.#ltcTex = null;
        this.#atlasUploaded = -1;
        this.#ltcReady = false;
        this.#blackReady = false;
        this.#envDrawn = null;
        // the element read back as the logo, and emboss.print: start over on the next init
        this.#capRt = null;
        this.#capKey = "";
        this.#capHash = "";
        this.#capTries = 0;
        this.#capPending = false;
        this.#capInFlight = false;
        this.#capToken++;
        this.#printTex?.dispose();
        this.#printTex = null;
        this.#printImg = null;
        this.#printWant = "";
        this.#printToken++;
        this.#printBusy = false;
    }

    #uploadAtlas(ctx: EffectContext, atlas: SpectralAtlas): void {
        const canvas = this.#bytesCanvas;
        const c2d = canvas ? this.#ctx2d(canvas) : null;
        if (!c2d || !this.#bytesTex || !this.#conv || !this.#cum) {
            return;
        }
        c2d.putImageData(
            new ImageData(atlas.bytes, ATLAS.imageWidth, ATLAS.imageHeight),
            0,
            0,
        );
        this.#bytesTex.update();
        ctx.draw({
            frag: FRAG_DECODE,
            vert: PLAIN_VERT,
            target: this.#conv,
            uniforms: { uBytes: this.#bytesTex, uRowOffset: 0 },
        });
        ctx.draw({
            frag: FRAG_DECODE,
            vert: PLAIN_VERT,
            target: this.#cum,
            uniforms: { uBytes: this.#bytesTex, uRowOffset: ATLAS.height },
        });
        this.#atlasUploaded = atlas.version;
    }
}
