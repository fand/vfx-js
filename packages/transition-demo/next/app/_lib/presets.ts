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

export type PresetOption = {
    name: string;
    type: string;
    default: string;
    note: string;
};

export type PresetCategory = "page" | "bold" | "image";

export type PresetInfo = {
    name: PresetName;
    note: string;
    category: PresetCategory;
    factory?: string;
    options?: PresetOption[];
    /** Set when the preset draws outside the element by default. */
    overflow?: boolean;
};

const directions = '"left" | "right" | "up" | "down"';

export const categories: { id: PresetCategory; label: string; note: string }[] =
    [
        {
            id: "page",
            label: "For page navigation",
            note: "Calm and short. The text stays readable, so they suit routes you click often.",
        },
        {
            id: "bold",
            label: "Bold",
            note: "Glitches and hard cuts. Use them for a moment you want people to notice.",
        },
        {
            id: "image",
            label: "For images",
            note: "Smears and streaks that look best on photos, video and big color fields.",
        },
    ];

export const presetList: PresetInfo[] = [
    { name: "crossfade", note: "Plain mix. The default.", category: "page" },
    {
        name: "swipe",
        note: "Content moves out, the new one follows it in.",
        category: "page",
        factory: "createSwipe",
        options: [
            {
                name: "direction",
                type: directions,
                default: '"left"',
                note: "Where the old content moves.",
            },
        ],
    },
    {
        name: "zoom",
        note: "Old zooms in, new grows out of the center.",
        category: "page",
        overflow: true,
    },
    {
        name: "crosszoom",
        note: "Crossfade through a zoom blur.",
        category: "page",
        overflow: true,
    },
    {
        name: "distortFade",
        note: "Noise warp while crossfading.",
        category: "page",
    },
    {
        name: "tile",
        note: "Tiles shrink away to show the new content.",
        category: "page",
        factory: "createTile",
        options: [
            {
                name: "direction",
                type: `"center" | ${directions}`,
                default: '"center"',
                note: "Where the tiles start to shrink.",
            },
            {
                name: "shape",
                type: '"hex" | "square"',
                default: '"hex"',
                note: "Tile shape.",
            },
            {
                name: "count",
                type: "number",
                default: "12",
                note: "Tiles along the longer side.",
            },
        ],
    },
    { name: "glitch", note: "Jittery RGB-split blocks.", category: "bold" },
    {
        name: "glitchSlide",
        note: "Sliding stripes with RGB split.",
        category: "bold",
    },
    {
        name: "jpegGlitch",
        note: "Hard cut through a real JPEG glitch.",
        category: "bold",
        factory: "createJpegGlitch",
        options: [
            {
                name: "iterations",
                type: "number",
                default: "64",
                note: "Encode and corrupt passes at the peak. More is messier.",
            },
            {
                name: "quality",
                type: "number (0–1)",
                default: "0.3",
                note: "JPEG quality. Lower gives bigger blocks.",
            },
        ],
    },
    {
        name: "datamosh",
        note: "Hard cut that heals block by block.",
        category: "bold",
        factory: "createDatamosh",
        options: [
            {
                name: "blockSize",
                type: "number",
                default: "32",
                note: "Block size in px. 2 or more.",
            },
        ],
    },
    {
        name: "lensDistortion",
        note: "Lens warp with a rainbow split.",
        category: "bold",
        factory: "createLensDistortion",
        options: [
            {
                name: "strength",
                type: "number",
                default: "1",
                note: "How hard the lens warps.",
            },
            {
                name: "dispersion",
                type: "number",
                default: "0.6",
                note: "Rainbow split. 0 turns it off.",
            },
            {
                name: "zoom",
                type: "number",
                default: "3",
                note: "Old content zooms in this much, new zooms back out from it. 0 turns it off.",
            },
        ],
    },
    {
        name: "pixelScan",
        note: "A front of glowing pixel cells.",
        category: "bold",
        factory: "createPixelScan",
        options: [
            {
                name: "blackout",
                type: "boolean",
                default: "true",
                note: "Fill the gap between old and new with black. false leaves it transparent.",
            },
        ],
    },
    {
        name: "pixelsort",
        note: "Melts into sorted streaks and sorts back out.",
        category: "image",
        factory: "createPixelsort",
        options: [
            {
                name: "direction",
                type: '"up" | "down" | "left" | "right"',
                default: '"up"',
                note: "Where the old content melts.",
            },
        ],
    },
    {
        name: "slitScan",
        note: "Smears into stripes and back out.",
        category: "image",
    },
    {
        name: "pixelStretch",
        note: "Stretches into streaks from the top.",
        category: "image",
    },
    {
        name: "zoomBlur",
        note: "Radial blur with RGB split.",
        category: "image",
        overflow: true,
    },
];
