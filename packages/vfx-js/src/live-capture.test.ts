import { describe, expect, test, vi } from "vitest";
import { resolveTexture } from "./effect-host";
import type { Texture } from "./gl/texture";
import {
    captureLive,
    createLiveTexture,
    type LiveTexture,
} from "./live-capture";

type FakeTexture = Texture & { offscreen: OffscreenCanvas; uploads: number };

const offscreen = (width: number, height: number) =>
    ({ width, height }) as OffscreenCanvas;

function fakeLiveTexture() {
    const made: FakeTexture[] = [];
    const make = (source: OffscreenCanvas) => {
        const texture = {
            offscreen: source,
            uploads: 1,
            dispose: vi.fn(),
        } as unknown as FakeTexture;
        made.push(texture);
        return texture;
    };
    const live = createLiveTexture(
        make,
        (texture, source) => {
            const old = texture as FakeTexture;
            if (old.offscreen === source) {
                old.uploads++;
                return old;
            }
            old.dispose();
            return make(source);
        },
        (texture, axis) =>
            axis === "w"
                ? (texture as FakeTexture).offscreen.width
                : (texture as FakeTexture).offscreen.height,
    );
    return { live, made };
}

describe("createLiveTexture", () => {
    test("is null until the first capture", () => {
        const { live } = fakeLiveTexture();
        expect(live.texture).toBeNull();
        live.update(offscreen(10, 10));
        expect(live.texture).not.toBeNull();
    });

    test("re-uploads the same capture and swaps the texture on resize", () => {
        const { live, made } = fakeLiveTexture();
        const small = offscreen(10, 10);
        live.update(small);
        live.update(small);
        const handle = live.texture;
        expect(made).toHaveLength(1);
        expect(made[0].uploads).toBe(2);
        live.update(offscreen(20, 30));
        expect(made).toHaveLength(2);
        expect(made[0].dispose).toHaveBeenCalledOnce();
        // The handle stays the same and reads the new texture.
        expect(live.texture).toBe(handle);
        expect(resolveTexture(handle as never)).toBe(made[1]);
        expect([handle?.width, handle?.height]).toEqual([20, 30]);
    });

    test("does nothing after dispose", () => {
        const { live, made } = fakeLiveTexture();
        live.update(offscreen(10, 10));
        live.dispose();
        expect(made[0].dispose).toHaveBeenCalledOnce();
        live.update(offscreen(10, 10));
        expect(made).toHaveLength(1);
        expect(live.texture).toBeNull();
    });
});

describe("captureLive", () => {
    const canvas = { width: 1, height: 1, getContext: () => null };

    function setup() {
        let first: (offscreen: OffscreenCanvas) => void = () => {};
        let onCapture: (offscreen: OffscreenCanvas) => void = () => {};
        const capture = {
            setupCapture: vi.fn(
                (
                    _canvas: HTMLCanvasElement,
                    opts: { onCapture: (offscreen: OffscreenCanvas) => void },
                ) => {
                    onCapture = opts.onCapture;
                    return new Promise<OffscreenCanvas>((resolve) => {
                        first = resolve;
                    });
                },
            ),
            teardownCapture: vi.fn(),
        };
        const live: LiveTexture & { updates: OffscreenCanvas[] } = {
            texture: null,
            updates: [],
            update(source) {
                this.updates.push(source);
            },
            dispose: vi.fn(),
        };
        const handle = captureLive(
            canvas as unknown as HTMLCanvasElement,
            live,
            4096,
            capture as never,
        );
        return {
            handle,
            live,
            capture,
            first: (source: OffscreenCanvas) => first(source),
            paint: (source: OffscreenCanvas) => onCapture(source),
        };
    }

    test("passes the first capture and later ones to the texture", async () => {
        const { live, first, paint } = setup();
        const a = offscreen(10, 10);
        const b = offscreen(10, 10);
        first(a);
        await Promise.resolve();
        paint(b);
        expect(live.updates).toEqual([a, b]);
    });

    test("dispose before the first capture drops it", async () => {
        const { handle, live, capture, first } = setup();
        handle.dispose();
        first(offscreen(10, 10));
        await Promise.resolve();
        expect(live.updates).toEqual([]);
        expect(capture.teardownCapture).toHaveBeenCalledOnce();
        expect(live.dispose).toHaveBeenCalledOnce();
    });

    test("dispose runs once", () => {
        const { handle, live, capture } = setup();
        handle.dispose();
        handle.dispose();
        expect(capture.teardownCapture).toHaveBeenCalledOnce();
        expect(live.dispose).toHaveBeenCalledOnce();
    });
});
