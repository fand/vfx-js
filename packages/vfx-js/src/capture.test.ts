import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type CaptureDeps, type CaptureDom, createCapture } from "./capture";
import { resolveTexture } from "./effect-host";
import type { Texture } from "./gl/texture";

class FakeElement {
    style = Object.assign(
        { opacity: "" },
        {
            setProperty(this: { opacity: string }, _: string, value: string) {
                this.opacity = value;
            },
        },
    );
    box = { left: 1, top: 2, width: 30, height: 40 };
    listeners: Record<string, () => void> = {};
    hasBox = true;
    parentNode: unknown = null;
    getBoundingClientRect() {
        return { ...this.box };
    }
    getClientRects() {
        return this.hasBox ? [this.box] : [];
    }
    addEventListener(type: string, fn: () => void) {
        this.listeners[type] = fn;
    }
}
class FakeImage extends FakeElement {
    decode = vi.fn(() => Promise.resolve());
}
class FakeVideo extends FakeElement {
    readyState = 4;
}
class FakeCanvas extends FakeElement {}
class FakeDiv extends FakeElement {}
class FakeOffscreen {
    constructor(
        public width: number,
        public height: number,
    ) {}
}

type FakeTexture = Texture & { dispose: ReturnType<typeof vi.fn> };

function fakeDeps(dom?: Partial<CaptureDom>) {
    const made: FakeTexture[] = [];
    const emptyTexture = { dispose: vi.fn() } as unknown as Texture;
    const createTexture = (source: unknown) => {
        const texture = {
            source,
            needsUpdate: false,
            dispose: vi.fn(),
        } as unknown as FakeTexture;
        made.push(texture);
        return texture;
    };
    const deps: CaptureDeps = {
        createTexture,
        // Like the player: re-upload the same canvas, replace on a new one.
        refreshTexture: (old, offscreen) => {
            if (old.source === offscreen) {
                old.needsUpdate = true;
                return old;
            }
            old.dispose();
            const texture = createTexture(offscreen);
            texture.premultiplyAlpha = old.premultiplyAlpha;
            return texture;
        },
        textureSize: (_, axis) => (axis === "w" ? 60 : 80),
        emptyTexture,
        maxTextureSize: 4096,
        stillZIndex: 41,
        dom,
    };
    return { deps, made, emptyTexture };
}

const asElement = (el: FakeElement) => el as unknown as HTMLElement;

