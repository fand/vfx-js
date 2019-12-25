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
        doc.documentElement.namespaceURI!
    );

    // Get well-formed markup
    const wfHtml = new XMLSerializer().serializeToString(doc);
    return wfHtml.replace(/<!DOCTYPE html>/, "");
};

// Clone DOM node.
function cloneNode<T extends Node>(node: T): T {
    return node.cloneNode() as T;
}

// Render element content to canvas and return it.
// ref.
export default function getCanvasFromElement(
    element: HTMLElement
): Promise<HTMLCanvasElement> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(rect.width * 1.01, rect.width + 1); // XXX
    canvas.height = Math.max(rect.height * 1.01, rect.height + 1);

    // Clone element with styles in text attribute
    // to apply styles in SVG
    const newElement = cloneNode(element);
    const styles = window.getComputedStyle(element, "");
    const styleText = styles.cssText;
    newElement.setAttribute("style", styleText);
    newElement.style.setProperty("margin", "0");
    newElement.innerHTML = element.innerHTML;

    // Wrap the element for text styling
    const wrapper = document.createElement("div");
    wrapper.style.setProperty("text-align", styles.textAlign);
    wrapper.style.setProperty("vertical-align", styles.verticalAlign);
    wrapper.appendChild(newElement);

    // Create SVG string
    const html = wrapper.outerHTML;
    const xml = convertHtmlToXml(html);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg">` +
        `<foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext("2d");
            if (ctx === null) {
                return reject();
            }

            ctx.drawImage(img, 0, 0);
            resolve(canvas);
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}
