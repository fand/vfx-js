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
 * Replace cross-origin `<img>` src with data URLs inside the subtree.
 * Safe because `layoutsubtree` prevents visual rendering of children.
 * Returns a restore function.
 */
async function inlineCrossOriginImages(
    root: Element,
): Promise<() => void> {
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

const LAYOUT_FLOW_STYLES = [
    "display",
    "margin",
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
    "order",
    "grid-column",
    "grid-row",
    "grid-area",
    "justify-self",
    "place-self",
] as const;

const resizeObservers = new WeakMap<HTMLCanvasElement, ResizeObserver>();
const savedMargins = new WeakMap<HTMLElement, string>();
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();

/**
 * Wrap an element in a `<canvas layoutsubtree>` for html-in-canvas capture.
 * The canvas takes over the element's position in the layout flow.
 */
export async function wrapElement(element: HTMLElement): Promise<HTMLCanvasElement> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("layoutsubtree", "");

    // Copy layout-flow styles from element to canvas
    const cs = window.getComputedStyle(element);
    for (const prop of LAYOUT_FLOW_STYLES) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // Width: responsive (fills parent like original block/flex/grid element)
    // Height: measured value (updated by ResizeObserver when content reflows)
    canvas.style.setProperty("width", "100%");
    canvas.style.setProperty("height", `${rect.height}px`);
    canvas.style.setProperty("box-sizing", "border-box");

    // Set pixel buffer size
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // Save original margin and reset
    savedMargins.set(element, element.style.margin);

    // Insert canvas in element's place, move element inside
    element.parentNode?.insertBefore(canvas, element);
    canvas.appendChild(element);
    element.style.setProperty("margin", "0");

    // Inline cross-origin images once (safe because layoutsubtree hides children)
    const restore = await inlineCrossOriginImages(element);
    imageRestorers.set(canvas, restore);

    // ResizeObserver: only update CSS height (content reflow).
    // Pixel buffer is updated in captureElement to avoid clearing canvas mid-frame.
    const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { height } = entry.contentRect;
            canvas.style.setProperty("height", `${height}px`);
        }
    });
    ro.observe(element);
    resizeObservers.set(canvas, ro);

    return canvas;
}

/**
 * Unwrap: move element back out of the canvas wrapper and restore state.
 */
export function unwrapElement(
    canvas: HTMLCanvasElement,
    element: HTMLElement,
): void {
    const ro = resizeObservers.get(canvas);
    if (ro) {
        ro.disconnect();
        resizeObservers.delete(canvas);
    }

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

/**
 * Wait for the browser to paint the layoutsubtree canvas children.
 * `requestPaint()` schedules a paint; rAF fires before paint, so we need
 * a double-rAF to ensure the paint record is cached.
 */
function waitForPaint(canvas: HTMLCanvasElement): Promise<void> {
    if (typeof (canvas as any).requestPaint === "function") {
        (canvas as any).requestPaint();
    }
    return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
}

/**
 * Capture element content via drawElementImage → OffscreenCanvas.
 * Waits for paint record before calling drawElementImage.
 * Reuses `oldOffscreen` when dimensions match.
 */
export async function captureElement(
    canvas: HTMLCanvasElement,
    targetChild: Element,
    oldOffscreen?: OffscreenCanvas,
    maxSize?: number,
): Promise<OffscreenCanvas> {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get 2d context from layoutsubtree canvas");
    }

    // Sync pixel buffer to current child dimensions (may have changed due to resize).
    // Done here (not in ResizeObserver) to avoid clearing the canvas mid-frame.
    const childRect = (targetChild as HTMLElement).getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(childRect.width * dpr);
    canvas.height = Math.round(childRect.height * dpr);

    // Ensure the browser has painted the element
    await waitForPaint(canvas);

    // Draw the child element onto the layoutsubtree canvas.
    // drawElementImage renders the display list at device pixel resolution,
    // so no DPR scaling is needed — the content fills the pixel buffer as-is.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawElementImage(targetChild, 0, 0);

    // Clamp to maxSize
    let w = canvas.width;
    let h = canvas.height;
    if (maxSize && (w > maxSize || h > maxSize)) {
        const scale = Math.min(maxSize / w, maxSize / h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
    }

    // Reuse or create OffscreenCanvas
    const offscreen =
        oldOffscreen && oldOffscreen.width === w && oldOffscreen.height === h
            ? oldOffscreen
            : new OffscreenCanvas(w, h);

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) {
        throw new Error("Failed to get 2d context from OffscreenCanvas");
    }

    offCtx.clearRect(0, 0, w, h);
    offCtx.drawImage(canvas, 0, 0, w, h);

    return offscreen;
}
