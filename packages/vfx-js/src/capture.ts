import dom2canvas from "./dom-to-canvas.js";
import { makeEffectTexture } from "./effect-host.js";
import type { Texture, TextureSource } from "./gl/texture.js";
import {
    releaseFirstCapture,
    requestCapture,
    unwrapElement,
    wrapElement,
} from "./html-in-canvas.js";
import { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
import type { VFXCapture, VFXCaptureOpts, VFXCaptureRect } from "./types.js";

/** The DOM functions the drivers use. Replaced in tests. */
export type CaptureDom = {
    supportsHtmlInCanvas: typeof supportsHtmlInCanvas;
    wrapElement: typeof wrapElement;
    unwrapElement: typeof unwrapElement;
    requestCapture: typeof requestCapture;
    releaseFirstCapture: typeof releaseFirstCapture;
    dom2canvas: typeof dom2canvas;
    /** Resolves on the next animation frame. */
    nextFrame: () => Promise<void>;
};

const defaultDom: CaptureDom = {
    supportsHtmlInCanvas,
    wrapElement,
    unwrapElement,
    requestCapture,
    releaseFirstCapture,
    dom2canvas,
    nextFrame: () => new Promise((r) => requestAnimationFrame(() => r())),
};

// Longer than `vfx.update`'s wait: a repaint can be slow on phones.
const UPDATE_TIMEOUT_MS = 1000;

/** What the player gives `createCapture`. */
export type CaptureDeps = {
    /** A new texture, premultiplied like `ctx.src`. */
    createTexture(source: TextureSource): Texture;
    /** Upload now. Throws when the upload fails. */
    uploadTexture(texture: Texture): void;
    /**
     * Re-upload `offscreen` into `old`, or return a new texture with the
     * same settings and dispose `old` when the capture canvas changed.
     */
    refreshTexture(old: Texture, offscreen: OffscreenCanvas): Texture;
    /** Native size of a texture's source, in physical px. */
    textureSize(texture: Texture, axis: "w" | "h"): number;
    /** Transparent texture that a disposed handle resolves to. */
    emptyTexture: Texture;
    maxTextureSize: number;
    /** z-index of the still copy that covers an html-in-canvas wrap. */
    stillZIndex: number;
    dom?: Partial<CaptureDom>;
};

/** What a source kind has to provide. */
type CaptureDriver = {
    /** The element whose rect is measured. */
    readonly box: Element;
    /** False when the source has left the box, so it has no layout. */
    inBox?(): boolean;
    /** The slot size follows the box on every frame (image, video, canvas). */
    readonly sizeFollowsBox: boolean;
    /** Upload on every frame (video, canvas). */
    readonly uploadEveryFrame: boolean;
    /** True when new pixels are in the texture. */
    update(): Promise<boolean>;
    /** Called on a window resize. */
    resize?(): void;
    dispose(): void;
};

/** Mutable texture slot shared by the driver and the handle. */
type CaptureSlot = {
    texture: Texture;
    /** CSS size of `box` when `texture` was captured. */
    width: number;
    height: number;
};

export type CaptureEntry = {
    readonly capture: VFXCapture;
    /** Called by the player at the start of each rendered frame. */
    tick(): void;
    /** Called by the player on a window resize. */
    resize(): void;
};

type MutableRect = { -readonly [K in keyof VFXCaptureRect]: VFXCaptureRect[K] };

/**
 * The box's rect, or null when it has no layout (not in the document,
 * `display: none`). Only an empty rect can mean that, so only then are
 * the client rects checked.
 */
export function layoutRect(box: Element): DOMRect | null {
    const r = box.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && box.getClientRects().length === 0) {
        return null;
    }
    return r;
}

/**
 * Capture `source` into a texture that effects can read.
 * Resolves after the first capture is in the texture.
 * `onDispose` is called once, when the capture is disposed.
 * Aborting `signal` before that rejects and restores the element.
 */
