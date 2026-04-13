/// <reference path="./html-in-canvas.d.ts" />

/**
 * Check if an image is cross-origin.
 */
function isCrossOrigin(img: HTMLImageElement): boolean {
    if (!img.src || img.src.startsWith("data:")) return false;
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
 * Safe because `layoutsubtree` prevents visual rendering of children.
 * Returns a restore function.
 */
async function inlineCrossOriginImages(root: Element): Promise<() => void> {
    const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
    const crossOriginImgs = imgs.filter(
        (img) => img.complete && img.naturalWidth > 0 && isCrossOrigin(img),
    );

    if (crossOriginImgs.length === 0) return () => {};

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
    "margin",
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
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();

/**
 * Set up onpaint handler + ResizeObserver on a layoutsubtree canvas.
 * drawElementImage is called inside onpaint (spec-compliant: uses "current
 * frame" snapshot). Returns the initial OffscreenCanvas from the first onpaint.
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
        if (!child || canvas.width === 0 || canvas.height === 0) return;

        // drawElementImage inside onpaint → "current frame" snapshot
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
        if (!offCtx) return;
        offCtx.clearRect(0, 0, w, h);
        offCtx.drawImage(canvas, 0, 0, w, h);

        // Clear canvas so wrapper appears empty
        // (VFXPlayer's WebGL canvas renders the shader version)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resolveFirst) {
            resolveFirst(offscreen);
            resolveFirst = null;
            return; // initial capture is returned via promise, skip onCapture
        }
        onCapture(offscreen);
    };

    // Canvas RO: pixel buffer sync + re-capture trigger
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

    // Child RO: canvas is a replaced element and doesn't auto-fit height
    // to children. Sync CSS height from the child so the canvas RO gets
    // the correct dimensions.
    const child = canvas.firstElementChild as HTMLElement | null;
    if (child) {
        const childRO = new ResizeObserver((entries) => {
            const box = entries[0].borderBoxSize?.[0];
            if (box) {
                canvas.style.setProperty("height", `${box.blockSize}px`);
            }
            // canvas RO will fire from the CSS height change → pixel buffer + requestPaint
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
 * Delegates onpaint + RO to `setupCapture`.
 */
export async function wrapElement(
    element: HTMLElement,
    opts: CaptureOpts,
): Promise<WrapResult> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("layoutsubtree", "");

    // --- 1. Copy CSS identity ---
    canvas.className = element.className;
    const styleAttr = element.getAttribute("style");
    if (styleAttr) {
        canvas.setAttribute("style", styleAttr);
    }

    // --- 2. Canvas-specific overrides (literal values, safe for detached) ---
    canvas.style.setProperty("padding", "0");
    canvas.style.setProperty("border", "none");
    canvas.style.setProperty("box-sizing", "content-box");

    // --- 3. Computed-style overrides ---
    const cs = getComputedStyle(element);

    const display = cs.display === "inline" ? "block" : cs.display;
    canvas.style.setProperty("display", display);

    for (const prop of MARGIN_PROPS) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }
    for (const prop of POSITION_FLOW_STYLES) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // --- 4. Padding/border compensation ---
    // Canvas has padding:0 border:none, so its content-box must equal the
    // element's border-box. When the element has padding/border, override
    // the copied width with the measured border-box value.
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

    // Fallback: if no explicit CSS width was set (no inline, no class, no
    // compensation), canvas would use its intrinsic size (canvas.width attr),
    // creating a feedback loop with the RO. Set 100% to act as a block.
    if (!canvas.style.width) {
        canvas.style.setProperty("width", "100%");
    }
    // Canvas is a replaced element — without explicit height it derives
    // height from the pixel-buffer aspect ratio, not from children.
    // Always set initial CSS height from the element's measured height.
    if (!canvas.style.height) {
        canvas.style.setProperty("height", `${rect.height}px`);
    }

    // --- 5. Pixel buffer (may be 0 — setupCapture's RO corrects) ---
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // --- 6. DOM swap ---
    savedMargins.set(element, element.style.margin);
    element.parentNode?.insertBefore(canvas, element);
    canvas.appendChild(element);
    element.style.setProperty("margin", "0");

    // --- 7. Cross-origin images ---
    const restore = await inlineCrossOriginImages(element);
    imageRestorers.set(canvas, restore);

    // --- 8. onpaint + RO via setupCapture ---
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

    // Restore original margin
    const savedMargin = savedMargins.get(element);
    if (savedMargin !== undefined) {
        element.style.margin = savedMargin;
        savedMargins.delete(element);
    }
}
