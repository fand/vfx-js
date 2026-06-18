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

/**
 * An image tile source. Strings are treated as URLs (loaded and decoded
 * in `init()`); the rest are used directly.
 */
export type AsciiImageSource =
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | string;

/** Name of a built-in {@link ASCII_PRESETS} ramp. */
export type AsciiPresetName =
    | "standard"
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
    // Paul Bourke's short 10-step grey-scale ramp, reversed to dark → light.
    // ref. https://paulbourke.net/dataformats/asciiart/
    standard: " .:-=+*#%@",
    minimal: " .#",
    // Unicode shade blocks — smooth, font-independent gradient.
    blocks: " ░▒▓█",
    // Round symbols growing from a dot to a filled bullet.
    dots: " .·•●",
    // Outline → filled circles (the ◯ … ● family).
    circles: " ◌○◉●",
    // Paul Bourke's 70-step grey-scale ramp, reversed to dark → light.
    // ref. https://paulbourke.net/dataformats/asciiart/
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
uniform int tileColor;       // 1 = use the atlas tile's own RGBA (image tiles)
uniform float dither;        // ordered-dither amount in index units (0 = off)
uniform vec2 atlasCellPx;    // atlas cell size in texels (for edge inset)

// Box-average TAPS x TAPS samples per cell. A single centre tap throws
// away most of the cell; this keeps the glyph choice representative.
const int TAPS = 4;

