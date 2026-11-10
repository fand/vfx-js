import { getPageVFX } from "./page-vfx";

// Make the shared VFX with our options before <VFXTransition> does.
try {
    getPageVFX();
} catch (e) {
    console.warn(e);
}

const TARGET_ATTR = "data-vfx-transition-target";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.addEventListener("astro:before-preparation", () => {
    // Cut without animation. The target's spec is read when the run starts.
    const target = document.querySelector(`[${TARGET_ATTR}]`);
    if (!target || !reducedMotion.matches) {
        return;
    }
    const spec = JSON.parse(target.getAttribute(TARGET_ATTR) || "{}");
    target.setAttribute(TARGET_ATTR, JSON.stringify({ ...spec, duration: 0 }));
});

document.addEventListener("astro:before-swap", (e) => {
    // The top page's intro masks are for full page loads only.
    for (const id of ["MaskTop", "MaskBottom"]) {
        e.newDocument.getElementById(id)?.remove();
    }
});
