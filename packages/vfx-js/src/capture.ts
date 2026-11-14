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

/** What the player gives `createCapture`. */
export type CaptureDeps = {
    createTexture(source: TextureSource): Texture;
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
    /** Upload on every frame (video, canvas). */
    readonly everyFrame: boolean;
    update(): Promise<void>;
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
 * Capture `source` into a texture that effects can read.
 * Resolves after the first capture is in the texture.
 * `onDispose` is called once, when the capture is disposed.
 */
export async function createCapture(
    deps: CaptureDeps,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    onDispose?: () => void,
): Promise<CaptureEntry> {
    const slot = { width: 0, height: 0 } as CaptureSlot;
    const driver = await createDriver(deps, source, opts, slot);

    let disposed = false;
    let warned = false;
    const rect: MutableRect = { x: 0, y: 0, width: 0, height: 0 };

    const measure = () => {
        const r = driver.box.getBoundingClientRect();
        rect.x = r.left;
        rect.y = r.top;
        // Video and canvas are captured every frame, so their size follows the box.
        if (driver.everyFrame) {
            slot.width = r.width;
            slot.height = r.height;
        }
        rect.width = slot.width;
        rect.height = slot.height;
    };

    const update = (): Promise<void> =>
        disposed ? Promise.resolve() : driver.update();

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
            update();
        },
    );

    const capture: VFXCapture = {
        texture,
        rect,
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
            if (driver.everyFrame) {
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
): Promise<CaptureDriver> {
    const dom = { ...defaultDom, ...deps.dom };
    if (
        source instanceof HTMLImageElement ||
        source instanceof HTMLVideoElement ||
        source instanceof HTMLCanvasElement
    ) {
        return mediaDriver(deps, source, opts, slot);
    }
    // drawElementImage throws on an element without a box, and dom2canvas draws nothing.
    if (source.getClientRects().length === 0) {
        return Promise.reject(
            new Error("[VFX-JS] capture() needs an element with a box."),
        );
    }
    if (dom.supportsHtmlInCanvas()) {
        return hicDriver(deps, dom, source, opts, slot);
    }
    return snapshotDriver(deps, dom, source, opts, slot);
}

function setSlotTexture(slot: CaptureSlot, texture: Texture): void {
    texture.premultiplyAlpha = true;
    texture.wrapS = "clamp";
    texture.wrapT = "clamp";
    texture.minFilter = "linear";
    texture.magFilter = "linear";
    slot.texture = texture;
}

function setSlotSize(slot: CaptureSlot, box: Element): void {
    const r = box.getBoundingClientRect();
    slot.width = r.width;
    slot.height = r.height;
}

async function mediaDriver(
    deps: CaptureDeps,
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
): Promise<CaptureDriver> {
    const isVideo = source instanceof HTMLVideoElement;
    const savedOpacity = source.style.opacity;
    const restoreOpacity = () => {
        if (opts.hide) {
            source.style.opacity = savedOpacity;
        }
    };
    if (opts.hide) {
        // Don't hide a video completely, to keep frames decoding.
        source.style.setProperty("opacity", isVideo ? "0.0001" : "0");
    }

    const setTexture = () => {
        setSlotTexture(slot, deps.createTexture(source));
        setSlotSize(slot, source);
    };

    try {
        if (source instanceof HTMLImageElement) {
            await source.decode();
            setTexture();
            return {
                box: source,
                everyFrame: false,
                async update() {
                    await source.decode();
                    slot.texture.needsUpdate = true;
                    setSlotSize(slot, source);
                },
                dispose: restoreOpacity,
            };
        }
        if (source instanceof HTMLVideoElement && source.readyState < 3) {
            await new Promise<void>((resolve) => {
                source.addEventListener("canplay", () => resolve(), {
                    once: true,
                });
            });
        }
        setTexture();
        return {
            box: source,
            everyFrame: true,
            update: () => Promise.resolve(),
            dispose: restoreOpacity,
        };
    } catch (err) {
        restoreOpacity();
        throw err;
    }
}

async function hicDriver(
    deps: CaptureDeps,
    dom: CaptureDom,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
): Promise<CaptureDriver> {
    const parent = source.parentNode;
    let wrapper: HTMLCanvasElement;
    let initialCapture: OffscreenCanvas;
    try {
        ({ canvas: wrapper, initialCapture } = await dom.wrapElement(source, {
            onCapture: (offscreen) => {
                slot.texture = deps.refreshTexture(slot.texture, offscreen);
                setSlotSize(slot, wrapper);
            },
            maxSize: deps.maxTextureSize,
            keepDrawn: !opts.hide,
            stillCover: opts.hide ? undefined : { zIndex: deps.stillZIndex },
        }));
    } catch (err) {
        // wrapElement has already moved the element when its capture setup fails.
        const canvas = source.parentNode;
        if (canvas !== parent && canvas instanceof HTMLCanvasElement) {
            dom.unwrapElement(canvas, source);
        }
        throw err;
    }

    setSlotTexture(slot, deps.createTexture(initialCapture));
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
        everyFrame: false,
        async update() {
            await dom.requestCapture(wrapper);
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

    const first = await dom.dom2canvas(
        source,
        originalOpacity,
        undefined,
        deps.maxTextureSize,
    );
    if (first.width === 0 || first.height === 0) {
        throw new Error("[VFX-JS] capture() got an empty snapshot.");
    }
    setSlotTexture(slot, deps.createTexture(first));
    setSlotSize(slot, source);
    if (opts.hide) {
        source.style.setProperty("opacity", "0");
    }

    let disposed = false;
    let running: Promise<void> | null = null;
    let queued: Promise<void> | null = null;
    const snapshot = async () => {
        const old = slot.texture.source;
        const canvas = await dom.dom2canvas(
            source,
            originalOpacity,
            old instanceof OffscreenCanvas ? old : undefined,
            deps.maxTextureSize,
        );
        // Not laid out (0-size canvas): keep the previous texture.
        if (disposed || canvas.width === 0 || canvas.height === 0) {
            return;
        }
        slot.texture = deps.refreshTexture(slot.texture, canvas);
        setSlotSize(slot, source);
    };
    // One snapshot at a time. A call during a snapshot queues one more,
    // which every call until it starts shares, so its DOM changes are kept.
    const update = (): Promise<void> => {
        if (disposed) {
            return Promise.resolve();
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
        everyFrame: false,
        update,
        resize() {
            const r = source.getBoundingClientRect();
            if (r.width !== slot.width || r.height !== slot.height) {
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
