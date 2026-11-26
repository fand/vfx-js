// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Backend } from "./backend";

let pendingBackend: {
    resolve: (b: Backend) => void;
    reject: (err: unknown) => void;
};

vi.mock("./create-backend.js", () => ({
    createBackend: () =>
        new Promise<Backend>((resolve, reject) => {
            pendingBackend = { resolve, reject };
        }),
}));

import { getVFXOpts } from "./types";
import { VFXPlayer } from "./vfx-player";

const WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }";

function makeBackend(opts: { ready: () => boolean }) {
    const texture = () => ({
        source: null,
        wrapS: "clamp",
        wrapT: "clamp",
        minFilter: "linear",
        magFilter: "linear",
        premultiplyAlpha: false,
        needsUpdate: false,
        dispose: vi.fn(),
    });
    return {
        shaderLanguage: "wgsl",
        maxTextureSize: 4096,
        createTexture: vi.fn(texture),
        createProgram: vi.fn(() => ({ dispose: vi.fn() })),
        prepare: vi.fn(() => opts.ready()),
        setSize: vi.fn(),
        beginFrame: vi.fn(),
        endFrame: vi.fn(),
        clear: vi.fn(),
        draw: vi.fn(),
        dispose: vi.fn(),
    } as unknown as Backend & {
        draw: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
    };
}

function makeElement(): HTMLCanvasElement {
    const el = document.createElement("canvas");
    el.width = 100;
    el.height = 100;
    el.getBoundingClientRect = () =>
        ({
            left: 0,
            top: 0,
            right: 100,
            bottom: 100,
            width: 100,
            height: 100,
        }) as DOMRect;
    document.body.append(el);
    return el;
}

const players: VFXPlayer[] = [];

function makePlayer(): VFXPlayer {
    const player = new VFXPlayer(
        getVFXOpts({ backend: "webgpu", autoplay: false }),
        document.createElement("canvas"),
    );
    players.push(player);
    return player;
}

afterEach(() => {
    for (const p of players.splice(0)) {
        p.destroy();
    }
    document.body.innerHTML = "";
});

describe("VFXPlayer on an async backend", () => {
    test("add() waits for the device", async () => {
        const player = makePlayer();
        const el = makeElement();
        const added = player.addElement(el, { shader: [{ wgsl: WGSL }] });
        await Promise.resolve();
        expect(player.hasElement(el)).toBe(false);

        pendingBackend.resolve(makeBackend({ ready: () => true }));
        await added;
        expect(player.hasElement(el)).toBe(true);
        expect(el.style.opacity).toBe("0");
    });

    test("render() before the device is a no-op", () => {
        const player = makePlayer();
        expect(() => player.render()).not.toThrow();
    });

    test("add() rejects when the device request fails", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const player = makePlayer();
        const added = player.addElement(makeElement(), {
            shader: [{ wgsl: WGSL }],
        });
        pendingBackend.reject(new Error("[VFX-JS] no adapter"));
        await expect(added).rejects.toThrow("no adapter");
        error.mockRestore();
    });

    test("keeps the element visible until its pipelines are built", async () => {
        let ready = false;
        const backend = makeBackend({ ready: () => ready });
        const player = makePlayer();
        const el = makeElement();
        const added = player.addElement(el, { shader: [{ wgsl: WGSL }] });
        pendingBackend.resolve(backend);
        await added;
        expect(el.style.opacity).toBe("");

        player.render();
        expect(el.style.opacity).toBe("");
        expect(backend.draw).not.toHaveBeenCalled();

        ready = true;
        player.render();
        expect(el.style.opacity).toBe("0");
    });

    test("rejects shader presets and effects with a clear error", async () => {
        const player = makePlayer();
        pendingBackend.resolve(makeBackend({ ready: () => true }));
        await expect(
            player.addElement(makeElement(), { shader: "rainbow" }),
        ).rejects.toThrow(/\[VFX-JS\].*WebGPU/);
        await expect(
            player.addElement(makeElement(), { effect: {} }),
        ).rejects.toThrow(/\[VFX-JS\].*WebGPU/);
        await expect(
            player.addElement(makeElement(), { shader: [{ frag: "x" }] }),
        ).rejects.toThrow(/needs `wgsl`/);
    });

    test("destroy() before the device disposes it on arrival", async () => {
        const player = makePlayer();
        const backend = makeBackend({ ready: () => true });
        player.destroy();
        pendingBackend.resolve(backend);
        await Promise.resolve();
        await Promise.resolve();
        expect(backend.dispose).toHaveBeenCalled();
    });
});
