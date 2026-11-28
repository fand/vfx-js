// The scene around the 3D silhouette effects (GlassEffect, BubbleEffect):
// the backdrop plane and its palette, the soft box lights, and the output
// passes (tone map, FXAA). Zero runtime deps.
import type {
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
} from "@vfx-js/core";
import { parseHexColor } from "./_figma-common.js";
import { padOutputRect } from "./_pad.js";

/**
 * A procedural `backdrop` of `GlassEffect` and `BubbleEffect`,
 * coloured through the `backdropColors` palette. `"none"` is black.
 * `"marble"` is the contour bands of a slow noise field, like zebra
 * marble. `"flow"` runs through the palette diagonally, bent by a slow
 * noise field into wavering ribbons.
 */
export type BackdropPatternName =
    | "none"
    | "stripes"
    | "grid"
    | "marble"
    | "flow";

/** A preset for `backdropColors`, see {@link BACKDROP_PALETTES}. */
export type BackdropPaletteName = "mono" | "pastel" | "redblue";

/** The colours of each {@link BackdropPaletteName}, `#rrggbb`, in order. */
export const BACKDROP_PALETTES: Readonly<
    Record<BackdropPaletteName, readonly string[]>
> = {
    mono: ["#000000", "#ffffff"],
    pastel: ["#ff9f9f", "#dfdf80", "#9fff9f", "#80dfdf", "#9f9fff", "#df80df"],
    redblue: ["#e8102a", "#1a3fe0"],
};

/**
 * An image for `backdrop`. Strings other than a
 * {@link BackdropPatternName} are treated as URLs.
 */
export type BackdropImageSource =
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap
    | string;

export const PATTERN_MODES: Record<BackdropPatternName, number> = {
    none: 0,
    stripes: 1,
    grid: 2,
    marble: 3,
    flow: 4,
};
export const IMAGE_MODE = 5;
// The palette texture is at least this wide, so a hard edge stays sharp
// when the pattern is magnified.
const PALETTE_MIN_TEXELS = 4096;
// Noise frequency of "flow", per pattern unit.
const FLOW_FREQ = "0.3";
// Contour bands of "marble" per unit of its noise field.
const MARBLE_BANDS = "3.0";
// Size of the "marble" noise field, in pattern units.
const MARBLE_FREQ = "0.14";
// Long side of the mipmapped copy of a backdrop image, at most.
const BACKDROP_MIP_LONG = 2048;
// Frost at 1: width of the blur per unit of distance from the surface to
// the backdrop, and the softness of the lights' edges. GLSL floats.
const FROST_SPREAD = "0.35";
export const FROST_LIGHT_SOFTNESS = "0.6";

/**
 * The backdrop plane and the lights, in view space: `backdrop(p, fw)`,
 * `lights(d, soft)` and `radiance(p, d, rough)`, with their uniforms.
 * Needs `snoiseD` (GLSL_SIMPLEX3 + GLSL_SIMPLEX3_GRAD) before it.
 *
 * A shader that defines `BACKDROP_KIND` as a backdrop mode before it
 * only compiles that mode: it must only run with that `backdropMode`,
 * or with 0 (none). The patterns are large, so this compiles much
 * faster. See `backdropKind`.
 */
