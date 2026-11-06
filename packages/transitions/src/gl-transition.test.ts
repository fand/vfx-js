import transitions from "gl-transitions";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createGLTransition, type GLTransitionDef } from "./gl-transition";

const wave: GLTransitionDef = {
    name: "wave",
    glsl: `
uniform float amount; // = 0.5
uniform vec2 dir; // = vec2(1.0, 0.0)
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv + dir * amount), progress);
}
`,
    defaultParams: { amount: 0.5, dir: [1, 0] },
    paramsTypes: { amount: "float", dir: "vec2" },
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe("createGLTransition", () => {
    test("wraps the snippet", () => {
        const def = createGLTransition(wave);
        expect(def.name).toBe("gl:wave");
        expect(def.ease).toBe("linear");
        expect(def.frag).toContain("float progress;");
        expect(def.frag).toContain("float ratio;");
        expect(def.frag).toContain("vec4 getFromColor(vec2 p)");
        expect(def.frag).toContain("vec4 getToColor(vec2 p)");
        expect(def.frag).toContain("vec4 glTransition_(vec2 uv)");
        expect(def.frag).toContain("vec4 transition(vec2 uv, float t)");
        expect(def.frag.match(/vec4 transition\(/g)).toHaveLength(1);
    });

    test.each([
        "vec4 transition(vec2 p)",
        "vec4 transition (vec2 p)",
        "vec4  transition( vec2  p )",
        "vec4\ntransition(\n  vec2 p\n)",
    ])("matches %j", (signature) => {
        const def = createGLTransition({
            name: "s",
            glsl: `${signature} { return getToColor(p); }`,
        });
        expect(def.frag).toContain("vec4 glTransition_(vec2 p)");
    });

    test("throws without a transition function", () => {
        expect(() =>
            createGLTransition({ name: "bad", glsl: "vec4 main() {}" }),
        ).toThrow(/bad/);
    });

    test("params override the defaults", () => {
        expect(createGLTransition(wave).uniforms).toEqual({
            amount: 0.5,
            dir: [1, 0],
        });
        expect(createGLTransition(wave, { amount: 2 }).uniforms).toEqual({
            amount: 2,
            dir: [1, 0],
        });
    });

    test("throws on textures", () => {
        expect(() =>
            createGLTransition({
                name: "luma",
                glsl: "vec4 transition(vec2 uv) { return getToColor(uv); }",
                textures: ["luma"],
            }),
        ).toThrow(/luma/);
        expect(() =>
            createGLTransition({
                name: "old",
                glsl: "vec4 transition(vec2 uv) { return getToColor(uv); }",
                paramsTypes: { luma: "sampler2D" },
            }),
        ).toThrow(/luma/);
    });

    test("warns on an unknown param", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        createGLTransition(wave, { amout: 1 });
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain("amout");
    });

    test("renames params that clash with core names", () => {
        const def = createGLTransition(
            {
                name: "bow",
                glsl: `
uniform bool reverse; // = false
vec4 transition(vec2 uv) {
  return reverse ? getFromColor(uv) : getToColor(uv);
}
`,
                defaultParams: { reverse: false },
                paramsTypes: { reverse: "bool" },
            },
            { reverse: true },
        );
        expect(def.frag).toContain("uniform bool glParam_reverse;");
        expect(def.frag).toContain("return glParam_reverse ?");
        expect(def.uniforms).toEqual({ glParam_reverse: true });
    });

    test("accepts every gl-transitions entry without textures", () => {
        const withTextures = transitions.filter((e) => e.textures.length > 0);
        expect(withTextures.map((e) => e.name).sort()).toEqual([
            "DisplacementMap",
            "LumaWipe",
        ]);
        for (const entry of transitions) {
            if (entry.textures.length > 0) {
                expect(() => createGLTransition(entry)).toThrow();
            } else {
                expect(createGLTransition(entry).name).toBe(`gl:${entry.name}`);
            }
        }
    });
});
