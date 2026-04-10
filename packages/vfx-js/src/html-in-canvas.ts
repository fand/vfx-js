/// <reference path="./html-in-canvas.d.ts" />

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

/**
 * Wrap an element in a `<canvas layoutsubtree>` for html-in-canvas capture.
 * The canvas takes over the element's position in the layout flow.
 */
export function wrapElement(element: HTMLElement): HTMLCanvasElement {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("layoutsubtree", "");

    // Copy layout-flow styles from element to canvas
    const cs = window.getComputedStyle(element);
    for (const prop of LAYOUT_FLOW_STYLES) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // Set canvas CSS size to measured element size
    canvas.style.setProperty("width", `${rect.width}px`);
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

    // ResizeObserver to keep canvas size in sync
    const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.style.setProperty("width", `${width}px`);
            canvas.style.setProperty("height", `${height}px`);
            canvas.width = Math.round(width * window.devicePixelRatio);
            canvas.height = Math.round(height * window.devicePixelRatio);
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
 * `requestPaint()` schedules a paint, then we wait one frame for it to complete.
 */
function waitForPaint(canvas: HTMLCanvasElement): Promise<void> {
    if (typeof (canvas as any).requestPaint === "function") {
        (canvas as any).requestPaint();
    }
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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

    // Ensure the browser has painted the element
    await waitForPaint(canvas);

    // Draw the child element onto the layoutsubtree canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio;
    ctx.scale(dpr, dpr);
    ctx.drawElementImage(targetChild, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

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
