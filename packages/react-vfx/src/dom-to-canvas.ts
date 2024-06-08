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
    oldCanvas?: HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
    const rect = element.getBoundingClientRect();
    const width = Math.max(rect.width * 1.01, rect.width + 1); // XXX
    const height = Math.max(rect.height * 1.01, rect.height + 1);

    const ratio = window.devicePixelRatio;

    const canvas = oldCanvas || document.createElement("canvas");
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Clone element with styles in text attribute
    // to apply styles in SVG
    const newElement = cloneNode(element);
    const styles = window.getComputedStyle(element);
    syncStylesOfTree(element, newElement);

    // Traverse and update input value
    traverseDOM(newElement, (el) => {
        if (el.tagName === "INPUT") {
            el.setAttribute("value", (el as HTMLInputElement).value);
        } else if (el.tagName === "TEXTAREA") {
            el.innerHTML = (el as HTMLTextAreaElement).value;
        }
    });

    // Wrap the element for text styling
    const wrapper = document.createElement("div");
    wrapper.style.setProperty("text-align", styles.textAlign);
    wrapper.style.setProperty("vertical-align", styles.verticalAlign);
    wrapper.appendChild(newElement);

    // Create SVG string
    const html = wrapper.outerHTML;
    const xml = convertHtmlToXml(html);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">` +
        `<foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext("2d");
            if (ctx === null) {
                return reject();
            }
            ctx.scale(ratio, ratio);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            resolve(canvas);
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

function traverseDOM(
    element: HTMLElement,
    callback: (e: HTMLElement) => void,
): void {
    callback(element);

    element.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            traverseDOM(child as HTMLElement, callback);
        }
    });
}

function syncStylesOfTree(el1: HTMLElement, el2: HTMLElement): void {
    const styles = window.getComputedStyle(el1);
    Array.from(styles).forEach((key) => {
        el2.style.setProperty(
            key,
            styles.getPropertyValue(key),
            styles.getPropertyPriority(key),
        );
    });

    for (let i = 0; i < el1.children.length; i++) {
        const c1 = el1.children[i] as HTMLElement;
        const c2 = el2.children[i] as HTMLElement;
        syncStylesOfTree(c1, c2);
    }
}
