"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convertHtmlToXml = (html) => {
    const doc = document.implementation.createHTMLDocument("test");
    const range = doc.createRange();
    range.selectNodeContents(doc.documentElement);
    range.deleteContents();
    const h = document.createElement("head");
    doc.documentElement.appendChild(h);
    doc.documentElement.appendChild(range.createContextualFragment(html));
    doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
    const wfHtml = new XMLSerializer().serializeToString(doc);
    return wfHtml.replace(/<!DOCTYPE html>/, "");
};
function cloneNode(node) {
    return node.cloneNode();
}
function getCanvasFromElement(element) {
    const rect = element.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = rect.width + 1;
    canvas.height = rect.height + 1;
    const newElement = cloneNode(element);
    const styleText = window.getComputedStyle(element, "").cssText;
    newElement.setAttribute("style", styleText);
    newElement.innerHTML = element.innerHTML;
    const html = newElement.outerHTML;
    const xml = convertHtmlToXml(html);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">` +
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
exports.default = getCanvasFromElement;
//# sourceMappingURL=dom-to-canvas.js.map