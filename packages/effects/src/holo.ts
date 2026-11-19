// Holographic foil on the element: the physically based diffraction foils of holospot
// (https://github.com/dmitrykurash/holospot, MIT © 2026 Dmitry Kurash; the renderer of https://www.holo.spot),
// ported to a vfx-js effect. The element is a flat card under holo.spot's spectral studio lights; the pointer tilts it.
// The port keeps holospot's physics (grating equation, order efficiencies, η renormalisation, material- and
// SPD-convolved spectral tables, coat, environment, tone curve); see docs/tasks/holo/plan.md for what differs.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import { LOOKS } from "./_holo/data/looks.js";
import { PARAM_SPECS } from "./_holo/data/params.js";
import {
    type HoloPresetNames,
    STARTING_POINTS,
} from "./_holo/data/starting-points.js";
import { EmbossAssets } from "./_holo/emboss-assets.js";
import { HoloGlare } from "./_holo/glare.js";
import outputFrag from "./_holo/glsl/output.js";
import {
    FRAG_DECODE_LTC_MAIN,
    LTC_IMAGE,
    LTC_SIZE,
    ltcImageBytes,
} from "./_holo/ltc.js";
import type { MaterialDef, Uniforms } from "./_holo/materials/build.js";
import { emboss, paperKey } from "./_holo/materials/emboss.js";
import { nebula } from "./_holo/materials/nebula.js";
import { prism } from "./_holo/materials/prism.js";
import { shatter } from "./_holo/materials/shatter.js";
import { sparkle } from "./_holo/materials/sparkle.js";
import { vortex } from "./_holo/materials/vortex.js";
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
import { PoseSpring, wobbleOffset } from "./_holo/scene/pose.js";
import { buildWaves, type WaveSet } from "./_holo/scene/relief.js";
import {
    backgroundTone,
    exposureMultiplier,
    isCopyBlob,
    type Resolved,
    resolveSettings,
    type SceneState,
    sceneStateFrom,
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
import { TIERS } from "./_holo/tier.js";
import {
    type HoloMaterialId,
    type Mat3,
    type ParamValue,
    SPD_IDS,
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
 * The artwork of the `emboss` material's foil logo: an image, a canvas, an `ImageBitmap`, or the URL of an SVG or PNG
 * (also one of holo.spot's built-in marks, `"/logos/rosette.svg"`, `"koru"`, `"wordmark"`, `"leaf"`, `"facets"` as
 * `/logos/<name>.svg`), or `"none"`. Transparent areas carry no foil; an opaque image is read by its contrast against
 * its border.
 */
export type HoloLogo =
    | string
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | OffscreenCanvas;
/** Quality tier (holospot's tiers: orders, rect-light model, environment diffraction, glitter search radii). */
export type HoloQuality = "low" | "medium" | "high";
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
    readonly default: HoloSettingValue;
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
export type HoloLights =
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
 * and scene ids (`studio.*` lights, `display.ev` / `display.tone` / `display.glare`, `grain.*`, `card.*`,
 * `motion.*`, `scene.background`). A holo.spot "Copy settings" blob (`{ holoDev: 1, material, values }`) is
 * accepted as well.
 */
export type HoloSettings = Readonly<
    Record<string, HoloSettingValue | undefined>
>;

export type HoloParams = {
    /** Foil material. */
    material: HoloMaterial;
    /**
     * holo.spot settings by id (the material's `<material>.*`, the lights `studio.*`, `card.*`, …), over holo.spot's
     * parameter defaults. The typed params below win over them.
     */
    settings: HoloSettings;
    /**
     * Physical size of the element's largest side in mm (the foil has a real grain). `null`: the element's CSS size
     * at 96 dpi (1 px = 0.2646 mm).
     */
    sizeMm: number | null;
    /** Quality tier. */
    quality: HoloQuality;
    /** Where the foil is. */
    mask: HoloMask;
    /**
     * How much the element's colour tints the foil as a translucent ink, in [0, 1]. 0: bare foil. All materials but
     * `emboss`, whose element is printed on the paper instead (`emboss.printInk`).
     */
    ink: number;
    /**
     * How much the card visibly tilts, in [0, 1]. The shading always follows the full pose; this only sets how far the
     * drawn card turns with it. 0: the element stays in place (flat). 1: the card turns as far as it is lit, seen by
     * holospot's camera. Above 0 the output grows by about 21 % of the element's size on each side, so the tilted card
     * and its glare fit (holospot's framing: the card at rest fills 70 % of the view, exactly the element's rect).
     */
    perspective: number;
    /**
     * Size of the foil's structure, in [0.1, 10] (1 = as designed): shards (`shatter`), flakes (`nebula`), dots
     * (`sparkle`), the paper's tooth and the logo (`emboss`), the relief waves. Smaller values make it finer. The
     * gratings keep their pitch: the colours do not change. Each material also has its own size settings
     * (`shatter.size`, `nebula.size`, `sparkle.size`, …).
     */
    structureScale: number;
    /** Exposure in stops (EV; holo.spot `display.ev`, −3 to 3). `null`: the default (or `settings`). */
    exposure: number | null;
    /** Tone curve (holo.spot `display.tone`). `null`: the default (or `settings`). */
    tone: HoloTone | null;
    /** Glow around bright points, in [0, 1] (holo.spot `display.glare` 0–0.1). `null`: the default (or `settings`). */
    glare: number | null;
    /** Film grain, in [0, 1] (holo.spot `grain.amount` 0–0.6; 0 turns it off). `null`: the default (or `settings`). */
    grain: number | null;
    /** Light rig (holo.spot `studio.preset`). `null`: holo.spot's default rig (or `settings`). Single lights: `settings` (`studio.*`). */
    lights: HoloLights | null;
    /**
     * The page behind the element, which the lighting adapts to (holo.spot `scene.background`): `"black"`, `"white"`
     * or a `#rrggbb` colour. `null`: the default (or `settings`).
     */
    background: string | null;
    /** The card's bow in mm (holo.spot `card.bow`, 0–2): the sheet sags, so the light sweeps across it. `null`: the default. */
    bow: number | null;
    /** Rest pose in degrees: `x` turns the face to the right, `y` tips the top edge toward the viewer. `null`: the default. */
    pose: HoloVec2 | null;
    /**
     * What the pointer does over the element (holo.spot `motion.pointer`): `"tilt"` tilts the card, `"light"` moves a
     * flashlight over it (the card stays at its pose), `"flash"` puts the flashlight at the camera, `"none"` ignores the
     * pointer. `null`: `"tilt"`.
     */
    pointer: HoloPointer | null;
    /** How far the pointer tilts the card, in degrees at the element's edge (holo.spot `motion.tiltRange`). `null`: 25. */
    tiltRange: number | null;
    /** Slow automatic tilt while the pointer is away, amplitude in degrees; 0 turns it off (holo.spot `motion.wobble`, `motion.wobbleAmp`). `null`: 14. */
    wobble: number | null;
    /** 4× multisampling of the card target (half float, as holospot). Smooths the card's outline in perspective mode. */
    msaa: boolean;
    /** `emboss`: the foil logo's artwork. `null`: the `emboss.logo` setting, else holo.spot's rosette. */
    logo: HoloLogo | null;
};

const DEFAULT_PARAMS: HoloParams = {
    material: "prism",
    settings: {},
    sizeMm: null,
    quality: "medium",
    mask: "alpha",
    ink: 0,
    perspective: 0,
    structureScale: 1,
    exposure: null,
    tone: null,
    glare: null,
    grain: null,
    lights: null,
    background: null,
    bow: null,
    pose: null,
    pointer: null,
    tiltRange: null,
    wobble: null,
    msaa: false,
    logo: null,
};

/**
 * A look holo.spot ships, as params to spread into the constructor: the typed params it sets (`pose`, `exposure`,
 * `glare`, `grain`, `bow`, `background`) and the rest as `settings` (its lights `studio.*`, card finish, material
 * values). Spreading replaces `settings` as a whole, so merge yours into the look's:
 * `{ ...look, settings: { ...look.settings, "prism.pitch": 1200 } }`.
 */
function lookParams(
    entries: readonly (readonly [
        string,
        {
            values: Readonly<Record<string, ParamValue>>;
            pose: { rx: number; ry: number };
        },
    ])[],
    material?: HoloMaterial,
): Readonly<Partial<HoloParams>> {
    const values: Record<string, ParamValue> = {};
    for (const [, e] of entries) {
        Object.assign(values, e.values);
    }
    const pose = entries[0][1].pose;
    const take = (id: string) => {
        const v = values[id];
        delete values[id];
        return v;
    };
    const out: Partial<HoloParams> = { pose: { x: pose.ry, y: pose.rx } };
    take("motion.pose");
    if (material) {
        out.material = material;
    }
    const ev = take("display.ev");
    if (typeof ev === "number") {
        out.exposure = ev;
    }
    const glare = take("display.glare");
    if (typeof glare === "number") {
        out.glare = glare / 0.1;
    }
    const on = take("grain.on");
    const amount = take("grain.amount");
    if (on === false) {
        out.grain = 0;
    } else if (typeof amount === "number") {
        out.grain = amount / 0.6;
    }
    const bow = take("card.bow");
    if (typeof bow === "number") {
        out.bow = bow;
    }
    const bg = take("scene.background");
    const bgColor = take("scene.bgColor");
    if (bg === "colour" && typeof bgColor === "string") {
        out.background = bgColor;
    } else if (bg === "black" || bg === "white") {
        out.background = bg;
    }
    out.settings = Object.freeze(values);
    return Object.freeze(out);
}

/** Merges param objects in order; `settings` merge by id (a holo.spot Copy settings blob replaces them). */
function mergeParams(
    parts: readonly Partial<HoloParams>[],
): Partial<HoloParams> {
    const out: Partial<HoloParams> = {};
    for (const p of parts) {
        const { settings, ...rest } = p;
        Object.assign(out, rest);
        if (settings) {
            out.settings =
                isCopyBlob(settings) || isCopyBlob(out.settings)
                    ? settings
                    : { ...out.settings, ...settings };
        }
    }
    return out;
}

/** Params of holo.spot's material presets: `material` and its `settings`. */
export type HoloPreset = Readonly<{
    material: HoloMaterial;
    settings: HoloSettings;
}>;

/** holospot's material "Starting points", by material and name (see `HoloEffect.presets`). */
export type HoloPresets = {
    readonly [M in keyof HoloPresetNames]: {
        readonly [N in HoloPresetNames[M]]: HoloPreset;
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

/** The holo.spot settings the typed params stand for (they win over `settings`). */
function typedSettings(p: HoloParams): Record<string, ParamValue> {
    const o: Record<string, ParamValue> = {};
    const fin = (x: number | null): x is number =>
        typeof x === "number" && Number.isFinite(x);
    if (fin(p.exposure)) {
        o["display.ev"] = Math.min(Math.max(p.exposure, -3), 3);
    }
    if (p.tone) {
        o["display.tone"] = p.tone;
    }
    if (fin(p.glare)) {
        o["display.glare"] = 0.1 * Math.min(Math.max(p.glare, 0), 1);
    }
    if (fin(p.grain)) {
        const g = Math.min(Math.max(p.grain, 0), 1);
        o["grain.on"] = g > 0;
        o["grain.amount"] = 0.6 * g;
    }
    if (p.lights) {
        o["studio.preset"] = p.lights;
    }
    if (p.background) {
        const b = p.background.trim();
        if (b === "black" || b === "white") {
            o["scene.background"] = b;
        } else {
            o["scene.background"] = "colour";
            o["scene.bgColor"] = b;
        }
    }
    if (fin(p.bow)) {
        o["card.bow"] = Math.min(Math.max(p.bow, 0), 2);
    }
    if (p.pose && fin(p.pose.x) && fin(p.pose.y)) {
        o["motion.pose"] = { x: p.pose.x, y: p.pose.y };
    }
    if (p.pointer) {
        o["motion.pointer"] = p.pointer;
    }
    if (fin(p.tiltRange)) {
        o["motion.tiltRange"] = Math.min(Math.max(p.tiltRange, 0), 89);
    }
    if (fin(p.wobble)) {
        o["motion.wobble"] = p.wobble > 0;
        o["motion.wobbleAmp"] = Math.max(p.wobble, 0);
    }
    return o;
}

const MATERIALS: Record<HoloMaterialId, MaterialDef> = {
    prism,
    shatter,
    nebula,
    sparkle,
    vortex,
    emboss,
};

const MM_PER_CSS_PX = 25.4 / 96;
const MATERIAL_PREFIXES = new Set(Object.keys(MATERIALS));
/** holospot's framing: the card at rest fills this share of the view (camera FOV 22°). */
const FRAMING = 0.7;
const TAN_HALF_FOV = Math.tan((11 * Math.PI) / 180);

/** Perspective-mode margin [physical px] on each side of the element. */
function perspectiveMargin(w: number, h: number): [number, number] {
    const k = (1 / FRAMING - 1) / 2;
    return [Math.ceil(w * k), Math.ceil(h * k)];
}
const MASKS: Record<HoloMask, number> = { alpha: 0, luma: 1, none: 2 };
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

const FRAG_DECODE_LTC = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${GLSL_DECODE_FLOAT24}
${FRAG_DECODE_LTC_MAIN}`;

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
uniform sampler2D uBase;   // perspective mode: the element mapped onto the card
uniform int uMask;
uniform int uPersp;
void main() {
  // flat mode: the card target covers the element; perspective mode: the whole (grown) output
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
 * [holospot](https://github.com/dmitrykurash/holospot) (MIT). The element is lit as a flat card by holo.spot's
 * spectral studio lights and tilts toward the pointer. Settings use holo.spot's ids, so a look copied from
 * holo.spot carries over.
 *
 * @example
 * ```ts
 * vfx.add(el, {
 *     effect: new HoloEffect({
 *         material: "prism",
 *         settings: { "prism.pitch": 1200, "prism.pattern": "radial" },
 *     }),
 * });
 * ```
 */
export class HoloEffect implements Effect {
    params: HoloParams;

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
    /** The card's surface domain [mm]: its size / `structureScale` (the structure's frame, not the geometry's). */
    #domainMm: [number, number] = [63, 88];
    /** The drawn card's rotation: the pose scaled by `perspective`. */
    #visRot = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    #eta: { ord: Float32Array; mir: Float32Array; env: Float32Array } | null =
        null;
    #matUniforms: Uniforms = {};
    #frag = "";
    #mouseStart: readonly [number, number] | null = null;
    #pointerSeen = false;
    #started = false;

    /**
     * Takes any number of param objects, merged in order: later ones win, and `settings` merge by id. So a look, a
     * material preset and your own values compose:
     * `new HoloEffect(HoloEffect.looks.card, HoloEffect.presets.prism.compactDisc, { exposure: 1 })`.
     */
    constructor(...parts: Partial<HoloParams>[]) {
        this.params = { ...DEFAULT_PARAMS, ...mergeParams(parts) };
    }

    /**
     * The looks holo.spot ships, as params to spread: `card` (its holographic card), `object` (its 3D object),
     * `paperCard` (its Foil Emboss paper card; sets `material: "emboss"`). Without one, the effect starts from holo.spot's
     * parameter defaults. Looks set the scene (lights, pose, exposure, …); `HoloEffect.presets` set the material.
     *
     * @example
     * ```ts
     * new HoloEffect({ ...HoloEffect.looks.card, material: "shatter", lights: "softbox" });
     * ```
     */
    static readonly looks: Readonly<{
        card: Readonly<Partial<HoloParams>>;
        object: Readonly<Partial<HoloParams>>;
        paperCard: Readonly<Partial<HoloParams>>;
    }> = Object.freeze({
        card: lookParams(lookEntries("card")),
        object: lookParams(lookEntries("object")),
        paperCard: lookParams(
            [
                [
                    "emboss",
                    LOOKS.card.emboss as NonNullable<
                        (typeof LOOKS.card)["emboss"]
                    >,
                ],
            ],
            "emboss",
        ),
    });

    /**
     * Material presets: the "Starting points" of holospot's material docs, as params (`material` and `settings`). They
     * set the material only, not the lights or the pose, so combine them with a look:
     * `new HoloEffect(HoloEffect.looks.card, HoloEffect.presets.prism.compactDisc)`.
     */
    static readonly presets: HoloPresets = Object.freeze(
        Object.fromEntries(
            Object.entries(STARTING_POINTS).map(([m, ps]) => [
                m,
                Object.freeze(
                    Object.fromEntries(
                        Object.entries(ps).map(([name, settings]) => [
                            name,
                            Object.freeze({
                                material: m as HoloMaterial,
                                settings: Object.freeze({ ...settings }),
                            }),
                        ]),
                    ),
                ),
            ]),
        ),
    ) as HoloPresets;

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
     * The settings in effect: holo.spot's defaults, then `settings`, then the typed params (`exposure`, `glare`, …), by
     * holo.spot id. Useful to show a control's current value.
     */
    resolvedSettings(): Readonly<Record<string, HoloSettingValue>> {
        if (this.#dirty || !this.#resolved) {
            this.#resolve();
        }
        const r = this.#resolved;
        if (!r) {
            return {};
        }
        // the rest pose in effect (motion.pose / pose when given): x = ry, y = rx
        return { ...r.values, "motion.pose": { x: r.pose.ry, y: r.pose.rx } };
    }

    setParams(updates: Partial<HoloParams>): void {
        if (updates.settings) {
            const merged = isCopyBlob(updates.settings)
                ? updates.settings
                : { ...this.params.settings, ...updates.settings };
            updates = { ...updates, settings: merged };
        }
        Object.assign(this.params, updates);
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
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

    /** The card target (float, the output's size) and the perspective base layer, with `msaa` (4× half float). */
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
        if (!(this.params.perspective > 0)) {
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

    #resolve(): void {
        const p = this.params;
        const s = p.settings as unknown;
        const blob = isCopyBlob(s) ? s : null;
        const material = p.material;
        const given = {
            ...((blob ? blob.values : p.settings) as Record<
                string,
                ParamValue | undefined
            >),
            ...typedSettings(p),
        };
        this.#resolved = resolveSettings(material, "plain", given, blob?.pose);
        this.#scene = sceneStateFrom(this.#resolved.values);
        const def = this.#def();
        this.#matUniforms = def.uniforms(this.#resolved.values);
        this.#atlas?.setTint(def.gratingSummary(this.#resolved.values).tint);
        const tier = TIERS[p.quality] ?? TIERS.medium;
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
                NSPD: 5,
                MAX_LIGHTS: 4,
                DEBUG_VIEW: 0,
            },
            def.extraChunks,
            def.fragmentMain,
        );
        this.#dirty = false;
    }

    #def(): MaterialDef {
        const def = MATERIALS[this.params.material];
        if (!def) {
            throw new Error(
                `HoloEffect: unknown material "${this.params.material}"`,
            );
        }
        return def;
    }

    /** holospot's camera: FOV 22°, at (0, 0, D) looking down −Z (column-major projection × view). */
    #setViewProj(aspect: number, D: number): void {
        const f = 1 / TAN_HALF_FOV;
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
        const [pw, ph] = ctx.dims.elementPixel;
        const w = Math.max(ew, 1);
        const h = Math.max(eh, 1);
        const largest = this.params.sizeMm ?? Math.max(w, h) * MM_PER_CSS_PX;
        const k = largest / Math.max(w, h);
        this.#cardSizeMm = [w * k, h * k];
        // the surface's domain: a smaller structure scale lays more of the structure over the card
        const ss = Math.min(Math.max(this.params.structureScale || 1, 0.1), 10);
        this.#domainMm = [(w * k) / ss, (h * k) / ss];
        let D = framingDistance(
            w / h,
            this.#cardSizeMm[0] / 2000,
            this.#cardSizeMm[1] / 2000,
        );
        if (this.params.perspective > 0) {
            // the card at rest maps exactly onto the element inside the grown output
            const [mx, my] = perspectiveMargin(pw, ph);
            const oh = ph + 2 * my;
            D =
                (this.#cardSizeMm[1] / 2000 / TAN_HALF_FOV) *
                (oh / Math.max(ph, 1));
            this.#setViewProj((pw + 2 * mx) / Math.max(oh, 1), D);
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

        const rot = eulerXYZ(this.#pose.rx, this.#pose.ry, 0);
        if (this.#started) {
            this.#prevCardRot.set(this.#cardRot);
            this.#prevLightPos.set(this.#lights.pos);
        }
        colMajor(rot, this.#cardRot);
        const pv = Math.min(Math.max(this.params.perspective || 0, 0), 1);
        colMajor(
            eulerXYZ(pv * this.#pose.rx, pv * this.#pose.ry, 0),
            this.#visRot,
        );

        const pad = over ? { x: nx, y: ny } : { x: 0, y: 0 };
        computeLights(
            s.studio,
            {
                mode: m.pointer === "none" ? "tilt" : m.pointer,
                pad,
            },
            s.background,
            { x: 0, y: 0, z: 0, w: 1 },
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
        if (this.params.material === "emboss") {
            this.#emboss ??= new EmbossAssets();
            const lv = r.values["emboss.logo"];
            this.#emboss.setLogo(
                this.params.logo ?? (typeof lv === "string" ? lv : null),
            );
            this.#emboss.setPaper(paperKey(r.values));
        }
        this.#eta = etaFrame(
            this.#def().gratingSummary(r.values),
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
                    frag: FRAG_DECODE_LTC,
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

        const tier = TIERS[this.params.quality] ?? TIERS.medium;
        const tr = tier.trips;
        const L = this.#lights;
        const bins = atlas.bins[tier.defines.NB === 6 ? 6 : 8];
        const binLam = new Float32Array(8);
        binLam.set(bins.lambda);
        const binW = new Float32Array(72);
        binW.set(bins.W);

        const emb =
            this.params.material === "emboss" ? this.#embossUniforms(ctx) : {};
        const persp = this.params.perspective > 0;
        const card = {
            uCardRot: this.#cardRot,
            uPrevCardRot: this.#prevCardRot,
            uCardSizeMm: this.#domainMm,
            uCardWorldMm: this.#cardSizeMm,
            uVisRot: this.#visRot,
            uViewProj: this.#viewProj,
            uPersp: persp ? 1 : 0,
        };
        const mask = MASKS[this.params.mask] ?? 0;
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
                uEnvRot: envRotation(s.studio.ambient.rotationDeg),
                uEnvUniform: 0,
                uCmfConv: this.#conv,
                uCmfCum: this.#cum,
                uSpecProj: atlas.specProj,
                uBinLam: binLam,
                uBinW: binW,
                uBinWidth: bins.width,
                uLtc1: this.#ltc1 ?? this.#black,
                uLtc2: this.#ltc2 ?? this.#black,
                uWave: waves?.data ?? new Float32Array(128),
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
    }

    /** Uploads the Foil Emboss textures when they change and returns their uniforms. */
    #embossUniforms(ctx: EffectContext): Uniforms {
        const a = this.#emboss;
        const black = this.#black;
        if (!a || !black) {
            return {};
        }
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
                this.#upload(ctx, l.image, this.#logoRt, "logo");
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
            this.#upload(ctx, a.paper.mom, this.#paperRt.mom, "mom");
            this.#upload(ctx, a.paper.aux, this.#paperRt.aux, "aux");
        }
        return {
            uLogoTex: this.#logoRt ?? black,
            uLogoOn: this.#logoRt ? 1 : 0,
            uLogoMap: this.#logoMap,
            uPaperMom: this.#paperRt?.mom ?? black,
            uPaperAux: this.#paperRt?.aux ?? black,
            uPaperOn: this.#paperRt ? 1 : 0,
            uPrintTex: black,
        };
    }

    /** One float RGBA byte image (emboss-assets.ts) → a float target, through a canvas and the decode pass. */
    #upload(
        ctx: EffectContext,
        img: { w: number; h: number; bytes: Uint8ClampedArray<ArrayBuffer> },
        target: EffectRenderTarget,
        _what: string,
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
            frag: FRAG_DECODE_LTC,
            vert: PLAIN_VERT,
            target,
            uniforms: { uBytes: tex, uRowOffset: 0 },
        });
        tex.dispose();
    }

    dispose(): void {
        for (const rt of [
            this.#conv,
            this.#cum,
            this.#hdr,
            this.#base,
            this.#black,
            this.#env,
            this.#ltc1,
            this.#ltc2,
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
