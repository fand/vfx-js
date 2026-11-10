import { Swipe, Zoom } from "@vfx-js/transitions";

// Maps the `transition` field of a page to a preset.
// Swipe and Zoom show their direction, so a reversed run is easy to spot.
export const presets = {
    swipe: Swipe,
    zoom: Zoom,
};
