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

    // Ceil to integer pixels — see clone-width override below.
    const ceilW = Math.ceil(rect.width);
    const ceilH = Math.ceil(rect.height);

    const fullW = ceilW * ratio;
    const fullH = ceilH * ratio;

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
    restoreAutoMargins(element, newElement);
    newElement.style.setProperty("opacity", originalOpacity.toString());
    newElement.style.setProperty("margin", "0px");
    zeroCollapsingMargins(newElement);
    // Pin the clone's outer box to integer pixels. Host-DOM text metrics and
    // the SVG rasterizer's text metrics can disagree by tiny sub-pixel
    // amounts (visibly so at non-100% browser zoom); a 0–1 px buffer here
    // absorbs that mismatch so single-line text doesn't spill to a 2nd line
    // and multi-line break positions stay stable. The texture is then mapped
    // back to the original sub-pixel rect at render time — the resulting
    // squish is <1% and visually imperceptible.
    newElement.style.setProperty("box-sizing", "border-box");
    newElement.style.setProperty("width", `${ceilW}px`);
    newElement.style.setProperty("height", `${ceilH}px`);

    // Build SVG at full (unclamped) physical-pixel size.
    const html = newElement.outerHTML;
    const xml = convertHtmlToXml(html);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}">` +
        `<foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;

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

async function syncStylesOfTree(
    el1: HTMLElement,
    el2: HTMLElement,
): Promise<void> {
    // Sync CSS styles
    const styles = window.getComputedStyle(el1);
    for (const key of Array.from(styles)) {
        // Skip CSS logical properties and -webkit- prefixed aliases.
        // Physical counterparts (margin-left, width, etc.) already carry
        // the correct resolved values; logical duplicates can override
        // them with stale initial values (e.g. -webkit-margin-start: 0
        // overriding margin-left: 558px).
        if (
            /(-inline-|-block-|^inline-|^block-)/.test(key) ||
            /^-webkit-.*(start|end|before|after|logical)/.test(key)
        ) {
            continue;
        }
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
    } else if (el2.tagName === "IMG") {
        try {
            (el2 as HTMLImageElement).src = await toObjectUrl(
                (el1 as HTMLImageElement).src,
            );
        } catch {
            // Cross-origin fetch failed; keep original src
        }
    }

    for (let i = 0; i < el1.children.length; i++) {
        const c1 = el1.children[i] as HTMLElement;
        const c2 = el2.children[i] as HTMLElement;
        await syncStylesOfTree(c1, c2);
    }
}

/**
 * Restore `margin: auto` on the clone for elements that use auto margins
 * for centering. syncStylesOfTree resolves auto to pixel values, but those
 * values may be incorrect (e.g. 0px on initial load). Detecting via CSS
 * Typed OM and restoring as `auto` lets the foreignObject resolve them.
 * @internal
 */
function restoreAutoMargins(original: HTMLElement, clone: HTMLElement): void {
    if (typeof original.computedStyleMap === "function") {
        try {
            const map = original.computedStyleMap();
            for (const prop of [
                "margin-top",
                "margin-right",
                "margin-bottom",
                "margin-left",
            ] as const) {
                const val = map.get(prop);
                if (val instanceof CSSKeywordValue && val.value === "auto") {
                    clone.style.setProperty(prop, "auto");
                }
            }
        } catch {
            // computedStyleMap may throw for detached elements
        }
    }

    for (let i = 0; i < original.children.length; i++) {
        const c1 = original.children[i];
        const c2 = clone.children[i];
        if (c1 instanceof HTMLElement && c2 instanceof HTMLElement) {
            restoreAutoMargins(c1, c2);
        }
    }
}

/**
 * In normal flow, a child's margin can collapse through its parent when the
 * parent has no padding/border on that side. SVG foreignObject acts as a BFC
 * boundary, so the collapsed margin can't escape — it becomes visible space
 * inside the canvas instead. Zero those margins on the clone to match the
 * original visual layout.
 * @internal
 */
function zeroCollapsingMargins(root: HTMLElement): void {
    // Top: walk first-child chain
    let el: HTMLElement = root;
    for (;;) {
        const s = el.style;
        if (
            Number.parseFloat(s.paddingTop) > 0 ||
            Number.parseFloat(s.borderTopWidth) > 0 ||
            (s.getPropertyValue("overflow-x") &&
                s.getPropertyValue("overflow-x") !== "visible") ||
            (s.getPropertyValue("overflow-y") &&
                s.getPropertyValue("overflow-y") !== "visible") ||
            s.display === "flex" ||
            s.display === "grid" ||
            s.display === "flow-root" ||
            s.display === "inline-block"
        ) {
            break;
        }
        const child = el.firstElementChild as HTMLElement | null;
        if (!child) {
            break;
        }
        child.style.setProperty("margin-top", "0px");
        el = child;
    }
    // Bottom: walk last-child chain
    el = root;
    for (;;) {
        const s = el.style;
        if (
            Number.parseFloat(s.paddingBottom) > 0 ||
            Number.parseFloat(s.borderBottomWidth) > 0 ||
            (s.getPropertyValue("overflow-x") &&
                s.getPropertyValue("overflow-x") !== "visible") ||
            (s.getPropertyValue("overflow-y") &&
                s.getPropertyValue("overflow-y") !== "visible") ||
            s.display === "flex" ||
            s.display === "grid" ||
            s.display === "flow-root" ||
            s.display === "inline-block"
        ) {
            break;
        }
        const child = el.lastElementChild as HTMLElement | null;
        if (!child) {
            break;
        }
        child.style.setProperty("margin-bottom", "0px");
        el = child;
    }
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
