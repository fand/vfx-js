/**
 * Convert HTML string to valid XML.
 * @internal
 */
const convertHtmlToXml = (html: string): string => {
    const doc = document.implementation.createHTMLDocument("test");

    const range = doc.createRange();
    range.selectNodeContents(doc.documentElement);
    range.deleteContents();

    const h = document.createElement("head");
    doc.documentElement.appendChild(h);
    doc.documentElement.appendChild(range.createContextualFragment(html));
    doc.documentElement.setAttribute(
        "xmlns",
        // biome-ignore lint/style/noNonNullAssertion: ok
        doc.documentElement.namespaceURI!,
    );

    // Get well-formed markup
    const wfHtml = new XMLSerializer().serializeToString(doc);
    return wfHtml.replace(/<!DOCTYPE html>/, "");
};

// Clone DOM node.
function cloneNode<T extends Node>(node: T): T {
    return node.cloneNode(true) as T;
}

/**
 * Detect whether the current browser's SVG-as-image rasterizer renders
 * `<img>` elements inside foreignObject. WebKit (iOS Safari, macOS Safari)
 * blocks this even with data URL `src`, so we need a fallback path that
 * paints images via native SVG `<image>` elements instead.
 *
 * Result is cached for the lifetime of the module.
 * @internal
 */
