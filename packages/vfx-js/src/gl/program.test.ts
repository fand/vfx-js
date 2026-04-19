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

/**
 * Mock of the subset of WebGL2 that uploadScalarUniform uses. Records every
 * uniform* call so a test can assert which dispatch branch was hit with
 * which arguments.
 */
function mockGl() {
    const calls: [string, ...unknown[]][] = [];
    // biome-ignore lint/suspicious/noExplicitAny: intentional loose mock
    const gl: any = {
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
    };
    const methods = [
        "uniform1f",
        "uniform2f",
        "uniform3f",
        "uniform4f",
        "uniform1fv",
        "uniform2fv",
        "uniform3fv",
        "uniform4fv",
        "uniform1i",
        "uniform2i",
        "uniform3i",
        "uniform4i",
        "uniform1iv",
        "uniform2iv",
        "uniform3iv",
        "uniform4iv",
        "uniform1ui",
        "uniform2ui",
        "uniform3ui",
        "uniform4ui",
        "uniform1uiv",
        "uniform2uiv",
        "uniform3uiv",
        "uniform4uiv",
        "uniformMatrix2fv",
        "uniformMatrix3fv",
        "uniformMatrix4fv",
    ];
    for (const name of methods) {
        gl[name] = (...args: unknown[]) => calls.push([name, ...args]);
    }
    return { gl, calls };
}

const LOC = { dummy: true } as unknown as WebGLUniformLocation;

function info(type: number, size = 1) {
    return { location: LOC, type, size };
}