export async function createCapture(
    deps: CaptureDeps,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    onDispose?: () => void,
    signal?: AbortSignal,
): Promise<CaptureEntry> {
    const slot = { width: 0, height: 0 } as CaptureSlot;
    const driver = await createDriver(deps, source, opts, slot, signal);
    // Upload now, so a source WebGL can't read rejects here.
    try {
        deps.uploadTexture(slot.texture);
    } catch (err) {
        driver.dispose();
        slot.texture.dispose();
        throw err;
    }

    let disposed = false;
    let warned = false;
    const rect: MutableRect = { x: 0, y: 0, width: 0, height: 0 };
    let hasLayout = false;

    const measure = () => {
        const r = driver.inBox?.() === false ? null : layoutRect(driver.box);
        hasLayout = r !== null;
        if (!r) {
            return;
        }
        rect.x = r.left;
        rect.y = r.top;
        if (driver.sizeFollowsBox) {
            slot.width = r.width;
            slot.height = r.height;
        }
        rect.width = slot.width;
        rect.height = slot.height;
    };

    const update = (): Promise<boolean> =>
        disposed ? Promise.resolve(false) : driver.update();

    const texture = makeEffectTexture(
        () => {
            if (!disposed) {
                return slot.texture;
            }
            if (!warned) {
                warned = true;
                console.warn("[VFX-JS] This capture is disposed.");
            }
            return deps.emptyTexture;
        },
        () => (disposed ? 0 : deps.textureSize(slot.texture, "w")),
        () => (disposed ? 0 : deps.textureSize(slot.texture, "h")),
        undefined,
        () => {
            update().catch((err) => console.error(err));
        },
    );

    const capture: VFXCapture = {
        texture,
        get rect() {
            return hasLayout ? rect : null;
        },
        update,
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            driver.dispose();
            slot.texture.dispose();
            onDispose?.();
        },
    };

    measure();

    return {
        capture,
        tick() {
            if (disposed) {
                return;
            }
            measure();
            if (driver.uploadEveryFrame) {
                slot.texture.needsUpdate = true;
            }
        },
        resize() {
            if (!disposed) {
                driver.resize?.();
            }
        },
    };
}

function createDriver(
    deps: CaptureDeps,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
    signal: AbortSignal | undefined,
): Promise<CaptureDriver> {
    const dom = { ...defaultDom, ...deps.dom };
    if (
        source instanceof HTMLImageElement ||
        source instanceof HTMLVideoElement ||
        source instanceof HTMLCanvasElement
    ) {
        return mediaDriver(deps, source, opts, slot, signal);
    }
    // drawElementImage throws on an element without a box, and dom2canvas
    // draws nothing. A wrapper of 0 width or height never paints, so the
    // first capture would never come.
    const r = source.getBoundingClientRect();
    if (
        source.getClientRects().length === 0 ||
        r.width === 0 ||
        r.height === 0
    ) {
        return Promise.reject(
            new Error("[VFX-JS] capture() needs an element with a size."),
        );
    }
    if (dom.supportsHtmlInCanvas()) {
        return hicDriver(deps, dom, source, opts, slot, signal);
    }
    return snapshotDriver(deps, dom, source, opts, slot);
}

function abortError(): Error {
    return new Error("[VFX-JS] capture() was aborted.");
}

/** Reject when `signal` aborts before `promise` settles. */
function abortable<T>(
    promise: Promise<T>,
    signal: AbortSignal | undefined,
): Promise<T> {
    if (!signal) {
        return promise;
    }
    if (signal.aborted) {
        return Promise.reject(abortError());
    }
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(abortError());
        signal.addEventListener("abort", onAbort, { once: true });
        promise
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", onAbort));
    });
}

/**
 * Why `canplay` will never come without the page doing something, or null.
 * networkState can't tell: it reads NETWORK_NO_SOURCE right after `src` is set.
 */
function videoWontLoad(video: HTMLVideoElement): string | null {
    if (video.error) {
        return "failed to load";
    }
    const sources = video.querySelectorAll("source[src]");
    if (!video.srcObject && !video.src && sources.length === 0) {
        return "has no source";
    }
    // With preload="none", only playing loads it.
    if (
        video.preload === "none" &&
        video.paused &&
        !video.autoplay &&
        video.readyState === 0
    ) {
        return 'is not loading (preload="none"). Call play() first';
    }
    return null;
}

