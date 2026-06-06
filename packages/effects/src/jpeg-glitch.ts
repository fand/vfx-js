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
     * Fraction of the element resolution to process at (0–1). `1` is full
     * resolution; `0.5` reads back / encodes / decodes at half size (much
     * cheaper, chunkier blocks) and the result is scaled back up to fit.
     * `0` clamps to a single pixel. (Default: `1`)
     */
    resolutionScale: number;

    /**
     * Randomly render half the glitches upside-down. Tears propagate
     * downward (top stays cleaner), so rotating the source 180° before
     * corrupting — then rotating the output back — flips the bias upward
     * and balances the glitch over both directions. `false` disables it so
     * tears always trail downward. (Default: `true`)
     */
    randomFlip: boolean;

    /**
     * Rotate the image a quarter turn (-90°) before corrupting, then rotate
     * the decoded output back. Tears run top-to-bottom, so this turns them
     * sideways. Composes with `randomFlip`. (Default: `false`)
     */
    vertical: boolean;

    /**
     * Re-glitches per second. `0` glitches once and holds a stable frame
     * (re-runs when params change); `> 0` keeps re-corrupting for a live,
     * moving glitch. (Default: `0`)
     */
    speed: number;

    /**
     * Disable the effect: pass the source straight through at its original
     * resolution with no encode/decode round trip. Toggling this is the cheap
     * way to switch the glitch on and off — the instance stays attached, so it
     * keeps its buffers and pays no re-init cost. (Default: `false`)
     */
    bypass: boolean;
};

const DEFAULT_PARAMS: JPEGGlitchParams = {
    quality: 0.4,
    seed: 0.25,
    iterations: 24,
    resolutionScale: 1,
    randomFlip: true,
    vertical: false,
    speed: 0,
    bypass: false,
};

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
    save(): void;
    restore(): void;
    translate(x: number, y: number): void;
    rotate(angle: number): void;
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

// Draw a `srcW`×`srcH` source into `ctx` rotated by `angleDeg` (a multiple
// of 90), filling a `destW`×`destH` target. Uses exact integer translates so
// right-angle turns stay pixel-aligned (no resample blur). A 90°/270° turn
// expects the dest to have swapped dimensions (destW=srcH, destH=srcW).
function drawRotated(
    ctx: Ctx2D,
    src: CanvasImageSource,
    srcW: number,
    srcH: number,
    angleDeg: number,
    destW: number,
    destH: number,
): void {
    ctx.save();
    ctx.clearRect(0, 0, destW, destH);
    switch (angleDeg) {
        case 90:
            ctx.translate(destW, 0);
            break;
        case 180:
            ctx.translate(destW, destH);
            break;
        case 270:
            ctx.translate(0, destH);
            break;
    }
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.drawImage(src, 0, 0, srcW, srcH);
    ctx.restore();
}

