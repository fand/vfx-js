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

const resizeObservers = new WeakMap<HTMLCanvasElement, ResizeObserver>();
const savedMargins = new WeakMap<HTMLElement, string>();
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();

/**
 * Wrap an element in a `<canvas layoutsubtree>` for html-in-canvas capture.
 *
 * CSS identity (class + style) is copied to the canvas so width/height
 * resolve via normal CSS cascade. `layoutsubtree` makes height auto-fit
 * to child content, so no child RO is needed.
 *
 * A ResizeObserver on the canvas (`device-pixel-content-box`) keeps the
 * pixel buffer in sync. `onReflow` fires on resize and, if available,
 * on `canvas.onpaint` (child content changes).
 */
export async function wrapElement(
    element: HTMLElement,
    onReflow?: (canvas: HTMLCanvasElement) => void,
): Promise<HTMLCanvasElement> {
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

    // --- 5. Pixel buffer (may be 0 — canvas RO / captureElement corrects) ---
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

    // --- 8. Canvas RO (device-pixel-content-box) for pixel buffer sync ---
    const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const dpSize = entry.devicePixelContentBoxSize?.[0];
            if (dpSize) {
                canvas.width = dpSize.inlineSize;
                canvas.height = dpSize.blockSize;
            } else {
                const box = entry.borderBoxSize?.[0];
                if (box) {
                    canvas.width = Math.round(box.inlineSize * dpr);
                    canvas.height = Math.round(box.blockSize * dpr);
                }
            }
        }
        onReflow?.(canvas);
    });
    ro.observe(canvas, { box: "device-pixel-content-box" });
    resizeObservers.set(canvas, ro);

    // --- 9. onpaint (if available) ---
    if ("onpaint" in canvas) {
        // biome-ignore lint/suspicious/noExplicitAny: onpaint is not yet in TS lib
        (canvas as any).onpaint = () => onReflow?.(canvas);
    }

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
    if (typeof canvas.requestPaint === "function") {
        canvas.requestPaint();
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

    // Wait for paint BEFORE flipping opacity, to minimize the window where
    // the wrapper canvas is visible. (VFXPlayer keeps it at opacity:0 to hide
    // the original element.) drawElementImage includes parent opacity in the
    // paint record, so we still need opacity:1 at draw time.
    await waitForPaint(canvas);

    // Temporarily restore canvas visibility for drawElementImage.
    const prevOpacity = canvas.style.opacity;
    canvas.style.setProperty("opacity", "1");

    // RO manages the pixel buffer in steady state, but it may not have
    // fired yet on the first captureElement call. Fall back to manual
    // measurement when canvas dimensions are 0.
    if (canvas.width === 0 || canvas.height === 0) {
        const childRect = (targetChild as HTMLElement).getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        canvas.width = Math.round(childRect.width * dpr);
        canvas.height = Math.round(childRect.height * dpr);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawElementImage(targetChild, 0, 0);

    canvas.style.setProperty("opacity", prevOpacity);

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
