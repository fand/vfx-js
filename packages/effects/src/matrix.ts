// The "code rain" effect from the movie "Matrix".
// Generate rain drops on a grid, and show random text glyphs with colors.
// The output color is multiplied with the input source image's grayscale value.

import type { Effect, EffectContext, EffectTexture } from "@vfx-js/core";

/** RGBA colour, each channel in [0, 1]. */
export type MatrixColor = [number, number, number, number];

/**
 * Trail colour: a single {@link MatrixColor}, or an array of two or more
 * colour stops forming a gradient along each drop's trail (first stop at the
 * head, last at the tail end). Stops are interpolated in OKLCH.
 */
export type MatrixTrailColor = MatrixColor | MatrixColor[];

/**
 * The pool of glyphs rained down the columns. Pass a string (split per
 * Unicode code point) or an array of single chars. The order is irrelevant
 * — a random glyph is picked for every cell.
 */
export type MatrixGlyphs = string | readonly string[];

/**
 * Default glyph pool: half-width katakana (the look the film used) plus
 * digits and a few symbols. Mirrored katakana isn't reproducible from a
 * normal font, so these render upright.
 */
export const MATRIX_GLYPHS =
    'ﾊﾋﾌﾍﾎｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:."=*+-<>|';

// Max number of trail-colour gradient stops the shader interpolates between.
// Stops are passed straight through as sRGB and interpolated in OKLCH on the
// GPU, per fragment — exact at any `tail`, no precomputed ramp.
const MAX_STOPS = 8;

