import type { Framebuffer } from "./framebuffer.js";

/** Options for {@link startPixelRead}. Mirrors `EffectReadPixelsOpts`. @internal */
export type PixelReadOpts = {
    rect?: readonly [number, number, number, number];
    flipY?: boolean;
    into?: Uint8Array | Float32Array;
};

/** How often a pending read checks its fence, in ms. */
const POLL_MS = 4;

/**
 * One asynchronous readback: `readPixels` into a `PIXEL_PACK_BUFFER`,
 * then a fence, polled off the render loop. The copy is queued when the
 * read starts, so the result is the framebuffer's content at that time.
 * @internal
 */
export class PixelRead {
    readonly promise: Promise<Uint8Array | Float32Array>;

    #gl: WebGL2RenderingContext;
    #buffer: WebGLBuffer | null = null;
    #sync: WebGLSync | null = null;
    #timer: ReturnType<typeof setTimeout> | undefined;
    #out: Uint8Array | Float32Array | null = null;
    #len = 0;
    #rowLen = 0;
    #rows = 0;
    #flipY = false;
    #settled = false;
    #onSettle: (read: PixelRead) => void;
    #resolve!: (px: Uint8Array | Float32Array) => void;
    #reject!: (err: Error) => void;

    constructor(
        gl: WebGL2RenderingContext,
        fb: Framebuffer,
        opts: PixelReadOpts | undefined,
        onSettle: (read: PixelRead) => void,
    ) {
        this.#gl = gl;
        this.#onSettle = onSettle;
        this.promise = new Promise((resolve, reject) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
        try {
            this.#start(fb, opts);
        } catch (e) {
            this.cancel(e instanceof Error ? e : new Error(String(e)));
        }
    }

    /** True once the promise resolved or rejected. */
    get settled(): boolean {
        return this.#settled;
    }

    /** Reject the read and free its GL objects. No-op once settled. */
    cancel(err: Error): void {
        if (this.#settled) {
            return;
        }
        this.#finish();
        this.#reject(err);
    }

    #start(fb: Framebuffer, opts: PixelReadOpts | undefined): void {
        const gl = this.#gl;
        const [x, y, w, h] = opts?.rect ?? [0, 0, fb.width, fb.height];
        if (
            ![x, y, w, h].every(Number.isInteger) ||
            w <= 0 ||
            h <= 0 ||
            x < 0 ||
            y < 0 ||
            x + w > fb.width ||
            y + h > fb.height
        ) {
            throw new Error(
                `[VFX-JS] readPixels() rect [${x}, ${y}, ${w}, ${h}] must be whole pixels inside the ${fb.width}x${fb.height} target.`,
            );
        }
        const float = fb.float;
        const len = w * h * 4;
        const into = opts?.into;
        if (into) {
            const ok = float
                ? into instanceof Float32Array
                : into instanceof Uint8Array;
            if (!ok || into.length < len) {
                throw new Error(
                    `[VFX-JS] readPixels() into must be a ${float ? "Float32Array" : "Uint8Array"} of at least ${len} elements for this read.`,
                );
            }
        }
        this.#out =
            into ?? (float ? new Float32Array(len) : new Uint8Array(len));
        this.#len = len;
        this.#rowLen = w * 4;
        this.#rows = h;
        this.#flipY = opts?.flipY ?? false;

        // Save the caller's bindings first: the MSAA resolve rebinds both.
        const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
        const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
        const prevPack = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
        fb.resolveColor();

        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error("[VFX-JS] readPixels() could not create a buffer.");
        }
        this.#buffer = buffer;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
        gl.bufferData(
            gl.PIXEL_PACK_BUFFER,
            len * (float ? 4 : 1),
            gl.STREAM_READ,
        );
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb.resolveFbo ?? fb.fbo);
        gl.readPixels(
            x,
            y,
            w,
            h,
            gl.RGBA,
            float ? gl.FLOAT : gl.UNSIGNED_BYTE,
            0,
        );
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, prevPack);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);

        this.#sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!this.#sync) {
            throw new Error("[VFX-JS] readPixels() could not create a fence.");
        }
        // Send the commands now, so the fence can signal before the next frame.
        gl.flush();
        this.#schedule();
    }

    #schedule(): void {
        this.#timer = setTimeout(() => this.#poll(), POLL_MS);
    }

    #poll(): void {
        this.#timer = undefined;
        if (this.#settled) {
            return;
        }
        const gl = this.#gl;
        const sync = this.#sync;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : null;
        if (status === gl.UNSIGNALED) {
            this.#schedule();
            return;
        }
        if (status !== gl.SIGNALED) {
            this.cancel(new Error("[VFX-JS] readPixels() lost its fence."));
            return;
        }
        const out = this.#out as Uint8Array | Float32Array;
        const prevPack = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.#buffer);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, out, 0, this.#len);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, prevPack);
        if (this.#flipY) {
            flipRows(out, this.#rowLen, this.#rows);
        }
        this.#finish();
        this.#resolve(out);
    }

    #finish(): void {
        this.#settled = true;
        if (this.#timer !== undefined) {
            clearTimeout(this.#timer);
            this.#timer = undefined;
        }
        const gl = this.#gl;
        // Handles from a lost context are already dead; deleting them is a no-op.
        if (this.#sync) {
            gl.deleteSync(this.#sync);
            this.#sync = null;
        }
        if (this.#buffer) {
            gl.deleteBuffer(this.#buffer);
            this.#buffer = null;
        }
        this.#out = null;
        this.#onSettle(this);
    }
}

/** Reverse the order of `rows` rows of `rowLen` elements, in place. */
function flipRows(
    data: Uint8Array | Float32Array,
    rowLen: number,
    rows: number,
): void {
    const tmp = data.slice(0, rowLen);
    for (let top = 0, bottom = rows - 1; top < bottom; top++, bottom--) {
        const a = top * rowLen;
        const b = bottom * rowLen;
        tmp.set(data.subarray(a, a + rowLen));
        data.copyWithin(a, b, b + rowLen);
        data.set(tmp, b);
    }
}
