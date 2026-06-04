// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// JPEGGlitch: a *real* JPEG glitch, not a shader simulation. Inspired by
// snorpey/glitch-canvas (https://github.com/snorpey/glitch-canvas).
//
// Instead of faking DCT artifacts in a fragment shader, this effect runs
// the source through an actual JPEG codec and corrupts the compressed
// byte stream, exactly like the classic "open a .jpg in a text editor and
// mash the keyboard" trick:
//
//   1. read the element capture back to the CPU (GPU -> ImageData)
//   2. encode it to a real JPEG with the browser's native encoder
//   3. flip random bytes in the entropy-coded scan data (NOT the header,
//      so the file still parses) — the glitch-canvas algorithm
//   4. decode the corrupted JPEG with the browser's native decoder
//   5. upload the decoded result as a texture and draw it
//
// Because the decode is the browser's own tolerant JPEG decoder, the DC
// drift / color-block smears / 8x8 banding are the genuine article rather
// than an approximation.
//
// The encode/decode round trip is asynchronous, so it runs off the render
// loop: each frame just draws the latest decoded result (a wrapped
// canvas texture), and a new glitch is kicked off on a throttle. Until
// the first result is ready the effect passes the source through.
import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";

// Copy ctx.src into the readback RT. `uvSrc` maps the content into the
// buffer (handles a cropped / prior-stage source correctly).
const FRAG_CAPTURE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`;

// Passthrough of the live source to the canvas (used until the first
// glitch result is ready). Premultiplied for the canvas blend.
const FRAG_PASSTHROUGH = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) ||
        any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 c = texture(src, uvSrc);
    outColor = vec4(c.rgb * c.a, c.a);
}
`;