let foreignObjectImgSupport: Promise<boolean> | undefined;
function detectForeignObjectImgSupport(): Promise<boolean> {
    if (foreignObjectImgSupport) return foreignObjectImgSupport;
    foreignObjectImgSupport = new Promise<boolean>((resolve) => {
        // 1×1 red PNG as a data URL (smallest reasonable test bitmap).
        const RED_1X1 =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Z3a4xUAAAAASUVORK5CYII=";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><foreignObject width="100%" height="100%"><img xmlns="http://www.w3.org/1999/xhtml" src="${RED_1X1}" width="1" height="1" /></foreignObject></svg>`;
        const img = new Image();
        img.onload = () => {
            try {
                const c = new OffscreenCanvas(1, 1);
                const ctx = c.getContext("2d");
                if (!ctx) return resolve(false);
                ctx.drawImage(img, 0, 0);
                // alpha > 0 → foreignObject did render the <img>
                const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
                resolve(alpha > 0);
            } catch {
                resolve(false);
            }
        };
        img.onerror = () => resolve(false);
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    return foreignObjectImgSupport;
}

/**
 * Render element content to canvas and return it.
 * @internal
 */
export default async function getCanvasFromElement(
    element: HTMLElement,
    originalOpacity: number,
    oldCanvas?: OffscreenCanvas,
    maxSize?: number,
): Promise<OffscreenCanvas> {
    const rect = element.getBoundingClientRect();

    const ratio = window.devicePixelRatio;

    // Unclamped physical-pixel target size of the texture.
    const fullW = rect.width * ratio;
    const fullH = rect.height * ratio;

    // Clamp to GL MAX_TEXTURE_SIZE so that the resulting CanvasTexture can
    // actually be uploaded. iOS Safari (and some mobile GPUs) have lower
    // limits than the document height of tall scrolling pages.
    let clampScale = 1;
    let canvasW = fullW;
    let canvasH = fullH;
    if (maxSize && (canvasW > maxSize || canvasH > maxSize)) {
        clampScale = Math.min(maxSize / canvasW, maxSize / canvasH);
        canvasW = Math.floor(canvasW * clampScale);
        canvasH = Math.floor(canvasH * clampScale);
    }

    const canvas =
        oldCanvas && oldCanvas.width === canvasW && oldCanvas.height === canvasH
            ? oldCanvas
            : new OffscreenCanvas(canvasW, canvasH);

    // Clone element with styles in text attribute
    // to apply styles in SVG
    const newElement = cloneNode(element);
    await syncStylesOfTree(element, newElement);
    newElement.style.setProperty("opacity", originalOpacity.toString());

    // Remove margins of the root element
    newElement.style.setProperty("margin", "0px");

    // Pre-fetch all descendant <img> elements as data URLs once. We use
    // these either as the cloned img's src (when the browser renders
    // <img> inside foreignObject) or as the href of native SVG <image>
    // elements emitted alongside the foreignObject (the iOS Safari
    // fallback). Doing this once avoids fetching twice.
    const originalImgs = Array.from(
        element.querySelectorAll("img"),
    ) as HTMLImageElement[];
    const clonedImgs = Array.from(
        newElement.querySelectorAll("img"),
    ) as HTMLImageElement[];
    const dataUrls = await Promise.all(
        originalImgs.map(async (img) => {
            if (!img.complete || img.naturalWidth === 0) return null;
            try {
                return await toObjectUrl(img.src);
            } catch {
                return null;
            }
        }),
    );

    // Pick the path: most browsers render <img> inside foreignObject
    // correctly (and preserve border-radius / object-fit / etc.), but
    // WebKit (iOS + macOS Safari) blocks all images in foreignObject
    // during SVG-as-image rasterization. We detect support once and
    // fall back to native SVG <image> overlays for the WebKit path.
    const useForeignObjectImg = await detectForeignObjectImgSupport();

    let imageEls: string[] = [];
    const clipPathDefs: string[] = [];
    if (useForeignObjectImg) {
        // Cloned imgs render inside the foreignObject. Set their src to
        // the pre-fetched data URL so the rasterizer doesn't try to fetch
        // a (forbidden) external resource. No SVG <image> overlay needed.
        for (let i = 0; i < clonedImgs.length; i++) {
            const dataUrl = dataUrls[i];
            if (dataUrl) clonedImgs[i].src = dataUrl;
        }
    } else {
        // WebKit fallback: hide cloned imgs so they still occupy layout
        // space but don't render, then overlay each as a native SVG
        // <image> element at the same coordinates. Border-radius is
        // re-created via an SVG <clipPath> when all four corners share
        // the same radius (the common case). object-fit / CSS filters /
        // non-uniform corners are still lost.
        imageEls = clonedImgs.map((cloned, i) => {
            cloned.style.setProperty("visibility", "hidden");
            const dataUrl = dataUrls[i];
            if (!dataUrl) return "";
            const orig = originalImgs[i];
            const cs = window.getComputedStyle(orig);
            const r = orig.getBoundingClientRect();
            const x = r.left - rect.left;
            const y = r.top - rect.top;

            const radii = parseUniformBorderRadius(cs);
            let clipAttr = "";
            if (radii) {
                const clipId = `vfx-img-clip-${i}`;
                clipPathDefs.push(
                    `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${r.width}" height="${r.height}" rx="${radii.rx}" ry="${radii.ry}" /></clipPath>`,
                );
                clipAttr = ` clip-path="url(#${clipId})"`;
            }

            const par = imgObjectFitToPreserveAspectRatio(cs);
            return `<image href="${dataUrl}" x="${x}" y="${y}" width="${r.width}" height="${r.height}" preserveAspectRatio="${par}"${clipAttr} />`;
        });
    }

    // Create SVG string. The SVG is sized in unclamped physical pixels
    // (rect × DPR), which is twice the CSS-pixel size of the content. The
    // foreignObject is twice as wide/tall as the cloned DOM, so the content
    // renders into the top-left (rect.width × rect.height) of the SVG and
    // the rest is blank. Any SVG <image> overlays are emitted in the same
    // coordinate space.
    const html = newElement.outerHTML;
    const xml = convertHtmlToXml(html);
    const defsBlock =
        clipPathDefs.length > 0 ? `<defs>${clipPathDefs.join("")}</defs>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${fullW}" height="${fullH}">${defsBlock}<foreignObject width="100%" height="100%">${xml}</foreignObject>${imageEls.join("")}</svg>`;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext(
                "2d",
            ) as OffscreenCanvasRenderingContext2D | null;
            if (ctx === null) {
                return reject();
            }

            ctx.clearRect(0, 0, canvasW, canvasH);
            // Combined scale: ratio (DPR upscale) × clampScale (size clamp).
            // With ctx.scale + drawImage(... fullW, fullH), the user-space
            // dest (0..fullW, 0..fullH) maps to physical pixels
            // (0..fullW × drawScale, 0..fullH × drawScale). Because the
            // canvas is exactly canvasW × canvasH = (fullW × clampScale) ×
            // (fullH × clampScale), only the top-left rect.w × rect.h area
            // of the source SVG (where the foreignObject content lives) is
            // visible — and it ends up filling the canvas exactly.
            const drawScale = ratio * clampScale;
            ctx.scale(drawScale, drawScale);
            ctx.drawImage(img, 0, 0, fullW, fullH);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            resolve(canvas);
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

async function syncStylesOfTree(
    el1: HTMLElement,
    el2: HTMLElement,
): Promise<void> {
    // Sync CSS styles
    const styles = window.getComputedStyle(el1);
    for (const key of Array.from(styles)) {
        el2.style.setProperty(
            key,
            styles.getPropertyValue(key),
            styles.getPropertyPriority(key),
        );
    }

    // Reflect input value to HTML attributes
    if (el2.tagName === "INPUT") {
        el2.setAttribute("value", (el2 as HTMLInputElement).value);
    } else if (el2.tagName === "TEXTAREA") {
        el2.innerHTML = (el2 as HTMLTextAreaElement).value;
    }
    // IMG elements are handled by getCanvasFromElement after the tree is
    // cloned: it pre-fetches each img as a data URL, then either sets the
    // cloned img's src (browsers that render imgs in foreignObject) or
    // hides the cloned img and emits a native SVG <image> overlay (WebKit
    // / iOS Safari fallback).

    for (let i = 0; i < el1.children.length; i++) {
        const c1 = el1.children[i] as HTMLElement;
        const c2 = el2.children[i] as HTMLElement;
        await syncStylesOfTree(c1, c2);
    }
}

/**
 * Read border-radius from a computed style and return it as `{ rx, ry }`
 * if all four corners share the same value (so it can be expressed as a
 * single SVG `<rect rx ry>`). Returns null otherwise.
 *
 * Computed corner values are like `"8px"` (circle) or `"8px 4px"` (ellipse).
 * @internal
 */
function parseUniformBorderRadius(
    cs: CSSStyleDeclaration,
): { rx: number; ry: number } | null {
    const tl = cs.borderTopLeftRadius;
    const tr = cs.borderTopRightRadius;
    const bl = cs.borderBottomLeftRadius;
    const br = cs.borderBottomRightRadius;
    if (tl !== tr || tl !== bl || tl !== br) return null;
    const parts = tl.split(/\s+/).map((s) => Number.parseFloat(s));
    if (parts.length === 0 || !Number.isFinite(parts[0])) return null;
    const rx = parts[0];
    const ry = parts.length > 1 && Number.isFinite(parts[1]) ? parts[1] : rx;
    if (rx <= 0 && ry <= 0) return null;
    return { rx, ry };
}

/**
 * Translate the CSS `object-fit` / `object-position` of an `<img>` to an SVG
 * `preserveAspectRatio` attribute string. Used by the WebKit fallback path
 * where an `<img>` is replaced by a native SVG `<image>` overlay; SVG's
 * preserveAspectRatio covers the common cases (fill / contain / cover with
 * any of the nine "Min/Mid/Max" alignment grid points).
 *
 * `none` and `scale-down` don't have a clean SVG equivalent (they require
 * the image's natural size, which would also need width/height adjustments
 * on the `<image>` element); they fall back to `fill`.
 * @internal
 */
function imgObjectFitToPreserveAspectRatio(cs: CSSStyleDeclaration): string {
    const fit = cs.objectFit || "fill";
    if (fit !== "contain" && fit !== "cover") return "none";
    const pos = (cs.objectPosition || "50% 50%").split(/\s+/);
    const ax = pos[0] === "0%" ? "Min" : pos[0] === "100%" ? "Max" : "Mid";
    const ay = pos[1] === "0%" ? "Min" : pos[1] === "100%" ? "Max" : "Mid";
    return `x${ax}Y${ay} ${fit === "cover" ? "slice" : "meet"}`;
}

// ref. https://stackoverflow.com/questions/44698967/
async function toObjectUrl(url: string): Promise<string> {
    const blob = await fetch(url).then((response) => response.blob());
    return new Promise((callback) => {
        const reader = new FileReader();
        reader.onload = function () {
            callback(this.result as string);
        };
        reader.readAsDataURL(blob);
    });
}
