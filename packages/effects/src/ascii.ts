// ASCII / glyph mosaic. Splits the element into a grid of cells, reads
// each cell's average luminance, and stamps a character from a dark→light
// lookup table — rendered from a real font into a glyph atlas at init.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext, EffectTexture } from "@vfx-js/core";

/** RGBA colour, each channel in [0, 1]. */
export type AsciiColor = [number, number, number, number];

/**
 * A character ramp ordered **dark → light**: index `0` maps to the
 * darkest input luminance, the last entry to the brightest. Pass a
 * string (split per Unicode code point) or an array of single chars.
 */
export type AsciiCharRamp = string | readonly string[];

/** Name of a built-in {@link ASCII_PRESETS} ramp. */
export type AsciiPresetName =
    | "standard"
    | "simple"
    | "minimal"
    | "blocks"
    | "dots"
    | "circles"
    | "detailed";

/**
 * Built-in character ramps, ordered dark → light. Suited for
 * light-on-dark output (more "ink" = brighter); flip with
 * `invert: true` for dark-on-light.
 */
export const ASCII_PRESETS: Record<AsciiPresetName, string> = {
    // Paul Bourke's classic 10-level ramp.
    standard: " .:-=+*#%@",
    // Compact ramp close to a typical hand-picked set.
    simple: " .:-=+$#",
    minimal: " .#",
    // Unicode shade blocks — smooth, font-independent gradient.
    blocks: " ░▒▓█",
    // Round symbols growing from a dot to a filled bullet.
    dots: " .·•●",
    // Outline → filled circles (the ◯ … ● family).
    circles: " ◌○◉●",
    // Paul Bourke's 70-level ramp (reversed to dark → light).
    detailed:
        " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
};

const FRAG_ASCII = `#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D atlas;
uniform vec4 srcRectUv;
uniform vec2 elementPx;     // element size, physical px
uniform vec2 cellPx;        // cell size, physical px
uniform float cols;         // atlas columns
uniform float rows;         // atlas rows
uniform float charCount;    // number of glyphs in the ramp
uniform vec4 color;         // fixed glyph colour (when colorFromSource == 0)
uniform vec4 background;     // cell backdrop, non-premultiplied
uniform int colorFromSource; // 1 = tint glyph with the cell's avg colour
uniform int invert;          // 1 = flip the luminance → glyph mapping
uniform float glyphAspect;   // font's character box aspect (advance / em)

// Box-average TAPS x TAPS samples per cell. A single centre tap throws
// away most of the cell; this keeps the glyph choice representative.
const int TAPS = 4;

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    vec2 fragPx = uvContent * elementPx;
    vec2 cellIdx = floor(fragPx / cellPx);
    vec2 cellOriginPx = cellIdx * cellPx;

    vec4 acc = vec4(0.0);
    for (int y = 0; y < TAPS; ++y) {
        for (int x = 0; x < TAPS; ++x) {
            vec2 o = (vec2(float(x), float(y)) + 0.5) / float(TAPS);
            vec2 samplePx = cellOriginPx + o * cellPx;
            acc += readSrc(samplePx / elementPx);
        }
    }
    acc /= float(TAPS * TAPS);

    float lum = dot(acc.rgb, vec3(0.299, 0.587, 0.114));
    if (invert == 1) {
        lum = 1.0 - lum;
    }

    // Pick the glyph and its cell in the atlas (top-row origin in canvas
    // space; the texture is uploaded Y-flipped, hence the 1.0 - ... on v).
    float idx = clamp(floor(lum * charCount), 0.0, charCount - 1.0);
    float col = mod(idx, cols);
    float rowTop = floor(idx / cols);

    // Fit the glyph's character box into the cell with its native
    // aspect preserved (contain): scale by the limiting axis and centre,
    // so a wide cell letterboxes left/right and a tall cell top/bottom
    // instead of stretching the glyph to the cell's aspect.
    vec2 local = fract(fragPx / cellPx);
    float cellAspect = cellPx.x / cellPx.y;
    vec2 frac = min(vec2(1.0), vec2(glyphAspect / cellAspect, cellAspect / glyphAspect));
    vec2 gloc = (local - 0.5) / frac + 0.5;

    float glyph = 0.0;
    if (gloc.x >= 0.0 && gloc.x <= 1.0 && gloc.y >= 0.0 && gloc.y <= 1.0) {
        float u = (col + gloc.x) / cols;
        float v = 1.0 - (rowTop + 1.0 - gloc.y) / rows;
        glyph = texture(atlas, vec2(u, v)).a;
    }

    vec3 fg = colorFromSource == 1 ? acc.rgb : color.rgb;
    // Fade glyph coverage by the cell's source alpha so transparent
    // regions (e.g. text captures) fall back to the background.
    float fgA = color.a * glyph * acc.a;

    float outA = fgA + background.a * (1.0 - fgA);
    vec3 premul = fg * fgA + background.rgb * background.a * (1.0 - fgA);
    outColor = vec4(premul, outA);
}
`;

