import { VFX } from "@vfx-js/core";
import { SpheresEffect } from "./spheres-bg";

export const bgVFX = new VFX({
    pixelRatio: 1,
    zIndex: -2,
    scrollPadding: false,
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
        scroll = scroll * 0.97 + window.scrollY * 0.03;
        bgSpheres.center = [0.65, 0.5 + (scroll * 0.1) / window.innerHeight];
        requestAnimationFrame(loop);
    };
    loop();

    await bgVFX.add(bg, { effect: [bgSpheres] });
}
