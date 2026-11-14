/// <reference path="./html-in-canvas.d.ts" />
import { markHicCanvas, redrawNestedCanvases } from "./hic-canvas.js";
import { getImageSourceUrl } from "./image-source.js";
import { coverWithStill } from "./still-clone.js";

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

// Elements with an intrinsic size; insets don't stretch them.
const REPLACED_TAGS = new Set([
    "IMG",
    "VIDEO",
    "CANVAS",
    "IFRAME",
    "EMBED",
    "OBJECT",
    "INPUT",
    "TEXTAREA",
    "SELECT",
]);

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

const INSET_PROPS = new Set<string>(["top", "right", "bottom", "left"]);

// Inline styles `lockCanvasSize` sets and restores.
const LOCKED_PROPS = [
    "width",
    "height",
    "flex-grow",
    "flex-shrink",
    "min-width",
    "max-width",
    "overflow",
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
const savedPositions = new WeakMap<HTMLElement, string>();
const savedHeights = new WeakMap<HTMLElement, string>();
const imageRestorers = new WeakMap<HTMLCanvasElement, () => void>();
const addedDrawable = new WeakSet<HTMLElement>();
const stillCovers = new WeakMap<HTMLCanvasElement, () => void>();
const captureWaiters = new WeakMap<HTMLCanvasElement, Set<() => void>>();
const lockedCanvases = new WeakSet<HTMLCanvasElement>();
// Canvases whose height comes from top/bottom insets, not the child.
const insetHeightCanvases = new WeakSet<HTMLCanvasElement>();

const CAPTURE_TIMEOUT_MS = 300;

const PX_LENGTH = /^[\d.e+-]+px$/;

/**
 * Add a waiter to the set and resolve when it is called or on timeout.
 * Resolves to false on timeout.
 */
export function waitForFlush(
    waiters: Set<() => void>,
    timeoutMs: number,
): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const finish = (flushed: boolean) => {
            clearTimeout(timer);
            waiters.delete(done);
            resolve(flushed);
        };
        const done = () => finish(true);
        const timer = setTimeout(() => finish(false), timeoutMs);
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
 * Resolves after the capture is handed to `onCapture`, or to false after a timeout.
 * Returns `undefined` if the canvas has no capture set up.
 */
export function requestCapture(
    canvas: HTMLCanvasElement,
    timeoutMs = CAPTURE_TIMEOUT_MS,
): Promise<boolean> | undefined {
    const waiters = captureWaiters.get(canvas);
    if (!waiters) {
        return undefined;
    }
    const captured = waitForFlush(waiters, timeoutMs);
    canvas.requestPaint();
    return captured;
}

/**
 * Pin the canvas's CSS size so content changes don't resize it.
 * Returns a function that restores the size and syncs the height to the child.
 */
export function lockCanvasSize(canvas: HTMLCanvasElement): () => void {
    if (lockedCanvases.has(canvas)) {
        return () => {};
    }
    lockedCanvases.add(canvas);
    const saved = LOCKED_PROPS.map(
        (prop) => [prop, canvas.style.getPropertyValue(prop)] as const,
    );
    // Resolved values are the used size, untransformed. The rect is scaled
    // by a transformed ancestor. The canvas has no padding or border.
    // Without a box (e.g. under `display: none`) they read `auto`.
    const size = getComputedStyle(canvas);
    const rect = canvas.getBoundingClientRect();
    const px = (v: string, fallback: number) =>
        PX_LENGTH.test(v) ? v : `${fallback}px`;
    const width = px(size.width, rect.width);
    canvas.style.setProperty("width", width);
    canvas.style.setProperty("height", px(size.height, rect.height));
    // The locked width would become the flex base, and a flex item shrunk
    // from it would shrink again. min/max-width would also clamp it.
    canvas.style.setProperty("flex-grow", "0");
    canvas.style.setProperty("flex-shrink", "0");
    canvas.style.setProperty("min-width", width);
    canvas.style.setProperty("max-width", width);
    // Taller new content must not spill out of the box; the capture is canvas-sized anyway.
    canvas.style.setProperty("overflow", "hidden");

    return () => {
        if (!lockedCanvases.has(canvas)) {
            return;
        }
        lockedCanvases.delete(canvas);
        for (const [prop, value] of saved) {
            canvas.style.setProperty(prop, value);
        }
        const child = canvas.firstElementChild;
        if (child && !insetHeightCanvases.has(canvas)) {
            const childHeight = Math.round(
                child.getBoundingClientRect().height,
            );
            canvas.style.setProperty("height", `${childHeight}px`);
        }
    };
}

function removeStillCover(canvas: HTMLCanvasElement): void {
    stillCovers.get(canvas)?.();
    stillCovers.delete(canvas);
}

/**
 * Clear the first capture that `setupCapture` left on the canvas and drop
 * the still copy `wrapElement` put over it.
 * Call it once the overlay has the element's texture.
 */
export function releaseFirstCapture(
    canvas: HTMLCanvasElement,
    keepCapture = false,
): void {
    // The player's frame callback is queued first, so the overlay draws
    // in the same frame that this clears.
    requestAnimationFrame(() => {
        if (!keepCapture) {
            canvas
                .getContext("2d")
                ?.clearRect(0, 0, canvas.width, canvas.height);
        }
        removeStillCover(canvas);
    });
}

/**
 * Set up the paint handler + ResizeObservers on an html-in-canvas wrapper
 * (`<canvas layoutsubtree content="drawable">`). Returns the initial
 * OffscreenCanvas from the first paint.
 *
 * The first capture stays on the canvas so wrapping does not flash.
 * `VFX.add` releases it once the overlay shows the texture.
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
        // A child without a box (`display: none`) has nothing to draw, and drawElementImage throws.
        if (child.getClientRects().length === 0) {
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
    if (child) {
        const childRO = new ResizeObserver((entries) => {
            if (lockedCanvases.has(canvas) || insetHeightCanvases.has(canvas)) {
                return;
            }
            const box = entries[0].borderBoxSize?.[0];
            if (!box) {
                return;
            }
            const h = `${Math.round(box.blockSize)}px`;
            // Compare with the live style, since an unlock may have set it.
            if (h !== canvas.style.height) {
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

interface InsetSizing {
    /** `calc()` width from left/right insets, or null. */
    width: string | null;
    /** `calc()` height from top/bottom insets, or null. */
    height: string | null;
}

