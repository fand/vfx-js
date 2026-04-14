/// <reference path="./html-in-canvas.d.ts" />

/**
 * Check if an image is cross-origin.
 */
function isCrossOrigin(img: HTMLImageElement): boolean {
    if (!img.src || img.src.startsWith("data:")) {
        return false;
    }
    try {
        const imgUrl = new URL(img.src, location.href);
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
                const blobUrl = await toBlobUrl(img.src);
                originals.set(img, img.src);
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
const childResizeObservers = new WeakMap<HTMLCanvasElement, ResizeObserver>();
const savedMargins = new WeakMap<HTMLElement, string>();
const savedWidths = new WeakMap<HTMLElement, string>();
const savedBoxSizing = new WeakMap<HTMLElement, string>();
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();

/**
 * Set up onpaint handler + ResizeObservers on a layoutsubtree canvas.
 * Returns the initial OffscreenCanvas from the first onpaint.
 */
export async function setupCapture(
    canvas: HTMLCanvasElement,
    opts: CaptureOpts,
): Promise<OffscreenCanvas> {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get 2d context from layoutsubtree canvas");
    }

    const { onCapture, maxSize } = opts;
    let offscreen: OffscreenCanvas | null = null;

    let resolveFirst: ((oc: OffscreenCanvas) => void) | null = null;
    const firstCapture = new Promise<OffscreenCanvas>((resolve) => {
        resolveFirst = resolve;
    });

    canvas.onpaint = () => {
        const child = canvas.firstElementChild;
        if (!child || canvas.width === 0 || canvas.height === 0) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawElementImage(child, 0, 0);

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

        // Clear so VFXPlayer's WebGL canvas renders the shader version
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resolveFirst) {
            resolveFirst(offscreen);
            resolveFirst = null;
            return; // initial capture is returned via promise, skip onCapture
        }
        onCapture(offscreen);
    };

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
 * Wrap an element in a `<canvas layoutsubtree>` for html-in-canvas capture.
 *
 * CSS identity (class + style) is copied to the canvas so width/height
 * resolve via normal CSS cascade. Canvas is a replaced element — it does
 * NOT auto-fit height to children, even with `layoutsubtree`. A child RO
 * in `setupCapture` keeps the CSS height in sync with the child.
 *
 * Delegates onpaint + ROs to `setupCapture`.
 */
export async function wrapElement(
    element: HTMLElement,
    opts: CaptureOpts,
): Promise<WrapResult> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("layoutsubtree", "");

    // Copy CSS identity
    canvas.className = element.className;
    const styleAttr = element.getAttribute("style");
    if (styleAttr) {
        canvas.setAttribute("style", styleAttr);
    }

    canvas.style.setProperty("padding", "0");
    canvas.style.setProperty("border", "none");
    canvas.style.setProperty("box-sizing", "content-box");

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

    // Padding/border compensation:
    // Canvas content-box must equal element's border-box.
    const pf = (v: string) => Number.parseFloat(v);
    const paddingH =
        pf(cs.paddingLeft) +
        pf(cs.paddingRight) +
        pf(cs.borderLeftWidth) +
        pf(cs.borderRightWidth);
    const paddingV =
        pf(cs.paddingTop) +
        pf(cs.paddingBottom) +
        pf(cs.borderTopWidth) +
        pf(cs.borderBottomWidth);

    if (paddingH > 0) {
        canvas.style.setProperty("width", `${rect.width}px`);
    }
    if (paddingV > 0) {
        canvas.style.setProperty("height", `${rect.height}px`);
    }

    // Prevent intrinsic-size feedback loop with ResizeObserver.
    if (!canvas.style.width) {
        canvas.style.setProperty("width", "100%");
    }
    // Replaced element — height doesn't derive from children.
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
    canvas.appendChild(element);
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
    canvas.parentNode?.insertBefore(element, canvas);
    canvas.remove();

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