beforeEach(() => {
    vi.stubGlobal("HTMLImageElement", FakeImage);
    vi.stubGlobal("HTMLVideoElement", FakeVideo);
    vi.stubGlobal("HTMLCanvasElement", FakeCanvas);
    vi.stubGlobal("OffscreenCanvas", FakeOffscreen);
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("createCapture: sources", () => {
    test("resolves after the image decodes", async () => {
        const { deps, made } = fakeDeps();
        const img = new FakeImage();
        let decoded!: () => void;
        img.decode.mockReturnValueOnce(
            new Promise<void>((resolve) => {
                decoded = resolve;
            }),
        );
        let done = false;
        const pending = createCapture(deps, asElement(img), {}).then((e) => {
            done = true;
            return e;
        });
        await Promise.resolve();
        expect(done).toBe(false);
        expect(made).toHaveLength(0);
        decoded();
        const { capture } = await pending;
        expect(made).toHaveLength(1);
        expect(made[0].source).toBe(img);
        expect(made[0].premultiplyAlpha).toBe(true);
        expect(resolveTexture(capture.texture)).toBe(made[0]);
        expect([capture.texture.width, capture.texture.height]).toEqual([
            60, 80,
        ]);
        expect(capture.rect).toEqual({ x: 1, y: 2, width: 30, height: 40 });
    });

    test("rejects when decode() rejects and restores the opacity", async () => {
        const { deps, made } = fakeDeps();
        const img = new FakeImage();
        img.style.opacity = "0.5";
        img.decode.mockRejectedValueOnce(new Error("broken"));
        const pending = createCapture(deps, asElement(img), { hide: true });
        expect(img.style.opacity).toBe("0");
        await expect(pending).rejects.toThrow("broken");
        expect(img.style.opacity).toBe("0.5");
        expect(made).toHaveLength(0);
    });

    test("waits for canplay when the video has no frame yet", async () => {
        const { deps, made } = fakeDeps();
        const video = new FakeVideo();
        video.readyState = 1;
        const pending = createCapture(deps, asElement(video), {});
        await Promise.resolve();
        expect(made).toHaveLength(0);
        video.listeners.canplay();
        await pending;
        expect(made[0].source).toBe(video);
    });
});

describe("createCapture: hide", () => {
    test.each([
        ["image", () => new FakeImage(), "0"],
        ["canvas", () => new FakeCanvas(), "0"],
        ["video", () => new FakeVideo(), "0.0001"],
    ])(
        "%s: hide sets and dispose() restores the opacity",
        async (_, make, hidden) => {
            const { deps } = fakeDeps();
            const el = make();
            el.style.opacity = "0.7";
            const { capture } = await createCapture(deps, asElement(el), {
                hide: true,
            });
            expect(el.style.opacity).toBe(hidden);
            capture.dispose();
            expect(el.style.opacity).toBe("0.7");
        },
    );

    test("leaves the opacity alone without hide", async () => {
        const { deps } = fakeDeps();
        const el = new FakeCanvas();
        el.style.opacity = "0.7";
        const { capture } = await createCapture(deps, asElement(el), {});
        expect(el.style.opacity).toBe("0.7");
        capture.dispose();
        expect(el.style.opacity).toBe("0.7");
    });
});

describe("createCapture: tick", () => {
    test.each([
        ["image", () => new FakeImage(), false],
        ["canvas", () => new FakeCanvas(), true],
        ["video", () => new FakeVideo(), true],
    ])(
        "%s: updates the position, and flags an upload: %s",
        async (_, make, everyFrame) => {
            const { deps, made } = fakeDeps();
            const el = make();
            const { capture, tick } = await createCapture(
                deps,
                asElement(el),
                {},
            );
            const rect = capture.rect;
            el.box = { left: 5, top: 6, width: 30, height: 40 };
            tick();
            expect(capture.rect).toBe(rect);
            expect([rect.x, rect.y]).toEqual([5, 6]);
            expect(made[0].needsUpdate).toBe(everyFrame);
        },
    );

    test("image size follows update(), not tick()", async () => {
        const { deps, made } = fakeDeps();
        const img = new FakeImage();
        const { capture, tick } = await createCapture(deps, asElement(img), {});
        img.box = { left: 1, top: 2, width: 50, height: 60 };
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([30, 40]);
        await capture.update();
        expect(img.decode).toHaveBeenCalledTimes(2);
        expect(made[0].needsUpdate).toBe(true);
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([50, 60]);
    });
});

describe("createCapture: dispose", () => {
    test("leaves a safe handle", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { deps, made, emptyTexture } = fakeDeps();
        const onDispose = vi.fn();
        const { capture, tick } = await createCapture(
            deps,
            asElement(new FakeCanvas()),
            {},
            onDispose,
        );
        capture.dispose();
        expect(made[0].dispose).toHaveBeenCalledOnce();
        expect(onDispose).toHaveBeenCalledOnce();

        expect(resolveTexture(capture.texture)).toBe(emptyTexture);
        expect(resolveTexture(capture.texture)).toBe(emptyTexture);
        expect(warn).toHaveBeenCalledOnce();
        expect([capture.texture.width, capture.texture.height]).toEqual([0, 0]);
        await expect(capture.update()).resolves.toBeUndefined();
        made[0].needsUpdate = false;
        tick();
        expect(made[0].needsUpdate).toBe(false);

        capture.dispose();
        expect(made[0].dispose).toHaveBeenCalledOnce();
        expect(onDispose).toHaveBeenCalledOnce();
    });

    test("texture.dispose() does nothing", async () => {
        const { deps, made } = fakeDeps();
        const { capture } = await createCapture(
            deps,
            asElement(new FakeCanvas()),
            {},
        );
        capture.texture.dispose();
        expect(made[0].dispose).not.toHaveBeenCalled();
        expect(resolveTexture(capture.texture)).toBe(made[0]);
    });
});

const offscreen = (width: number, height: number) =>
    new FakeOffscreen(width, height) as unknown as OffscreenCanvas;

type WrapOpts = Parameters<CaptureDom["wrapElement"]>[1];

function fakeHic() {
    const el = new FakeDiv();
    const parent = {};
    el.parentNode = parent;
    const wrapper = new FakeCanvas();
    wrapper.box = { left: 3, top: 4, width: 50, height: 20 };
    const first = offscreen(100, 40);
    let wrapOpts!: WrapOpts;
    let captured!: () => void;
    const dom = {
        supportsHtmlInCanvas: () => true,
        wrapElement: vi.fn(async (_: HTMLElement, opts: WrapOpts) => {
            wrapOpts = opts;
            el.parentNode = wrapper;
            return {
                canvas: wrapper as unknown as HTMLCanvasElement,
                initialCapture: first,
            };
        }),
        unwrapElement: vi.fn(() => {
            el.parentNode = parent;
        }),
        requestCapture: vi.fn(
            () =>
                new Promise<boolean>((resolve) => {
                    captured = () => resolve(true);
                }),
        ),
        releaseFirstCapture: vi.fn(),
    };
    return {
        el,
        wrapper,
        first,
        dom,
        wrapOpts: () => wrapOpts,
        capture: () => captured(),
    };
}

describe("createCapture: html-in-canvas", () => {
    test("wraps with keepDrawn and a still copy without hide", async () => {
        const hic = fakeHic();
        const { deps, made } = fakeDeps(hic.dom);
        const { capture } = await createCapture(deps, asElement(hic.el), {});
        expect(hic.wrapOpts()).toMatchObject({
            maxSize: 4096,
            keepDrawn: true,
            stillCover: { zIndex: 41 },
        });
        expect(hic.dom.releaseFirstCapture).toHaveBeenCalledWith(
            hic.wrapper,
            true,
        );
        expect(made[0].source).toBe(hic.first);
        expect(made[0].premultiplyAlpha).toBe(true);
        expect(resolveTexture(capture.texture)).toBe(made[0]);
        expect(capture.rect).toEqual({ x: 3, y: 4, width: 50, height: 20 });
    });

    test("wraps without keepDrawn or a still copy with hide", async () => {
        const hic = fakeHic();
        const { deps } = fakeDeps(hic.dom);
        await createCapture(deps, asElement(hic.el), { hide: true });
        expect(hic.wrapOpts().keepDrawn).toBe(false);
        expect(hic.wrapOpts().stillCover).toBeUndefined();
        expect(hic.dom.releaseFirstCapture).toHaveBeenCalledWith(
            hic.wrapper,
            false,
        );
        expect(hic.el.style.opacity).toBe("");
    });

    test("a capture goes through refreshTexture and sets the size", async () => {
        const hic = fakeHic();
        const { deps, made } = fakeDeps(hic.dom);
        const { capture, tick } = await createCapture(
            deps,
            asElement(hic.el),
            {},
        );
        const handle = capture.texture;

        hic.wrapper.box = { left: 3, top: 4, width: 70, height: 30 };
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([50, 20]);

        hic.wrapOpts().onCapture(hic.first);
        expect(made).toHaveLength(1);
        expect(made[0].needsUpdate).toBe(true);
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([70, 30]);

        hic.wrapOpts().onCapture(offscreen(140, 60));
        expect(made).toHaveLength(2);
        expect(made[0].dispose).toHaveBeenCalledOnce();
        expect(made[1].premultiplyAlpha).toBe(true);
        expect(capture.texture).toBe(handle);
        expect(resolveTexture(handle)).toBe(made[1]);
    });

    test("update() resolves after requestCapture", async () => {
        const hic = fakeHic();
        const { deps } = fakeDeps(hic.dom);
        const { capture } = await createCapture(deps, asElement(hic.el), {});
        let done = false;
        const updated = capture.update().then(() => {
            done = true;
        });
        expect(hic.dom.requestCapture).toHaveBeenCalledWith(hic.wrapper);
        await Promise.resolve();
        expect(done).toBe(false);
        hic.capture();
        await updated;
        expect(done).toBe(true);
    });

    test("dispose() unwraps", async () => {
        const hic = fakeHic();
        const { deps, made } = fakeDeps(hic.dom);
        const { capture } = await createCapture(deps, asElement(hic.el), {});
        capture.dispose();
        expect(hic.dom.unwrapElement).toHaveBeenCalledWith(hic.wrapper, hic.el);
        expect(made[0].dispose).toHaveBeenCalledOnce();
    });

    test("rejects an element without a box before wrapping", async () => {
        const hic = fakeHic();
        hic.el.hasBox = false;
        const { deps } = fakeDeps(hic.dom);
        await expect(
            createCapture(deps, asElement(hic.el), {}),
        ).rejects.toThrow();
        expect(hic.dom.wrapElement).not.toHaveBeenCalled();
    });

    test("unwraps when the capture setup fails after the wrap", async () => {
        const hic = fakeHic();
        hic.dom.wrapElement.mockImplementationOnce(async () => {
            hic.el.parentNode = hic.wrapper;
            throw new Error("no context");
        });
        const { deps, made } = fakeDeps(hic.dom);
        await expect(
            createCapture(deps, asElement(hic.el), {}),
        ).rejects.toThrow("no context");
        expect(hic.dom.unwrapElement).toHaveBeenCalledWith(hic.wrapper, hic.el);
        expect(made).toHaveLength(0);
    });

    test("does not unwrap when the wrap fails before moving the element", async () => {
        const hic = fakeHic();
        hic.dom.wrapElement.mockRejectedValueOnce(new Error("early"));
        const { deps } = fakeDeps(hic.dom);
        await expect(
            createCapture(deps, asElement(hic.el), {}),
        ).rejects.toThrow("early");
        expect(hic.dom.unwrapElement).not.toHaveBeenCalled();
    });

    test("resize() does nothing", async () => {
        const hic = fakeHic();
        const { deps } = fakeDeps(hic.dom);
        const { resize } = await createCapture(deps, asElement(hic.el), {});
        hic.wrapper.box = { left: 0, top: 0, width: 1, height: 1 };
        resize();
        expect(hic.dom.requestCapture).not.toHaveBeenCalled();
    });
});

function fakeSnapshot() {
    const el = new FakeDiv();
    el.style.opacity = "0.5";
    let size: [number, number] = [60, 80];
    const dom = {
        supportsHtmlInCanvas: () => false,
        dom2canvas: vi.fn(
            async (
                _el: HTMLElement,
                _opacity: number,
                old?: OffscreenCanvas,
                _maxSize?: number,
            ) =>
                old && old.width === size[0] && old.height === size[1]
                    ? old
                    : offscreen(...size),
        ),
    };
    return {
        el,
        dom,
        setSize: (w: number, h: number) => {
            size = [w, h];
        },
    };
}

describe("createCapture: snapshot", () => {
    test("snapshots with the original opacity, then hides", async () => {
        const snap = fakeSnapshot();
        const { deps, made } = fakeDeps(snap.dom);
        const { capture } = await createCapture(deps, asElement(snap.el), {
            hide: true,
        });
        expect(snap.dom.dom2canvas).toHaveBeenCalledWith(
            snap.el,
            0.5,
            undefined,
            4096,
        );
        expect(made[0].source).toBeInstanceOf(FakeOffscreen);
        expect(made[0].premultiplyAlpha).toBe(true);
        expect(snap.el.style.opacity).toBe("0");
        expect(capture.rect).toEqual({ x: 1, y: 2, width: 30, height: 40 });
        capture.dispose();
        expect(snap.el.style.opacity).toBe("0.5");
    });

    test("rejects an empty first snapshot and leaves the element", async () => {
        const snap = fakeSnapshot();
        snap.setSize(0, 0);
        const { deps, made } = fakeDeps(snap.dom);
        await expect(
            createCapture(deps, asElement(snap.el), { hide: true }),
        ).rejects.toThrow();
        expect(snap.el.style.opacity).toBe("0.5");
        expect(made).toHaveLength(0);
    });

    test("rejects an element without a box before the snapshot", async () => {
        const snap = fakeSnapshot();
        snap.el.hasBox = false;
        const { deps } = fakeDeps(snap.dom);
        await expect(
            createCapture(deps, asElement(snap.el), {}),
        ).rejects.toThrow();
        expect(snap.dom.dom2canvas).not.toHaveBeenCalled();
    });

    test("update() re-runs dom2canvas and goes through refreshTexture", async () => {
        const snap = fakeSnapshot();
        const { deps, made } = fakeDeps(snap.dom);
        const { capture, tick } = await createCapture(
            deps,
            asElement(snap.el),
            {},
        );
        const first = made[0].source;

        await capture.update();
        expect(snap.dom.dom2canvas).toHaveBeenLastCalledWith(
            snap.el,
            0.5,
            first,
            4096,
        );
        expect(made).toHaveLength(1);
        expect(made[0].needsUpdate).toBe(true);

        snap.setSize(120, 160);
        snap.el.box = { left: 1, top: 2, width: 60, height: 80 };
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([30, 40]);
        await capture.update();
        expect(made).toHaveLength(2);
        expect(made[0].dispose).toHaveBeenCalledOnce();
        expect(resolveTexture(capture.texture)).toBe(made[1]);
        tick();
        expect([capture.rect.width, capture.rect.height]).toEqual([60, 80]);
    });

    test("update() keeps the texture when the snapshot is empty", async () => {
        const snap = fakeSnapshot();
        const { deps, made } = fakeDeps(snap.dom);
        const { capture } = await createCapture(deps, asElement(snap.el), {});
        snap.setSize(0, 0);
        await capture.update();
        expect(made).toHaveLength(1);
        expect(made[0].dispose).not.toHaveBeenCalled();
        expect(resolveTexture(capture.texture)).toBe(made[0]);
    });

    test("runs one snapshot at a time", async () => {
        const snap = fakeSnapshot();
        const { deps } = fakeDeps(snap.dom);
        const { capture } = await createCapture(deps, asElement(snap.el), {});
        await Promise.all([capture.update(), capture.update()]);
        expect(snap.dom.dom2canvas).toHaveBeenCalledTimes(2);
    });

    test("resize() snapshots again only when the size changed", async () => {
        const snap = fakeSnapshot();
        const { deps } = fakeDeps(snap.dom);
        const { capture, resize } = await createCapture(
            deps,
            asElement(snap.el),
            {},
        );
        resize();
        expect(snap.dom.dom2canvas).toHaveBeenCalledTimes(1);

        snap.el.box = { left: 1, top: 2, width: 31, height: 40 };
        resize();
        expect(snap.dom.dom2canvas).toHaveBeenCalledTimes(2);
        await capture.update();

        snap.el.box = { left: 1, top: 2, width: 32, height: 40 };
        capture.dispose();
        resize();
        expect(snap.dom.dom2canvas).toHaveBeenCalledTimes(2);
    });
});