vec4 readSrc(vec2 contentUv) {
    vec2 p = clamp(contentUv, 0.0, 1.0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

// 4x4 ordered (Bayer) dither threshold in (0, 1), keyed by cell index so
// the offset is constant across a cell (one character per cell).
float bayer4x4(vec2 cell) {
    int x = int(mod(cell.x, 4.0));
    int y = int(mod(cell.y, 4.0));
    float m[16] = float[16](
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
    );
    return (m[y * 4 + x] + 0.5) / 16.0;
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    // Anchor the grid at the element (srcRect) centre so cells are
    // symmetric about the middle instead of growing from the bottom-left
    // corner — any partial cells split evenly between opposite edges.
    vec2 fragPx = uvContent * elementPx;
    vec2 gridOrigin = elementPx * 0.5;
    vec2 rel = fragPx - gridOrigin;
    vec2 cellIdx = floor(rel / cellPx);
    vec2 cellOriginPx = gridOrigin + cellIdx * cellPx;

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
    // Ordered dither perturbs the continuous index by up to ±0.5 cell
    // (at dither == 1), so neighbouring cells round to different glyphs
    // and short ramps gain apparent tonal steps without banding.
    float li = lum * charCount;
    if (dither > 0.0) {
        li += (bayer4x4(cellIdx) - 0.5) * dither;
    }
    float idx = clamp(floor(li), 0.0, charCount - 1.0);
    float col = mod(idx, cols);
    float rowTop = floor(idx / cols);

    // Fit the glyph's character box into the cell with its native
    // aspect preserved (contain): scale by the limiting axis and centre,
    // so a wide cell letterboxes left/right and a tall cell top/bottom
    // instead of stretching the glyph to the cell's aspect.
    vec2 local = fract(rel / cellPx);
    float cellAspect = cellPx.x / cellPx.y;
    vec2 frac = min(vec2(1.0), vec2(glyphAspect / cellAspect, cellAspect / glyphAspect));
    vec2 gloc = (local - 0.5) / frac + 0.5;

    vec4 tile = vec4(0.0);
    if (gloc.x >= 0.0 && gloc.x <= 1.0 && gloc.y >= 0.0 && gloc.y <= 1.0) {
        // Image tiles can fill the cell edge-to-edge, so linear filtering
        // would bleed a neighbouring tile's colour across the shared
        // border — inset the sample by half a texel to stop it. Glyphs
        // have transparent side bearings, so they need no inset.
        vec2 inset = tileColor == 1 ? 0.5 / atlasCellPx : vec2(0.0);
        vec2 g2 = mix(inset, 1.0 - inset, gloc);
        float u = (col + g2.x) / cols;
        float v = 1.0 - (rowTop + 1.0 - g2.y) / rows;
        tile = texture(atlas, vec2(u, v));
    }

    // Image tiles keep their own RGBA; glyph tiles are a coverage mask in
    // .a, tinted by color (or the cell's average colour). The alpha is the
    // same either way: tile coverage x color.a (global opacity) x the
    // cell's source alpha, so transparent regions (e.g. text captures)
    // fall back to the background.
    vec3 fg;
    if (tileColor == 1) {
        fg = tile.rgb;
    } else {
        fg = colorFromSource == 1 ? acc.rgb : color.rgb;
    }
    float fgA = tile.a * color.a * acc.a;

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
     * Image tiles, ordered dark → light — an alternative to character
     * glyphs. Takes precedence over {@link chars} / {@link preset} when
     * non-empty. Each tile keeps its own colour (the `color` RGB /
     * `colorFromSource` tint is bypassed, though `color`'s alpha still
     * scales opacity), is contain-fitted into the cell at a shared aspect
     * (taken from the first tile), and the atlas is auto-downscaled to
     * stay within GPU texture limits.
     *
     * Baked into the atlas at `init()`; change by re-adding the effect.
     */
    tiles?: readonly AsciiImageSource[];

    /**
     * CSS font family used to render the glyph atlas (e.g. `"monospace"`,
     * `"Helvetica"`). Loaded via the Font Loading API before the atlas is
     * built. Construction-time only (see {@link chars}).
     */
    font: string;

    /**
     * Character box aspect ratio (width / height) used to keep glyphs
     * undistorted when the cell is non-square.
     *
     * Omit (default) to auto-measure it from the font — the glyph advance
     * (`measureText`) over the em height. That is exact for monospace
     * fonts; set it explicitly for proportional fonts, non-browser
     * builds, or to force a specific look (e.g. `0.5` for tall, narrow
     * characters). Construction-time only (see {@link chars}).
     */
    charAspect?: number;

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

    /**
     * Ordered (Bayer 4×4) dithering amount, [0, 1]. `0` disables it; `1`
     * spreads each quantisation step across a full ramp level so short
     * ramps (e.g. `minimal`, `dots`) render smooth gradients instead of
     * hard bands. Applied per cell, so each character stays consistent.
     */
    dither: number;
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
    dither: 0,
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

/** Result of building an atlas: the canvas plus its grid + cell metrics. */
type AtlasBuild = {
    canvas: HTMLCanvasElement;
    cols: number;
    rows: number;
    /** Cell size in atlas px (width / height gives the character aspect). */
    cellW: number;
    cellH: number;
};

/**
 * Render the ramp into a single glyph atlas canvas, laid out as a near-
 * square grid of cells. Cell height is `GLYPH_PX`; cell width tracks the
 * widest glyph's advance so glyphs sit flush (no baked-in side bearings
 * that would show as wide gaps on screen) yet wide glyphs (e.g. full-width
 * CJK) stay within their cell. White glyphs on transparent; the shader
 * reads coverage from the alpha channel.
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
    // Cell width = explicit aspect, or the widest glyph's advance (measure
    // first; resizing the canvas later resets context state).
    let cellW: number;
    if (aspectOverride && aspectOverride > 0) {
        cellW = Math.max(1, Math.round(aspectOverride * GLYPH_PX));
    } else {
        const probe = canvas.getContext("2d");
        cellW = GLYPH_PX;
        if (probe) {
            probe.font = fontStr;
            // Size the cell to the widest glyph in the ramp — not a fixed
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

// Upper bound on a single atlas axis (px). The image atlas is scaled to
// fit so it stays within common GPU max-texture-size limits.
const MAX_ATLAS_PX = 2048;
// Upper bound on a single tile cell (px) before the atlas-fit scale.
const MAX_TILE_PX = 256;

/** Intrinsic pixel size of an image source. */
function imageSize(src: CanvasImageSource): [number, number] {
    if (
        typeof HTMLImageElement !== "undefined" &&
        src instanceof HTMLImageElement
    ) {
        return [src.naturalWidth || src.width, src.naturalHeight || src.height];
    }
    const s = src as { width: number; height: number };
    return [s.width || 1, s.height || 1];
}

/** Load a tile source: decode URL strings, pass through ready images. */
async function resolveImage(src: AsciiImageSource): Promise<CanvasImageSource> {
    if (typeof src !== "string") {
        return src;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    try {
        await img.decode();
    } catch {
        // Broken / tainted source — drawImage will just paint nothing.
    }
    return img;
}

/**
 * Render image tiles (dark → light order) into one atlas. All tiles share
 * a single cell aspect (from the first tile) and are contain-fitted so
 * odd sizes letterbox instead of distorting. The cell size is derived
 * from the tallest tile, capped, then the whole atlas is scaled down to
 * fit {@link MAX_ATLAS_PX}.
 */
function buildImageAtlas(images: CanvasImageSource[]): AtlasBuild {
    const n = Math.max(1, images.length);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    const sizes = images.map(imageSize);
    const [w0, h0] = sizes[0] ?? [1, 1];
    const aspect = w0 / Math.max(1, h0);
    const tallest = Math.max(1, ...sizes.map((s) => s[1]));

    let cellH = Math.min(MAX_TILE_PX, Math.max(8, Math.round(tallest)));
    let cellW = Math.max(1, Math.round(cellH * aspect));
    // Shrink uniformly so neither atlas axis exceeds the cap.
    const fit = Math.min(
        1,
        MAX_ATLAS_PX / (cols * cellW),
        MAX_ATLAS_PX / (rows * cellH),
    );
    cellW = Math.max(1, Math.floor(cellW * fit));
    cellH = Math.max(1, Math.floor(cellH * fit));

    const canvas = document.createElement("canvas");
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;

    const g = canvas.getContext("2d");
    if (g) {
        g.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < images.length; i++) {
            const [iw, ih] = sizes[i];
            const s = Math.min(cellW / iw, cellH / ih);
            const dw = iw * s;
            const dh = ih * s;
            const dx = (i % cols) * cellW + (cellW - dw) / 2;
            const dy = Math.floor(i / cols) * cellH + (cellH - dh) / 2;
            g.drawImage(images[i], dx, dy, dw, dh);
        }
    }
    return { canvas, cols, rows, cellW, cellH };
}

/**
 * ASCII / glyph-mosaic effect.
 *
 * @example
 * ```ts
 * vfx.add(el, { effect: new AsciiEffect({ font: "Helvetica", grid: 16 }) });
 * vfx.add(el, { effect: new AsciiEffect({ chars: [" ", ".", "+", "#"] }) });
 * // Image tiles (dark → light), each keeping its own colour:
 * vfx.add(el, { effect: new AsciiEffect({ tiles: ["/0.png", "/1.png"] }) });
 * ```
 *
 * Glyphs keep their native aspect ratio regardless of the `grid` ratio:
 * each is fitted (contain) into its cell, so a non-square cell letterboxes
 * rather than stretching the character. Match `grid` to the font's
 * character box (≈ advance : em) for gap-free tiling.
 *
 * `grid`, `color`, `background`, `colorFromSource`, `invert`, and `dither`
 * are live (read every frame). `chars` / `tiles` / `font` / `fontWeight` /
 * `charAspect` are baked into the atlas at `init()` — after changing them
 * via `setParams`, call {@link AsciiEffect.updateAtlas} (or re-add the
 * effect) to rebuild.
 */
export class AsciiEffect implements Effect {
    params: AsciiParams;

    #atlas: EffectTexture | null = null;
    #cols = 1;
    #rows = 1;
    #charCount = 1;
    #glyphAspect = 1;
    #atlasCellPx: [number, number] = [1, 1];
    #tileColor = false;
    #ctx: EffectContext | null = null;

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
        this.#ctx = ctx;
        await this.#build(ctx);
    }

    /**
     * Rebuild the atlas from the current params, applying changes to the
     * baked fields (`chars` / `tiles` / `font` / `fontWeight` /
     * `charAspect`) without removing and re-adding the effect. Async — it
     * may load fonts or decode image tiles. No-op before `init()`.
     *
     * Allocates a fresh atlas texture and disposes the previous one once the
     * swap is live, so repeated calls don't leak. Still does real work
     * (rasterising / decoding), so prefer occasional calls (e.g. on a
     * settings change) over per-frame use.
     */
    async updateAtlas(): Promise<void> {
        if (!this.#ctx) {
            return;
        }
        await this.#build(this.#ctx);
    }

    async #build(ctx: EffectContext): Promise<void> {
        const tiles = this.params.tiles;
        let built: AtlasBuild;
        if (tiles && tiles.length > 0) {
            const images = await Promise.all(tiles.map(resolveImage));
            this.#charCount = images.length;
            this.#tileColor = true;
            built = buildImageAtlas(images);
        } else {
            if (tiles && tiles.length === 0) {
                console.warn(
                    "[VFX-JS] AsciiEffect: `tiles` is empty; falling back to characters.",
                );
            }
            const chars = resolveChars(
                this.params.chars ?? ASCII_PRESETS[this.params.preset],
            );
            if (chars.length === 0) {
                console.warn(
                    "[VFX-JS] AsciiEffect: empty character ramp; nothing will be rendered.",
                );
            }
            this.#charCount = Math.max(1, chars.length);
            this.#tileColor = false;
            await ensureFont(this.params.font, this.params.fontWeight);
            built = buildAtlas(
                chars,
                this.params.font,
                this.params.fontWeight,
                this.params.charAspect,
            );
        }

        // Swap in the new atlas, then free the old one. Disposing after the
        // swap means any render() that ran between the awaits above still
        // sampled the previous, valid texture. No-op on the first build.
        const previous = this.#atlas;
        this.#cols = built.cols;
        this.#rows = built.rows;
        this.#glyphAspect = built.cellW / built.cellH;
        this.#atlasCellPx = [built.cellW, built.cellH];
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
                atlasCellPx: this.#atlasCellPx,
                tileColor: this.#tileColor ? 1 : 0,
                color: this.params.color,
                background: this.params.background,
                colorFromSource: this.params.colorFromSource ? 1 : 0,
                invert: this.params.invert ? 1 : 0,
                dither: Math.min(1, Math.max(0, this.params.dither)),
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
