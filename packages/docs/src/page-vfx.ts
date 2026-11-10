import type { VFX } from "@vfx-js/core";
import { getVFX, registerVFX } from "@vfx-js/astro/client";

// Page demos and page transitions share one VFX.
// It must be set up before <VFXTransition> makes it (see Layout.astro).
registerVFX({
    vfx: { pixelRatio: window.devicePixelRatio, zIndex: -1 },
});

let clipped = false;

/** The VFX for page content and transitions. It stays across page swaps. The BG has its own. */
export function getPageVFX(): VFX {
    const vfx = getVFX();
    if (!vfx) {
        throw new Error("[docs] WebGL is not available.");
    }
    if (!clipped) {
        clipped = true;
        clipBelowHeader(vfx.canvas);
    }
    return vfx;
}

// The header stays on top. Clip the canvas at its bottom edge, like the page itself.
// Look the header up every frame, since page swaps replace it.
function clipBelowHeader(canvas: HTMLCanvasElement) {
    const loop = () => {
        const header = document.querySelector(".SiteHeader");
        const edge = header?.getBoundingClientRect().bottom ?? 0;
        const top = Math.max(0, edge - canvas.getBoundingClientRect().top);
        canvas.style.clipPath = `inset(${top}px 0 0 0)`;
        requestAnimationFrame(loop);
    };
    loop();
}
