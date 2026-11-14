import { describe, expect, it, vi } from "vitest";

vi.mock("./gl/pass.js", () => ({
    Pass: class {
        blend: string;
        constructor(...args: unknown[]) {
            this.blend = args[4] as string;
        }
    },
}));

import type { GLContext } from "./gl/context.js";
import { createPassMaterial } from "./render-target.js";

const ctx = {} as GLContext;
const fragmentShader = "out vec4 outColor; void main() { outColor = vec4(1); }";

describe("createPassMaterial", () => {
    it("blends a pass to the screen as premultiplied alpha", () => {
        const pass = createPassMaterial(ctx, { fragmentShader, uniforms: {} });
        expect(pass.blend).toBe("premultiplied");
    });

    it("does not blend a pass into a buffer", () => {
        const pass = createPassMaterial(ctx, {
            fragmentShader,
            uniforms: {},
            renderingToBuffer: true,
        });
        expect(pass.blend).toBe("none");
    });
});
