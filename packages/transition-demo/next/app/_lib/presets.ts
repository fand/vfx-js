import type { TransitionDef } from "@vfx-js/core";
import {
    crossfade,
    crosszoom,
    datamosh,
    distortFade,
    glitch,
    glitchSlide,
    jpegGlitch,
    lensDistortion,
    pixelScan,
    pixelStretch,
    pixelsort,
    slitScan,
    swipe,
    tile,
    zoom,
    zoomBlur,
} from "@vfx-js/transitions";
import type { PresetName } from "./site";

export const presets: Record<PresetName, TransitionDef> = {
    crossfade,
    swipe,
    zoom,
    zoomBlur,
    crosszoom,
    glitch,
    glitchSlide,
    jpegGlitch,
    datamosh,
    pixelsort,
    lensDistortion,
    slitScan,
    pixelScan,
    pixelStretch,
    tile,
    distortFade,
};

export type PresetInfo = {
    name: PresetName;
    note: string;
    factory?: string;
};

export const presetList: PresetInfo[] = [
    { name: "crossfade", note: "Plain mix. The default." },
    {
        name: "swipe",
        note: "Content moves out, the new one follows it in.",
        factory: "createSwipe({ direction })",
    },
    { name: "zoom", note: "Old shrinks to the center, new grows out of it." },
    { name: "zoomBlur", note: "Radial blur with RGB split." },
    { name: "crosszoom", note: "Crossfade through a zoom blur." },
    { name: "glitch", note: "Jittery RGB-split blocks." },
    { name: "glitchSlide", note: "Sliding stripes with RGB split." },
    {
        name: "jpegGlitch",
        note: "Hard cut through a real JPEG glitch.",
        factory: "createJpegGlitch({ iterations, quality })",
    },
    {
        name: "datamosh",
        note: "Hard cut that heals block by block.",
        factory: "createDatamosh({ blockSize })",
    },
    {
        name: "pixelsort",
        note: "Melts into sorted streaks and sorts back out.",
        factory: "createPixelsort({ direction })",
    },
    {
        name: "lensDistortion",
        note: "Lens warp with a rainbow split.",
        factory: "createLensDistortion({ strength, dispersion })",
    },
    { name: "slitScan", note: "Smears into stripes and back out." },
    { name: "pixelScan", note: "A front of glowing pixel cells." },
    { name: "pixelStretch", note: "Stretches into streaks from the top." },
    {
        name: "tile",
        note: "Tiles shrink away to show the new content.",
        factory: "createTile({ direction, shape, count })",
    },
    { name: "distortFade", note: "Noise warp while crossfading." },
];
