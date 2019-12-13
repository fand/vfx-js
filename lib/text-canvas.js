"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let canvas;
let ctx;
function textToImage(text, rect, style) {
    if (canvas == null) {
        canvas = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.left = "-99999px";
        canvas.style.top = "-99999px";
        document.body.appendChild(canvas);
        ctx = canvas.getContext("2d");
    }
    if (canvas == null || ctx == null) {
        return "";
    }
    canvas.width = rect.width;
    canvas.height = rect.height;
    const fontSize = style.getPropertyValue("font-size");
    const fontFamily = style.getPropertyValue("font-family");
    const fontWeight = style.getPropertyValue("font-weight");
    ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    const color = style.getPropertyValue("color");
    ctx.fillStyle = color;
    ctx.fillText(text, 0, rect.height);
    return canvas.toDataURL();
}
exports.textToImage = textToImage;
//# sourceMappingURL=text-canvas.js.map