import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectGlslVersion, uploadScalarUniform } from "./program.js";
import { Vec2, Vec4 } from "./vec.js";

describe("detectGlslVersion", () => {
    it("picks 300 es when #version 300 es directive is present", () => {
        expect(
            detectGlslVersion(
                "#version 300 es\nprecision highp float;\nout vec4 outColor; void main(){ outColor = vec4(1); }",
            ),
        ).toBe("300 es");
    });

    it("picks 100 when #version 100 directive is present", () => {
        expect(
            detectGlslVersion(
                "#version 100\nprecision highp float; void main(){ gl_FragColor = vec4(1); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on gl_FragColor usage", () => {
        expect(
            detectGlslVersion(
                "precision highp float; void main(){ gl_FragColor = vec4(1.); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on texture2D usage", () => {
        expect(
            detectGlslVersion(
                "precision highp float; uniform sampler2D src; varying vec2 vUv; void main(){ gl_FragColor = texture2D(src, vUv); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on varying declaration", () => {
        expect(
            detectGlslVersion(
                "precision highp float; varying vec2 vUv; void main(){}",
            ),
        ).toBe("100");
    });

    it("picks 100 on attribute declaration", () => {
        expect(
            detectGlslVersion(
                "precision highp float; attribute vec3 position; void main(){}",
            ),
        ).toBe("100");
    });

    it("defaults to 300 es when no markers are present", () => {
        expect(
            detectGlslVersion(
                "precision highp float; in vec3 position; void main(){}",
            ),
        ).toBe("300 es");
    });

    it("defaults to 300 es on empty source", () => {
        expect(detectGlslVersion("")).toBe("300 es");
    });
});

/** WebGL2 enum values for the uniform types we dispatch on. */
const T = {
    FLOAT: 0x1406,
    FLOAT_VEC2: 0x8b50,
    FLOAT_VEC3: 0x8b51,
    FLOAT_VEC4: 0x8b52,
    INT: 0x1404,
    INT_VEC2: 0x8b53,
    INT_VEC3: 0x8b54,
    INT_VEC4: 0x8b55,
    BOOL: 0x8b56,
    BOOL_VEC2: 0x8b57,
    BOOL_VEC3: 0x8b58,
    BOOL_VEC4: 0x8b59,
    FLOAT_MAT2: 0x8b5a,
    FLOAT_MAT3: 0x8b5b,
    FLOAT_MAT4: 0x8b5c,
    UNSIGNED_INT: 0x1405,
    UNSIGNED_INT_VEC2: 0x8dc6,
    UNSIGNED_INT_VEC3: 0x8dc7,
    UNSIGNED_INT_VEC4: 0x8dc8,
} as const;

const LOC = { dummy: true } as unknown as WebGLUniformLocation;

/**
 * Call uploadScalarUniform against a mock gl and return the list of
 * recorded (methodName, ...args) tuples the dispatcher invoked.
 */
function run(type: number, size: number, value: unknown): unknown[] {
    const calls: [string, ...unknown[]][] = [];
    const gl = { ...T } as Record<string | symbol, unknown>;
    const proxy = new Proxy(gl, {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            }
            return (...args: unknown[]) => calls.push([String(prop), ...args]);
        },
    });
    uploadScalarUniform(
        proxy as unknown as WebGL2RenderingContext,
        { location: LOC, type, size },
        value as Parameters<typeof uploadScalarUniform>[2],
    );
    return calls;
}

describe("uploadScalarUniform: float / vec", () => {
    it("float scalar → uniform1f", () => {
        expect(run(T.FLOAT, 1, 1.5)).toEqual([["uniform1f", LOC, 1.5]]);
    });
    it("float array → uniform1fv", () => {
        const v = new Float32Array([1, 2, 3]);
        expect(run(T.FLOAT, 3, v)).toEqual([["uniform1fv", LOC, v]]);
    });
    it("vec2 tuple → uniform2f", () => {
        expect(run(T.FLOAT_VEC2, 1, [1, 2])).toEqual([
            ["uniform2f", LOC, 1, 2],
        ]);
    });
    it("vec2 Vec2 instance → uniform2f", () => {
        const v = Object.assign(new Vec2(), { x: 3, y: 4 });
        expect(run(T.FLOAT_VEC2, 1, v)).toEqual([["uniform2f", LOC, 3, 4]]);
    });
    it("vec2 array → uniform2fv", () => {
        const v = new Float32Array([1, 2, 3, 4]);
        expect(run(T.FLOAT_VEC2, 2, v)).toEqual([["uniform2fv", LOC, v]]);
    });
    it("vec3 tuple → uniform3f", () => {
        expect(run(T.FLOAT_VEC3, 1, [1, 2, 3])).toEqual([
            ["uniform3f", LOC, 1, 2, 3],
        ]);
    });
    it("vec3 array → uniform3fv", () => {
        const v = new Float32Array(6);
        expect(run(T.FLOAT_VEC3, 2, v)).toEqual([["uniform3fv", LOC, v]]);
    });
    it("vec4 tuple → uniform4f", () => {
        expect(run(T.FLOAT_VEC4, 1, [1, 2, 3, 4])).toEqual([
            ["uniform4f", LOC, 1, 2, 3, 4],
        ]);
    });
    it("vec4 Vec4 instance → uniform4f", () => {
        const v = Object.assign(new Vec4(), { x: 1, y: 2, z: 3, w: 4 });
        expect(run(T.FLOAT_VEC4, 1, v)).toEqual([
            ["uniform4f", LOC, 1, 2, 3, 4],
        ]);
    });
    it("vec4 array → uniform4fv", () => {
        const v = new Float32Array(8);
        expect(run(T.FLOAT_VEC4, 2, v)).toEqual([["uniform4fv", LOC, v]]);
    });
});

describe("uploadScalarUniform: int / ivec", () => {
    it("int scalar → uniform1i", () => {
        expect(run(T.INT, 1, 7)).toEqual([["uniform1i", LOC, 7]]);
    });
    it("int array → uniform1iv", () => {
        const v = new Int32Array([1, 2]);
        expect(run(T.INT, 2, v)).toEqual([["uniform1iv", LOC, v]]);
    });
    it("ivec2 → uniform2i", () => {
        expect(run(T.INT_VEC2, 1, [1, 2])).toEqual([["uniform2i", LOC, 1, 2]]);
    });
    it("ivec3 array → uniform3iv", () => {
        const v = new Int32Array(6);
        expect(run(T.INT_VEC3, 2, v)).toEqual([["uniform3iv", LOC, v]]);
    });
    it("ivec4 → uniform4i", () => {
        expect(run(T.INT_VEC4, 1, [1, 2, 3, 4])).toEqual([
            ["uniform4i", LOC, 1, 2, 3, 4],
        ]);
    });
});

describe("uploadScalarUniform: bool / bvec", () => {
    it("bool scalar → uniform1i coerced", () => {
        expect(run(T.BOOL, 1, true)).toEqual([["uniform1i", LOC, 1]]);
    });
    it("bool array → uniform1iv", () => {
        const v = new Int32Array([0, 1, 1]);
        expect(run(T.BOOL, 3, v)).toEqual([["uniform1iv", LOC, v]]);
    });
    it("bvec2 → uniform2i", () => {
        expect(run(T.BOOL_VEC2, 1, [1, 0])).toEqual([["uniform2i", LOC, 1, 0]]);
    });
    it("bvec3 → uniform3i", () => {
        expect(run(T.BOOL_VEC3, 1, [1, 0, 1])).toEqual([
            ["uniform3i", LOC, 1, 0, 1],
        ]);
    });
    it("bvec4 → uniform4i", () => {
        expect(run(T.BOOL_VEC4, 1, [1, 0, 1, 0])).toEqual([
            ["uniform4i", LOC, 1, 0, 1, 0],
        ]);
    });
});

describe("uploadScalarUniform: matrices", () => {
    it("mat2 → uniformMatrix2fv", () => {
        const v = new Float32Array(4);
        expect(run(T.FLOAT_MAT2, 1, v)).toEqual([
            ["uniformMatrix2fv", LOC, false, v],
        ]);
    });
    it("mat3 → uniformMatrix3fv", () => {
        const v = new Float32Array(9);
        expect(run(T.FLOAT_MAT3, 1, v)).toEqual([
            ["uniformMatrix3fv", LOC, false, v],
        ]);
    });
    it("mat4 → uniformMatrix4fv", () => {
        const v = new Float32Array(16);
        expect(run(T.FLOAT_MAT4, 1, v)).toEqual([
            ["uniformMatrix4fv", LOC, false, v],
        ]);
    });
    it("mat4 array → uniformMatrix4fv (flat Nx16)", () => {
        const v = new Float32Array(32);
        expect(run(T.FLOAT_MAT4, 2, v)).toEqual([
            ["uniformMatrix4fv", LOC, false, v],
        ]);
    });
});

describe("uploadScalarUniform: uint / uvec", () => {
    it("uint scalar → uniform1ui", () => {
        expect(run(T.UNSIGNED_INT, 1, 5)).toEqual([["uniform1ui", LOC, 5]]);
    });
    it("uint array → uniform1uiv", () => {
        const v = new Uint32Array([1, 2]);
        expect(run(T.UNSIGNED_INT, 2, v)).toEqual([["uniform1uiv", LOC, v]]);
    });
    it("uvec2 → uniform2ui", () => {
        expect(run(T.UNSIGNED_INT_VEC2, 1, [1, 2])).toEqual([
            ["uniform2ui", LOC, 1, 2],
        ]);
    });
    it("uvec3 → uniform3ui", () => {
        expect(run(T.UNSIGNED_INT_VEC3, 1, [1, 2, 3])).toEqual([
            ["uniform3ui", LOC, 1, 2, 3],
        ]);
    });
    it("uvec4 array → uniform4uiv", () => {
        const v = new Uint32Array(8);
        expect(run(T.UNSIGNED_INT_VEC4, 2, v)).toEqual([
            ["uniform4uiv", LOC, v],
        ]);
    });
});

describe("uploadScalarUniform: unknown type", () => {
    let warn: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
        warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => {
        warn.mockRestore();
    });

    it("warns once and skips", () => {
        expect(run(0xdead, 1, 0)).toEqual([]);
        expect(run(0xdead, 1, 0)).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toMatch(/Unsupported uniform type/);
    });
});
