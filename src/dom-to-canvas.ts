const getWellFormedHtml = (html: string): string => {
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

function cloneNode<T extends Node>(node: T): T {
    return node.cloneNode() as T;
}

export default function getCanvasFromElement(
    element: HTMLElement
): Promise<HTMLCanvasElement> {
    const style = window.getComputedStyle(element, "");
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.width = rect.width + 1; // XXX
    canvas.height = rect.height + 1;

    // Clone element with styles in text attribute
    // to apply styles in SVG
    const newElement = cloneNode(element);
    const styleText = style.cssText;
    newElement.setAttribute("style", styleText);
    newElement.innerHTML = element.innerHTML;

    // Create SVG string
    const html = newElement.outerHTML;
    const wellFormedHtml = getWellFormedHtml(html);
    const data =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">` +
        `<foreignObject width="100%" height="100%">${wellFormedHtml}</foreignObject></svg>`;

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

        img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
    });
}
