import { makeEffectTexture } from "./effect-host.js";
import type { Texture, TextureSource } from "./gl/texture.js";
import type { VFXCapture, VFXCaptureOpts, VFXCaptureRect } from "./types.js";

/** What the player gives `createCapture`. */
export type CaptureDeps = {
    createTexture(source: TextureSource): Texture;
    /** Native size of a texture's source, in physical px. */
    textureSize(texture: Texture, axis: "w" | "h"): number;
    /** Transparent texture that a disposed handle resolves to. */
    emptyTexture: Texture;
};

/** What a source kind has to provide. */
type CaptureDriver = {
    /** The element whose rect is measured. */
    readonly box: Element;
    /** Upload on every frame (video, canvas). */
    readonly everyFrame: boolean;
    update(): Promise<void>;
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
    };
}

async function createDriver(
    deps: CaptureDeps,
    source: HTMLElement,
    opts: VFXCaptureOpts,
    slot: CaptureSlot,
): Promise<CaptureDriver> {
    const isVideo = source instanceof HTMLVideoElement;
    if (
        !(source instanceof HTMLImageElement) &&
        !isVideo &&
        !(source instanceof HTMLCanvasElement)
    ) {
        // TODO(capture step 3): html-in-canvas and snapshot drivers.
        throw new Error(
            "[VFX-JS] capture() supports only img, video and canvas.",
        );
    }

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
        const texture = deps.createTexture(source);
        texture.premultiplyAlpha = true;
        texture.wrapS = "clamp";
        texture.wrapT = "clamp";
        texture.minFilter = "linear";
        texture.magFilter = "linear";
        slot.texture = texture;
        setSlotSize();
    };
    const setSlotSize = () => {
        const r = source.getBoundingClientRect();
        slot.width = r.width;
        slot.height = r.height;
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
                    setSlotSize();
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