export const GLSL_SCENE = `
// The one backdrop mode compiled in, or -1 for all of them.
#ifndef BACKDROP_KIND
#define BACKDROP_KIND -1
#endif
uniform int backdropMode;
uniform sampler2D backdropTex;
uniform float backdropAspect;
uniform float backdropVisible;
uniform float backdropScale;
uniform float backdropDistance;
uniform float backdropOffset;
// The palette, baked along x with its own mip chain (the top level is
// its mean), and its number of colours.
uniform sampler2D paletteTex;
// Turn of the palette that keeps the bands of two colours centred where
// they are at an even split, whatever the ratio.
uniform float paletteShift;
uniform int paletteSize;
uniform float backdropSoftness;

uniform float lightIntensity;
uniform float lightSoftness;

// The palette at u (0 first colour, 1 last), blurred over a width w of u.
// Its texture repeats, so the last colour runs into the first, except for
// the grid, whose u does not go round.
// A mip level averages 2^lod texels, so the level follows w; the palette
// is laid out so that its colours start on texel boundaries of every
// level that is narrower than a colour.
vec3 palette(float u, float w) {
    float lod = log2(max(w * float(textureSize(paletteTex, 0).x), 1e-4));
    return textureLod(paletteTex, vec2(u, 0.5), lod).rgb;
}

// The backdrop plane, at view-space xy. fw is the footprint of the pixel
// on it, in the same units.
vec3 backdrop(vec2 p, float fw) {
#if BACKDROP_KIND == 0
    return vec3(0.0);
#else
    if (backdropMode == 0) {
        return vec3(0.0);
    }
#if BACKDROP_KIND == -1 || BACKDROP_KIND == ${IMAGE_MODE}
    if (backdropMode == ${IMAGE_MODE}) {
        vec2 half_ = backdropScale * vec2(backdropAspect, 1.0)
            / max(backdropAspect, 1.0);
        vec2 q = p / half_ * 0.5 + 0.5;
        // Mirrored repeat, so the image has no visible border.
        q = 1.0 - abs(mod(q, 2.0) - 1.0);
        // The mip level from the footprint: the fold of the mirror and
        // the refraction would throw off the GPU's own derivatives.
        // fwidth's length is about sqrt(2) times the GPU's footprint.
        vec2 size = vec2(textureSize(backdropTex, 0));
        float texels = fw * 0.5 * max(size.x / half_.x, size.y / half_.y);
        float lod = log2(max(texels, 1e-4)) - 0.5;
        return textureLod(backdropTex, q, lod).rgb;
    }
#endif
#if BACKDROP_KIND == ${IMAGE_MODE}
    return vec3(0.0);
#else
    vec2 q = p / max(backdropScale, 1e-3);
    fw = clamp(fw / max(backdropScale, 1e-3), 1e-4, 4.0);
    // Each pattern gives u, 0 at the middle of the palette's first colour
    // and 1 at the middle of its last, before any threshold, and gu, the
    // length of its gradient in pattern units. u is area-equalised: equal
    // slices of it cover equal areas, so equal shares of the palette get
    // equal areas and the pattern's mean is the palette's. k scales the
    // softness: the bands keep it along u; the grid, whose u is not
    // proportional to distance, keeps it as a distance (k follows gu),
    // so all its edges are equally soft at any ratio.
    float u = 0.0;
    float gu = 1.0;
    float k = 1.0;
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 1
    if (backdropMode == 1) {
        // Once round the palette per stripe period.
        u = fract((q.x - q.y) * 0.7071 + backdropOffset + paletteShift);
        gu = 1.0;
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 2
    if (backdropMode == 2) {
        // Distance t from the lines' centre, 0..0.5. The area within t of
        // a line is 1 - (1 - 2t)^2.
        vec2 g = abs(fract(q + vec2(backdropOffset, 0.0)) - 0.5);
        float a = 1.0 - 2.0 * min(g.x, g.y);
        u = a * a;
        gu = 4.0 * a;
        k = gu;
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 3
    if (backdropMode == 3) {
        // "marble": contour bands of a slow noise field: closed loops
        // round its peaks, bands crowding where it is steep. A weaker
        // second octave makes the widths irregular. u goes once round the
        // palette per contour.
        vec3 n = vec3(q * ${MARBLE_FREQ}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.3, 2.3, 1.5) + vec3(5.2, 1.3, 7.7));
        float s = (a.w + 0.2 * b.w) * ${MARBLE_BANDS};
        u = fract(s + paletteShift);
        vec2 g = (a.xy + 0.46 * b.xy) * ${MARBLE_FREQ};
        gu = ${MARBLE_BANDS} * length(g);
    }
#endif
#if BACKDROP_KIND == -1 || BACKDROP_KIND == 4
    if (backdropMode == 4) {
        // "flow": a diagonal run through the palette, bent by a noise
        // field. The bend stays weaker than the run, so the colours keep
        // going one way: no closed rings, and no points where they all
        // meet.
        vec3 n = vec3(q * ${FLOW_FREQ}, backdropOffset);
        vec4 a = snoiseD(n);
        vec4 b = snoiseD(n * vec3(2.1, 2.1, 1.3) + vec3(17.3, 5.1, 9.7));
        vec2 dir = vec2(0.7071, -0.7071) * 0.22;
        float h = dot(q, dir) + (a.w + 0.25 * b.w) * 0.32 + backdropOffset * 0.05;
        u = fract(h);
        gu = length(dir + (a.xy + 0.525 * b.xy) * 0.32 * ${FLOW_FREQ});
    }
#endif
    // Softness and filtering are one blur along u: the pixel's footprint
    // in u, or the softness in shares of a colour. Low softness matches
    // the smoothstep edges the patterns had (3 shares per unit); it
    // saturates at one share, which is a gradient through the colours.
    float sf = clamp(backdropSoftness, 0.0, 1.0);
    float shares = 3.0 * sf / (1.0 + 2.0 * sf * sqrt(sf));
    float soft = k * shares / float(max(paletteSize, 2));
    return palette(u, max(fw * gu, soft));
#endif
#endif
}

// A rectangular light seen in direction d: centre c, half size in
// tangent units, edges as soft as \`soft\`.
float boxLight(vec3 d, vec3 c, vec2 halfSize, float soft) {
    c = normalize(c);
    float k = dot(d, c);
    if (k <= 0.0) {
        return 0.0;
    }
    vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 v = cross(c, u);
    vec2 q = abs(vec2(dot(d, u), dot(d, v)) / k);
    vec2 s = max(soft * halfSize, vec2(1e-3));
    vec2 e = smoothstep(halfSize + s, halfSize - s, q);
    return e.x * e.y;
}

vec3 lights(vec3 d, float soft) {
    if (lightIntensity <= 0.0) {
        return vec3(0.0);
    }
    float l = boxLight(d, vec3(-0.7, 0.55, 0.45), vec2(0.55, 0.3), soft)
        + boxLight(d, vec3(0.95, 0.05, 0.3), vec2(0.1, 0.9), soft)
        + 0.6 * boxLight(d, vec3(0.25, -0.85, 0.45), vec2(0.7, 0.15), soft)
        // Behind the shape: only seen without a backdrop.
        + boxLight(d, vec3(0.25, 0.15, -1.0), vec2(0.8, 0.45), soft);
    return vec3(l * lightIntensity);
}

// Radiance along a ray in view space: one that left the surface, or one
// that misses it. \`rough\` is the frost of the surface the ray left (0
// for a miss).
vec3 radiance(vec3 p, vec3 d, float rough) {
    vec3 col = lights(d, max(lightSoftness, rough * ${FROST_LIGHT_SOFTNESS}));
    if (backdropMode != 0 && d.z < -1e-4) {
        float t = (-backdropDistance - p.z) / d.z;
        if (t > 0.0) {
            vec2 q = p.xy + d.xy * t;
            // Strong refraction squeezes a wide piece of the backdrop
            // into one pixel; filter the pattern by that footprint. A
            // rough surface scatters into a cone, so its blur grows
            // with the distance to the backdrop.
            float fw = length(fwidth(q));
            if (rough > 0.0) {
                fw += rough * ${FROST_SPREAD} * t;
            }
            col = backdrop(q, fw);
        }
    }
    return col;
}
`;

