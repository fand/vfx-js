/**
 * GLSL ES version of a shader. When omitted on a VFX prop, it is
 * auto-detected from the fragment shader:
 * GLSL 100 markers (`gl_FragColor`, `texture2D`, `varying`, `attribute`)
 * pick `"100"`, otherwise `"300 es"`.
 */
export type GlslVersion = "100" | "300 es";

/** @see {@link GlslVersion} */
export function detectGlslVersion(src: string): GlslVersion {
    if (/#version\s+300\s+es\b/.test(src)) {
        return "300 es";
    }
    if (/#version\s+100\b/.test(src)) {
        return "100";
    }
    if (/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(src)) {
        return "100";
    }
    return "300 es";
}