/** Resolve on `canplay`, reject on `error` or abort. */
function waitForVideo(
    video: HTMLVideoElement,
    signal: AbortSignal | undefined,
): Promise<void> {
    const reason = videoWontLoad(video);
    if (reason) {
        return Promise.reject(
            new Error(`[VFX-JS] capture() got a video that ${reason}.`),
        );
    }
    // When every <source> fails, the error fires on the last one, not the video.
    const sources = video.querySelectorAll("source");
    const lastSource = sources[sources.length - 1];
    return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
            video.removeEventListener("canplay", onCanPlay);
            video.removeEventListener("error", onError);
            lastSource?.removeEventListener("error", onError);
            signal?.removeEventListener("abort", onAbort);
        };
        const onCanPlay = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error("[VFX-JS] capture() could not load the video."));
        };
        const onAbort = () => {
            cleanup();
            reject(abortError());
        };
        if (signal?.aborted) {
            reject(abortError());
            return;
        }
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("error", onError);
        lastSource?.addEventListener("error", onError);
        signal?.addEventListener("abort", onAbort);
    });
}

function setSlotSize(slot: CaptureSlot, box: Element): void {
    const r = box.getBoundingClientRect();
    slot.width = r.width;
    slot.height = r.height;
}

/** CSS size that dom2canvas captures: it ceils to whole pixels. */
function snapshotSize(box: Element): [number, number] {
    const r = box.getBoundingClientRect();
    return [Math.ceil(r.width), Math.ceil(r.height)];
}

/** Pixel size of a media source. */
function sourceSize(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): [number, number] {
    if (source instanceof HTMLImageElement) {
        return [source.naturalWidth, source.naturalHeight];
    }
    if (source instanceof HTMLVideoElement) {
        return [source.videoWidth, source.videoHeight];
    }
    return [source.width, source.height];
}

async function mediaDriver(
    deps: CaptureDeps,
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
    signal: AbortSignal | undefined,
): Promise<CaptureDriver> {
    if (source instanceof HTMLImageElement) {
        await abortable(source.decode(), signal);
    } else if (source instanceof HTMLVideoElement && source.readyState < 3) {
        await waitForVideo(source, signal);
    }
    const [w, h] = sourceSize(source);
    if (w === 0 || h === 0) {
        throw new Error("[VFX-JS] capture() got a source with no pixels.");
    }
    if (w > deps.maxTextureSize || h > deps.maxTextureSize) {
        throw new Error(
            `[VFX-JS] capture() got a source larger than the max texture size (${deps.maxTextureSize}px).`,
        );
    }
    slot.texture = deps.createTexture(source);

    // Hide only once the texture exists, so a failed setup leaves the element alone.
    const savedOpacity = source.style.opacity;
    if (opts.hide) {
        // Don't hide a video completely, to keep frames decoding.
        const isVideo = source instanceof HTMLVideoElement;
        source.style.setProperty("opacity", isVideo ? "0.0001" : "0");
    }
    const restoreOpacity = () => {
        if (opts.hide) {
            source.style.opacity = savedOpacity;
        }
    };

    if (source instanceof HTMLImageElement) {
        return {
            box: source,
            sizeFollowsBox: true,
            uploadEveryFrame: false,
            async update() {
                await source.decode();
                slot.texture.needsUpdate = true;
                return true;
            },
            dispose: restoreOpacity,
        };
    }
    return {
        box: source,
        sizeFollowsBox: true,
        uploadEveryFrame: true,
        update: () => Promise.resolve(true),
        dispose: restoreOpacity,
    };
}