/** Heat map of a cost count, 64 per colour step. */
export const GLSL_HEAT = `
// Heat map of a count of SDF lookups, 64 per colour step.
vec4 heat(float n) {
    float x = clamp(n / 64.0, 0.0, 5.0);
    vec3 c = mix(vec3(0.0), vec3(0.0, 0.0, 1.0), clamp(x, 0.0, 1.0));
    c = mix(c, vec3(0.0, 1.0, 0.0), clamp(x - 1.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 1.0, 0.0), clamp(x - 2.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 0.0, 0.0), clamp(x - 3.0, 0.0, 1.0));
    c = mix(c, vec3(1.0), clamp(x - 4.0, 0.0, 1.0));
    return vec4(c, 1.0);
}
`;

// Premultiplied output. The scene's alpha is 1 where the backdrop shows;
// lights on a black backdrop are additive over the page.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform int hasScene;
uniform int raw;
out vec4 outColor;

vec3 softClip(vec3 x) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
    return mix(x, k, step(0.8, x));
}

void main() {
    if (hasScene == 0) {
        outColor = vec4(0.0);
        return;
    }
    vec4 s = texture(scene, uv);
    if (raw != 0) {
        outColor = s;
        return;
    }
    vec3 col = softClip(max(s.rgb, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    outColor = vec4(min(col, a), a);
}
`;

// FXAA (after the public domain FXAA 3 by Timothy Lottes, in its compact
// form): blur along the local edge direction, unless that reaches past
// the local luma range. Works on the premultiplied output.
const FRAG_FXAA = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

float luma(vec4 c) {
    return dot(c.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec4 m = texture(srcTex, uv);
    float lNW = luma(texture(srcTex, uv + texel * vec2(-1.0, -1.0)));
    float lNE = luma(texture(srcTex, uv + texel * vec2(1.0, -1.0)));
    float lSW = luma(texture(srcTex, uv + texel * vec2(-1.0, 1.0)));
    float lSE = luma(texture(srcTex, uv + texel * vec2(1.0, 1.0)));
    float lM = luma(m);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin < max(0.03, lMax * 0.1)) {
        outColor = m;
        return;
    }
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * texel;
    vec4 a = 0.5 * (texture(srcTex, uv + dir * (1.0 / 3.0 - 0.5))
        + texture(srcTex, uv + dir * (2.0 / 3.0 - 0.5)));
    vec4 b = a * 0.5 + 0.25 * (texture(srcTex, uv - dir * 0.5)
        + texture(srcTex, uv + dir * 0.5));
    float lB = luma(b);
    outColor = (lB < lMin || lB > lMax) ? a : b;
}
`;

const FRAG_COPY = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`;

// A linearly filtered RGBA16F texture from float data. Half float so it
// can be filtered linearly everywhere.
export function uploadFloatTexture(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    data: Float32Array,
): WebGLTexture | null {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        w,
        h,
        0,
        gl.RGBA,
        gl.FLOAT,
        data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
}

const HEX_RE = /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** RGB 0..1 of a `#rgb` / `#rrggbb` colour, or of `fallback` when it is not one. */
export function hexToRgb(
    hex: unknown,
    fallback = "#000000",
): [number, number, number] {
    const [r, g, b] = parseHexColor(
        typeof hex === "string" && HEX_RE.test(hex) ? hex : fallback,
    );
    return [r, g, b];
}

export function clampInt(
    v: number,
    lo: number,
    hi: number,
    fallback: number,
): number {
    return Number.isFinite(v)
        ? Math.min(Math.max(Math.round(v), lo), hi)
        : fallback;
}

/** `v` clamped to [lo, hi], or `fallback` when it is not a finite number. */
export function num(
    v: number,
    lo: number,
    hi: number,
    fallback: number,
): number {
    return Number.isFinite(v) ? Math.min(Math.max(v, lo), hi) : fallback;
}

export function isPattern(
    v: BackdropPatternName | BackdropImageSource,
): v is BackdropPatternName {
    return typeof v === "string" && v in PATTERN_MODES;
}

/**
 * The `BACKDROP_KIND` a shader for `backdrop` compiles (see GLSL_SCENE):
 * the pattern's mode, or the image's. An image keeps its kind while it
 * loads and shows as none, so the shader does not change when it is
 * ready.
 */
export function backdropKind(
    v: BackdropPatternName | BackdropImageSource,
): number {
    return isPattern(v) ? PATTERN_MODES[v] : IMAGE_MODE;
}

type BackdropElement = Exclude<BackdropImageSource, string>;

// Native size of a backdrop element; 0 while a video has no frame.
function sourceSize(el: BackdropElement): [number, number] {
    if (
        typeof HTMLImageElement !== "undefined" &&
        el instanceof HTMLImageElement
    ) {
        return [el.naturalWidth || el.width, el.naturalHeight || el.height];
    }
    if (
        typeof HTMLVideoElement !== "undefined" &&
        el instanceof HTMLVideoElement
    ) {
        return [el.videoWidth || el.width, el.videoHeight || el.height];
    }
    return [el.width, el.height];
}

// Whether the element has pixels to draw: an image that has loaded, a
// video with its first frame.
function sourceReady(el: BackdropElement): boolean {
    if (
        typeof HTMLImageElement !== "undefined" &&
        el instanceof HTMLImageElement
    ) {
        return el.complete && el.naturalWidth > 0;
    }
    if (
        typeof HTMLVideoElement !== "undefined" &&
        el instanceof HTMLVideoElement
    ) {
        return el.readyState >= 2;
    }
    return el.width > 0 && el.height > 0;
}

// The colours of a `backdropColors` value, at least two: one colour is a
// flat fill. Unknown names fall back to "mono".
function resolvePalette(
    v: BackdropPaletteName | readonly string[],
    presets: Readonly<Record<BackdropPaletteName, readonly string[]>>,
): string[] {
    const list =
        typeof v === "string"
            ? (presets[v as BackdropPaletteName] ?? presets.mono)
            : v;
    const colors = list.length > 0 ? [...list] : [...presets.mono];
    // A colour that is not `#rrggbb` takes the default palette's in its place.
    for (let i = 0; i < colors.length; i++) {
        if (typeof colors[i] !== "string" || !HEX_RE.test(colors[i])) {
            colors[i] = presets.mono[i % presets.mono.length];
        }
    }
    return colors.length === 1 ? [colors[0], colors[0]] : colors;
}

/**
 * The palette as a row of texels, every colour an equal run, and its
 * whole mip chain averaged exactly on the CPU, so the top level is the
 * palette's mean. The width is the number of colours times a power of
 * two, so each colour starts on a texel of every level narrower than it.
 * Two colours split at `1 - ratio` instead, so the second covers `ratio`
 * of the area and every level, the mean included, follows it; that
 * boundary can fall inside a texel, which then holds the exact mix.
 */
function bakePalette(colors: readonly string[], ratio: number): Float32Array[] {
    const n = colors.length;
    const rgb = colors.map((c) => hexToRgb(c));
    const w =
        n * 2 ** Math.max(0, Math.ceil(Math.log2(PALETTE_MIN_TEXELS / n)));
    // Prefix sums per channel, to average any range of texels.
    const sum = new Float64Array((w + 1) * 3);
    const split = (1 - ratio) * w;
    for (let i = 0; i < w; i++) {
        let c = rgb[Math.floor((i * n) / w)];
        if (n === 2) {
            // The share of the second colour in [i, i + 1].
            const t = Math.min(Math.max(i + 1 - split, 0), 1);
            c =
                t === 0
                    ? rgb[0]
                    : t === 1
                      ? rgb[1]
                      : (rgb[0].map(
                            (a, k) => a + (rgb[1][k] - a) * t,
                        ) as typeof c);
        }
        for (let k = 0; k < 3; k++) {
            sum[(i + 1) * 3 + k] = sum[i * 3 + k] + c[k];
        }
    }
    // The sum up to a fractional texel x.
    const at = (x: number, k: number) => {
        const i = Math.min(Math.floor(x), w - 1);
        return (
            sum[i * 3 + k] + (x - i) * (sum[(i + 1) * 3 + k] - sum[i * 3 + k])
        );
    };
    const levels: Float32Array[] = [];
    for (let lw = w; ; lw = Math.max(1, Math.floor(lw / 2))) {
        const data = new Float32Array(lw * 4);
        const span = w / lw;
        for (let j = 0; j < lw; j++) {
            for (let k = 0; k < 3; k++) {
                data[j * 4 + k] =
                    (at((j + 1) * span, k) - at(j * span, k)) / span;
            }
            data[j * 4 + 3] = 1;
        }
        levels.push(data);
        if (lw === 1) {
            break;
        }
    }
    return levels;
}

/** The params of the backdrop and the lights, as in GlassParams. */
export type SceneParams = {
    backdrop: BackdropPatternName | BackdropImageSource;
    backdropVisible: boolean;
    backdropScale: number;
    backdropDistance: number;
    backdropSpeed: number;
    backdropColors: BackdropPaletteName | readonly string[];
    backdropRatio: number;
    backdropSoftness: number;
    lightIntensity: number;
    lightSoftness: number;
};

/**
 * The backdrop's GPU resources: the baked palette, and the backdrop
 * image with its mipmapped copy. Call `update` once per frame, before
 * `uniforms`.
 */
export class SceneBackdrop {
    readonly #presets: Readonly<Record<BackdropPaletteName, readonly string[]>>;
    // Used in place of params that are not finite numbers.
    readonly #defaults: SceneParams;
    // The palette twice: repeating, and clamped for the grid.
    #paletteRaw: WebGLTexture[] = [];
    #paletteTex: EffectTexture | null = null;
    #paletteClampTex: EffectTexture | null = null;
    // The colours the palette was baked from.
    #paletteKey: string | null = null;
    #paletteSize = 2;

    // The backdrop image, and the param value it was loaded from.
    #image: EffectTexture | null = null;
    #imageKey: SceneParams["backdrop"] | null = null;
    #imageAspect = 1;
    #imageEl: BackdropElement | null = null;
    // Videos and canvases change every frame; images only when replaced.
    #imageLive = false;
    // The image copied into a mipmapped target, so it can be filtered by
    // the footprint of a pixel on it.
    #backdropMip: EffectRenderTarget | null = null;
    #backdropDirty = false;
    // The image was wrapped before it had loaded: upload it again once it has.
    #imageWaiting = false;
    // Counts loads, so a stale URL load does not wrap its image.
    #loadId = 0;
    #disposed = false;

    constructor(
        presets: Readonly<Record<BackdropPaletteName, readonly string[]>>,
        defaults: SceneParams,
    ) {
        this.#presets = presets;
        this.#defaults = defaults;
    }

    /** The raw textures are gone with the context: rebuild them. */
    contextRestored(): void {
        this.#paletteTex?.dispose();
        this.#paletteClampTex?.dispose();
        this.#paletteRaw = [];
        this.#paletteTex = null;
        this.#paletteClampTex = null;
        this.#paletteKey = null;
        this.#backdropDirty = true;
    }

    update(ctx: EffectContext, p: SceneParams): void {
        this.#disposed = false;
        this.#updatePalette(ctx, p);
        this.#updateImage(ctx, p);
        this.#updateBackdropMip(ctx);
    }

    /**
     * The uniforms of GLSL_SCENE. `minDistance` keeps the backdrop
     * behind the shape; `fallback` fills samplers that are not ready.
     */
    uniforms(
        p: SceneParams,
        time: number,
        minDistance: number,
        fallback: EffectTexture,
    ): Record<string, EffectUniformValue> {
        const image = isPattern(p.backdrop) ? null : this.#backdropMip;
        // An image that is still loading shows as black.
        const mode = isPattern(p.backdrop)
            ? PATTERN_MODES[p.backdrop]
            : image
              ? IMAGE_MODE
              : 0;
        const d = this.#defaults;
        return {
            backdropMode: mode,
            backdropTex: image ?? fallback,
            backdropAspect: this.#imageAspect,
            backdropVisible: p.backdropVisible ? 1 : 0,
            backdropScale: num(p.backdropScale, 1e-3, 1e3, d.backdropScale),
            backdropDistance: num(
                p.backdropDistance,
                minDistance,
                1e3,
                Math.max(d.backdropDistance, minDistance),
            ),
            backdropOffset:
                time * num(p.backdropSpeed, -1e3, 1e3, d.backdropSpeed),
            paletteTex:
                (mode === PATTERN_MODES.grid
                    ? this.#paletteClampTex
                    : this.#paletteTex) ?? fallback,
            paletteSize: this.#paletteSize,
            paletteShift:
                this.#paletteSize === 2
                    ? 0.5 - num(p.backdropRatio, 0, 1, d.backdropRatio) / 2
                    : 0,
            backdropSoftness: num(p.backdropSoftness, 0, 1, d.backdropSoftness),
            lightIntensity: num(p.lightIntensity, 0, 1e3, d.lightIntensity),
            lightSoftness: num(p.lightSoftness, 0, 1, d.lightSoftness),
        };
    }

    // Bake the palette into its texture when the colours change.
    #updatePalette(ctx: EffectContext, p: SceneParams): void {
        const colors = resolvePalette(p.backdropColors, this.#presets);
        // A two-colour palette has backdropRatio baked in.
        const r = p.backdropRatio;
        const ratio = Number.isFinite(r) ? Math.min(Math.max(r, 0), 1) : 0.5;
        const key =
            colors.length === 2
                ? `${colors.join(",")}|${ratio}`
                : colors.join(",");
        if (key === this.#paletteKey) {
            return;
        }
        this.#paletteKey = key;
        this.#paletteSize = colors.length;
        const gl = ctx.gl;
        this.#paletteTex?.dispose();
        this.#paletteClampTex?.dispose();
        for (const tex of this.#paletteRaw) {
            gl.deleteTexture(tex);
        }
        this.#paletteRaw = [];
        this.#paletteTex = null;
        this.#paletteClampTex = null;
        const levels = bakePalette(colors, ratio);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        const upload = (repeat: boolean): EffectTexture | null => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            levels.forEach((data, level) => {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    level,
                    gl.RGBA16F,
                    data.length / 4,
                    1,
                    0,
                    gl.RGBA,
                    gl.FLOAT,
                    data,
                );
            });
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                gl.LINEAR_MIPMAP_LINEAR,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE,
            );
            gl.bindTexture(gl.TEXTURE_2D, null);
            if (!tex) {
                return null;
            }
            this.#paletteRaw.push(tex);
            // A wrapped handle keeps the mip filter set here.
            return ctx.wrapTexture(tex, {
                size: [levels[0].length / 4, 1],
                filter: "linear",
                wrap: [repeat ? "repeat" : "clamp", "clamp"],
            });
        };
        this.#paletteTex = upload(true);
        this.#paletteClampTex = upload(false);
        ctx.resetState();
    }

    // Load the backdrop image when `backdrop` changes to a new one.
    #updateImage(ctx: EffectContext, p: SceneParams): void {
        const src = p.backdrop;
        if (src === this.#imageKey) {
            return;
        }
        this.#imageKey = src;
        this.#image?.dispose();
        this.#image = null;
        this.#imageEl = null;
        this.#backdropMip?.dispose();
        this.#backdropMip = null;
        const loadId = ++this.#loadId;
        if (isPattern(src)) {
            return;
        }
        const wrap = (el: BackdropElement) => {
            if (this.#disposed || loadId !== this.#loadId) {
                return;
            }
            this.#image?.dispose();
            this.#imageEl = el;
            this.#imageWaiting = false;
            this.#imageLive =
                (typeof HTMLCanvasElement !== "undefined" &&
                    el instanceof HTMLCanvasElement) ||
                (typeof HTMLVideoElement !== "undefined" &&
                    el instanceof HTMLVideoElement);
            this.#backdropDirty = true;
            this.#image = ctx.wrapTexture(el, {
                filter: "linear",
                wrap: "clamp",
            });
        };
        if (typeof src !== "string") {
            wrap(src);
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.decode().then(
            () => wrap(img),
            () => {
                if (!this.#disposed && loadId === this.#loadId) {
                    console.warn(
                        `[VFX-JS] Could not load the backdrop image: ${src}`,
                    );
                }
            },
        );
    }

    // Copy the backdrop image into its mipmapped target: once per image,
    // or every frame for a video or canvas.
    #updateBackdropMip(ctx: EffectContext): void {
        const image = this.#image;
        const el = this.#imageEl;
        if (!image || !el || !(this.#backdropDirty || this.#imageLive)) {
            return;
        }
        if (!sourceReady(el)) {
            // Not loaded yet: try again next frame.
            this.#imageWaiting = true;
            this.#backdropDirty = true;
            return;
        }
        if (this.#imageWaiting) {
            this.#imageWaiting = false;
            image.update();
        }
        const [iw, ih] = sourceSize(el);
        this.#imageAspect = iw / ih;
        const fit = Math.min(1, BACKDROP_MIP_LONG / Math.max(iw, ih, 1));
        const w = Math.max(1, Math.round(iw * fit));
        const h = Math.max(1, Math.round(ih * fit));
        if (this.#backdropMip?.width !== w || this.#backdropMip?.height !== h) {
            this.#backdropMip?.dispose();
            this.#backdropMip = ctx.createRenderTarget({
                size: [w, h],
                filter: "linear",
                mipmap: true,
            });
        }
        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { srcTex: image },
            target: this.#backdropMip,
        });
        this.#backdropDirty = false;
    }

    dispose(gl: WebGL2RenderingContext | null): void {
        this.#disposed = true;
        this.#paletteTex?.dispose();
        this.#paletteClampTex?.dispose();
        if (gl) {
            for (const tex of this.#paletteRaw) {
                gl.deleteTexture(tex);
            }
        }
        this.#paletteRaw = [];
        this.#paletteTex = null;
        this.#paletteClampTex = null;
        this.#paletteKey = null;
        this.#image?.dispose();
        this.#image = null;
        this.#imageEl = null;
        this.#imageKey = null;
        this.#imageWaiting = false;
        this.#loadId++;
        this.#backdropMip?.dispose();
        this.#backdropMip = null;
    }
}

