import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type CaptureDeps, createCapture } from "./capture";
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
    getBoundingClientRect() {
        return { ...this.box };
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

type FakeTexture = Texture & { dispose: ReturnType<typeof vi.fn> };

function fakeDeps() {
    const made: FakeTexture[] = [];
    const emptyTexture = { dispose: vi.fn() } as unknown as Texture;
    const deps: CaptureDeps = {
        createTexture: (source) => {
            const texture = {
                source,
                needsUpdate: false,
                dispose: vi.fn(),
            } as unknown as FakeTexture;
            made.push(texture);
            return texture;
        },
        textureSize: (_, axis) => (axis === "w" ? 60 : 80),
        emptyTexture,
    };
    return { deps, made, emptyTexture };
}

const asElement = (el: FakeElement) => el as unknown as HTMLElement;

beforeEach(() => {
    vi.stubGlobal("HTMLImageElement", FakeImage);
    vi.stubGlobal("HTMLVideoElement", FakeVideo);
    vi.stubGlobal("HTMLCanvasElement", FakeCanvas);
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

    test("rejects other elements for now", async () => {
        const { deps } = fakeDeps();
        await expect(
            createCapture(deps, asElement(new FakeDiv()), {}),
        ).rejects.toThrow();
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
