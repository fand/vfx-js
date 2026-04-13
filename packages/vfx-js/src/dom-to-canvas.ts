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

/**
 * Detect whether foreignObject renders `<img>`. WebKit blocks this,
 * so we fall back to native SVG `<image>` overlays. Cached.
 * @internal
 */
let foreignObjectImgSupport: Promise<boolean> | undefined;
function detectForeignObjectImgSupport(): Promise<boolean> {
    if (foreignObjectImgSupport) {
        return foreignObjectImgSupport;
    }
    foreignObjectImgSupport = new Promise<boolean>((resolve) => {
        // 1×1 red PNG data URL for the sniff test.
        const RED_1X1 =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Z3a4xUAAAAASUVORK5CYII=";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><foreignObject width="100%" height="100%"><img xmlns="http://www.w3.org/1999/xhtml" src="${RED_1X1}" width="1" height="1" /></foreignObject></svg>`;
        const img = new Image();
        img.onload = () => {
            try {
                const c = new OffscreenCanvas(1, 1);
                const ctx = c.getContext("2d");
                if (!ctx) {
                    return resolve(false);
                }
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

    const fullW = rect.width * ratio;
    const fullH = rect.height * ratio;

    // Clamp to GL MAX_TEXTURE_SIZE.
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
    const newElement = element.cloneNode(true) as HTMLElement;
    await syncStylesOfTree(element, newElement);
    newElement.style.setProperty("opacity", originalOpacity.toString());
    newElement.style.setProperty("margin", "0px");

    const { imageEls, clipPathDefs } = await prepareImages(
        element,
        newElement,
        rect,
    );

    // Build SVG at full (unclamped) physical-pixel size.
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
            // DPR × clampScale so the SVG content fills the clamped canvas.
            const drawScale = ratio * clampScale;
            ctx.scale(drawScale, drawScale);
            ctx.drawImage(img, 0, 0, fullW, fullH);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            resolve(canvas);
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

/**
 * Pre-fetch `<img>` data URLs and build SVG overlay fragments if needed.
 * @internal
 */
async function prepareImages(
    element: HTMLElement,
    newElement: HTMLElement,
    rect: DOMRect,
): Promise<{ imageEls: string[]; clipPathDefs: string[] }> {
    const originalImgs = Array.from(
        element.querySelectorAll("img"),
    ) as HTMLImageElement[];
    const clonedImgs = Array.from(
        newElement.querySelectorAll("img"),
    ) as HTMLImageElement[];
    const dataUrls = await Promise.all(
        originalImgs.map(async (img) => {
            if (!img.complete || img.naturalWidth === 0) {
                return null;
            }
            try {
                return await toObjectUrl(img.src);
            } catch {
                return null;
            }
        }),
    );

    const useForeignObjectImg = await detectForeignObjectImgSupport();

    if (useForeignObjectImg) {
        for (let i = 0; i < clonedImgs.length; i++) {
            const dataUrl = dataUrls[i];
            if (dataUrl) {
                clonedImgs[i].src = dataUrl;
            }
        }
        return { imageEls: [], clipPathDefs: [] };
    }

    // WebKit: hide cloned imgs, overlay as SVG <image> elements.
    const clipPathDefs: string[] = [];
    const imageEls = clonedImgs.map((cloned, i) => {
        cloned.style.setProperty("visibility", "hidden");
        const dataUrl = dataUrls[i];
        if (!dataUrl) {
            return "";
        }
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

    return { imageEls, clipPathDefs };
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
    // IMG elements are handled by getCanvasFromElement after cloning.

    for (let i = 0; i < el1.children.length; i++) {
        const c1 = el1.children[i] as HTMLElement;
        const c2 = el2.children[i] as HTMLElement;
        await syncStylesOfTree(c1, c2);
    }
}

/**
 * Return `{ rx, ry }` if all four border-radius corners are equal, else null.
 * @internal
 */
function parseUniformBorderRadius(
    cs: CSSStyleDeclaration,
): { rx: number; ry: number } | null {
    const tl = cs.borderTopLeftRadius;
    const tr = cs.borderTopRightRadius;
    const bl = cs.borderBottomLeftRadius;
    const br = cs.borderBottomRightRadius;
    if (tl !== tr || tl !== bl || tl !== br) {
        return null;
    }
    const parts = tl.split(/\s+/).map((s) => Number.parseFloat(s));
    if (parts.length === 0 || !Number.isFinite(parts[0])) {
        return null;
    }
    const rx = parts[0];
    const ry = parts.length > 1 && Number.isFinite(parts[1]) ? parts[1] : rx;
    if (rx <= 0 && ry <= 0) {
        return null;
    }
    return { rx, ry };
}

/**
 * Convert CSS object-fit/object-position to SVG preserveAspectRatio.
 * Only handles contain/cover; others fall back to fill.
 * @internal
 */
function imgObjectFitToPreserveAspectRatio(cs: CSSStyleDeclaration): string {
    const fit = cs.objectFit || "fill";
    if (fit !== "contain" && fit !== "cover") {
        return "none";
    }
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
