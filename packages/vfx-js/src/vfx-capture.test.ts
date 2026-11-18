import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { VFXCapture } from "./types";
import { VFX } from "./vfx";

type Pending = {
    source: unknown;
    onDispose?: () => void;
    signal?: AbortSignal;
    resolve: (capture: VFXCapture) => void;
    reject: (err: unknown) => void;
};

const pending: Pending[] = [];
const wrapped: unknown[] = [];
const players: { destroy: () => void }[] = [];
const instances: VFX[] = [];

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
        added = new Set<unknown>();
        // Like the player, register after an await.
        async addElement(element: unknown) {
            await Promise.resolve();
            this.added.add(element);
        }
        hasElement(element: unknown) {
            return this.added.has(element);
        }
        play() {}
        destroy = vi.fn();
        constructor() {
            players.push(this);
        }
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
            signal?: AbortSignal,
        ) {
            return new Promise<VFXCapture>((resolve, reject) => {
                pending.push({ source, onDispose, signal, resolve, reject });
            });
        }
    },
}));

const body = { appendChild: () => {} };
const html = {};

function createVFX() {
    const canvas = {
        style: { zIndex: "", setProperty: () => {} },
        remove() {},
    };
    vi.stubGlobal("document", {
        createElement: () => canvas,
        body,
        documentElement: html,
    });
    const vfx = new VFX();
    instances.push(vfx);
    return vfx;
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
        contains: () => false,
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
    for (const vfx of instances.splice(0)) {
        vfx.destroy();
    }
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

    test("rejects an element that addHTML is still wrapping", async () => {
        const vfx = createVFX();
        const el = element();
        const adding = vfx.addHTML(el, { shader: "rainbow" });
        await expect(vfx.capture(el)).rejects.toThrow("wrapped");
        expect(pending).toHaveLength(0);
        await adding;
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

    test("destroy() leaves the captures to the player", async () => {
        const vfx = createVFX();
        const result = vfx.capture(element());
        const capture = settle();
        await result;
        vfx.destroy();
        expect(capture.dispose).not.toHaveBeenCalled();
        expect(players[players.length - 1].destroy).toHaveBeenCalledOnce();
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

    test("destroy() aborts a pending capture so it can restore the element", async () => {
        const vfx = createVFX();
        const result = vfx.capture(element());
        vfx.destroy();
        expect(pending[0].signal?.aborted).toBe(true);
        pending[0].reject(new Error("aborted"));
        await expect(result).rejects.toThrow("destroyed");
    });
});

const image = () =>
    Object.assign(
        new (globalThis.HTMLImageElement as unknown as new () => object)(),
        element(),
        { complete: true },
    ) as unknown as HTMLElement;

describe("VFX.capture and add on one element", () => {
    test("add rejects a captured HTML element", async () => {
        const vfx = createVFX();
        const el = element();
        const capture = vfx.capture(el);
        settle();
        await capture;
        await expect(vfx.add(el, {})).rejects.toThrow("captured");
    });

    test("capture rejects an HTML element added with add", async () => {
        const vfx = createVFX();
        const el = element();
        await vfx.add(el, {});
        await expect(vfx.capture(el)).rejects.toThrow("add()");
        expect(pending).toHaveLength(0);
    });

    test("a media element can be added and captured without hide", async () => {
        const vfx = createVFX();
        const img = image();
        await vfx.add(img, {});
        const capture = vfx.capture(img);
        settle();
        await expect(capture).resolves.toBeDefined();

        const img2 = image();
        const capture2 = vfx.capture(img2);
        settle();
        await capture2;
        await expect(vfx.add(img2, {})).resolves.toBeUndefined();
    });

    test("a media element with hide cannot be both", async () => {
        const vfx = createVFX();
        const img = image();
        await vfx.add(img, {});
        await expect(vfx.capture(img, { hide: true })).rejects.toThrow("add()");

        const img2 = image();
        const capture = vfx.capture(img2, { hide: true });
        settle();
        await capture;
        await expect(vfx.add(img2, {})).rejects.toThrow("captured");
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

    test("has no rect for an element without layout", async () => {
        vi.stubGlobal("window", {
            matchMedia: () => ({ matches: true }),
        });
        const vfx = createVFX();
        const el = {
            style: { opacity: "" },
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            }),
            getClientRects: () => [],
        } as unknown as HTMLElement;
        const capture = await vfx.capture(el);
        expect(capture.rect).toBeNull();
    });
});

describe("VFX.capture across instances", () => {
    test("a second instance cannot capture the same element", async () => {
        const v1 = createVFX();
        const v2 = createVFX();
        const el = element();
        const first = v1.capture(el);
        await expect(v2.capture(el)).rejects.toThrow("another VFX instance");
        settle();
        const capture = await first;
        await expect(v2.capture(el)).rejects.toThrow("another VFX instance");
        expect(pending).toHaveLength(1);

        capture.dispose();
        const second = v2.capture(el);
        settle();
        await expect(second).resolves.toBeDefined();
    });

    test("addHTML and add reject an element another instance captured", async () => {
        const v1 = createVFX();
        const v2 = createVFX();
        const el = element();
        const capture = v1.capture(el);
        settle();
        await capture;
        await expect(v2.addHTML(el, {})).rejects.toThrow("captured");
        await expect(v2.add(el, {})).rejects.toThrow("captured");
        expect(wrapped).toEqual([]);
    });

    test("capture rejects an element another instance wrapped or added", async () => {
        const v1 = createVFX();
        const v2 = createVFX();
        const wrappedEl = element();
        await v1.addHTML(wrappedEl, {});
        await expect(v2.capture(wrappedEl)).rejects.toThrow("wrapped");

        const addedEl = element();
        await v1.add(addedEl, {});
        await expect(v2.capture(addedEl)).rejects.toThrow("add()");

        // A media element without hide is fine, like in one instance.
        const img = image();
        await v1.add(img, {});
        const capture = v2.capture(img);
        settle();
        await expect(capture).resolves.toBeDefined();
        expect(pending).toHaveLength(1);
    });

    test("a destroyed instance no longer owns its elements", async () => {
        const v1 = createVFX();
        const v2 = createVFX();
        const el = element();
        await v1.add(el, {});
        v1.destroy();
        const capture = v2.capture(el);
        settle();
        await expect(capture).resolves.toBeDefined();
    });
});

describe("VFX.capture while add is loading", () => {
    test("rejects an element whose add has not resolved", async () => {
        const vfx = createVFX();
        const el = element();
        const adding = vfx.add(el, {});
        await expect(vfx.capture(el, { hide: true })).rejects.toThrow("add()");
        await adding;
        expect(pending).toHaveLength(0);
    });

    test("another instance sees the pending add too", async () => {
        const v1 = createVFX();
        const v2 = createVFX();
        const el = element();
        const adding = v1.add(el, {});
        await expect(v2.capture(el)).rejects.toThrow("add()");
        await adding;
    });
});

describe("VFX.capture rejects unsafe roots", () => {
    test.each([
        ["<body>", () => body],
        ["<html>", () => html],
    ])("rejects %s", async (_, root) => {
        const vfx = createVFX();
        const el = Object.assign(root(), element());
        await expect(vfx.capture(el)).rejects.toThrow("<html>, <body>");
        expect(pending).toHaveLength(0);
    });

    test("rejects an element that contains a VFX canvas", async () => {
        const vfx = createVFX();
        const other = createVFX();
        const el = Object.assign(element(), {
            contains: (node: unknown) => node === other.canvas,
        });
        await expect(vfx.capture(el)).rejects.toThrow("VFX canvas");
        expect(pending).toHaveLength(0);
    });
});
