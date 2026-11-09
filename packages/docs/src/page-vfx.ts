import { VFX } from "@vfx-js/core";

let pageVFX: VFX | undefined;

/** The VFX for page content, shared by every demo on the page. The BG has its own. */
export function getPageVFX(): VFX {
    if (!pageVFX) {
        pageVFX = new VFX({
            pixelRatio: window.devicePixelRatio,
            zIndex: -1,
        });
        clipBelowHeader(pageVFX.canvas);
    }
    return pageVFX;
}

// The header stays on top while scrolling. Clip the canvas at its bottom edge,
// like the page itself (see Header.astro).
function clipBelowHeader(canvas: HTMLCanvasElement) {
    const header = document.querySelector(".SiteHeader");
    if (!header) {
        return;
    }
    const loop = () => {
        const edge = header.getBoundingClientRect().bottom;
        const top = Math.max(0, edge - canvas.getBoundingClientRect().top);
        canvas.style.clipPath = `inset(${top}px 0 0 0)`;
        requestAnimationFrame(loop);
    };
    loop();
}
