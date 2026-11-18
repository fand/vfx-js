// Assembles holospot's material programs for vfx-js (holospot engine/shaders/lib/index.ts `assemble`, MIT © 2026
// Dmitry Kurash) and applies the few adaptations the port needs. Every adaptation replaces an exact snippet of the
// verbatim sources in ./glsl and throws if the snippet is missing, so a re-import that changes them is caught.
//
// Adaptations:
//   prefix     what three.js prepends to a ShaderMaterial fragment shader (version, precision, gl_FragColor,
//              `varying` → `in`, cameraPosition)
//   spectral   sampler2DArray uCmfConv / uCmfCum → 2D atlases with the 5 SPD layers stacked (spectral/atlas.ts)
//   ibl        samplerCube uEnv (PMREM) → octahedral 2D map with a mip chain (scene/env.ts)
//   print      the procedural card print → the element itself as a translucent ink over the foil
import coat from "./glsl/coat.js";
import common from "./glsl/common.js";
import grating from "./glsl/grating.js";
import ibl from "./glsl/ibl.js";
import lights from "./glsl/lights.js";
import ltc from "./glsl/ltc.js";
import relief from "./glsl/relief.js";
import spectral from "./glsl/spectral.js";
import wear from "./glsl/wear.js";

function replaceExact(
    src: string,
    from: string,
    to: string,
    what: string,
): string {
    if (!src.includes(from)) {
        throw new Error(`holo: shader adaptation "${what}" no longer applies`);
    }
    return src.split(from).join(to);
}

/** What three r187 prepends to a WebGL 2 ShaderMaterial fragment shader (the parts the holo shaders rely on). */
export const FRAG_PREFIX = `#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
precision highp float;
precision highp int;
precision highp sampler2D;
#define HIGH_PRECISION
uniform vec3 cameraPosition;
`;