const FRAG_MATRIX = `#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D atlas;
uniform vec4 srcRectUv;
uniform vec2 elementPx;      // element size, physical px
uniform vec2 cellPx;         // cell size, physical px
uniform float cols;          // atlas columns
uniform float rows;          // atlas rows
uniform float glyphCount;    // number of glyphs in the pool
uniform float glyphAspect;   // font's character box aspect (advance / em)
uniform float time;          // seconds since VFX start
uniform float seed;          // shifts the random pattern (columns + glyphs)
uniform vec4 colorStops[${MAX_STOPS}]; // trail-colour gradient stops (sRGB), head→tail
uniform int colorStopCount;  // number of active stops (>= 1)
uniform vec4 headColor;      // leading-glyph colour, non-premultiplied
uniform vec4 background;     // cell backdrop, non-premultiplied
uniform float speed;         // base fall speed, cells / second
uniform float tail;          // trail length, cells
uniform float tailFade;      // 1 = fade to the tail, 0 = no fade (gradient only)
uniform float birthRate;     // new drops per second, per column
uniform float glyphSpeed;    // glyph reshuffle rate, changes / second
uniform float brightness;    // overall gain on the rain
uniform float contrast;      // source-luminance contrast about 0.5 (1 = off)
uniform int invert;          // 1 = flip source luminance

// Box-average a TAPS x TAPS grid per cell for the source luminance.
const int TAPS = 4;

// --- OKLCH gradient (Björn Ottosson's sRGB <-> OKLab) --------------------
vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
               step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
}
vec3 linSrgbToOklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z);
}
vec3 oklabToLinSrgb(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z);
}

// Interpolate two sRGB colours in OKLCH at t: lightness + chroma linearly,
// hue along the shortest path (achromatic endpoints borrow the other's hue,
// matching CSS oklch). Alpha is interpolated linearly.
vec4 oklchMix(vec4 c0, vec4 c1, float t) {
    vec3 lab0 = linSrgbToOklab(srgbToLinear(c0.rgb));
    vec3 lab1 = linSrgbToOklab(srgbToLinear(c1.rgb));
    float C0 = length(lab0.yz);
    float C1 = length(lab1.yz);
    float h0 = atan(lab0.z, lab0.y);
    float h1 = atan(lab1.z, lab1.y);
    if (C0 < 1e-4) h0 = h1;
    if (C1 < 1e-4) h1 = h0;
    float dh = h1 - h0;
    dh -= 6.283185307 * floor(dh / 6.283185307 + 0.5); // wrap to [-pi, pi]
    float L = mix(lab0.x, lab1.x, t);
    float C = mix(C0, C1, t);
    float h = h0 + dh * t;
    vec3 rgb = oklabToLinSrgb(vec3(L, C * cos(h), C * sin(h)));
    return vec4(linearToSrgb(rgb), mix(c0.a, c1.a, t));
}

// Sample the trail-colour gradient at t in [0, 1] (0 = head, 1 = tail end).
vec4 sampleGradient(float t) {
    if (colorStopCount <= 1) {
        return colorStops[0];
    }
    float f = clamp(t, 0.0, 1.0) * float(colorStopCount - 1);
    int i = min(int(floor(f)), colorStopCount - 2);
    return oklchMix(colorStops[i], colorStops[i + 1], f - float(i));
}

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

// Sine-free hashes (Dave Hoskins) — stable across GPUs.
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    // Flip Y to a top-down pixel frame so columns fall from the top edge.
    vec2 fragPx = uvContent * elementPx;
    vec2 topPx = vec2(fragPx.x, elementPx.y - fragPx.y);

    // Center the grid on the element so partial cells split evenly between
    // edges (matches AsciiEffect).
    vec2 gridOrigin = elementPx * 0.5;
    vec2 cellIdx = floor((topPx - gridOrigin) / cellPx);
    vec2 cellOriginTop = gridOrigin + cellIdx * cellPx;
    float colId = cellIdx.x;
    // Row from the top edge, so drops start at the top wherever the grid lands.
    float topRow = floor(-gridOrigin.y / cellPx.y);
    float rowTopId = cellIdx.y - topRow;

    // Per-column drop train: each column has its own speed and phase and births
    // a stream ~every 1/birthRate s (jittered). seed shifts the pattern.
    float colSpeed = max(0.0001, speed * mix(0.5, 1.5, hash11(colId * 1.37 + 3.1 + seed)));
    float colPhase = hash11(colId * 0.71 + 7.3 + seed * 7.77);
    float spawnInterval = 1.0 / max(birthRate, 0.0001);

    // Scan recent drops and keep the one whose head is closest above this cell
    // (smallest d); bestD < 0 means none reach here. Centring the scan on the
    // drop at THIS cell lets deep cells catch older drops. The fixed 5-drop
    // window can clip a long dim tail — cosmetic; widen the loop if needed.
    float bestD = -1.0;
    float headSlot = (time - rowTopId / colSpeed) / spawnInterval - colPhase;
    float kStart = floor(headSlot) + 1.0;
    for (int i = 0; i < 5; i++) {
        float kk = kStart - float(i);
        // Birth time, jittered within ±0.3 of its slot.
        float jit = (hash11(kk * 3.7 + colId * 1.9 + seed * 11.13) - 0.5) * 0.6;
        float tb = (kk + colPhase + jit) * spawnInterval;
        float elapsed = time - tb;
        if (elapsed < 0.0) {
            continue;   // not born yet
        }
        // Cells above the head (d >= 0) form the trail; below it is dark.
        float d = elapsed * colSpeed - rowTopId;
        if (d < 0.0 || d > tail) {
            continue;
        }
        if (bestD < 0.0 || d < bestD) {
            bestD = d;
        }
    }

    float trail = 0.0;     // brightness along the trail (head = 1)
    float headMix = 0.0;   // blend toward headColor at the tip
    float gradT = 0.0;     // colour-ramp position: 0 at head, 1 at tail end
    if (bestD >= 0.0) {
        // tailFade scales the dim-toward-tail falloff: 0 = flat trail (fade via
        // gradient), 1 = classic bright head / dim tail.
        float fade = pow(1.0 - bestD / tail, 1.5);
        trail = mix(1.0, fade, tailFade);
        // Blend toward headColor over the first ~2 cells.
        headMix = clamp(1.0 - bestD * 0.6, 0.0, 1.0);
        gradT = clamp(bestD / tail, 0.0, 1.0);
    }

    // Random glyph per cell, reshuffled in steps; per-column phase desyncs
    // neighbours.
    float gstep = floor(time * glyphSpeed + hash11(colId + seed * 3.3) * 17.0);
    float gi = hash13(vec3(colId + seed * 13.0, rowTopId, gstep));
    float idx = clamp(floor(gi * glyphCount), 0.0, glyphCount - 1.0);

    // Atlas cell for this glyph (texture is Y-flipped, hence 1.0 - ... on v).
    float acol = mod(idx, cols);
    float arowTop = floor(idx / cols);

    // Contain-fit the glyph so non-square cells letterbox instead of stretching.
    vec2 local = (topPx - cellOriginTop) / cellPx;  // 0..1 within the cell
    vec2 luv = vec2(local.x, 1.0 - local.y);        // bottom-up for upright glyphs
    float cellAspect = cellPx.x / cellPx.y;
    vec2 frac = min(vec2(1.0), vec2(glyphAspect / cellAspect, cellAspect / glyphAspect));
    vec2 gloc = (luv - 0.5) / frac + 0.5;

    float cover = 0.0;
    if (gloc.x >= 0.0 && gloc.x <= 1.0 && gloc.y >= 0.0 && gloc.y <= 1.0) {
        float u = (acol + gloc.x) / cols;
        float v = 1.0 - (arowTop + 1.0 - gloc.y) / rows;
        cover = texture(atlas, vec2(u, v)).a;
    }

    // Box-averaged source luminance, multiplied into the rain so the picture
    // shows through.
    vec4 acc = vec4(0.0);
    for (int y = 0; y < TAPS; ++y) {
        for (int x = 0; x < TAPS; ++x) {
            vec2 o = (vec2(float(x), float(y)) + 0.5) / float(TAPS);
            vec2 sTop = cellOriginTop + o * cellPx;
            vec2 sUv = vec2(sTop.x, elementPx.y - sTop.y) / elementPx;
            acc += readSrc(sUv);
        }
    }
    acc /= float(TAPS * TAPS);
    float lum = dot(acc.rgb, vec3(0.299, 0.587, 0.114));
    // Contrast about mid-grey: < 1 flattens, > 1 deepens.
    lum = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Trail colour from the gradient along the drop (0 = head, 1 = tail).
    vec4 trailColor = sampleGradient(gradT);

    // Rain lights up only where the picture is bright; blend hue and alpha
    // toward headColor at the tip. Transparent source falls back to background.
    vec3 hue = mix(trailColor.rgb, headColor.rgb, headMix);
    float colA = mix(trailColor.a, headColor.a, headMix);
    float fgA = clamp(cover * trail * lum * acc.a * colA * brightness, 0.0, 1.0);

    float outA = fgA + background.a * (1.0 - fgA);
    vec3 premul = hue * fgA + background.rgb * background.a * (1.0 - fgA);
    outColor = vec4(premul, outA);
}
`;

