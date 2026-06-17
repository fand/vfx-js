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
uniform vec4 color;          // trail colour, non-premultiplied
uniform vec4 headColor;      // leading-glyph colour, non-premultiplied
uniform vec4 background;     // cell backdrop, non-premultiplied
uniform float speed;         // base fall speed, cells / second
uniform float tail;          // trail length, cells
uniform float glyphSpeed;    // glyph reshuffle rate, changes / second
uniform float brightness;    // overall gain on the rain
uniform int invert;          // 1 = flip source luminance

// Box-average TAPS x TAPS source samples per cell so the luminance is
// representative of the whole cell, not a single point.
const int TAPS = 4;

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
    float nrows = max(1.0, floor(elementPx.y / cellPx.y));
    vec2 cellIdx = floor(topPx / cellPx);   // .x = column, .y = row from top
    float colId = cellIdx.x;
    float rowTopId = cellIdx.y;

    // Per-column falling head. Each column gets its own speed and phase so
    // the streams don't move in lockstep. The period is nrows + tail, so a
    // stream fully clears the bottom before re-entering at the top.
    float period = nrows + tail;
    float colSpeed = speed * mix(0.5, 1.5, hash11(colId * 1.37 + 3.1));
    float phase = hash11(colId * 0.71 + 7.3) * period;
    float head = mod(time * colSpeed + phase, period);

    // Distance behind the head, in cells. Cells the head has passed (above
    // it) form the fading trail; cells below it are dark.
    float d = head - rowTopId;
    float trail = (d >= 0.0 && d <= tail) ? (1.0 - d / tail) : 0.0;
    // Sharpen the falloff so the head reads as a bright tip with a long,
    // dim tail rather than a flat gradient.
    trail = pow(trail, 1.5);
    // Leading glyph: blend toward headColor over the first ~2 cells.
    float headMix = clamp(1.0 - d * 0.6, 0.0, 1.0) * step(0.0, d);

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
    vec2 local = fract(topPx / cellPx);       // 0 at the cell's top-left
    vec2 luv = vec2(local.x, 1.0 - local.y);  // bottom-up for upright glyphs
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
    vec2 cellOriginTop = cellIdx * cellPx;
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
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Glyph coverage x trail x source grayscale: the rain only lights up
    // where the picture is bright. Transparent source (e.g. text captures)
    // falls back to the background via acc.a.
    vec3 hue = mix(color.rgb, headColor.rgb, headMix);
    float fgA = clamp(cover * trail * lum * acc.a * color.a * brightness, 0.0, 1.0);

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

    /** Trail colour — the classic phosphor green. */
    color: MatrixColor;

    /** Leading-glyph colour at the head of each stream (usually near-white). */
    headColor: MatrixColor;

    /** Cell backdrop behind the rain, non-premultiplied. */
    background: MatrixColor;

    /** Base fall speed in cells per second. Per-column randomised ±50%. */
    speed: number;

    /** Trail length in cells (how far the fade extends behind the head). */
    tail: number;

    /** Glyph reshuffle rate in changes per second (`0` = static glyphs). */
    glyphSpeed: number;

    /** Overall gain on the rain brightness. */
    brightness: number;

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
    glyphSpeed: 8,
    brightness: 1,
    invert: false,
};

// Atlas glyph cell height (physical px). Oversized vs. typical on-screen
// cells so linear minification keeps glyphs crisp. Cell width tracks the
// font's advance so glyphs sit flush horizontally.
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
 * square grid. Cell height is `GLYPH_PX`; cell width tracks the font's
 * advance. White glyphs on transparent; the shader reads coverage from the
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
            cellW = Math.max(1, Math.ceil(probe.measureText("M").width));
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
            const cx = (i % cols) * cellW + cellW / 2;
            const cy = Math.floor(i / cols) * GLYPH_PX + GLYPH_PX / 2;
            g.fillText(chars[i], cx, cy);
        }
    }
    return { canvas, cols, rows, cellW, cellH: GLYPH_PX };
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
 * `grid`, `color`, `headColor`, `background`, `speed`, `tail`, `glyphSpeed`,
 * `brightness`, and `invert` are live (read every frame). `glyphs` / `font`
 * / `fontWeight` / `charAspect` are baked into the atlas at `init()` — after
 * changing them via `setParams`, call {@link MatrixEffect.updateAtlas} (or
 * re-add the effect) to rebuild.
 */
export class MatrixEffect implements Effect {
    params: MatrixParams;

    #atlas: EffectTexture | null = null;
    #cols = 1;
    #rows = 1;
    #glyphCount = 1;
    #glyphAspect = 1;
    #ctx: EffectContext | null = null;

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

        this.#cols = built.cols;
        this.#rows = built.rows;
        this.#glyphAspect = built.cellW / built.cellH;
        this.#atlas = ctx.wrapTexture(built.canvas, {
            autoUpdate: false,
            filter: "linear",
        });
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
                color: this.params.color,
                headColor: this.params.headColor,
                background: this.params.background,
                speed: this.params.speed,
                tail: Math.max(1, this.params.tail),
                glyphSpeed: Math.max(0, this.params.glyphSpeed),
                brightness: Math.max(0, this.params.brightness),
                invert: this.params.invert ? 1 : 0,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#atlas = null;
        this.#ctx = null;
    }
}