/**
 * The render targets of a 3D scene: the float scene at `resolution`, and
 * the tone-mapped copy that FXAA reads.
 */
export class ScenePasses {
    #scene: EffectRenderTarget | null = null;
    #ldr: EffectRenderTarget | null = null;

    /**
     * The scene target for this frame, sized from the output rect and
     * `resolution` (0.25 to 2); null when the output is empty.
     */
    scene(
        ctx: EffectContext,
        pad: number | "fullscreen",
        resolution: number,
    ): EffectRenderTarget | null {
        const [, , ow, oh] = padOutputRect(pad, ctx.dims);
        if (ow <= 0 || oh <= 0) {
            return null;
        }
        const scale = Number.isFinite(resolution)
            ? Math.min(Math.max(resolution, 0.25), 2)
            : 1;
        const sw = Math.max(1, Math.round(ow * scale));
        const sh = Math.max(1, Math.round(oh * scale));
        if (
            !this.#scene ||
            this.#scene.width !== sw ||
            this.#scene.height !== sh
        ) {
            this.#scene?.dispose();
            this.#scene = ctx.createRenderTarget({
                size: [sw, sh],
                float: true,
                filter: "linear",
            });
        }
        return this.#scene;
    }

    /**
     * Tone map `scene` into the output, through FXAA when asked. `raw`
     * copies it as is (the debug heat maps).
     */
    output(
        ctx: EffectContext,
        scene: EffectRenderTarget | null,
        opts: { pad: number | "fullscreen"; antialias: boolean; raw: boolean },
    ): void {
        // FXAA reads the tone-mapped image, so it gets its own target.
        const [, , ow, oh] = padOutputRect(opts.pad, ctx.dims);
        const lw = Math.round(ow);
        const lh = Math.round(oh);
        const fxaa =
            opts.antialias && scene !== null && !opts.raw && lw > 0 && lh > 0;
        if (fxaa && (this.#ldr?.width !== lw || this.#ldr?.height !== lh)) {
            this.#ldr?.dispose();
            this.#ldr = ctx.createRenderTarget({
                size: [lw, lh],
                filter: "linear",
            });
        }
        const ldr = fxaa ? this.#ldr : null;
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                scene: scene ?? ctx.src,
                hasScene: scene ? 1 : 0,
                raw: opts.raw ? 1 : 0,
            },
            target: ldr ?? ctx.target,
        });
        if (ldr) {
            ctx.draw({
                frag: FRAG_FXAA,
                uniforms: {
                    srcTex: ldr,
                    texel: [1 / ldr.width, 1 / ldr.height],
                },
                target: ctx.target,
            });
        }
    }

    dispose(): void {
        this.#scene?.dispose();
        this.#scene = null;
        this.#ldr?.dispose();
        this.#ldr = null;
    }
}