export type MatrixParams = {
    /**
     * Cell size in CSS px. A single number is a square cell; a
     * `[width, height]` tuple sets the axes independently. Glyphs keep
     * their native aspect (contain-fitted), so a non-square cell
     * letterboxes rather than stretching.
     */
    grid: number | [number, number];

    /**
     * Glyph pool rained down the columns, picked at random per cell.
     * Defaults to {@link MATRIX_GLYPHS}. Baked into the atlas at `init()`;
     * change it (or `font` / `fontWeight`) then call
     * {@link MatrixEffect.updateAtlas} (or re-add the effect) to rebuild.
     */
    glyphs?: MatrixGlyphs;

    /** CSS font family used to render the glyph atlas. */
    font: string;

    /** CSS font weight for the glyph atlas (`"normal"`, `"bold"`, 100–900). */
    fontWeight: string | number;

    /**
     * Character box aspect ratio (width / height). Omit to auto-measure it
     * from the font (advance over em height).
     */
    charAspect?: number;

    /**
     * Trail colour — the classic phosphor green. Pass an array of two or
     * more {@link MatrixColor} stops for a gradient along each drop's trail
     * (first at the head, last at the tail end), interpolated in OKLCH. Pair
     * with `tailFade: 0` to fade purely via the gradient.
     */
    color: MatrixTrailColor;

    /** Leading-glyph colour at the head of each stream (usually near-white). */
    headColor: MatrixColor;

    /** Cell backdrop behind the rain, non-premultiplied. */
    background: MatrixColor;

    /** Base fall speed in cells per second. Per-column randomised ±50%. */
    speed: number;

    /** Trail length in cells (how far the trail extends behind the head). */
    tail: number;

    /**
     * How much the trail dims toward its tail, in `[0, 1]`. `1` is the
     * classic bright-head / dim-tail falloff; `0` keeps the whole trail at
     * full brightness so you control the fade yourself via the colour
     * gradient (e.g. a `color` stop fading to transparent or black).
     */
    tailFade: number;

    /**
     * Drop spawn rate: how many new falling streams are born per second in
     * each column. Higher values spawn drops frequently (a busy, dense
     * downpour — drops overlap into near-continuous streams); lower values
     * leave long gaps between drops (sparse, intermittent rain).
     */
    birthRate: number;

    /** Glyph reshuffle rate in changes per second (`0` = static glyphs). */
    glyphSpeed: number;

    /** Overall gain on the rain brightness. */
    brightness: number;

    /**
     * Contrast of the source luminance, pivoting around mid-grey (0.5).
     * `1` leaves the input unchanged; `< 1` flattens it toward grey; `> 1`
     * deepens the split between dark and bright regions, so the picture
     * reads more sharply through the rain.
     */
    contrast: number;

    /** Flip the source luminance (rain shows through dark areas instead). */
    invert: boolean;

    /**
     * Random seed for the rain pattern (per-column speed/phase and the glyph
     * sequence). Any number; the same seed always reproduces the same
     * pattern, so pin it (with {@link VFX.setTime}) for deterministic
     * snapshots / visual regression tests. `0` is the default look.
     */
    seed: number;
};

