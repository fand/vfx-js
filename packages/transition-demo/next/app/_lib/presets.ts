import type { TransitionDef } from "@vfx-js/core";
import {
    crossfade,
    crosszoom,
    datamosh,
    glitch,
    glitchSlide,
    pixelsort,
    swipe,
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
    datamosh,
    pixelsort,
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
        name: "datamosh",
        note: "Hard cut that heals block by block.",
        factory: "createDatamosh({ blockSize })",
    },
    {
        name: "pixelsort",
        note: "Melts into sorted streaks and sorts back out.",
        factory: "createPixelsort({ direction })",
    },
];
