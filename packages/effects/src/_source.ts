// Reads the element back from the GPU for the effects that build a shape
// from it on the CPU (the silhouette effects). The capture loop is shared
// here; what to read and what to do with the pixels stays in the effect.
import type { EffectContext, EffectReadPixelsOpts } from "@vfx-js/core";
import { captureContent } from "./_capture.js";

/**
 * Which channel of the element is read as a shape: `"alpha"` (where it is
 * opaque), `"luminance"` (where it is bright) or `"none"` (the whole
 * element rect).
 */
export type SourceChannel = "alpha" | "luminance" | "none";

/** A {@link SourceChannel} param as given, with anything else read as `"alpha"`. */
export function sourceChannelOf(v: unknown): SourceChannel {
    return v === "luminance" || v === "none" ? v : "alpha";
}

// Frames to wait before reading the element back, and the most frames
// between retries while it is empty (the gap doubles from the first).
export const CAPTURE_DELAY = 3;
export const CAPTURE_RETRY_MAX = 120;
// Recapture when the element's aspect ratio drifts this far (relative)
// from the one last captured, once the size has held still for
// RESIZE_SETTLE frames.
export const ASPECT_TOLERANCE = 0.01;
export const RESIZE_SETTLE = 5;
// With `minLongSide`, recapture when the element's long side grows this
// many times past the mask's.
export const GROW_TOLERANCE = 1.25;

/** The pixels of one capture. */
export type SourceReadback = {
    /** RGBA, premultiplied; rows bottom-up unless `read.flipY`. */
    pixels: Uint8Array | Float32Array;
    width: number;
    height: number;
    /** Width / height of the element when it was captured. */
    aspect: number;
};

export type SourceCaptureOptions = {
    /** Long side of the read-back mask, in px. The short side follows the element's aspect. */
    longSide: number;
    /**
     * When set, the long side follows the element's long side in device
     * px, between this and `longSide`, so a small element reads a small
     * mask. The element is read again when it grows well past it.
     */
    minLongSide?: number;
    /** Options for `ctx.readPixels`. */
    read?: EffectReadPixelsOpts;
    /**
     * Called with the pixels of a capture that is still current. Return
     * (or resolve to) false when they hold nothing usable yet: the
     * capture is tried again later, less often each time. While a
     * returned promise is pending the phase stays `"reading"`; a
     * refresh, restore or reset in the meantime drops its result.
     * `isCurrent` tells, once it resolves, whether the result is still
     * wanted.
     */
    onRead: (
        r: SourceReadback,
        isCurrent: () => boolean,
    ) => boolean | Promise<boolean>;
};

/**
 * - `"capture"`: waiting for the source to upload, then reading it.
 * - `"reading"`: a readback is on its way.
 * - `"idle"`: the last capture was used; watching the aspect ratio.
 */
export type SourceCapturePhase = "capture" | "reading" | "idle";

/**
 * The capture loop: waits a few frames for the source to upload, reads
 * the element's content back into a mask of `longSide` px, and hands the
 * pixels to `onRead`. An empty read is retried with a growing gap. Once a
 * read was used, the element's aspect ratio is watched, and a change is
 * recaptured once the size settles. A readback that resolves after
 * {@link refresh}, {@link contextRestored} or {@link reset} is dropped.
 *
 * Call {@link update} once a frame from `render()`.
 */
export class SourceCapture {
    readonly #opts: SourceCaptureOptions;
    // Bumped by reset, context restore and a refresh during a read, so
    // a readback started before them is dropped.
    #token = 0;
    #phase: SourceCapturePhase = "capture";
    #srcFrames = 0;
    // Frames to wait before the next capture; doubles while it's empty.
    #gap = CAPTURE_DELAY;
    // Aspect and long side of the last capture used.
    #aspect = 0;
    #long = 0;
    // Element size last frame, and frames it has held still.
    #lastSize: [number, number] = [0, 0];
    #settled = 0;

    constructor(opts: SourceCaptureOptions) {
        this.#opts = opts;
    }

    get phase(): SourceCapturePhase {
        return this.#phase;
    }

    /** Capture, or watch the aspect ratio, depending on the phase. */
    update(ctx: EffectContext): void {
        if (this.#phase === "idle") {
            this.#watchAspect(ctx);
        }
        if (this.#phase === "capture") {
            this.#capture(ctx);
        }
    }

