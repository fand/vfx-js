import { VFX } from "@vfx-js/core";
import { scrollRoot } from "./lifecycle";
import { SpheresEffect } from "./spheres-bg";

// Below the still copy that page transitions put at z-index -2.
export const bgVFX = new VFX({
    pixelRatio: 1,
    zIndex: -3,
    scrollPadding: false,
});
// Doc pages dim it with CSS (see layout.css).
bgVFX.canvas.classList.add("BGCanvas");

// Keep the canvas across page swaps. Astro moves it to the placeholder with the same id.
const PERSIST_ATTR = "data-astro-transition-persist";
bgVFX.canvas.setAttribute(PERSIST_ATTR, "bg-canvas");
document.addEventListener("astro:before-swap", (e) => {
    const placeholder = e.newDocument.createElement("div");
    placeholder.setAttribute(PERSIST_ATTR, "bg-canvas");
    e.newDocument.body.append(placeholder);
});

// #BG covers the viewport. The spheres sit at 65% x.
export const bgSpheres = new SpheresEffect({ center: [0.65, 0.5], zoom: 1.4 });

let ready: Promise<void> | undefined;

/** Start the spheres BG once. Later calls return the same promise. */
export function initBackground(): Promise<void> {
    ready ??= start();
    return ready;
}

async function start() {
    const bg = document.getElementById("BG");
    if (!bg) {
        return;
    }

    // Parallax moves the spheres in the shader. Moving #BG itself would crop them at its bottom edge.
    let scroll = 0;
    const loop = () => {
        scroll = scroll * 0.97 + (scrollRoot()?.scrollTop ?? 0) * 0.03;
        bgSpheres.center = [0.65, 0.5 + (scroll * 0.1) / window.innerHeight];
        requestAnimationFrame(loop);
    };
    loop();

    await bgVFX.add(bg, { effect: [bgSpheres] });
}
