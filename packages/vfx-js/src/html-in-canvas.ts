/// <reference path="./html-in-canvas.d.ts" />
import { markHicCanvas, redrawNestedCanvases } from "./hic-canvas.js";
import { getImageSourceUrl } from "./image-source.js";

/**
 * Check if an image is cross-origin.
 */
function isCrossOrigin(img: HTMLImageElement): boolean {
    const imageUrl = getImageSourceUrl(img);
    if (!imageUrl || imageUrl.startsWith("data:")) {
        return false;
    }
    try {
        const imgUrl = new URL(imageUrl, location.href);
        return imgUrl.origin !== location.origin;
    } catch {
        return false;
    }
}

/**
 * Fetch image as blob URL. Much cheaper than data URL for large images
 * since it's just a reference — no base64 encoding overhead.
 */
async function toBlobUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

/**
 * Replace cross-origin `<img>` src with blob URLs inside the subtree.
 * Returns a restore function that reverts src and revokes blob URLs.
 */
async function inlineCrossOriginImages(root: Element): Promise<() => void> {
    const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
    const crossOriginImgs = imgs.filter(
        (img) => img.complete && img.naturalWidth > 0 && isCrossOrigin(img),
    );

    if (crossOriginImgs.length === 0) {
        return () => {};
    }

    const originals = new Map<HTMLImageElement, string>();
    const blobUrls: string[] = [];

    await Promise.all(
        crossOriginImgs.map(async (img) => {
            try {
                const imageUrl = getImageSourceUrl(img);
                const blobUrl = await toBlobUrl(imageUrl);
                originals.set(img, imageUrl);
                blobUrls.push(blobUrl);

                // Wait for the image to reload with the blob URL
                await new Promise<void>((resolve) => {
                    img.addEventListener("load", () => resolve(), {
                        once: true,
                    });
                    img.src = blobUrl;
                });
            } catch {
                // CORS not allowed — skip silently
            }
        }),
    );

    return () => {
        for (const [img, src] of originals) {
            img.src = src;
        }
        for (const url of blobUrls) {
            URL.revokeObjectURL(url);
        }
    };
}

const MARGIN_PROPS = [
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
] as const;

const POSITION_FLOW_STYLES = [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "float",
    "flex",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "align-self",
    "justify-self",
    "place-self",
    "order",
    "grid-column",
    "grid-column-start",
    "grid-column-end",
    "grid-row",
    "grid-row-start",
    "grid-row-end",
    "grid-area",
] as const;

export interface CaptureOpts {
    onCapture: (offscreen: OffscreenCanvas) => void;
    maxSize?: number;
}

const canvasResizeObservers = new WeakMap<HTMLCanvasElement, ResizeObserver>();
const paintListeners = new WeakMap<HTMLCanvasElement, (e?: Event) => void>();
const childResizeObservers = new WeakMap<HTMLCanvasElement, ResizeObserver>();
const savedMargins = new WeakMap<HTMLElement, string>();
const savedWidths = new WeakMap<HTMLElement, string>();
const savedBoxSizing = new WeakMap<HTMLElement, string>();
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();
const addedDrawable = new WeakSet<HTMLElement>();
const captureWaiters = new WeakMap<HTMLCanvasElement, Set<() => void>>();

const CAPTURE_TIMEOUT_MS = 300;

/**
 * Add a waiter to the set and resolve when it is called or on timeout.
 */
export function waitForFlush(
    waiters: Set<() => void>,
    timeoutMs: number,
): Promise<void> {
    return new Promise<void>((resolve) => {
        const done = () => {
            clearTimeout(timer);
            waiters.delete(done);
            resolve();
        };
        const timer = setTimeout(done, timeoutMs);
        waiters.add(done);
    });
}

function flushWaiters(waiters: Set<() => void> | undefined): void {
    if (!waiters) {
        return;
    }
    for (const done of [...waiters]) {
        done();
    }
}

/**
 * Move a node and keep its state (iframes, video, focus) when the browser
 * supports `moveBefore`.
 */
export function moveNode(
    parent: ParentNode & Node,
    node: Node,
    before: Node | null,
): void {
    if (typeof parent.moveBefore === "function") {
        try {
            parent.moveBefore(node, before);
            return;
        } catch {
            // Throws when the move can't keep state, e.g. across documents.
        }
    }
    parent.insertBefore(node, before);
}

/**
 * Request a new capture of a canvas set up by `setupCapture`.
 * Resolves after the capture is handed to `onCapture`, or after a timeout.
 * Returns `undefined` if the canvas has no capture set up.
 */
export function requestCapture(
    canvas: HTMLCanvasElement,
    timeoutMs = CAPTURE_TIMEOUT_MS,
): Promise<void> | undefined {
    const waiters = captureWaiters.get(canvas);
    if (!waiters) {
        return undefined;
    }
    const captured = waitForFlush(waiters, timeoutMs);
    canvas.requestPaint();
    return captured;
}

/**
 * Clear the first capture that `setupCapture` left on the canvas.
 * Call it once the overlay has the element's texture.
 */
