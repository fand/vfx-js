import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { VFXCapture } from "./types";
import { VFX } from "./vfx";

type Pending = {
    source: unknown;
    onDispose?: () => void;
    resolve: (capture: VFXCapture) => void;
    reject: (err: unknown) => void;
};

const pending: Pending[] = [];
const wrapped: unknown[] = [];

vi.mock("./webgl-support.js", () => ({ isWebGLAvailable: () => true }));
vi.mock("./html-in-canvas-support.js", () => ({
    supportsHtmlInCanvas: () => true,
}));
vi.mock("./html-in-canvas.js", () => ({
    wrapElement: async (element: unknown) => {
        wrapped.push(element);
        return { canvas: { element }, initialCapture: {} };
    },
    unwrapElement: () => {},
    releaseFirstCapture: () => {},
    requestCapture: () => undefined,
    lockCanvasSize: () => () => {},
}));
vi.mock("./vfx-player.js", () => ({
    VFXPlayer: class {
        maxTextureSize = 4096;
        play() {}
        destroy() {}
        addElement() {}
        isFrozen() {
            return false;
        }
        emptyTexture() {
            return { __brand: "EffectTexture", width: 0, height: 0 };
        }
        addCapture(
            source: unknown,
            _opts: unknown,
            _z: number,
            onDispose?: () => void,
        ) {
            return new Promise<VFXCapture>((resolve, reject) => {
                pending.push({ source, onDispose, resolve, reject });
            });
        }
    },
}));

function createVFX() {
    const canvas = {
        style: { zIndex: "", setProperty: () => {} },
        remove() {},
    };
    vi.stubGlobal("document", {
        createElement: () => canvas,
        body: { appendChild: () => {} },
    });
    return new VFX();
}

function fakeCapture(entry: Pending) {
    const capture = {
        texture: {},
        rect: {},
        update: () => Promise.resolve(),
        dispose: vi.fn(() => entry.onDispose?.()),
    } as unknown as VFXCapture & { dispose: ReturnType<typeof vi.fn> };
    return capture;
}

// Resolve the last pending addCapture call.
function settle() {
    const entry = pending[pending.length - 1];
    const capture = fakeCapture(entry);
    entry.resolve(capture);
    return capture;
}

const element = () =>
    ({
        style: { opacity: "" },
        getBoundingClientRect: () => ({
            left: 1,
            top: 2,
            width: 30,
            height: 40,
        }),
    }) as unknown as HTMLElement;

beforeEach(() => {
    vi.stubGlobal("window", {
        matchMedia: () => ({ matches: false }),
    });
    for (const name of [
        "HTMLImageElement",
        "HTMLVideoElement",
        "HTMLCanvasElement",
    ]) {
        vi.stubGlobal(name, class {});
    }
});
afterEach(() => {
    vi.unstubAllGlobals();
    pending.length = 0;
    wrapped.length = 0;
});

describe("VFX.capture", () => {
    test("rejects a second capture of the same element", async () => {
        const vfx = createVFX();
        const el = element();
        const first = vfx.capture(el);
        await expect(vfx.capture(el)).rejects.toThrow("already captured");
        settle();
        await first;
        await expect(vfx.capture(el)).rejects.toThrow("already captured");
        expect(pending).toHaveLength(1);
    });

    test("allows a new capture after dispose and after a failure", async () => {
        const vfx = createVFX();
        const el = element();
        const first = vfx.capture(el);
        pending[0].reject(new Error("broken"));
        await expect(first).rejects.toThrow("broken");

        const second = vfx.capture(el);
        settle();
        (await second).dispose();

        const third = vfx.capture(el);
        settle();
        await expect(third).resolves.toBeDefined();
    });

    test("rejects an element that addHTML wrapped", async () => {
        const vfx = createVFX();
        const el = element();
        await vfx.addHTML(el, { shader: "rainbow" });
        await expect(vfx.capture(el)).rejects.toThrow("wrapped");
        expect(pending).toHaveLength(0);
    });

    test("addHTML rejects a captured element, pending or not", async () => {
        const vfx = createVFX();
        const el = element();
        const capture = vfx.capture(el);
        await expect(vfx.addHTML(el, {})).rejects.toThrow("captured");
        settle();
        await capture;
        await expect(vfx.addHTML(el, {})).rejects.toThrow("captured");
        expect(wrapped).toEqual([]);
    });

    test("destroy() disposes captures", async () => {
        const vfx = createVFX();
        const a = vfx.capture(element());
        const captureA = settle();
        await a;
        const b = vfx.capture(element());
        const captureB = settle();
        (await b).dispose();
        vfx.destroy();
        expect(captureA.dispose).toHaveBeenCalledOnce();
        expect(captureB.dispose).toHaveBeenCalledOnce();
    });

    test("destroy() while pending disposes the capture and rejects", async () => {
        const vfx = createVFX();
        const result = vfx.capture(element());
        vfx.destroy();
        const capture = settle();
        await expect(result).rejects.toThrow("destroyed");
        expect(capture.dispose).toHaveBeenCalledOnce();
        await expect(vfx.capture(element())).rejects.toThrow("destroyed");
    });
});

describe("VFX.capture with reduced motion", () => {
    test("leaves the element alone", async () => {
        vi.stubGlobal("window", {
            matchMedia: () => ({ matches: true }),
        });
        const vfx = createVFX();
        const el = element();
        const capture = await vfx.capture(el, { hide: true });
        expect(pending).toHaveLength(0);
        expect(el.style.opacity).toBe("");
        expect([capture.texture.width, capture.texture.height]).toEqual([0, 0]);
        expect(capture.rect).toEqual({ x: 1, y: 2, width: 30, height: 40 });
        await expect(capture.update()).resolves.toBeUndefined();
        capture.dispose();
        // Not tracked, so a second capture works too.
        await expect(vfx.capture(el)).resolves.toBeDefined();
    });
});
