import {
    type ShaderTransitionDef,
    shaderTransition,
    type TransitionUniforms,
} from "@vfx-js/core";

/** One entry of the `gl-transitions` package. */
export type GLTransitionDef = {
    name: string;
    glsl: string;
    defaultParams?: Record<string, unknown>;
    paramsTypes?: Record<string, string>;
    /** Extra textures the shader reads. Not supported. */
    textures?: string[];
};

const SIGNATURE = /vec4\s+transition\s*\(\s*vec2\s+(\w+)\s*\)/;

// Names the core prelude and the wrapper declare. Params with these names are renamed.
const RESERVED = new Set([
    "from",
    "src",
    "srcRectUv",
    "t",
    "reverse",
    "resolution",
    "time",
    "uvContent",
    "outColor",
    "progress",
    "ratio",
]);

const paramName = (name: string) =>
    RESERVED.has(name) ? `glParam_${name}` : name;

/** Use a shader from gl-transitions as a `TransitionDef`. `params` override its defaults. */
export function createGLTransition(
    def: GLTransitionDef,
    params: TransitionUniforms = {},
): ShaderTransitionDef {
    const types = def.paramsTypes ?? {};
    const textures = [
        ...(def.textures ?? []),
        ...Object.keys(types).filter((key) => types[key] === "sampler2D"),
    ];
    if (textures.length > 0) {
        throw new Error(
            `[VFX-JS] gl-transition "${def.name}" needs textures (${textures.join(", ")}), which are not supported.`,
        );
    }
    if (!SIGNATURE.test(def.glsl)) {
        throw new Error(
            `[VFX-JS] gl-transition "${def.name}" has no \`vec4 transition(vec2 uv)\`.`,
        );
    }
    for (const key of Object.keys(params)) {
        if (!(key in types)) {
            console.warn(
                `[VFX-JS] gl-transition "${def.name}" has no param "${key}".`,
            );
        }
    }

    let glsl = def.glsl.replace(SIGNATURE, "vec4 glTransition_(vec2 $1)");
    for (const key of Object.keys(types)) {
        const name = paramName(key);
        if (name !== key) {
            glsl = glsl.replace(
                new RegExp(`(^|[^.\\w])${key}\\b`, "g"),
                `$1${name}`,
            );
        }
    }
    const uniforms: TransitionUniforms = {};
    const values = { ...def.defaultParams, ...params };
    for (const key of Object.keys(values)) {
        uniforms[paramName(key)] = values[key] as TransitionUniforms[string];
    }

    return shaderTransition({
        name: `gl:${def.name}`,
        frag: `
float progress;
float ratio;
vec4 getFromColor(vec2 p) { return readFrom(clamp(p, 0.0, 1.0)); }
vec4 getToColor(vec2 p) { return readTo(clamp(p, 0.0, 1.0)); }

${glsl}

vec4 transition(vec2 uv, float t) {
  // getFromColor clamps, so a container overflow would stretch the edges.
  if (!inRange(uv)) return vec4(0.0);
  progress = t;
  ratio = resolution.x / resolution.y;
  return glTransition_(uv);
}
`,
        uniforms,
        ease: "linear",
    });
}