export function releaseFirstCapture(canvas: HTMLCanvasElement): void {
    // The player's frame callback is queued first, so the overlay draws
    // in the same frame that this clears.
    requestAnimationFrame(() => {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    });
}

/**
 * Set up the paint handler + ResizeObservers on an html-in-canvas wrapper
 * (`<canvas layoutsubtree content="drawable">`). Returns the initial
 * OffscreenCanvas from the first paint.
 *
 * The first capture stays on the canvas so wrapping does not flash.
 * Call `releaseFirstCapture` once the overlay shows the texture.
 */
export async function setupCapture(
    canvas: HTMLCanvasElement,
    opts: CaptureOpts,
): Promise<OffscreenCanvas> {
    // Chrome 159+ paints only `content="drawable"` canvases and their
    // `drawable` children; older Chrome uses `layoutsubtree`.
    markHicCanvas(canvas, canvas.firstElementChild);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get 2d context from layoutsubtree canvas");
    }

    const { onCapture, maxSize } = opts;
    const waiters = new Set<() => void>();
    captureWaiters.set(canvas, waiters);
    let offscreen: OffscreenCanvas | null = null;

    let resolveFirst: ((oc: OffscreenCanvas) => void) | null = null;
    const firstCapture = new Promise<OffscreenCanvas>((resolve) => {
        resolveFirst = resolve;
    });

    // Chrome fires both `onpaint` and the `paint` event for one paint;
    // capture once per event.
    let lastEvent: Event | null = null;
    const onPaint = (e?: Event) => {
        if (e) {
            if (e === lastEvent) {
                return;
            }
            lastEvent = e;
        }
        const child = canvas.firstElementChild;
        if (!child || canvas.width === 0 || canvas.height === 0) {
            return;
        }
        if (!child.hasAttribute("drawable")) {
            child.setAttribute("drawable", "");
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Returns a DOMMatrix in older Chrome and nothing in newer; unused.
        ctx.drawElementImage(child, 0, 0);
        // Chrome 156-159 draw nested canvases at the wrong size and clip
        // them. A probe for this said "no bug" on a real Chrome 156 page
        // load, so always redraw them.
        redrawNestedCanvases(ctx, child);

        // Copy to OffscreenCanvas (with maxSize clamp)
        let w = canvas.width;
        let h = canvas.height;
        if (maxSize && (w > maxSize || h > maxSize)) {
            const s = Math.min(maxSize / w, maxSize / h);
            w = Math.floor(w * s);
            h = Math.floor(h * s);
        }
        if (!offscreen || offscreen.width !== w || offscreen.height !== h) {
            offscreen = new OffscreenCanvas(w, h);
        }
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) {
            return;
        }
        offCtx.clearRect(0, 0, w, h);
        offCtx.drawImage(canvas, 0, 0, w, h);

        if (resolveFirst) {
            resolveFirst(offscreen);
            resolveFirst = null;
            flushWaiters(waiters);
            return; // initial capture is returned via promise, skip onCapture
        }

        // Clear so VFXPlayer's WebGL canvas renders the shader version
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onCapture(offscreen);
        flushWaiters(waiters);
    };
    canvas.onpaint = onPaint;
    canvas.addEventListener("paint", onPaint);
    paintListeners.set(canvas, onPaint);

    // Pixel buffer sync + re-capture on resize
    const canvasRO = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const dpSize = entry.devicePixelContentBoxSize?.[0];
            if (dpSize) {
                canvas.width = dpSize.inlineSize;
                canvas.height = dpSize.blockSize;
            } else {
                const box = entry.borderBoxSize?.[0];
                if (box) {
                    const dpr = window.devicePixelRatio;
                    canvas.width = Math.round(box.inlineSize * dpr);
                    canvas.height = Math.round(box.blockSize * dpr);
                }
            }
        }
        canvas.requestPaint();
    });
    canvasRO.observe(canvas, { box: "device-pixel-content-box" });
    canvasResizeObservers.set(canvas, canvasRO);

    // Sync CSS height from child (canvas doesn't auto-fit to children).
    const child = canvas.firstElementChild as HTMLElement | null;
    let lastChildHeight = "";
    if (child) {
        const childRO = new ResizeObserver((entries) => {
            const box = entries[0].borderBoxSize?.[0];
            if (!box) {
                return;
            }
            const h = `${Math.round(box.blockSize)}px`;
            if (h !== lastChildHeight) {
                lastChildHeight = h;
                canvas.style.setProperty("height", h);
            }
        });
        childRO.observe(child);
        childResizeObservers.set(canvas, childRO);
    }

    return firstCapture;
}

/**
 * Tear down onpaint handler + ResizeObservers set up by setupCapture.
 */
