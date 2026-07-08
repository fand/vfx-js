// Shared helpers for the Figma Shader effect ports.
// Internal module — not part of the public @vfx-js/effects API.

/**
 * Parse a hex color into an RGBA tuple in [0, 1].
 * Accepts `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` (with or without `#`).
 * Alpha defaults to 1. Falls back to transparent black on a malformed value.
 */
export function parseHexColor(hex: string): [number, number, number, number] {
    let s = hex.startsWith("#") ? hex.slice(1) : hex;
    if (s.length === 3 || s.length === 4) {
        s = s
            .split("")
            .map((c) => c + c)
            .join("");
    }
    if (s.length === 6) {
        s += "ff";
    }
    if (s.length !== 8) {
        return [0, 0, 0, 0];
    }
    const r = Number.parseInt(s.slice(0, 2), 16) / 255;
    const g = Number.parseInt(s.slice(2, 4), 16) / 255;
    const b = Number.parseInt(s.slice(4, 6), 16) / 255;
    const a = Number.parseInt(s.slice(6, 8), 16) / 255;
    return [r, g, b, a];
}

/** 2D rotation matrix and a small hash, shared by the warp/slice ports. */
export const GLSL_COMMON = `
mat2 rot2d(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
`;