/**
 * Find a fixed/absolute element sized by its insets (e.g. `inset: 10px`
 * with auto width/height). A canvas won't stretch that way, so it needs
 * an explicit size. Uses computed values since getComputedStyle gives px.
 */
function getInsetSizing(element: HTMLElement): InsetSizing {
    const none = { width: null, height: null };
    if (
        typeof element.computedStyleMap !== "function" ||
        REPLACED_TAGS.has(element.tagName)
    ) {
        return none;
    }
    const styles = element.computedStyleMap();
    const value = (prop: string) => styles.get(prop)?.toString() ?? "auto";
    const position = value("position");
    if (position !== "fixed" && position !== "absolute") {
        return none;
    }
    const sizeFromInsets = (
        size: string,
        start: string,
        end: string,
    ): string | null => {
        const startInset = value(start);
        const endInset = value(end);
        if (
            value(size) !== "auto" ||
            startInset === "auto" ||
            endInset === "auto"
        ) {
            return null;
        }
        // Auto margins resolve to 0 here, so only subtract set ones.
        const margins = [`margin-${start}`, `margin-${end}`]
            .map((prop) => {
                const margin = value(prop);
                // Vertical % margins use the width, so pin them to px; they won't track resizes.
                if (size === "height" && margin.includes("%")) {
                    return getComputedStyle(element).getPropertyValue(prop);
                }
                return margin;
            })
            .filter((margin) => margin !== "auto");
        return `calc(${["100%", startInset, endInset, ...margins].join(" - ")})`;
    };
    return {
        width: sizeFromInsets("width", "left", "right"),
        height: sizeFromInsets("height", "top", "bottom"),
    };
}

// Added to a content-box width to get the border-box width. Padding comes
// from the computed style map to keep %; border widths from
// getComputedStyle, since the map gives `medium` (3px) for a border with
// style `none`.
const WIDTH_PADDINGS = ["padding-left", "padding-right"] as const;
const WIDTH_BORDERS = ["border-left-width", "border-right-width"] as const;

interface FixedWidth {
    width: string;
    minWidth: string;
    maxWidth: string;
}

/**
 * Canvas width for an element whose width doesn't follow its containing
 * block, or null if it does. Covers a set length from any rule, not only
 * the style attribute (em/vw compute to px), and `auto` on a replaced
 * element, which keeps its intrinsic width.
 *
 * Built from computed values rather than the rect, so a transformed
 * ancestor doesn't scale it, and a % min/max-width keeps tracking the
 * parent (the canvas sits in the same containing block).
 */
