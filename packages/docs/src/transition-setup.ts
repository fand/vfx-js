import { getPageVFX } from "./page-vfx";

// Make the shared VFX with our options before <VFXTransition> does.
try {
    getPageVFX();
} catch (e) {
    console.warn(e);
}

document.addEventListener("astro:before-swap", (e) => {
    // The top page's intro masks are for full page loads only.
    for (const id of ["MaskTop", "MaskBottom"]) {
        e.newDocument.getElementById(id)?.remove();
    }
});