// Corrupt the entropy-coded scan data. The byte VALUE written is a
// seed-derived random number — JPEG desyncs on any change, so the value is
// effectively arbitrary (there is no meaningful "amount" of it). Positions
// are spread one per segment (à la glitch-canvas), randomized within each
// segment, so the tears cover the whole stream. `rng` is the shared seeded
// sequence, so the result is reproducible from the seed.
function glitchBytes(
    bytes: Uint8Array,
    headerLength: number,
    iterations: number,
    rng: () => number,
): void {
    const maxIndex = bytes.length - headerLength - 4;
    if (maxIndex <= 1) {
        return;
    }
    const iter = Math.max(1, Math.floor(iterations));
    for (let i = 0; i < iter; i++) {
        const min = ((maxIndex / iter) * i) | 0;
        const max = ((maxIndex / iter) * (i + 1)) | 0;
        const delta = Math.max(1, max - min);
        const pos = Math.min(maxIndex, min + ((rng() * delta) | 0));
        const value = (rng() * 256) | 0;
        bytes[headerLength + pos] = value;
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

    enabled = true;

    #supported = false;
    #readRT: EffectRenderTarget | null = null;
    #outTex: EffectTexture | null = null;

    // Raw GL handles for the on-demand display-texture upload.
    #gl: WebGL2RenderingContext | null = null;
    // Display texture we upload `outCanvas` into only when a new glitch
    // lands, instead of re-uploading the canvas every frame.
    #outGLTex: WebGLTexture | null = null;
    #uploadPending = false;
    #restoreUnsub: (() => void) | null = null;

    #srcCanvas: GlitchCanvas | null = null;
    #srcCtx: Ctx2D | null = null;
    // Holds the (optionally rotated) image that actually gets encoded; its
    // size is set per-glitch since a quarter turn swaps width and height.
    #encCanvas: GlitchCanvas | null = null;
    #encCtx: Ctx2D | null = null;
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
    // Number of decoded glitch results produced. Increments once per
    // completed encode/decode round trip — sample it to measure the real
    // output rate, which is capped by codec latency below high `speed`.
    #producedFrames = 0;

    /** Count of decoded glitch results produced so far. */
    get producedFrames(): number {
        return this.#producedFrames;
    }

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
        // The element's time base restarts at 0 on each (re-)attach.
        this.#lastGlitchTime = -1e9;
        this.#dirty = true;
        this.#srcCanvas = createCanvas(1, 1);
        this.#srcCtx = get2d(this.#srcCanvas);
        this.#encCanvas = createCanvas(1, 1);
        this.#encCtx = get2d(this.#encCanvas);
        this.#outCanvas = createCanvas(1, 1);
        this.#outCtx = get2d(this.#outCanvas);
        // Sized to the processing resolution in #resize; start at 1×1.
        this.#readRT = ctx.createRenderTarget({ size: [1, 1] });
        this.#gl = ctx.gl;
        this.#createOutTexture(ctx);
        // The display texture dies on context loss; rebuild it.
        this.#restoreUnsub = ctx.onContextRestored(() => {
            this.#createOutTexture(ctx);
            // Re-push the last decoded frame, if any.
            this.#uploadPending = this.#hasResult;
        });
    }

    // Create (or recreate) the display texture and wrap it for sampling.
    // We own the GL handle and upload into it manually, so context-loss
    // rebuilds are our responsibility.
    #createOutTexture(ctx: EffectContext): void {
        const gl = ctx.gl;
        const tex = gl.createTexture();
        if (!tex) {
            return;
        }
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // Nearest mag so low resolutionScale upscales crisp, not blurry.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // 1×1 placeholder so the sampler is valid before the first upload.
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 0]),
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.#outGLTex = tex;
        this.#outTex = ctx.wrapTexture(tex, {
            size: [this.#w || 1, this.#h || 1],
        });
    }

    // update() runs even while disabled (the chain only skips render); drop
    // the cached glitch so re-enabling starts clean instead of flashing it.
    update(): void {
        if (this.enabled === false) {
            this.#hasResult = false;
        }
    }

    render(ctx: EffectContext): void {
        if (this.params.bypass || !this.#supported || !this.#readRT) {
            // Drop any stale decoded frame so re-enabling starts clean rather
            // than flashing the last glitch.
            this.#hasResult = false;
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

        // Process at a fraction of the element resolution. The decoded
        // output is sampled by uvContent so it scales back up to fit.
        const [ew, eh] = ctx.dims.elementPixel;
        const scale = Math.min(1, Math.max(0, this.params.resolutionScale));
        const w = Math.max(1, Math.round(ew * scale));
        const h = Math.max(1, Math.round(eh * scale));
        if (ew >= 2 && eh >= 2 && srcW > 0 && srcH > 0) {
            if (w !== this.#w || h !== this.#h) {
                this.#resize(ctx, w, h);
            }
            if (this.#shouldGlitch(ctx)) {
                this.#startGlitch(ctx);
            }
        }

        if (this.#hasResult && this.#outTex) {
            // Upload the decoded canvas to the GPU only when it changed.
            if (this.#uploadPending) {
                this.#uploadOutCanvas(ctx);
            }
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

    #resize(ctx: EffectContext, w: number, h: number): void {
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
        // The readback RT is sized to the processing resolution, so recreate
        // it (explicit-size RTs don't auto-track the element).
        this.#readRT?.dispose();
        this.#readRT = ctx.createRenderTarget({ size: [w, h] });
        this.#hasResult = false;
        this.#dirty = true;
        this.#busy = false;
        this.#uploadPending = false;
        this.#generation++;
    }

    #startGlitch(ctx: EffectContext): void {
        const w = this.#w;
        const h = this.#h;
        const srcCanvas = this.#srcCanvas;
        const srcCtx = this.#srcCtx;
        const encCanvas = this.#encCanvas;
        const encCtx = this.#encCtx;
        const imageData = this.#imageData;
        if (
            !srcCanvas ||
            !srcCtx ||
            !encCanvas ||
            !encCtx ||
            !imageData ||
            !this.#readRT
        ) {
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

        this.#busy = true;
        this.#dirty = false;
        this.#lastGlitchTime = ctx.time;

        // GL framebuffers are bottom-up; flip rows so the canvas is upright.
        // Force opaque alpha — JPEG has no alpha channel.
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

        // Static glitch (speed 0) stays on variant 0 so it's reproducible;
        // animated glitch advances the variant each round.
        const variant = this.params.speed > 0 ? this.#glitchCount : 0;
        this.#glitchCount++;

        const { quality, seed, iterations, randomFlip, vertical } = this.params;
        // One seeded sequence drives both the flip decision and the byte
        // corruption, so the whole glitch is reproducible from the seed.
        const rng = makeRng(seed, variant);
        const flip = randomFlip && rng() < 0.5;
        srcCtx.putImageData(imageData, 0, 0);

        // Rotate the source before corrupting: 180° (flip) balances the tear
        // direction, -90° (vertical, i.e. 270°) turns the tears sideways.
        // The angles compose; runGlitch rotates the decoded output back.
        const srcAngle = ((flip ? 180 : 0) + (vertical ? 270 : 0)) % 360;
        const swap = vertical; // a quarter turn swaps width and height
        const encW = swap ? h : w;
        const encH = swap ? w : h;
        encCanvas.width = encW;
        encCanvas.height = encH;
        drawRotated(encCtx, srcCanvas, w, h, srcAngle, encW, encH);

        void this.#runGlitch(
            encCanvas,
            w,
            h,
            quality,
            iterations,
            srcAngle,
            rng,
            this.#generation,
        );
    }

    // Upload the decoded glitch canvas into our display texture. FLIP_Y
    // matches the framework's canvas-as-image convention so FRAG_OUTPUT
    // (which samples by uvContent) shows it upright.
    #uploadOutCanvas(ctx: EffectContext): void {
        const gl = ctx.gl;
        if (!this.#outGLTex || !this.#outCanvas) {
            return;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.#outGLTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.#outCanvas,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.#uploadPending = false;
    }

    async #runGlitch(
        canvas: GlitchCanvas,
        w: number,
        h: number,
        quality: number,
        iterations: number,
        srcAngle: number,
        rng: () => number,
        generation: number,
    ): Promise<void> {
        try {
            const blob = await canvasToJpegBlob(canvas, quality);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const header = jpegScanStart(bytes);
            glitchBytes(bytes, header, iterations, rng);
            const bmp = await createImageBitmap(
                new Blob([bytes], { type: "image/jpeg" }),
            );
            // Discard if a resize happened while we were encoding/decoding.
            if (generation === this.#generation && this.#outCtx) {
                // Rotate the decoded glitch back upright (inverse of the
                // source rotation) into the w×h output canvas.
                const outAngle = (360 - srcAngle) % 360;
                drawRotated(
                    this.#outCtx,
                    bmp,
                    bmp.width,
                    bmp.height,
                    outAngle,
                    w,
                    h,
                );
                this.#hasResult = true;
                this.#producedFrames++;
                // New pixels — upload to the display texture on the next draw.
                this.#uploadPending = true;
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
        this.#restoreUnsub?.();
        this.#restoreUnsub = null;
        if (this.#gl && this.#outGLTex) {
            this.#gl.deleteTexture(this.#outGLTex);
        }
        this.#outGLTex = null;
        this.#gl = null;
        this.#uploadPending = false;
        this.#readRT?.dispose();
        this.#readRT = null;
        this.#outTex = null;
        this.#srcCanvas = null;
        this.#srcCtx = null;
        this.#encCanvas = null;
        this.#encCtx = null;
        this.#outCanvas = null;
        this.#outCtx = null;
        this.#imageData = null;
        this.#raw = new Uint8Array(0);
        this.#hasResult = false;
        this.#busy = false;
        // Forget the processed size so a re-init reallocates the readback RT
        // (which dispose just freed) instead of mistaking it for current.
        this.#w = 0;
        this.#h = 0;
        // Invalidate any in-flight round trip.
        this.#generation++;
    }
}