// Draw the decoded glitch canvas (element-sized, upright) to the canvas.
// Sampled by uvContent; premultiplied for the canvas blend.
const FRAG_OUTPUT = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    if (any(lessThan(uvContent, vec2(0.0))) ||
        any(greaterThan(uvContent, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 c = texture(tex, uvContent);
    outColor = vec4(c.rgb * c.a, c.a);
}
`;

export type JPEGGlitchParams = {
    /**
     * JPEG encode quality (0–1). Lower values bake in more blockiness
     * before any corruption is applied. (Default: `0.4`)
     */
    quality: number;

    /**
     * Random seed for the corruption pattern. Drives both the byte values
     * written into the scan stream and where they land. The same seed (with
     * the same other params) always produces the same glitch, so a static
     * frame is reproducible. (Default: `0.25`)
     */
    seed: number;

    /**
     * Number of bytes corrupted across the scan data. More iterations =
     * more, smaller tears spread through the image. (Default: `24`)
     */
    iterations: number;

    /**
     * Re-glitches per second. `0` glitches once and holds a stable frame
     * (re-runs when params change); `> 0` keeps re-corrupting for a live,
     * moving glitch. (Default: `0`)
     */
    speed: number;
};

const DEFAULT_PARAMS: JPEGGlitchParams = {
    quality: 0.4,
    seed: 0.25,
    iterations: 24,
    speed: 0,
};

// When a corruption's random byte value lands at or above this threshold,
// the very first scan byte is clobbered too. See glitchBytes for why.
const TOP_GLITCH_THRESHOLD = 0xc0;

type GlitchCanvas = HTMLCanvasElement | OffscreenCanvas;

// Minimal 2D-context surface common to Canvas/OffscreenCanvas contexts.
type Ctx2D = {
    putImageData(data: ImageData, dx: number, dy: number): void;
    drawImage(
        image: CanvasImageSource,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
    ): void;
    clearRect(x: number, y: number, w: number, h: number): void;
};

function createCanvas(w: number, h: number): GlitchCanvas {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(w, h);
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function get2d(canvas: GlitchCanvas): Ctx2D {
    // Both context flavors satisfy the structural Ctx2D surface above.
    const ctx = (canvas as HTMLCanvasElement).getContext("2d");
    if (!ctx) {
        throw new Error(
            "[VFX-JS] JPEGGlitchEffect: 2D canvas context unavailable",
        );
    }
    return ctx as unknown as Ctx2D;
}

function canvasToJpegBlob(
    canvas: GlitchCanvas,
    quality: number,
): Promise<Blob> {
    if (
        typeof OffscreenCanvas !== "undefined" &&
        canvas instanceof OffscreenCanvas
    ) {
        return canvas.convertToBlob({ type: "image/jpeg", quality });
    }
    const el = canvas as HTMLCanvasElement;
    return new Promise<Blob>((resolve, reject) => {
        el.toBlob(
            (b) =>
                b
                    ? resolve(b)
                    : reject(
                          new Error("[VFX-JS] JPEGGlitchEffect: toBlob failed"),
                      ),
            "image/jpeg",
            quality,
        );
    });
}

// Start of the entropy-coded scan data: scan for the SOS marker (0xFFDA)
// and skip its segment header. Everything before this is JPEG structure
// (markers, quant/Huffman tables, frame header) that must stay intact or
// the native decoder rejects the file outright. Cf. glitch-canvas's
// jpgHeaderLength, but we protect the whole SOS segment so the browser's
// (stricter than glitch-canvas's own) decoder keeps parsing.
function jpegScanStart(bytes: Uint8Array): number {
    for (let i = 2; i + 3 < bytes.length; i++) {
        if (bytes[i] === 0xff && bytes[i + 1] === 0xda) {
            const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
            return Math.min(bytes.length, i + 2 + segLen);
        }
    }
    return Math.min(bytes.length, 417);
}

// mulberry32 PRNG. Hash (seed, variant) into a 32-bit state so the same
// seed (and variant) always replays the same sequence — a static glitch is
// reproducible, while `variant` advances the pattern for animation.
function makeRng(seed: number, variant: number): () => number {
    let a =
        (Math.imul(Math.floor(seed * 0x9e3779b1) | 0, 0x85ebca77) +
            Math.imul(variant + 1, 0xc2b2ae3d)) >>>
        0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Corrupt the entropy-coded scan data. The byte VALUE written is a
// seed-derived random number — JPEG desyncs on any change, so the value is
// effectively arbitrary (there is no meaningful "amount" of it). Positions
// are spread one per segment (à la glitch-canvas), randomized within each
// segment, so the tears cover the whole stream.
//
// Top-row fix: a corruption only affects blocks decoded AFTER it, so the
// top of the image (decoded first) normally stays clean. Whenever a drawn
// value lands at/above TOP_GLITCH_THRESHOLD we also clobber the very first
// scan byte, pushing a tear right to the top.
function glitchBytes(
    bytes: Uint8Array,
    headerLength: number,
    seed: number,
    iterations: number,
    variant: number,
): void {
    const maxIndex = bytes.length - headerLength - 4;
    if (maxIndex <= 1) {
        return;
    }
    const iter = Math.max(1, Math.floor(iterations));
    const rng = makeRng(seed, variant);
    for (let i = 0; i < iter; i++) {
        const min = ((maxIndex / iter) * i) | 0;
        const max = ((maxIndex / iter) * (i + 1)) | 0;
        const delta = Math.max(1, max - min);
        const pos = Math.min(maxIndex, min + ((rng() * delta) | 0));
        const value = (rng() * 256) | 0;
        bytes[headerLength + pos] = value;
        if (value >= TOP_GLITCH_THRESHOLD) {
            bytes[headerLength] = value;
        }
    }
}

/**
 * Real (codec-level) JPEG glitch. Reads the element back to the CPU,
 * re-encodes it as a JPEG with the browser's native encoder, corrupts
 * random bytes in the compressed scan stream, and draws the browser's
 * decode of the broken file — so the artifacts are produced by an actual
 * JPEG decoder rather than approximated in a shader.
 *
 * Mutate `params` directly or via `setParams`. With `speed: 0` the effect
 * settles on a single stable glitched frame and only re-glitches when
 * params change; with `speed > 0` it keeps re-corrupting for a live,
 * animated glitch.
 *
 * Note: the encode/decode round trip is asynchronous and runs off the
 * render loop. The source passes through until the first result lands.
 */
export class JPEGGlitchEffect implements Effect {
    params: JPEGGlitchParams;

    #supported = false;
    #readRT: EffectRenderTarget | null = null;
    #outTex: EffectTexture | null = null;

    #srcCanvas: GlitchCanvas | null = null;
    #srcCtx: Ctx2D | null = null;
    #outCanvas: GlitchCanvas | null = null;
    #outCtx: Ctx2D | null = null;

    #raw: Uint8Array = new Uint8Array(0);
    #imageData: ImageData | null = null;

    #w = 0;
    #h = 0;
    // Source native size last seen — a change (e.g. an image finishing
    // loading) re-arms a static glitch so it doesn't latch a blank frame.
    #srcW = 0;
    #srcH = 0;

    // Re-glitch when a static frame's inputs change (params / resize).
    #dirty = true;
    // An encode/decode round trip is in flight; gate new glitches on it.
    #busy = false;
    // Last glitch start time (seconds), for the `speed` throttle.
    #lastGlitchTime = -1e9;
    // Bumped on resize so a stale in-flight result is discarded.
    #generation = 0;
    // Drives the animated seed walk when `speed > 0`.
    #glitchCount = 0;
    #hasResult = false;

    constructor(initial: Partial<JPEGGlitchParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<JPEGGlitchParams>): void {
        Object.assign(this.params, updates);
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
        this.#supported =
            typeof createImageBitmap === "function" &&
            (typeof OffscreenCanvas !== "undefined" ||
                typeof document !== "undefined");
        if (!this.#supported) {
            return;
        }
        this.#srcCanvas = createCanvas(1, 1);
        this.#srcCtx = get2d(this.#srcCanvas);
        this.#outCanvas = createCanvas(1, 1);
        this.#outCtx = get2d(this.#outCanvas);
        this.#readRT = ctx.createRenderTarget();
        this.#outTex = ctx.wrapTexture(this.#outCanvas, { autoUpdate: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#supported || !this.#readRT) {
            this.#passthrough(ctx);
            return;
        }

        // Re-arm a static glitch when the source first loads / changes size.
        const srcW = ctx.src.width;
        const srcH = ctx.src.height;
        if (srcW !== this.#srcW || srcH !== this.#srcH) {
            this.#srcW = srcW;
            this.#srcH = srcH;
            this.#dirty = true;
        }

        const w = this.#readRT.width;
        const h = this.#readRT.height;
        if (w >= 2 && h >= 2 && srcW > 0 && srcH > 0) {
            if (w !== this.#w || h !== this.#h) {
                this.#resize(w, h);
            }
            if (this.#shouldGlitch(ctx)) {
                this.#startGlitch(ctx);
            }
        }

        if (this.#hasResult && this.#outTex) {
            ctx.draw({
                frag: FRAG_OUTPUT,
                uniforms: { tex: this.#outTex },
                target: ctx.target,
            });
        } else {
            this.#passthrough(ctx);
        }
    }

    #passthrough(ctx: EffectContext): void {
        ctx.draw({
            frag: FRAG_PASSTHROUGH,
            uniforms: { src: ctx.src },
            target: ctx.target,
        });
    }

    #shouldGlitch(ctx: EffectContext): boolean {
        if (this.#busy) {
            return false;
        }
        const speed = this.params.speed;
        if (speed > 0) {
            return ctx.time - this.#lastGlitchTime >= 1 / speed;
        }
        return this.#dirty;
    }

    #resize(w: number, h: number): void {
        this.#w = w;
        this.#h = h;
        this.#raw = new Uint8Array(w * h * 4);
        this.#imageData = new ImageData(w, h);
        if (this.#srcCanvas) {
            this.#srcCanvas.width = w;
            this.#srcCanvas.height = h;
        }
        if (this.#outCanvas) {
            this.#outCanvas.width = w;
            this.#outCanvas.height = h;
        }
        this.#hasResult = false;
        this.#dirty = true;
        this.#busy = false;
        this.#generation++;
    }

    #startGlitch(ctx: EffectContext): void {
        const w = this.#w;
        const h = this.#h;
        const srcCanvas = this.#srcCanvas;
        const srcCtx = this.#srcCtx;
        const imageData = this.#imageData;
        if (!srcCanvas || !srcCtx || !imageData || !this.#readRT) {
            return;
        }

        // Read the element capture back to the CPU. ctx.draw leaves the
        // readback RT's framebuffer bound, so readPixels reads from it.
        ctx.draw({
            frag: FRAG_CAPTURE,
            uniforms: { src: ctx.src },
            target: this.#readRT,
        });
        const gl = ctx.gl;
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, this.#raw);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // GL framebuffers are bottom-up; flip rows so the canvas is upright
        // (the wrapped texture re-flips on upload). Force opaque alpha —
        // JPEG has no alpha channel.
        const data = imageData.data;
        const rowBytes = w * 4;
        for (let y = 0; y < h; y++) {
            const srcRow = (h - 1 - y) * rowBytes;
            data.set(
                this.#raw.subarray(srcRow, srcRow + rowBytes),
                y * rowBytes,
            );
        }
        for (let i = 3; i < data.length; i += 4) {
            data[i] = 255;
        }
        srcCtx.putImageData(imageData, 0, 0);

        this.#busy = true;
        this.#dirty = false;
        this.#lastGlitchTime = ctx.time;
        // Static glitch (speed 0) stays on variant 0 so it's reproducible;
        // animated glitch advances the variant each round.
        const variant = this.params.speed > 0 ? this.#glitchCount : 0;
        this.#glitchCount++;

        const { quality, seed, iterations } = this.params;
        void this.#runGlitch(
            srcCanvas,
            w,
            h,
            quality,
            seed,
            iterations,
            variant,
            this.#generation,
        );
    }

    async #runGlitch(
        canvas: GlitchCanvas,
        w: number,
        h: number,
        quality: number,
        seed: number,
        iterations: number,
        variant: number,
        generation: number,
    ): Promise<void> {
        try {
            const blob = await canvasToJpegBlob(canvas, quality);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const header = jpegScanStart(bytes);
            glitchBytes(bytes, header, seed, iterations, variant);
            const bmp = await createImageBitmap(
                new Blob([bytes], { type: "image/jpeg" }),
            );
            // Discard if a resize happened while we were encoding/decoding.
            if (generation === this.#generation && this.#outCtx) {
                this.#outCtx.clearRect(0, 0, w, h);
                this.#outCtx.drawImage(bmp, 0, 0, w, h);
                this.#hasResult = true;
            }
            bmp.close();
        } catch {
            // Corrupted past the decoder's tolerance — keep the last good
            // frame and try again on the next tick.
        } finally {
            if (generation === this.#generation) {
                this.#busy = false;
            }
        }
    }

    dispose(): void {
        this.#readRT?.dispose();
        this.#readRT = null;
        this.#outTex = null;
        this.#srcCanvas = null;
        this.#srcCtx = null;
        this.#outCanvas = null;
        this.#outCtx = null;
        this.#imageData = null;
        this.#raw = new Uint8Array(0);
        this.#hasResult = false;
        this.#busy = false;
        // Invalidate any in-flight round trip.
        this.#generation++;
    }
}
