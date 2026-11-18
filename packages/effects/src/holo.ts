// Holographic foil on the element: the physically based diffraction foils of holospot
// (https://github.com/dmitrykurash/holospot, MIT © 2026 Dmitry Kurash; the renderer of https://www.holo.spot),
// ported to a vfx-js effect. The element is a flat card under holo.spot's spectral studio lights; the pointer tilts it.
// The port keeps holospot's physics (grating equation, order efficiencies, η renormalisation, material- and
// SPD-convolved spectral tables, coat, environment, tone curve); see docs/tasks/holo/plan.md for what differs.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import outputFrag from "./_holo/glsl/output.js";
import {
    FRAG_DECODE_LTC_MAIN,
    LTC_IMAGE,
    LTC_SIZE,
    ltcImageBytes,
} from "./_holo/ltc.js";
import type { MaterialDef, Uniforms } from "./_holo/materials/build.js";
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
    type LookId,
    type Resolved,
    resolveSettings,
    type SceneState,
    sceneStateFrom,
} from "./_holo/settings.js";
import {
    assembleMaterial,
    CARD_VERT,
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
export type HoloMaterial = HoloMaterialId;
/** Look the settings start from: holo.spot's holographic card, its 3D object, or the bare parameter defaults. */
export type HoloLook = LookId;
/** Quality tier (holospot's tiers: orders, rect-light model, environment diffraction, glitter search radii). */
export type HoloQuality = "low" | "medium" | "high";
/** Where the foil is: where the element is opaque, where it is bright, or the whole element rect. */
export type HoloMask = "alpha" | "luma" | "none";
/** A 2D value of a holo.spot setting (pads such as `studio.panel.dir`, `motion.pose`). */
export type HoloVec2 = { x: number; y: number };
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
    /** Look the values start from (default `"card"`). */
    look: HoloLook;
    /** holo.spot settings by id; they override the look. */
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
    /** How much the element's colour tints the foil as a translucent ink, in [0, 1]. */
    ink: number;
};

const DEFAULT_PARAMS: HoloParams = {
    material: "prism",
    look: "card",
    settings: {},
    sizeMm: null,
    quality: "medium",
    mask: "alpha",
    ink: 0,
};

const MATERIALS: Record<HoloMaterialId, MaterialDef> = {
    prism,
    shatter,
    nebula,
    sparkle,
    vortex,
};

const MM_PER_CSS_PX = 25.4 / 96;
const MASKS: Record<HoloMask, number> = { alpha: 0, luma: 1, none: 2 };
const TONES = { neutral: 0, agx: 1, clamp: 2 } as const;

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
in vec2 uvContent;
in vec2 uvSrc;
uniform sampler2D src;
uniform int uMask;
void main() {
  vec4 P = textureLod(tHdr, clamp(uvContent, 0.0, 1.0), 0.0);
  float a = clamp(P.a, 0.0, 1.0); vec3 c = vec3(0.0);
  if (a > 1e-5) { vec3 cu = P.rgb / a; c = cu / (ENC_S * max(1.0 - max(max3(cu), 0.0), 1e-4)); }
  vec3 card = toDisplay(c * uExposure);
  vec3 enc = srgbOETF(card);
  enc += triangularDither(gl_FragCoord.xy) / 255.0;
  vec4 foil = vec4(clamp(enc, 0.0, 1.0), 1.0);
  vec4 s = texture(src, uvSrc);
  if (uvContent.x < 0.0 || uvContent.x > 1.0 || uvContent.y < 0.0 || uvContent.y > 1.0) {
    gl_FragColor = s;
  } else if (uMask == 0) {
    gl_FragColor = foil * s.a;
  } else if (uMask == 1) {
    vec3 u = s.a > 1e-4 ? s.rgb / s.a : vec3(0.0);
    float m = clamp(dot(u, LUMA_SRGB), 0.0, 1.0);
    gl_FragColor = mix(s, foil * s.a, m);
  } else {
    gl_FragColor = foil;
  }
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
    #black: EffectRenderTarget | null = null;
    #env: EffectRenderTarget | null = null;
    #ltcTex: EffectTexture | null = null;
    #ltc1: EffectRenderTarget | null = null;
    #ltc2: EffectRenderTarget | null = null;
    #ltcReady = false;
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
    #eta: { ord: Float32Array; mir: Float32Array; env: Float32Array } | null =
        null;
    #matUniforms: Uniforms = {};
    #frag = "";
    #mouseStart: readonly [number, number] | null = null;
    #pointerSeen = false;
    #started = false;

    constructor(initial: Partial<HoloParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
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
        this.#hdr = ctx.createRenderTarget({ float: true, filter: "nearest" });
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
        const given = (blob ? blob.values : p.settings) as Record<
            string,
            ParamValue | undefined
        >;
        this.#resolved = resolveSettings(material, p.look, given, blob?.pose);
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
        const D = framingDistance(
            w / h,
            this.#cardSizeMm[0] / 2000,
            this.#cardSizeMm[1] / 2000,
        );
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

        ctx.draw({
            frag: this.#frag,
            vert: CARD_VERT,
            target: this.#hdr,
            uniforms: {
                ...this.#matUniforms,
                cameraPosition: [...this.#camPos],
                uCardRot: this.#cardRot,
                uPrevCardRot: this.#prevCardRot,
                uCardSizeMm: this.#cardSizeMm,
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
                uPrintRect: [0, 0, 1, 1],
                uInk: Math.min(Math.max(this.params.ink, 0), 1),
            },
        });

        ctx.draw({
            frag: FRAG_OUTPUT,
            target: ctx.target,
            uniforms: {
                tHdr: this.#hdr,
                src: ctx.src,
                uExposure: exposureMultiplier(s.display.ev, tone),
                uTone: TONES[s.display.tone],
                uP3: 0,
                uMask: MASKS[this.params.mask] ?? 0,
            },
        });
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