export function teardownCapture(canvas: HTMLCanvasElement): void {
    canvas.onpaint = null;
    flushWaiters(captureWaiters.get(canvas));
    captureWaiters.delete(canvas);
    const onPaint = paintListeners.get(canvas);
    if (onPaint) {
        canvas.removeEventListener("paint", onPaint);
        paintListeners.delete(canvas);
    }
    const canvasRO = canvasResizeObservers.get(canvas);
    if (canvasRO) {
        canvasRO.disconnect();
        canvasResizeObservers.delete(canvas);
    }
    const childRO = childResizeObservers.get(canvas);
    if (childRO) {
        childRO.disconnect();
        childResizeObservers.delete(canvas);
    }
}

interface WrapResult {
    canvas: HTMLCanvasElement;
    initialCapture: OffscreenCanvas;
}

/**
 * Wrap an element in a `<canvas layoutsubtree content="drawable">` for
 * html-in-canvas capture.
 *
 * CSS identity (class + style) is copied to the canvas so width/height
 * resolve via normal CSS cascade. Canvas is a replaced element — it does
 * NOT auto-fit height to children, even with `layoutsubtree`. A child RO
 * in `setupCapture` keeps the CSS height in sync with the child.
 *
 * The element is expected to fill its containing block (full-width) or carry
 * an explicit px width; content-sized elements are unsupported. See the
 * sizing policy in docs/html-in-canvas.md.
 *
 * Delegates onpaint + ROs to `setupCapture`.
 */
export async function wrapElement(
    element: HTMLElement,
    opts: CaptureOpts,
): Promise<WrapResult> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    if (!element.hasAttribute("drawable")) {
        addedDrawable.add(element);
    }
    markHicCanvas(canvas, element);

    // Copy CSS identity
    canvas.className = element.className;
    const styleAttr = element.getAttribute("style");
    if (styleAttr) {
        canvas.setAttribute("style", styleAttr);
    }

    canvas.style.setProperty("padding", "0");
    canvas.style.setProperty("border", "none");
    canvas.style.setProperty("box-sizing", "content-box");
    // Element's bg is already baked into the captured texture; if we
    // inherit it as the canvas's CSS bg too, alpha=0 fragments show the
    // bg again instead of what's behind the canvas.
    canvas.style.setProperty("background", "transparent");

    // Computed-style overrides
    const cs = getComputedStyle(element);

    const display = cs.display === "inline" ? "block" : cs.display;
    canvas.style.setProperty("display", display);

    for (const prop of MARGIN_PROPS) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }
    for (const prop of POSITION_FLOW_STYLES) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // Full-width target → 100% (tracks resizes); explicit px width → pinned
    // border-box (constant, reflow-safe). Content-sized unsupported (see docs).
    if (element.style.width.endsWith("px")) {
        canvas.style.setProperty("width", `${rect.width}px`);
    } else {
        canvas.style.setProperty("width", "100%");
    }
    // Replaced element — height doesn't derive from children, so seed an
    // explicit border-box height. setupCapture's child RO keeps it in sync.
    if (!canvas.style.height) {
        canvas.style.setProperty("height", `${rect.height}px`);
    }

    // Pixel buffer (may be 0 — setupCapture's RO corrects)
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // DOM swap
    savedMargins.set(element, element.style.margin);
    savedWidths.set(element, element.style.width);
    savedBoxSizing.set(element, element.style.boxSizing);
    element.parentNode?.insertBefore(canvas, element);
    moveNode(canvas, element, null);
    element.style.setProperty("margin", "0");

    // layoutsubtree canvas doesn't establish a standard block formatting
    // context — block children won't auto-fill the containing block width.
    // Force 100% so the element matches the canvas's CSS dimensions.
    element.style.setProperty("width", "100%");
    element.style.setProperty("box-sizing", "border-box");

    // Cross-origin images
    const restore = await inlineCrossOriginImages(element);
    imageRestorers.set(canvas, restore);

    const initialCapture = await setupCapture(canvas, opts);

    return { canvas, initialCapture };
}

/**
 * Unwrap: move element back out of the canvas wrapper and restore state.
 */
export function unwrapElement(
    canvas: HTMLCanvasElement,
    element: HTMLElement,
): void {
    teardownCapture(canvas);

    // Restore cross-origin image src and revoke blob URLs
    const restoreImages = imageRestorers.get(canvas);
    if (restoreImages) {
        restoreImages();
        imageRestorers.delete(canvas);
    }

    // Move element back before canvas, then remove canvas
    const parent = canvas.parentNode;
    if (parent) {
        moveNode(parent, element, canvas);
    }
    canvas.remove();
    if (addedDrawable.has(element)) {
        element.removeAttribute("drawable");
        addedDrawable.delete(element);
    }

    // Restore original styles
    const savedMargin = savedMargins.get(element);
    if (savedMargin !== undefined) {
        element.style.margin = savedMargin;
        savedMargins.delete(element);
    }
    const savedWidth = savedWidths.get(element);
    if (savedWidth !== undefined) {
        element.style.width = savedWidth;
        savedWidths.delete(element);
    }
    const savedBS = savedBoxSizing.get(element);
    if (savedBS !== undefined) {
        element.style.boxSizing = savedBS;
        savedBoxSizing.delete(element);
    }
}
