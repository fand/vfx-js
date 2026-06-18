// "Digital rain" — the Matrix-movie effect. Splits the element into a grid
// of cells and rains random glyphs down each column, with a bright leading
// tip and a fading trail. Unlike AsciiEffect, the glyph in each cell is
// chosen at random (not looked up from luminance); the source image's
// grayscale is simply multiplied into the rain, so the picture emerges from
// the falling characters. Glyphs are rendered from a real font into an
// atlas at init.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
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

// Number of samples in the precomputed trail-colour ramp. The gradient is
// interpolated in OKLCH on the CPU into this many RGBA stops; the shader does
// a cheap linear lookup between them. 32 is dense enough that the residual
// linear-RGB interpolation between samples is visually indistinguishable.
const RAMP_SIZE = 32;

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
uniform vec4 colorRamp[${RAMP_SIZE}]; // trail-colour gradient, top→bottom
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

// Box-average TAPS x TAPS source samples per cell so the luminance is
// representative of the whole cell, not a single point.
const int TAPS = 4;

// Sample the trail-colour ramp at t in [0, 1] (0 = drop head, 1 = tail end).
vec4 sampleColorRamp(float t) {
    float f = clamp(t, 0.0, 1.0) * float(${RAMP_SIZE} - 1);
    float i0 = floor(f);
    int idx = int(i0);
    int idx1 = min(idx + 1, ${RAMP_SIZE} - 1);
    return mix(colorRamp[idx], colorRamp[idx1], f - i0);
}

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

// Hash without sine (Dave Hoskins). Stable across GPUs, unlike sin-based
// hashes that drift with precision.
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

    // Work in a top-down pixel frame so columns fall cleanly from the top
    // edge (uvContent.y == 1 is the top; flip it to measure downward).
    vec2 fragPx = uvContent * elementPx;
    vec2 topPx = vec2(fragPx.x, elementPx.y - fragPx.y);

    // Anchor the grid at the element (srcRect) centre so cells are symmetric
    // about the middle and any partial cells split evenly between opposite
    // edges (matching AsciiEffect), instead of growing from a corner.
    vec2 gridOrigin = elementPx * 0.5;
    vec2 cellIdx = floor((topPx - gridOrigin) / cellPx);
    vec2 cellOriginTop = gridOrigin + cellIdx * cellPx;
    float colId = cellIdx.x;
    // Row distance from the top edge (topmost cell == 0, growing downward) so
    // drops are still born at the top wherever the centred grid lands.
    float topRow = floor(-gridOrigin.y / cellPx.y);
    float rowTopId = cellIdx.y - topRow;

    // Per-column drop train. Each column gets its own fall speed and phase,
    // and births a new falling stream roughly every 1 / birthRate seconds
    // (jittered so they don't tick in lockstep).
    float colSpeed = max(0.0001, speed * mix(0.5, 1.5, hash11(colId * 1.37 + 3.1)));
    float colPhase = hash11(colId * 0.71 + 7.3);
    float spawnInterval = 1.0 / max(birthRate, 0.0001);

    // A drop lights this cell while its head is within tail cells below it,
    // i.e. it was born around (time - rowTopId / colSpeed) seconds ago.
    // Centre the (small, fixed) scan on the drop whose head is at this cell
    // — NOT on the newest drop — so deep cells still find the older drops
    // that have reached them. Otherwise a high birthRate floods the window
    // with young drops and the rain appears to die before hitting the bottom.
    //
    // The window is a fixed 5 drops back from the head. When drops overlap
    // more densely than that — roughly when tail / (spawnInterval * colSpeed)
    // exceeds 5, e.g. a high birthRate with a long tail — the dim end of the
    // trail falls outside the window and the tail reads shorter than the
    // tail length. Cosmetic only (no flicker/popping); widen the loop if
    // longer tails are needed at extreme densities.
    // Find the front-most drop covering this cell — the one whose head is
    // closest above (smallest d). bestD < 0 means no drop reaches here.
    float bestD = -1.0;
    float headSlot = (time - rowTopId / colSpeed) / spawnInterval - colPhase;
    float kStart = floor(headSlot) + 1.0;
    for (int i = 0; i < 5; i++) {
        float kk = kStart - float(i);
        // Birth time of drop kk, jittered within ±0.3 of its slot.
        float jit = (hash11(kk * 3.7 + colId * 1.9) - 0.5) * 0.6;
        float tb = (kk + colPhase + jit) * spawnInterval;
        float elapsed = time - tb;
        if (elapsed < 0.0) {
            continue;   // not born yet
        }
        // Cells behind this drop's head: the head has passed cells above it
        // (d >= 0), which form the trail; cells below it are dark.
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
        // Sharpened falloff toward the tail. tailFade scales it in, so
        // tailFade = 0 keeps the trail at full brightness and the user fades
        // it via the colour gradient instead; tailFade = 1 is the classic
        // bright-head / dim-tail look.
        float fade = pow(1.0 - bestD / tail, 1.5);
        trail = mix(1.0, fade, tailFade);
        // Leading glyph: blend toward headColor over the first ~2 cells.
        headMix = clamp(1.0 - bestD * 0.6, 0.0, 1.0);
        gradT = clamp(bestD / tail, 0.0, 1.0);
    }

    // Random glyph for this cell, reshuffled over time in discrete steps. A
    // per-column phase keeps neighbouring columns out of sync.
    float gstep = floor(time * glyphSpeed + hash11(colId) * 17.0);
    float gi = hash13(vec3(colId, rowTopId, gstep));
    float idx = clamp(floor(gi * glyphCount), 0.0, glyphCount - 1.0);

    // Atlas cell for this glyph (top-row origin; texture is uploaded
    // Y-flipped, hence the 1.0 - ... on v below).
    float acol = mod(idx, cols);
    float arowTop = floor(idx / cols);

    // Contain-fit the glyph into the cell, preserving its native aspect, so
    // a non-square cell letterboxes the glyph instead of stretching it.
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

    // Source luminance for this cell (box-averaged), multiplied into the
    // rain so the picture shows through the falling glyphs.
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
    // Contrast about the 0.5 mid-grey: < 1 flattens, > 1 deepens the
    // separation between dark and bright source regions.
    lum = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Trail colour from the gradient ramp, mapped along the drop's trail
    // (0 at the head, 1 at the tail end).
    vec4 trailColor = sampleColorRamp(gradT);

    // Glyph coverage x trail x source grayscale: the rain only lights up
    // where the picture is bright. Transparent source (e.g. text captures)
    // falls back to the background via acc.a.
    vec3 hue = mix(trailColor.rgb, headColor.rgb, headMix);
    // Blend the opacity toward headColor's alpha over the head, mirroring the
    // hue blend, so headColor's alpha isn't silently dropped.
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
            // Clip to the cell so any ink that overshoots the advance can't
            // bleed into adjacent cells (belt-and-braces over the max-advance
            // cell width above).
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

