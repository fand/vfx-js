import { describe, expect, it, vi } from "vitest";
import type { GLContext } from "./context.js";
import { Texture } from "./texture.js";

function makeMockGl() {
    const noop = () => {};
    return {
        TEXTURE_2D: 0x0de1,
        TEXTURE0: 0x84c0,
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
        UNPACK_ALIGNMENT: 0x0cf5,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        createTexture: vi.fn(() => ({})),
        deleteTexture: noop,
        activeTexture: noop,
        bindTexture: noop,
        pixelStorei: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: noop,
    };
}

function makeCtx(gl: ReturnType<typeof makeMockGl>): GLContext {
    return {
        gl,
        addResource: noopFn,
        removeResource: noopFn,
    } as unknown as GLContext;
}

function noopFn() {}

function premultiplyArg(gl: ReturnType<typeof makeMockGl>): unknown {
    const call = gl.pixelStorei.mock.calls.find(
        ([pname]) => pname === gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    );
    return call?.[1];
}

describe("Texture alpha", () => {
    it("uploads straight alpha by default", () => {
        const gl = makeMockGl();
        const tex = new Texture(makeCtx(gl), {} as HTMLCanvasElement);
        tex.bind(0);
        expect(premultiplyArg(gl)).toBe(false);
    });

    it("uploads premultiplied alpha when premultiplyAlpha is set", () => {
        const gl = makeMockGl();
        const tex = new Texture(makeCtx(gl), {} as HTMLCanvasElement);
        tex.premultiplyAlpha = true;
        tex.bind(0);
        expect(premultiplyArg(gl)).toBe(true);
    });
});