    /**
     * Start a new capture in CAPTURE_DELAY frames, dropping a readback in
     * flight.
     */
    refresh(): void {
        if (this.#phase === "reading") {
            this.#token++;
        }
        this.#phase = "capture";
        this.#srcFrames = 0;
        this.#gap = CAPTURE_DELAY;
    }

    /**
     * For `ctx.onContextRestored`: a readback in flight was rejected;
     * start it over.
     */
    contextRestored(): void {
        this.#token++;
        if (this.#phase === "reading") {
            this.#phase = "capture";
            this.#srcFrames = 0;
        }
    }

    /** Start over like a new instance (for `dispose()`). */
    reset(): void {
        this.#token++;
        this.#phase = "capture";
        this.#srcFrames = 0;
        this.#gap = CAPTURE_DELAY;
        this.#aspect = 0;
        this.#long = 0;
        this.#lastSize[0] = 0;
        this.#lastSize[1] = 0;
        this.#settled = 0;
    }

    // Recapture once the element's aspect ratio has drifted from the
    // captured one and its size has held still for RESIZE_SETTLE frames,
    // so a resize animation reads back once, at the end.
    #watchAspect(ctx: EffectContext): void {
        const [ew, eh] = ctx.dims.elementPixel;
        if (!(ew >= 1 && eh >= 1)) {
            return;
        }
        const moved = ew !== this.#lastSize[0] || eh !== this.#lastSize[1];
        this.#lastSize[0] = ew;
        this.#lastSize[1] = eh;
        this.#settled = moved ? 0 : this.#settled + 1;
        if (this.#settled < RESIZE_SETTLE) {
            return;
        }
        if (
            Math.abs(ew / eh / this.#aspect - 1) > ASPECT_TOLERANCE ||
            this.#longSide(ew, eh) > this.#long * GROW_TOLERANCE
        ) {
            this.refresh();
        }
    }

    // The mask's long side for an element of ew × eh device px.
    #longSide(ew: number, eh: number): number {
        const { longSide, minLongSide } = this.#opts;
        if (minLongSide === undefined) {
            return longSide;
        }
        return Math.round(
            Math.min(Math.max(Math.max(ew, eh), minLongSide), longSide),
        );
    }

    #capture(ctx: EffectContext): void {
        const [ew, eh] = ctx.dims.elementPixel;
        if (
            ctx.src.width === 0 ||
            ctx.src.height === 0 ||
            !(ew >= 1 && eh >= 1)
        ) {
            return;
        }
        // Give the source a few frames to upload.
        if (++this.#srcFrames < this.#gap) {
            return;
        }
        const long = this.#longSide(ew, eh);
        const aspect = ew / eh;
        const width = Math.max(
            1,
            aspect >= 1 ? long : Math.round(long * aspect),
        );
        const height = Math.max(
            1,
            aspect >= 1 ? Math.round(long / aspect) : long,
        );
        const mask = ctx.createRenderTarget({ size: [width, height] });
        captureContent(ctx, mask);
        this.#phase = "reading";
        const token = this.#token;
        // The read copies the pixels now, so the mask can go.
        const read = this.#opts.read
            ? ctx.readPixels(mask, this.#opts.read)
            : ctx.readPixels(mask);
        mask.dispose();
        const retry = (backoff: boolean) => {
            this.#srcFrames = 0;
            if (backoff) {
                this.#gap = Math.min(this.#gap * 2, CAPTURE_RETRY_MAX);
            }
            this.#phase = "capture";
        };
        const isCurrent = () => token === this.#token;
        read.then(
            (pixels) => {
                if (!isCurrent()) {
                    return;
                }
                const done = (ok: boolean) => {
                    if (!isCurrent()) {
                        return;
                    }
                    if (ok) {
                        this.#aspect = aspect;
                        this.#long = long;
                        this.#phase = "idle";
                    } else {
                        // Nothing drawn yet: try again later, less often,
                        // in case it's a late-loading image.
                        retry(true);
                    }
                };
                const ok = this.#opts.onRead(
                    { pixels, width, height, aspect },
                    isCurrent,
                );
                if (typeof ok === "boolean") {
                    done(ok);
                } else {
                    ok.then(done, () => done(false));
                }
            },
            () => {
                // Disposed or context lost.
                if (isCurrent()) {
                    retry(false);
                }
            },
        );
    }
}