const DEFAULT_PARAMS: MatrixParams = {
    grid: [12, 16],
    font: "monospace",
    fontWeight: "normal",
    color: [0.18, 1, 0.36, 1],
    headColor: [0.85, 1, 0.9, 1],
    background: [0, 0, 0, 1],
    speed: 10,
    tail: 18,
    tailFade: 1,
    birthRate: 0.6,
    glyphSpeed: 8,
    brightness: 1,
    contrast: 1,
    invert: false,
    seed: 0,
};

// Atlas glyph cell height (physical px). Oversized vs. typical on-screen
// cells so linear minification keeps glyphs crisp. Cell width tracks the
// widest glyph's advance so wide glyphs stay within their cell.
const GLYPH_PX = 64;

/** Split a glyph pool into single chars (per Unicode code point). */
function resolveGlyphs(glyphs: MatrixGlyphs): string[] {
    return Array.isArray(glyphs) ? [...glyphs] : Array.from(glyphs as string);
}

/** Normalize `grid` to a `[width, height]` pair in CSS px. */
function resolveGrid(grid: number | [number, number]): [number, number] {
    return typeof grid === "number" ? [grid, grid] : grid;
}

/**
 * Best-effort wait for `font` to be ready before rasterising the atlas. No-op
 * outside the browser / when the Font Loading API is unavailable.
 */
async function ensureFont(
    font: string,
    weight: string | number,
): Promise<void> {
    const fonts = (
        typeof document !== "undefined"
            ? (document as Document & { fonts?: FontFaceSet }).fonts
            : undefined
    ) as FontFaceSet | undefined;
    if (!fonts?.load) {
        return;
    }
    try {
        await fonts.load(`${weight} ${GLYPH_PX}px ${font}`);
        await fonts.ready;
    } catch {
        // Font unavailable — fall through and let canvas pick a fallback.
    }
}

/** Result of building the glyph atlas: the canvas plus its grid metrics. */
type AtlasBuild = {
    canvas: HTMLCanvasElement;
    cols: number;
    rows: number;
    cellW: number;
    cellH: number;
};

/**
 * Render the glyph pool into a single atlas canvas, laid out as a near-
 * square grid. Cell height is `GLYPH_PX`; cell width tracks the widest
 * glyph's advance so wide glyphs (e.g. full-width CJK) stay within their
 * cell. White glyphs on transparent; the shader reads coverage from the
 * alpha channel.
 */