// --- Trail-colour gradient (OKLCH) -----------------------------------------
//
// The trail colour can be a single colour or a list of stops. We interpolate
// the stops in OKLCH (perceptually uniform, with hue taking the shortest path
// around the wheel) and bake the result into a small RGBA ramp the shader can
// sample cheaply. sRGB <-> OKLab uses Björn Ottosson's coefficients.

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

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v));
}

/** sRGB RGBA → OKLCH `[L, C, hueRadians, alpha]`. */
function rgbaToOklch([r, g, b, a]: MatrixColor): [
    number,
    number,
    number,
    number,
] {
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    return [L, Math.hypot(A, B), Math.atan2(B, A), a];
}

/** OKLCH `[L, C, hueRadians, alpha]` → sRGB RGBA (clamped). */
function oklchToRgba([L, C, H, a]: [
    number,
    number,
    number,
    number,
]): MatrixColor {
    const A = C * Math.cos(H);
    const B = C * Math.sin(H);
    const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = L - 0.0894841775 * A - 1.291485548 * B;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b), a];
}

/** Interpolate two OKLCH colours at `t`, hue via the shortest path. */
function mixOklch(
    c0: [number, number, number, number],
    c1: [number, number, number, number],
    t: number,
): [number, number, number, number] {
    // Achromatic endpoints have a "powerless" hue: borrow the other's so the
    // gradient doesn't swing through unrelated hues (matches CSS oklch).
    let h0 = c0[2];
    let h1 = c1[2];
    if (c0[1] < 1e-4) {
        h0 = h1;
    }
    if (c1[1] < 1e-4) {
        h1 = h0;
    }
    let dh = h1 - h0;
    while (dh > Math.PI) {
        dh -= 2 * Math.PI;
    }
    while (dh < -Math.PI) {
        dh += 2 * Math.PI;
    }
    return [
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        h0 + dh * t,
        c0[3] + (c1[3] - c0[3]) * t,
    ];
}

/**
 * Bake colour stops into a flat `RAMP_SIZE`×RGBA `Float32Array`, interpolated
 * in OKLCH. Stops are spaced evenly across [0, 1].
 */
function buildColorRamp(stops: MatrixColor[]): Float32Array {
    const out = new Float32Array(RAMP_SIZE * 4);
    if (stops.length === 1) {
        const [r, g, b, a] = stops[0];
        for (let i = 0; i < RAMP_SIZE; i++) {
            out.set([r, g, b, a], i * 4);
        }
        return out;
    }
    const lch = stops.map(rgbaToOklch);
    const segs = stops.length - 1;
    for (let i = 0; i < RAMP_SIZE; i++) {
        const f = (i / (RAMP_SIZE - 1)) * segs;
        const si = Math.min(Math.floor(f), segs - 1);
        const rgba = oklchToRgba(mixOklch(lch[si], lch[si + 1], f - si));
        out.set(rgba, i * 4);
    }
    return out;
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
 * `birthRate`, `glyphSpeed`, `brightness`, `contrast`, and `invert` are live
 * (read every frame). `glyphs` / `font` / `fontWeight` / `charAspect` are
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

    // Cached trail-colour ramp, rebuilt only when `color` changes.
    #colorRamp: Float32Array = buildColorRamp(
        resolveColorStops(DEFAULT_PARAMS.color),
    );
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
        // Rebuild the OKLCH colour ramp only when `color` actually changes.
        const colorKey = JSON.stringify(this.params.color);
        if (colorKey !== this.#colorKey) {
            this.#colorRamp = buildColorRamp(
                resolveColorStops(this.params.color),
            );
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
                colorRamp: this.#colorRamp,
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
