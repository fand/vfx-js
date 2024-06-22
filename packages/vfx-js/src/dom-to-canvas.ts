// Convert HTML string to valid XML.
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

// Render element content to canvas and return it.
export default function getCanvasFromElement(
    element: HTMLElement,
    originalOpacity: number,
    oldCanvas?: OffscreenCanvas,
): Promise<OffscreenCanvas> {
    const rect = element.getBoundingClientRect();

    const ratio = window.devicePixelRatio;
    const width = rect.width * ratio;
    const height = rect.height * ratio;

    const canvas =
        oldCanvas && oldCanvas.width === width && oldCanvas.height === height
            ? oldCanvas
            : new OffscreenCanvas(width, height);

    // Clone element with styles in text attribute
    // to apply styles in SVG
    const newElement = cloneNode(element);
    syncStylesOfTree(element, newElement);
    newElement.style.setProperty("opacity", originalOpacity.toString());

    // Remove margins of the root element
    newElement.style.setProperty("margin", "0px");

    // Create SVG string
    const html = newElement.outerHTML;
    const xml = convertHtmlToXml(html);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
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

            ctx.clearRect(0, 0, width, height);
            ctx.scale(ratio, ratio);
            ctx.drawImage(img, 0, 0, width, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            resolve(canvas);
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

function syncStylesOfTree(el1: HTMLElement, el2: HTMLElement): void {
    // Sync CSS styles
    const styles = window.getComputedStyle(el1);
    Array.from(styles).forEach((key) => {
        el2.style.setProperty(
            key,
            styles.getPropertyValue(key),
            styles.getPropertyPriority(key),
        );
    });

    // Reflect input value to HTML attributes
    if (el2.tagName === "INPUT") {
        el2.setAttribute("value", (el2 as HTMLInputElement).value);
    } else if (el2.tagName === "TEXTAREA") {
        el2.innerHTML = (el2 as HTMLTextAreaElement).value;
    }

    for (let i = 0; i < el1.children.length; i++) {
        const c1 = el1.children[i] as HTMLElement;
        const c2 = el2.children[i] as HTMLElement;
        syncStylesOfTree(c1, c2);
    }
}