describe("uploadScalarUniform", () => {
    describe("float", () => {
        it("scalar → uniform1f", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.FLOAT), 1.5);
            expect(calls).toEqual([["uniform1f", LOC, 1.5]]);
        });
        it("array → uniform1fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array([1, 2, 3]);
            uploadScalarUniform(gl, info(gl.FLOAT, 3), v);
            expect(calls).toEqual([["uniform1fv", LOC, v]]);
        });
    });

    describe("vec2/3/4 (float)", () => {
        it("vec2 tuple → uniform2f", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.FLOAT_VEC2), [1, 2]);
            expect(calls).toEqual([["uniform2f", LOC, 1, 2]]);
        });
        it("vec2 Vec2 instance → uniform2f", () => {
            const { gl, calls } = mockGl();
            const v = new Vec2();
            v.x = 3;
            v.y = 4;
            uploadScalarUniform(gl, info(gl.FLOAT_VEC2), v);
            expect(calls).toEqual([["uniform2f", LOC, 3, 4]]);
        });
        it("vec2 array → uniform2fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array([1, 2, 3, 4]);
            uploadScalarUniform(gl, info(gl.FLOAT_VEC2, 2), v);
            expect(calls).toEqual([["uniform2fv", LOC, v]]);
        });
        it("vec3 tuple → uniform3f", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.FLOAT_VEC3), [1, 2, 3]);
            expect(calls).toEqual([["uniform3f", LOC, 1, 2, 3]]);
        });
        it("vec3 array → uniform3fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(6);
            uploadScalarUniform(gl, info(gl.FLOAT_VEC3, 2), v);
            expect(calls).toEqual([["uniform3fv", LOC, v]]);
        });
        it("vec4 tuple → uniform4f", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.FLOAT_VEC4), [1, 2, 3, 4]);
            expect(calls).toEqual([["uniform4f", LOC, 1, 2, 3, 4]]);
        });
        it("vec4 Vec4 instance → uniform4f", () => {
            const { gl, calls } = mockGl();
            const v = new Vec4();
            v.x = 1;
            v.y = 2;
            v.z = 3;
            v.w = 4;
            uploadScalarUniform(gl, info(gl.FLOAT_VEC4), v);
            expect(calls).toEqual([["uniform4f", LOC, 1, 2, 3, 4]]);
        });
        it("vec4 array → uniform4fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(8);
            uploadScalarUniform(gl, info(gl.FLOAT_VEC4, 2), v);
            expect(calls).toEqual([["uniform4fv", LOC, v]]);
        });
    });

    describe("int / ivec", () => {
        it("int scalar → uniform1i", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.INT), 7);
            expect(calls).toEqual([["uniform1i", LOC, 7]]);
        });
        it("int array → uniform1iv", () => {
            const { gl, calls } = mockGl();
            const v = new Int32Array([1, 2]);
            uploadScalarUniform(gl, info(gl.INT, 2), v);
            expect(calls).toEqual([["uniform1iv", LOC, v]]);
        });
        it("ivec2 scalar → uniform2i", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.INT_VEC2), [1, 2]);
            expect(calls).toEqual([["uniform2i", LOC, 1, 2]]);
        });
        it("ivec3 array → uniform3iv", () => {
            const { gl, calls } = mockGl();
            const v = new Int32Array(6);
            uploadScalarUniform(gl, info(gl.INT_VEC3, 2), v);
            expect(calls).toEqual([["uniform3iv", LOC, v]]);
        });
        it("ivec4 scalar → uniform4i", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.INT_VEC4), [1, 2, 3, 4]);
            expect(calls).toEqual([["uniform4i", LOC, 1, 2, 3, 4]]);
        });
    });

    describe("bool / bvec", () => {
        it("bool scalar → uniform1i coerced", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.BOOL), true);
            expect(calls).toEqual([["uniform1i", LOC, 1]]);
        });
        it("bool array → uniform1iv", () => {
            const { gl, calls } = mockGl();
            const v = new Int32Array([0, 1, 1]);
            uploadScalarUniform(gl, info(gl.BOOL, 3), v);
            expect(calls).toEqual([["uniform1iv", LOC, v]]);
        });
        it("bvec2 scalar → uniform2i with 0/1 coercion", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.BOOL_VEC2), [1, 0]);
            expect(calls).toEqual([["uniform2i", LOC, 1, 0]]);
        });
        it("bvec3 scalar → uniform3i", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.BOOL_VEC3), [1, 0, 1]);
            expect(calls).toEqual([["uniform3i", LOC, 1, 0, 1]]);
        });
        it("bvec4 scalar → uniform4i", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.BOOL_VEC4), [1, 0, 1, 0]);
            expect(calls).toEqual([["uniform4i", LOC, 1, 0, 1, 0]]);
        });
    });

    describe("matrices", () => {
        it("mat2 → uniformMatrix2fv(loc,false,v)", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(4);
            uploadScalarUniform(gl, info(gl.FLOAT_MAT2), v);
            expect(calls).toEqual([["uniformMatrix2fv", LOC, false, v]]);
        });
        it("mat3 → uniformMatrix3fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(9);
            uploadScalarUniform(gl, info(gl.FLOAT_MAT3), v);
            expect(calls).toEqual([["uniformMatrix3fv", LOC, false, v]]);
        });
        it("mat4 → uniformMatrix4fv", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(16);
            uploadScalarUniform(gl, info(gl.FLOAT_MAT4), v);
            expect(calls).toEqual([["uniformMatrix4fv", LOC, false, v]]);
        });
        it("mat4 array → uniformMatrix4fv (flat Nx16)", () => {
            const { gl, calls } = mockGl();
            const v = new Float32Array(32);
            uploadScalarUniform(gl, info(gl.FLOAT_MAT4, 2), v);
            expect(calls).toEqual([["uniformMatrix4fv", LOC, false, v]]);
        });
    });

    describe("uint / uvec", () => {
        it("uint scalar → uniform1ui", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.UNSIGNED_INT), 5);
            expect(calls).toEqual([["uniform1ui", LOC, 5]]);
        });
        it("uint array → uniform1uiv", () => {
            const { gl, calls } = mockGl();
            const v = new Uint32Array([1, 2]);
            uploadScalarUniform(gl, info(gl.UNSIGNED_INT, 2), v);
            expect(calls).toEqual([["uniform1uiv", LOC, v]]);
        });
        it("uvec2 scalar → uniform2ui", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.UNSIGNED_INT_VEC2), [1, 2]);
            expect(calls).toEqual([["uniform2ui", LOC, 1, 2]]);
        });
        it("uvec3 scalar → uniform3ui", () => {
            const { gl, calls } = mockGl();
            uploadScalarUniform(gl, info(gl.UNSIGNED_INT_VEC3), [1, 2, 3]);
            expect(calls).toEqual([["uniform3ui", LOC, 1, 2, 3]]);
        });
        it("uvec4 array → uniform4uiv", () => {
            const { gl, calls } = mockGl();
            const v = new Uint32Array(8);
            uploadScalarUniform(gl, info(gl.UNSIGNED_INT_VEC4, 2), v);
            expect(calls).toEqual([["uniform4uiv", LOC, v]]);
        });
    });

    describe("unknown type", () => {
        let warn: ReturnType<typeof vi.spyOn>;
        beforeEach(() => {
            warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        });
        afterEach(() => {
            warn.mockRestore();
        });

        it("warns once and skips", () => {
            const { gl, calls } = mockGl();
            // 0xdead is guaranteed not to collide with any uniform type
            uploadScalarUniform(gl, info(0xdead), 0);
            uploadScalarUniform(gl, info(0xdead), 0);
            expect(calls).toEqual([]);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toMatch(/Unsupported uniform type/);
        });
    });
});