function getFixedWidth(element: HTMLElement, rect: DOMRect): FixedWidth | null {
    const pinned = (width: number): FixedWidth => ({
        width: `${width}px`,
        minWidth: "auto",
        maxWidth: "none",
    });
    if (typeof element.computedStyleMap !== "function") {
        return element.style.width.endsWith("px") ? pinned(rect.width) : null;
    }
    const styles = element.computedStyleMap();
    const value = (prop: string) => styles.get(prop)?.toString() ?? "auto";
    const replaced = REPLACED_TAGS.has(element.tagName);
    const resolved = getComputedStyle(element);

    let width = value("width");
    if (width === "auto") {
        if (!replaced) {
            return null;
        }
        // Intrinsic width. The resolved value is the used one, untransformed.
        width = resolved.width;
    }
    if (!PX_LENGTH.test(width)) {
        return null;
    }
    const display = value("display");
    // `width` doesn't apply to an inline box; keep the size it has.
    if (!replaced && display === "inline") {
        return pinned(rect.width);
    }

    const minWidth = value("min-width");
    const maxWidth = value("max-width");
    // A table grows to fit its content, and a keyword min/max-width
    // (`min-content`, `fit-content`) can't go in calc() and means something
    // else on a canvas. Keep the used width, untransformed.
    if (
        display === "table" ||
        display === "inline-table" ||
        !isLengthLike(minWidth, "auto") ||
        !isLengthLike(maxWidth, "none")
    ) {
        return pinned(usedBorderBoxWidth(resolved));
    }

    // The canvas has no padding or border, so its content box takes the
    // element's border box. A content-box size gets them added. A border-box
    // size can't go below them.
    const paddingAndBorder = [
        ...WIDTH_PADDINGS.map(value),
        ...WIDTH_BORDERS.map((prop) => resolved.getPropertyValue(prop)),
    ].filter((v) => v !== "" && !/^0(px)?$/.test(v));
    const toBorderBox = (v: string) => {
        if (paddingAndBorder.length === 0) {
            return v;
        }
        const sum = [v, ...paddingAndBorder].join(" + ");
        if (value("box-sizing") === "border-box") {
            return `max(${v}, ${sum.slice(v.length + 3)})`;
        }
        return `calc(${sum})`;
    };

    return {
        width: toBorderBox(width),
        minWidth: minWidth === "auto" ? "auto" : toBorderBox(minWidth),
        maxWidth: maxWidth === "none" ? "none" : toBorderBox(maxWidth),
    };
}