export type AsciiParams = {
    /**
     * Cell size in CSS px. A single number is a square cell; a
     * `[width, height]` tuple sets the axes independently.
     *
     * Glyphs always keep their native aspect ratio — a cell wider/taller
     * than the character box letterboxes the glyph rather than stretching
     * it. Set the cell to the font's character aspect (≈ advance : em, so
     * cells narrower than they are tall) for gap-free tiling.
     */
    grid: number | [number, number];

    /**
     * Character ramp, ordered dark → light. Overrides {@link preset}.
     *
     * Baked into the glyph atlas at `init()`; changing it (or `font` /
     * `fontWeight`) after the effect is added has no effect until it is
     * re-added.
     */
    chars?: AsciiCharRamp;

    /** Built-in ramp to use when {@link chars} is omitted. */
    preset: AsciiPresetName;

    /**
     * CSS font family used to render the glyph atlas (e.g. `"monospace"`,
     * `"Helvetica"`). Loaded via the Font Loading API before the atlas is
     * built. Construction-time only (see {@link chars}).
     */
    font: string;

    /**
     * CSS font weight for the glyph atlas — a keyword (`"normal"`,
     * `"bold"`) or numeric weight (`100`–`900`). Construction-time only
     * (see {@link chars}).
     */
    fontWeight: string | number;

    /** Fixed glyph colour, used when {@link colorFromSource} is `false`. */
    color: AsciiColor;

    /** Cell backdrop behind the glyphs, non-premultiplied. */
    background: AsciiColor;

    /** Tint each glyph with the average colour of its source cell. */
    colorFromSource: boolean;

    /** Flip the luminance → glyph mapping (for dark-on-light output). */
    invert: boolean;
};

const DEFAULT_PARAMS: AsciiParams = {
    grid: 12,
    preset: "standard",
    font: "monospace",
    fontWeight: "normal",
    color: [1, 1, 1, 1],
    background: [0, 0, 0, 0],
    colorFromSource: false,
    invert: false,
};

// Atlas glyph cell height (physical px). Fixed and oversized vs. typical
// on-screen cells so linear minification keeps glyphs crisp. Cell width
// is measured from the font's advance so glyphs sit flush horizontally.
const GLYPH_PX = 64;

/**
 * Split a ramp into single-character cells (per Unicode code point).
 */
function resolveChars(ramp: AsciiCharRamp): string[] {
    return Array.isArray(ramp) ? [...ramp] : Array.from(ramp as string);
}

/** Normalize `grid` to a `[width, height]` pair in CSS px. */
function resolveGrid(grid: number | [number, number]): [number, number] {
    return typeof grid === "number" ? [grid, grid] : grid;
}

/**
 * Best-effort wait for `font` to be ready before rasterising the atlas,
 * so the first build doesn't fall back to a system font. No-op outside
 * the browser / when the Font Loading API is unavailable.
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

/**
 * Render the ramp into a single glyph atlas canvas, laid out as a near-
 * square grid of cells. Cell height is `GLYPH_PX`; cell width tracks the
 * font's advance so glyphs sit flush (no baked-in side bearings that
 * would show as wide gaps on screen). White glyphs on transparent; the
 * shader reads coverage from the alpha channel.
 */
function buildAtlas(
    chars: string[],
    font: string,
    weight: string | number,
): {
    canvas: HTMLCanvasElement;
    cols: number;
    rows: number;
    /** Character box aspect (cell advance / em height). */
    aspect: number;
} {
    const n = Math.max(1, chars.length);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const fontStr = `${weight} ${GLYPH_PX}px ${font}`;

    const canvas = document.createElement("canvas");
    // Measure the advance first (resizing the canvas later resets state).
    let cellW = GLYPH_PX;
    const probe = canvas.getContext("2d");
    if (probe) {
        probe.font = fontStr;
        cellW = Math.max(1, Math.ceil(probe.measureText("M").width));
    }
    const aspect = cellW / GLYPH_PX;

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
    return { canvas, cols, rows, aspect };
}

/**
 * ASCII / glyph-mosaic effect.
 *
 * @example
 * ```ts
 * vfx.add(el, { effect: new AsciiEffect({ font: "Helvetica", grid: 16 }) });
 * vfx.add(el, { effect: new AsciiEffect({ chars: [" ", ".", "+", "#"] }) });
 * ```
 *
 * Glyphs keep their native aspect ratio regardless of the `grid` ratio:
 * each is fitted (contain) into its cell, so a non-square cell letterboxes
 * rather than stretching the character. Match `grid` to the font's
 * character box (≈ advance : em) for gap-free tiling.
 *
 * `grid`, `color`, `background`, `colorFromSource`, and `invert` are live
 * (read every frame). `chars` / `font` / `fontWeight` are baked into the
 * glyph atlas at `init()` — change them by re-adding the effect.
 */
export class AsciiEffect implements Effect {
    params: AsciiParams;

    #atlas: EffectTexture | null = null;
    #cols = 1;
    #rows = 1;
    #charCount = 1;
    #glyphAspect = 1;

    constructor(initial: Partial<AsciiParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<AsciiParams>): void {
        Object.assign(this.params, updates);
    }

    async init(ctx: EffectContext): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        const chars = resolveChars(
            this.params.chars ?? ASCII_PRESETS[this.params.preset],
        );
        this.#charCount = Math.max(1, chars.length);

        await ensureFont(this.params.font, this.params.fontWeight);

        const { canvas, cols, rows, aspect } = buildAtlas(
            chars,
            this.params.font,
            this.params.fontWeight,
        );
        this.#cols = cols;
        this.#rows = rows;
        this.#glyphAspect = aspect;
        this.#atlas = ctx.wrapTexture(canvas, {
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
            frag: FRAG_ASCII,
            uniforms: {
                src: ctx.src,
                atlas: this.#atlas,
                elementPx: [Math.max(1, ew), Math.max(1, eh)],
                cellPx,
                cols: this.#cols,
                rows: this.#rows,
                charCount: this.#charCount,
                glyphAspect: this.#glyphAspect,
                color: this.params.color,
                background: this.params.background,
                colorFromSource: this.params.colorFromSource ? 1 : 0,
                invert: this.params.invert ? 1 : 0,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#atlas = null;
    }
}