function buildAtlas(
    chars: string[],
    font: string,
    weight: string | number,
    aspectOverride?: number,
): AtlasBuild {
    const n = Math.max(1, chars.length);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const fontStr = `${weight} ${GLYPH_PX}px ${font}`;

    const canvas = document.createElement("canvas");
    // Measure cell width before resizing (resizing resets context state).
    let cellW: number;
    if (aspectOverride && aspectOverride > 0) {
        cellW = Math.max(1, Math.round(aspectOverride * GLYPH_PX));
    } else {
        const probe = canvas.getContext("2d");
        cellW = GLYPH_PX;
        if (probe) {
            probe.font = fontStr;
            // Size the cell to the widest glyph in the pool — not a fixed
            // probe char — so wide glyphs (e.g. full-width CJK) don't spill
            // into the neighbouring cell in the atlas.
            let maxAdvance = 0;
            for (const ch of chars) {
                maxAdvance = Math.max(maxAdvance, probe.measureText(ch).width);
            }
            if (maxAdvance > 0) {
                cellW = Math.max(1, Math.ceil(maxAdvance));
            }
        }
    }

    canvas.width = cols * cellW;
    canvas.height = rows * GLYPH_PX;

    const g = canvas.getContext("2d");
    if (g) {
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = "#fff";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = fontStr;
        for (let i = 0; i < chars.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = col * cellW + cellW / 2;
            const cy = row * GLYPH_PX + GLYPH_PX / 2;
            // Clip to the cell so ink that overshoots the advance can't bleed
            // into the next cell (extra guard on top of the max-advance width).
            g.save();
            g.beginPath();
            g.rect(col * cellW, row * GLYPH_PX, cellW, GLYPH_PX);
            g.clip();
            g.fillText(chars[i], cx, cy);
            g.restore();
        }
    }
    return { canvas, cols, rows, cellW, cellH: GLYPH_PX };
}

// --- Trail-colour gradient -------------------------------------------------
//
// The trail colour is one colour or a list of stops, passed straight to the
// shader as sRGB; OKLCH interpolation happens on the GPU (see `oklchMix`).

/** Is the value a list of colour stops (vs. a single RGBA colour)? */
function isColorStops(c: MatrixTrailColor): c is MatrixColor[] {
    return Array.isArray(c[0]);
}

/** Normalize the trail-colour param to a non-empty stop list. */
function resolveColorStops(c: MatrixTrailColor): MatrixColor[] {
    if (isColorStops(c)) {
        return c.length > 0 ? c : [DEFAULT_PARAMS.color as MatrixColor];
    }
    return [c as MatrixColor];
}

/**
 * Pack the stops into the shader's fixed-size `vec4[MAX_STOPS]` uniform
 * (extra stops past the cap are dropped). Returns the flat array and the
 * active stop count.
 */
function buildStops(c: MatrixTrailColor): {
    data: Float32Array;
    count: number;
} {
    const stops = resolveColorStops(c).slice(0, MAX_STOPS);
    const data = new Float32Array(MAX_STOPS * 4);
    for (let i = 0; i < stops.length; i++) {
        data.set(stops[i], i * 4);
    }
    return { data, count: stops.length };
}

/**
 * "Digital rain" / Matrix-movie effect.
 *
 * @example
 * ```ts
 * vfx.add(el, { effect: new MatrixEffect({ grid: [12, 16] }) });
 * vfx.add(el, { effect: new MatrixEffect({ glyphs: "01", color: [0, 1, 0, 1] }) });
 * ```
 *
 * Splits the element into a grid and rains a random glyph down each column,
 * with a bright leading tip and a fading green trail. The source image's
 * grayscale is multiplied into the rain, so the picture emerges from the
 * falling characters.
 *
 * `grid`, `color`, `headColor`, `background`, `speed`, `tail`, `tailFade`,
 * `birthRate`, `glyphSpeed`, `brightness`, `contrast`, `invert`, and `seed`
 * are live (read every frame). `glyphs` / `font` / `fontWeight` / `charAspect` are
 * baked into the atlas at `init()` — after changing them via `setParams`,
 * call {@link MatrixEffect.updateAtlas} (or re-add the effect) to rebuild.
 */
