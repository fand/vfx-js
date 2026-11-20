import { describe, expect, it, vi } from "vitest";
import { GLContext } from "./context.js";

/** A canvas whose WebGL2 context records the extensions asked for, and can fire lost / restored events. */
function makeCanvas() {
    const asked: string[] = [];
    const listeners = new Map<string, (e: Event) => void>();
    const gl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        getExtension: vi.fn((name: string) => {
            asked.push(name);
            return {};
        }),
        getParameter: () => 4096,
    };
    const canvas = {
        getContext: () => gl,
        addEventListener: (type: string, cb: (e: Event) => void) => {
            listeners.set(type, cb);
        },
    } as unknown as HTMLCanvasElement;
    const fire = (type: string) =>
        listeners.get(type)?.({ preventDefault() {} } as Event);
    return { canvas, asked, fire };
}

describe("GLContext", () => {
    it("enables float linear filtering again on a restored context", () => {
        const { canvas, asked, fire } = makeCanvas();
        const ctx = new GLContext(canvas);
        expect(ctx.floatLinearFilter).toBe(true);
        expect(asked).toContain("OES_texture_float_linear");

        fire("webglcontextlost");
        expect(ctx.isContextLost).toBe(true);
        asked.length = 0;
        ctx.floatLinearFilter = false;
        const restored = vi.fn();
        ctx.onContextRestored(restored);
        fire("webglcontextrestored");

        // a restored context is a fresh one: every extension is asked for again
        expect(asked).toEqual(
            expect.arrayContaining([
                "EXT_color_buffer_float",
                "EXT_color_buffer_half_float",
                "EXT_float_blend",
                "OES_texture_float_linear",
            ]),
        );
        expect(ctx.floatLinearFilter).toBe(true);
        expect(ctx.isContextLost).toBe(false);
        expect(restored).toHaveBeenCalledTimes(1);
    });
});