/** A length, %, or math function, or the property's initial keyword. */
function isLengthLike(v: string, initial: string): boolean {
    return (
        v === initial ||
        PX_LENGTH.test(v) ||
        /^[\d.e+-]+%$/.test(v) ||
        /^(calc|min|max|clamp)\(/.test(v)
    );
}

/** Used border-box width from resolved values, which transforms don't scale. */
function usedBorderBoxWidth(resolved: CSSStyleDeclaration): number {
    const px = (prop: string) =>
        Number.parseFloat(resolved.getPropertyValue(prop)) || 0;
    let width = Number.parseFloat(resolved.width) || 0;
    if (resolved.boxSizing !== "border-box") {
        for (const prop of [...WIDTH_PADDINGS, ...WIDTH_BORDERS]) {
            width += px(prop);
        }
    }
    return width;
}

interface WrapOpts extends CaptureOpts {
    /** Cover the wrap frame with a still copy at this z-index. */
    stillCover?: { zIndex: number };
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
    opts: WrapOpts,
): Promise<WrapResult> {
    const rect = element.getBoundingClientRect();
    const insetSizing = getInsetSizing(element);
    const fixedWidth = insetSizing.width ? null : getFixedWidth(element, rect);

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

    // Margins and insets come from computed values, which keep `auto` and %,
    // so `margin: 0 auto`, `left: 50%` or `bottom: 0` keep tracking the
    // containing block. getComputedStyle resolves them to px at wrap time,
    // and a px top on a `bottom: 0` element makes the canvas grow downward.
    // Read before the DOM swap: the map is live and the swap zeroes margins.
    const styleMap =
        typeof element.computedStyleMap === "function"
            ? element.computedStyleMap()
            : null;
    const computed = (prop: string) =>
        styleMap?.get(prop)?.toString() ?? cs.getPropertyValue(prop);
    const resolved = (prop: string) => cs.getPropertyValue(prop);

    // Auto side margins need a definite canvas width. Against `width: 100%`
    // they resolve to 0, which would stretch a flex item that `margin: auto`
    // sized and placed, so keep the px it has now.
    const definiteWidth = Boolean(insetSizing.width || fixedWidth);
    for (const prop of MARGIN_PROPS) {
        const side = prop === "margin-left" || prop === "margin-right";
        const keep = !side || definiteWidth;
        canvas.style.setProperty(prop, keep ? computed(prop) : resolved(prop));
    }

    // An abs/fixed element with both insets `auto` on an axis sits at its
    // static position. The canvas is a block, so its static position can
    // differ (an inline-level element sits after the text before it). Keep
    // the px it has now on that axis.
    const positioned = cs.position === "absolute" || cs.position === "fixed";
    const staticAxis = (start: string, end: string) =>
        positioned && computed(start) === "auto" && computed(end) === "auto";
    const staticX = staticAxis("left", "right");
    const staticY = staticAxis("top", "bottom");
    for (const prop of POSITION_FLOW_STYLES) {
        let value = resolved(prop);
        if (INSET_PROPS.has(prop)) {
            const horizontal = prop === "left" || prop === "right";
            value = (horizontal ? staticX : staticY)
                ? resolved(prop)
                : computed(prop);
        }
        canvas.style.setProperty(prop, value);
    }

    // Full-width target → 100% (tracks resizes); explicit length width →
    // the same width as a border box, with its min/max-width (a % max-width
    // still tracks the parent). The inline 100% would beat a width from the
    // copied class, so it must not apply then.
    // Content-sized unsupported (see docs).
    // Inset-sized target → size from the insets, since a canvas won't stretch.
    // Intrinsic-width replaced element → pinned too.
    if (insetSizing.width) {
        canvas.style.setProperty("width", insetSizing.width);
    } else if (fixedWidth) {
        canvas.style.setProperty("width", fixedWidth.width);
        canvas.style.setProperty("min-width", fixedWidth.minWidth);
        canvas.style.setProperty("max-width", fixedWidth.maxWidth);
    } else {
        canvas.style.setProperty("width", "100%");
    }
    // Replaced element — height doesn't derive from children, so seed an
    // explicit border-box height. setupCapture's child RO keeps it in sync.
    if (insetSizing.height) {
        canvas.style.setProperty("height", insetSizing.height);
        insetHeightCanvases.add(canvas);
    } else if (!canvas.style.height) {
        canvas.style.setProperty("height", `${rect.height}px`);
    }

    // Pixel buffer (may be 0 — setupCapture's RO corrects)
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // A drawable child is not painted until its first capture lands, one
    // frame later. A still copy covers that frame.
    if (opts.stillCover) {
        stillCovers.set(
            canvas,
            coverWithStill(element, opts.stillCover.zIndex),
        );
    }

    // DOM swap
    savedMargins.set(element, element.style.margin);
    savedWidths.set(element, element.style.width);
    savedBoxSizing.set(element, element.style.boxSizing);
    element.parentNode?.insertBefore(canvas, element);
    // Style the new canvas before the move. moveBefore into an unstyled
    // parent restarts the element's CSS animations.
    getComputedStyle(canvas).display;
    moveNode(canvas, element, null);
    element.style.setProperty("margin", "0");

    // layoutsubtree canvas doesn't establish a standard block formatting
    // context — block children won't auto-fill the containing block width.
    // Force 100% so the element matches the canvas's CSS dimensions.
    element.style.setProperty("width", "100%");
    element.style.setProperty("box-sizing", "border-box");

    // The canvas now carries the insets, so the element just fills it.
    if (insetSizing.width || insetSizing.height) {
        savedPositions.set(element, element.style.position);
        element.style.setProperty("position", "static");
    }
    if (insetSizing.height) {
        savedHeights.set(element, element.style.height);
        element.style.setProperty("height", "100%");
    }

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
    removeStillCover(canvas);

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
    const savedPosition = savedPositions.get(element);
    if (savedPosition !== undefined) {
        element.style.position = savedPosition;
        savedPositions.delete(element);
    }
    const savedHeight = savedHeights.get(element);
    if (savedHeight !== undefined) {
        element.style.height = savedHeight;
        savedHeights.delete(element);
    }
}