export class MatrixEffect implements Effect {
    params: MatrixParams;

    #atlas: EffectTexture | null = null;
    #cols = 1;
    #rows = 1;
    #glyphCount = 1;
    #glyphAspect = 1;
    #ctx: EffectContext | null = null;

    // Cached packed gradient stops, rebuilt only when `color` changes.
    #stops = buildStops(DEFAULT_PARAMS.color);
    #colorKey = "";

    constructor(initial: Partial<MatrixParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<MatrixParams>): void {
        Object.assign(this.params, updates);
    }

    async init(ctx: EffectContext): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        this.#ctx = ctx;
        await this.#build(ctx);
    }

    /**
     * Rebuild the atlas from the current params, applying changes to the
     * baked fields (`glyphs` / `font` / `fontWeight` / `charAspect`) without
     * removing and re-adding the effect. Async — it may load fonts. No-op
     * before `init()`.
     *
     * Allocates a fresh atlas texture and disposes the previous one once the
     * swap is live, so repeated calls don't leak. Still rasterises the
     * atlas, so prefer occasional calls (e.g. on a settings change) over
     * per-frame use.
     */
    async updateAtlas(): Promise<void> {
        if (!this.#ctx) {
            return;
        }
        await this.#build(this.#ctx);
    }

    async #build(ctx: EffectContext): Promise<void> {
        const chars = resolveGlyphs(this.params.glyphs ?? MATRIX_GLYPHS);
        if (chars.length === 0) {
            console.warn(
                "[VFX-JS] MatrixEffect: empty glyph pool; nothing will be rendered.",
            );
        }
        this.#glyphCount = Math.max(1, chars.length);
        await ensureFont(this.params.font, this.params.fontWeight);
        const built = buildAtlas(
            chars,
            this.params.font,
            this.params.fontWeight,
            this.params.charAspect,
        );

        // Swap in the new atlas, then free the old one. Disposing after the
        // swap means any render() that ran between the awaits above still
        // sampled the previous, valid texture. No-op on the first build.
        const previous = this.#atlas;
        this.#cols = built.cols;
        this.#rows = built.rows;
        this.#glyphAspect = built.cellW / built.cellH;
        this.#atlas = ctx.wrapTexture(built.canvas, {
            autoUpdate: false,
            filter: "linear",
        });
        previous?.dispose();
    }

    render(ctx: EffectContext): void {
        if (!this.#atlas) {
            return;
        }
        const [ew, eh] = ctx.dims.elementPixel;
        const [gx, gy] = resolveGrid(this.params.grid);
        const cellPx: [number, number] = [
            Math.max(1, gx) * ctx.pixelRatio,
            Math.max(1, gy) * ctx.pixelRatio,
        ];
        // Re-pack the gradient stops only when `color` actually changes.
        const colorKey = JSON.stringify(this.params.color);
        if (colorKey !== this.#colorKey) {
            this.#stops = buildStops(this.params.color);
            this.#colorKey = colorKey;
        }
        ctx.draw({
            frag: FRAG_MATRIX,
            uniforms: {
                src: ctx.src,
                atlas: this.#atlas,
                elementPx: [Math.max(1, ew), Math.max(1, eh)],
                cellPx,
                cols: this.#cols,
                rows: this.#rows,
                glyphCount: this.#glyphCount,
                glyphAspect: this.#glyphAspect,
                time: ctx.time,
                colorStops: this.#stops.data,
                colorStopCount: this.#stops.count,
                headColor: this.params.headColor,
                background: this.params.background,
                speed: this.params.speed,
                tail: Math.max(1, this.params.tail),
                tailFade: Math.min(1, Math.max(0, this.params.tailFade)),
                birthRate: Math.max(0, this.params.birthRate),
                glyphSpeed: Math.max(0, this.params.glyphSpeed),
                brightness: Math.max(0, this.params.brightness),
                contrast: Math.max(0, this.params.contrast),
                invert: this.params.invert ? 1 : 0,
                seed: this.params.seed,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#atlas?.dispose();
        this.#atlas = null;
        this.#ctx = null;
    }
}
