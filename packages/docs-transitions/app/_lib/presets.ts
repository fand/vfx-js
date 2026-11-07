import type { TransitionClass } from "@vfx-js/core";
import {
    Crossfade,
    Crosszoom,
    Datamosh,
    DistortFade,
    Glitch,
    GlitchSlide,
    JpegGlitch,
    LensDistortion,
    PixelScan,
    PixelStretch,
    Pixelsort,
    SlitScan,
    Swipe,
    Tile,
    Zoom,
    ZoomBlur,
} from "@vfx-js/transitions";
import type { PresetName } from "./site";

export const presets: Record<PresetName, TransitionClass> = {
    crossfade: Crossfade,
    swipe: Swipe,
    zoom: Zoom,
    zoomBlur: ZoomBlur,
    crosszoom: Crosszoom,
    glitch: Glitch,
    glitchSlide: GlitchSlide,
    jpegGlitch: JpegGlitch,
    datamosh: Datamosh,
    pixelsort: Pixelsort,
    lensDistortion: LensDistortion,
    slitScan: SlitScan,
    pixelScan: PixelScan,
    pixelStretch: PixelStretch,
    tile: Tile,
    distortFade: DistortFade,
};

/** The exported class name, e.g. `zoomBlur` → `ZoomBlur`. */
export const classNameOf = (name: PresetName): string =>
    name[0].toUpperCase() + name.slice(1);

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
    /** Constructor params. */
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
            {
                name: "shadow",
                type: "number (0–1)",
                default: "0.5",
                note: "Drop shadow under the shrinking tiles. 0 turns it off.",
            },
        ],
    },
    {
        name: "glitch",
        note: "Jittery RGB-split blocks.",
        category: "bold",
        options: [
            {
                name: "amount",
                type: "number",
                default: "1",
                note: "How far the blocks shift.",
            },
            {
                name: "speed",
                type: "number",
                default: "1",
                note: "How fast the blocks jump.",
            },
        ],
    },
    {
        name: "glitchSlide",
        note: "Sliding stripes with RGB split.",
        category: "bold",
    },
    {
        name: "jpegGlitch",
        note: "Hard cut through a real JPEG glitch.",
        category: "bold",
        options: [
            {
                name: "iterations",
                type: "number",
                default: "4",
                note: "Encode and corrupt passes at the peak. More is messier.",
            },
            {
                name: "quality",
                type: "number (0–1)",
                default: "0.1",
                note: "JPEG quality. Lower gives bigger blocks.",
            },
        ],
    },
    {
        name: "datamosh",
        note: "Hard cut that heals block by block.",
        category: "bold",
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
        options: [
            {
                name: "direction",
                type: '"right" | "left" | "up" | "down" | "center"',
                default: '"right"',
                note: "Where the fronts sweep. center spreads out in rings.",
            },
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