const SPECTRAL = replaceExact(
    spectral,
    "uniform highp sampler2DArray uCmfConv;\nuniform highp sampler2DArray uCmfCum;",
    `uniform highp sampler2D uCmfConv;
uniform highp sampler2D uCmfCum;
// vfx-js port: the SPD layers are stacked vertically in one 2D atlas. c = (u, v within the layer, layer). v lies in
// [0.5, 40.5]/41 (cmfRow clamps σ), so bilinear filtering never mixes layers.
vec4 cmfAtlas(highp sampler2D t, vec3 c, float lod) {
  return textureLod(t, vec2(c.x, (c.z + c.y) / float(NSPD)), lod);
}`,
    "spectral atlas",
).replace(/textureLod\((uCmfConv|uCmfCum), vec3\(/g, "cmfAtlas($1, vec3(");
if (SPECTRAL.includes("textureLod(uCmf")) {
    throw new Error('holo: shader adaptation "spectral lookups" incomplete');
}

/** Octahedral direction → uv (Cigolle et al. 2014), shared by the environment pass and the lookups. */
export const GLSL_OCT = `
vec2 octEncode(vec3 d) {
  d /= abs(d.x) + abs(d.y) + abs(d.z);
  vec2 e = d.z >= 0.0 ? d.xy : (1.0 - abs(d.yx)) * vec2(d.x >= 0.0 ? 1.0 : -1.0, d.y >= 0.0 ? 1.0 : -1.0);
  return e * 0.5 + 0.5;
}
vec3 octDecode(vec2 uv) {
  vec2 f = uv * 2.0 - 1.0;
  vec3 n = vec3(f, 1.0 - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.0);
  n.xy += vec2(n.x >= 0.0 ? -t : t, n.y >= 0.0 ? -t : t);
  return normalize(n);
}
`;

/** Tiles of the environment atlas (= uEnvMaxLod + 1) and their size [texels] (scene/env.ts). */
export const ENV_LEVELS = 7;
export const ENV_SIZE = 128;

const IBL = replaceExact(
    replaceExact(
        ibl,
        "uniform samplerCube uEnv;",
        `uniform sampler2D uEnv;${GLSL_OCT}
// vfx-js port: uEnv is an octahedral atlas of ENV_LEVELS prefiltered tiles stacked vertically (scene/env.ts); the
// level blends the two nearest tiles, like a trilinear lookup of the PMREM mips.
vec3 envOctLod(vec3 d, float lod) {
  const float N = ${ENV_LEVELS.toFixed(1)}, S = ${ENV_SIZE.toFixed(1)};
  vec2 uv = clamp(octEncode(d), 0.5 / S, 1.0 - 0.5 / S);
  float l = clamp(lod, 0.0, N - 1.0), l0 = floor(l), l1 = min(l0 + 1.0, N - 1.0);
  vec3 a = textureLod(uEnv, vec2(uv.x, (l0 + uv.y) / N), 0.0).rgb;
  vec3 b = textureLod(uEnv, vec2(uv.x, (l1 + uv.y) / N), 0.0).rgb;
  return mix(a, b, l - l0);
}`,
        "ibl sampler",
    ),
    "textureLod(uEnv, uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r)).rgb",
    "envOctLod(uEnvRot * dirW, uEnvMaxLod * r * (2.0 - r))",
    "ibl lookup",
);

/** The element as print layer: bare foil under a translucent ink of the element's colour (W = 0). */
const PRINT = `
// ===== print (vfx-js port) — the element is the print layer =====
// holospot composes R ≈ (1 − W)·T2·R_foil + W·onWhite (print.glsl). Here W = 0 everywhere (the element's own pixels
// outside the foil are composited by the output pass) and T2 = mix(1, element colour, uInk): the element tints the
// foil like a translucent ink.
uniform sampler2D uPrintSrc;
uniform vec4 uPrintRect;   // element UV → src texture UV (srcRectUv)
uniform float uInk;
struct Print { float W; vec3 T2; vec3 onWhite; float silver; };
vec4 printUvDerivs(vec2 p) { return vec4(0.0); }
vec3 printSrgbToLinear(vec3 c) {
  return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, vec3(lessThanEqual(c, vec3(0.04045))));
}
Print printLayer(vec2 pMm, vec4 dUv) {
  Print pr; pr.W = 0.0; pr.onWhite = vec3(0.85); pr.silver = 0.0;
  vec4 s = texture(uPrintSrc, uPrintRect.xy + (pMm / uCardSizeMm) * uPrintRect.zw);
  vec3 c = s.a > 1e-4 ? printSrgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) : vec3(1.0);
  pr.T2 = mix(vec3(1.0), c, uInk);
  return pr;
}
`;

const DEFINE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function defineLines(
    defines: Readonly<Record<string, string | number>>,
): string {
    return Object.entries(defines)
        .map(([name, value]) => {
            if (!DEFINE_NAME.test(name)) {
                throw new Error(`holo: invalid define name "${name}"`);
            }
            return `#define ${name} ${value}`;
        })
        .join("\n");
}

/** holospot `assemble()`: defines → common → spectral → ltc → lights → relief → coat → wear → grating → ibl → print → extra chunks → main. */
export function assembleMaterial(
    defines: Readonly<Record<string, string | number>>,
    extraChunks: readonly string[],
    main: string,
): string {
    return [
        FRAG_PREFIX,
        defineLines(defines),
        "#define CARD_PROGRAM 1",
        common,
        SPECTRAL,
        ltc,
        lights,
        relief,
        coat,
        wear,
        grating,
        IBL,
        PRINT,
        ...extraChunks,
        main,
    ].join("\n");
}

/** card.vert for the element: a flat card of uCardSizeMm centred at the origin, rotated by uCardRot. */
export const CARD_VERT = `#version 300 es
precision highp float;
in vec3 position;
uniform mat3 uCardRot, uPrevCardRot;
uniform vec2 uCardSizeMm;
out vec3 vWorldPos; out vec3 vPrevWorldPos; out vec2 vUv; out vec3 vN; out vec3 vT; out vec3 vB;
out float vOcc;
void main() {
  vec2 uv = position.xy * 0.5 + 0.5;
  vec3 local = vec3((uv - 0.5) * uCardSizeMm * 0.001, 0.0);   // metres, card centre at the origin
  vWorldPos = uCardRot * local;
  vPrevWorldPos = uPrevCardRot * local;
  vUv = uv;
  vN = uCardRot[2]; vT = uCardRot[0]; vB = uCardRot[1];
  vOcc = 0.0;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Fullscreen vertex shader with a plain 0..1 uv (passes into the effect's own targets). */
export const PLAIN_VERT = `#version 300 es
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export { common as GLSL_COMMON };
