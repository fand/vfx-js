import type {
    EffectContext,
    EffectRenderTarget,
    EffectUniforms,
} from "@vfx-js/core";

export type SaberDeferredWarp = {
    fragment: string;
    uniforms: EffectUniforms;
};

const functions = new Map<string, string>();

// Embed the same cached warp shader as a callable function. Namespace its
// uniforms, helper functions and feature defines so Glow/Halo stay independent.
// The intermediate R16F store is reproduced before final light composition.
function warpFunction(fragment: string, prefix: string): string {
    const key = prefix + fragment;
    const cached = functions.get(key);
    if (cached) {
        return cached;
    }
    const names = new Set([
        "main",
        "outColor",
        "CACHED_NOISE",
        "CORE_BOUNDS",
        "ANALYTIC_CORE",
        "SCALAR_GLOW",
    ]);
    for (const match of fragment.matchAll(/uniform\s+\w+\s+(\w+)/g)) {
        if (match[1] !== "contentRectUv") {
            names.add(match[1]);
        }
    }
    for (const match of fragment.matchAll(
        /(?:void|float|int|bool|vec[234]|mat[234])\s+(\w+)\s*\(/g,
    )) {
        names.add(match[1]);
    }
    let source = fragment
        .replace(/^#version[^\n]*\n/, "")
        .replace(/in vec2 (uv|uvContent);/g, "")
        .replace("uniform vec4 contentRectUv;", "")
        .replace("out vec4 outColor;", "vec4 outColor;")
        // Final composition can target a viewport offset from the padded core.
        // Bounds must still address the original offscreen pixel grid.
        .replaceAll(
            "gl_FragCoord.xy",
            prefix === "cw_"
                ? "(uv * vec2(textureSize(src, 0)))"
                : "gl_FragCoord.xy",
        )
        .replace(/\b[A-Za-z_]\w*\b/g, (name) =>
            names.has(name) ? prefix + name : name,
        );
    source += `\nfloat ${prefix}sample() {
    ${prefix}main();
    return saberRoundWarp(${prefix}outColor.r);
}\n`;
    functions.set(key, source);
    return source;
}

// Float-to-R16F attachment conversion is backend-dependent. A one-texel
// probe distinguishes nearest rounding from truncation without a CPU readback.
const ROUND_WARP = `
uniform sampler2D warpRounding;
float saberRoundWarp(float value) {
    uint bits = packHalf2x16(vec2(value, 0.0)) & 65535u;
    float rounded = unpackHalf2x16(bits).x;
    if (texelFetch(warpRounding, ivec2(0), 0).r == 1.0 && abs(rounded) > abs(value)) {
        rounded = unpackHalf2x16(bits - 1u).x;
    }
    return rounded;
}
`;
const composites = new Map<
    string,
    Map<string, Map<string, Map<string, string>>>
>();
export class SaberWarpComposer {
    #rounding: EffectRenderTarget | null = null;
    #ready = false;
    invalidate(): void {
        this.#ready = false;
    }
    compose(
        ctx: EffectContext,
        composite: string,
        glow: SaberDeferredWarp | null,
        halo: SaberDeferredWarp | null,
        core: SaberDeferredWarp | null,
    ) {
        const result = fuseSaberWarps(composite, glow, halo, core);
        if (!glow && !halo && !core) {
            return result;
        }
        this.#rounding ??= ctx.createRenderTarget({
            format: "r16f",
            size: [1, 1],
        });
        if (!this.#ready) {
            ctx.draw({
                frag: `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(1.00075); }
`,
                uniforms: {},
                target: this.#rounding,
            });
            this.#ready = true;
        }
        result.uniforms.warpRounding = this.#rounding;
        return result;
    }
    dispose(): void {
        this.#rounding?.dispose();
        this.#rounding = null;
        this.#ready = false;
    }
}
function fuseSaberWarps(
    composite: string,
    glow: SaberDeferredWarp | null,
    halo: SaberDeferredWarp | null,
    core: SaberDeferredWarp | null,
): { fragment: string; uniforms: EffectUniforms } {
    if (!glow && !halo && !core) {
        return { fragment: composite, uniforms: {} };
    }
    // Look up original strings directly; do not concatenate/hash whole shader
    // bodies on every animated frame.
    let glowVariants = composites.get(composite);
    if (!glowVariants) {
        glowVariants = new Map();
        composites.set(composite, glowVariants);
    }
    const glowKey = glow?.fragment ?? "";
    let haloVariants = glowVariants.get(glowKey);
    if (!haloVariants) {
        haloVariants = new Map();
        glowVariants.set(glowKey, haloVariants);
    }
    const haloKey = halo?.fragment ?? "";
    let coreVariants = haloVariants.get(haloKey);
    if (!coreVariants) {
        coreVariants = new Map();
        haloVariants.set(haloKey, coreVariants);
    }
    const coreKey = core?.fragment ?? "";
    let fragment = coreVariants.get(coreKey);
    if (!fragment) {
        const code =
            (glow ? warpFunction(glow.fragment, "gw_") : "") +
            (halo ? warpFunction(halo.fragment, "hw_") : "") +
            (core ? warpFunction(core.fragment, "cw_") : "");
        fragment = composite.replace(
            "in vec2 uvSrc;",
            "in vec2 uvSrc;\nin vec2 uvContent;\nuniform vec4 contentRectUv;",
        );
        const main = fragment.lastIndexOf("void main() {");
        fragment =
            fragment.slice(0, main) + ROUND_WARP + code + fragment.slice(main);
        if (glow) {
            fragment = fragment.replace(
                "lights = texture(glowTex, uv);",
                "lights = vec4(gw_sample(), 0.0, 0.0, 1.0);",
            );
        }
        if (halo) {
            fragment = fragment.replace(
                "texture(haloTex, uv).r",
                "hw_sample()",
            );
        }
        if (core) {
            fragment = fragment.replace("texture(core, uv).r", "cw_sample()");
        }
        coreVariants.set(coreKey, fragment);
    }
    const uniforms: EffectUniforms = {};
    for (const [prefix, warp] of [
        ["gw_", glow],
        ["hw_", halo],
        ["cw_", core],
    ] as const) {
        if (warp) {
            for (const [name, value] of Object.entries(warp.uniforms)) {
                uniforms[prefix + name] = value;
            }
        }
    }
    return { fragment, uniforms };
}