async function hicDriver(
    deps: CaptureDeps,
    dom: CaptureDom,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
    signal: AbortSignal | undefined,
): Promise<CaptureDriver> {
    const parent = source.parentNode;
    let wrapper: HTMLCanvasElement;
    let initialCapture: OffscreenCanvas;
    try {
        const wrapping = dom.wrapElement(
            source,
            {
                onCapture: (offscreen) => {
                    slot.texture = deps.refreshTexture(slot.texture, offscreen);
                    setSlotSize(slot, wrapper);
                },
                maxSize: deps.maxTextureSize,
                keepDrawn: !opts.hide,
                stillCover: opts.hide
                    ? undefined
                    : { zIndex: deps.stillZIndex },
            },
            signal,
        );
        ({ canvas: wrapper, initialCapture } = await abortable(
            wrapping,
            signal,
        ));
    } catch (err) {
        // wrapElement has already moved the element when its capture setup
        // fails or is aborted.
        const canvas = source.parentNode;
        if (canvas !== parent && canvas instanceof HTMLCanvasElement) {
            dom.unwrapElement(canvas, source);
        }
        throw err;
    }

    slot.texture = deps.createTexture(initialCapture);
    setSlotSize(slot, wrapper);
    // With hide, clear the first capture too. Without it, keep it and only drop the still copy.
    dom.releaseFirstCapture(wrapper, !opts.hide);
    if (!opts.hide) {
        // releaseFirstCapture drops the still copy in a frame it has already
        // requested. Wait for it, so no copy with the same ids is left.
        await dom.nextFrame();
    }

    return {
        box: wrapper,
        // The page may remove or move the element out of the wrapper.
        inBox: () => source.parentNode === wrapper,
        sizeFollowsBox: false,
        uploadEveryFrame: false,
        async update() {
            return (
                (await dom.requestCapture(wrapper, UPDATE_TIMEOUT_MS)) ?? false
            );
        },
        dispose() {
            dom.unwrapElement(wrapper, source);
        },
    };
}

async function snapshotDriver(
    deps: CaptureDeps,
    dom: CaptureDom,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
): Promise<CaptureDriver> {
    const savedOpacity = source.style.opacity;
    const originalOpacity =
        savedOpacity === "" ? 1 : Number.parseFloat(savedOpacity);

    const [firstW, firstH] = snapshotSize(source);
    const first = await dom.dom2canvas(
        source,
        originalOpacity,
        undefined,
        deps.maxTextureSize,
    );
    if (first.width === 0 || first.height === 0) {
        throw new Error("[VFX-JS] capture() got an empty snapshot.");
    }
    slot.texture = deps.createTexture(first);
    slot.width = firstW;
    slot.height = firstH;
    if (opts.hide) {
        source.style.setProperty("opacity", "0");
    }

    let disposed = false;
    let running: Promise<boolean> | null = null;
    let queued: Promise<boolean> | null = null;
    const snapshot = async (): Promise<boolean> => {
        const old = slot.texture.source;
        // dom2canvas sizes the snapshot from the box at its start.
        const [w, h] = snapshotSize(source);
        const canvas = await dom.dom2canvas(
            source,
            originalOpacity,
            old instanceof OffscreenCanvas ? old : undefined,
            deps.maxTextureSize,
        );
        // Not laid out (0-size canvas): keep the previous texture.
        if (disposed || canvas.width === 0 || canvas.height === 0) {
            return false;
        }
        slot.texture = deps.refreshTexture(slot.texture, canvas);
        slot.width = w;
        slot.height = h;
        return true;
    };
    // One snapshot at a time. A call during a snapshot queues one more,
    // which every call until it starts shares, so its DOM changes are kept.
    const update = (): Promise<boolean> => {
        if (disposed) {
            return Promise.resolve(false);
        }
        if (!running) {
            running = snapshot().finally(() => {
                running = null;
            });
            return running;
        }
        queued ??= running
            .catch(() => {})
            .then(() => {
                queued = null;
                return update();
            });
        return queued;
    };

    return {
        box: source,
        sizeFollowsBox: false,
        uploadEveryFrame: false,
        update,
        resize() {
            const [w, h] = snapshotSize(source);
            if (w !== slot.width || h !== slot.height) {
                update().catch((err) => console.error(err));
            }
        },
        dispose() {
            disposed = true;
            if (opts.hide) {
                source.style.opacity = savedOpacity;
            }
        },
    };
}
