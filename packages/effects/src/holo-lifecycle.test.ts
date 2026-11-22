// HoloEffect's lifecycle against a fake EffectContext: ready, dispose / init again, a restored context, the
// transparent emboss ground's define, outputRect, the element readback, and the print while emboss.print loads.
import type { EffectContext, EffectDims } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadedMaterial } from "./_holo/materials/registry.js";
import { HoloEffect } from "./holo.js";

type Uniforms = Record<string, unknown>;
type Draw = { frag: string; target?: unknown; uniforms?: Uniforms };

/** 2D canvases: record what is put on them. */
const puts: { w: number; h: number; data: Uint8ClampedArray }[] = [];

beforeEach(() => {
    puts.length = 0;
    vi.stubGlobal(
        "ImageData",
        class {
            constructor(
                public data: Uint8ClampedArray,
                public width: number,
                public height: number,
            ) {}
        },
    );
    vi.stubGlobal(
        "OffscreenCanvas",
        class {
            constructor(
                public width: number,
                public height: number,
            ) {}
            getContext() {
                return {
                    putImageData: (img: {
                        data: Uint8ClampedArray;
                        width: number;
                        height: number;
                    }) =>
                        puts.push({
                            w: img.width,
                            h: img.height,
                            data: img.data,
                        }),
                    drawImage() {},
                    getImageData: (
                        _x: number,
                        _y: number,
                        w: number,
                        h: number,
                    ) => ({
                        data: new Uint8ClampedArray(w * h * 4),
                    }),
                };
            }
        },
    );
    // a worker that never answers: the logo and paper builds stay pending (no kernels on the test's thread)
    vi.stubGlobal(
        "Worker",
        class {
            postMessage() {}
            terminate() {}
        },
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    // images that never finish loading
    vi.stubGlobal(
        "Image",
        class {
            crossOrigin = "";
            src = "";
            decode() {
                return new Promise(() => {});
            }
        },
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * A fake EffectContext. Every draw, clear and blit fails if it touches a disposed target or texture, and
 * `ctx.readPixels` resolves to `pixels` (given bottom-up and premultiplied, flipped for `flipY`).
 */
function makeCtx(o: { w?: number; h?: number; pixels?: Uint8Array } = {}) {
    const w = o.w ?? 40;
    const h = o.h ?? 60;
    const disposed = new Set<unknown>();
    const draws: Draw[] = [];
    let restore: (() => void) | null = null;
    const resource = (rw: number, rh: number) => {
        const r = {
            width: rw,
            height: rh,
            dispose() {
                disposed.add(r);
            },
            update() {},
        };
        return r;
    };
    const check = (what: string, v: unknown) => {
        if (disposed.has(v)) {
            throw new Error(`${what} uses a disposed resource`);
        }
    };
    const gl = {
        RENDERER: 0x1f01,
        getExtension: () => null,
        getParameter: () => "test renderer",
    };
    const readPixels = vi.fn(
        (t: { width: number; height: number }, opts?: { flipY?: boolean }) => {
            const n = t.width * t.height * 4;
            const px = o.pixels ?? new Uint8Array(n).fill(255);
            if (!opts?.flipY) {
                return Promise.resolve(px);
            }
            const row = t.width * 4;
            const out = new Uint8Array(n);
            for (let y = 0; y < t.height; y++) {
                out.set(
                    px.subarray((t.height - 1 - y) * row, (t.height - y) * row),
                    y * row,
                );
            }
            return Promise.resolve(out);
        },
    );
    const dims = { element: [w, h], elementPixel: [w, h] };
    const ctx = {
        gl,
        src: resource(w, h),
        target: null,
        time: 0,
        deltaTime: 1 / 60,
        pixelRatio: 1,
        mouse: [0, 0],
        mouseViewport: [0, 0],
        dims,
        readPixels,
        draw(d: Draw) {
            check("draw target", d.target);
            for (const v of Object.values(d.uniforms ?? {})) {
                check("draw uniform", v);
            }
            draws.push(d);
        },
        clear(t: unknown) {
            check("clear", t);
        },
        blit(a: unknown, b: unknown) {
            check("blit", a);
            check("blit", b);
        },
        createRenderTarget(opts: { size?: readonly [number, number] }) {
            return resource(opts.size?.[0] ?? w, opts.size?.[1] ?? h);
        },
        wrapTexture(src: { width?: number; height?: number }) {
            return resource(src.width ?? 1, src.height ?? 1);
        },
        onContextRestored(cb: () => void) {
            restore = cb;
            return () => {
                restore = null;
            };
        },
    };
    return {
        ctx: ctx as unknown as EffectContext,
        draws,
        readPixels,
        restore: () => restore?.(),
        hasRestoreListener: () => restore !== null,
    };
}

/** One frame: update then render. */
function frame(fx: HoloEffect, ctx: EffectContext) {
    fx.update?.(ctx);
    fx.render?.(ctx);
}

// the material pass: the frag with a MATERIAL_<id> define
const isMaterial = (d: Draw) => /#define MATERIAL_[A-Z]+ /.test(d.frag);
const lastMaterial = (draws: Draw[]) => draws.filter(isMaterial).at(-1);
/** uPrintK.x of the last material draw: whether the paper has a print. */
const printOn = (draws: Draw[]) =>
    (lastMaterial(draws)?.uniforms?.uPrintK as number[] | undefined)?.[0];

/** Lets the readbacks (promises) resolve. */
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Resolves to "ready" or "pending" after a tick. */
const settled = (p: Promise<void>) =>
    Promise.race([
        p.then(() => "ready"),
        new Promise((r) => setTimeout(() => r("pending"), 20)),
    ]);

describe("HoloEffect lifecycle", () => {
    test("ready resolves after a frame is drawn", async () => {
        const { ctx, draws } = makeCtx();
        const fx = new HoloEffect();
        await fx.init?.(ctx);
        const ready = fx.ready;
        expect(await settled(ready)).toBe("pending");
        frame(fx, ctx);
        expect(await settled(ready)).toBe("ready");
        expect(draws.some(isMaterial)).toBe(true);
    });

    test("dispose resolves a pending ready, and init again draws with fresh resources", async () => {
        const { ctx, draws, readPixels, hasRestoreListener } = makeCtx();
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: { "emboss.logo": "element" },
            },
        });
        await fx.init?.(ctx);
        frame(fx, ctx);
        const ready = fx.ready; // emboss: the paper build is still pending
        expect(await settled(ready)).toBe("pending");
        fx.dispose?.();
        expect(await settled(ready)).toBe("ready");
        expect(hasRestoreListener()).toBe(false);

        draws.length = 0;
        await fx.init?.(ctx);
        expect(() => frame(fx, ctx)).not.toThrow(); // nothing disposed is drawn with
        expect(draws.some(isMaterial)).toBe(true);
        expect(readPixels).toHaveBeenCalledTimes(2); // the element is read again
    });

    test("a restored context uploads the tables again", async () => {
        const { ctx, draws, restore } = makeCtx();
        const fx = new HoloEffect();
        await fx.init?.(ctx);
        frame(fx, ctx);
        const decodes = () =>
            draws.filter((d) => d.uniforms && "uBytes" in d.uniforms).length;
        const first = decodes();
        expect(first).toBeGreaterThan(0);
        frame(fx, ctx);
        expect(decodes()).toBe(first); // uploaded once
        restore();
        frame(fx, ctx);
        expect(decodes()).toBeGreaterThan(first);
    });

    test("outputRect: the element's rect flat, grown in 3D", async () => {
        const dims = { elementPixel: [100, 200] } as unknown as EffectDims;
        expect(
            new HoloEffect({ flat: true }).outputRect?.(dims),
        ).toBeUndefined();
        const [x, y, w, h] = new HoloEffect().outputRect?.(dims) ?? [];
        expect(x).toBeLessThan(0);
        expect(y).toBeLessThan(0);
        expect(w).toBe(100 - 2 * (x as number));
        expect(h).toBe(200 - 2 * (y as number));
    });
});

describe("HoloEffect emboss with the element as the logo", () => {
    const element = {
        material: "emboss" as const,
        settings: { "emboss.logo": "element" },
    };

    test("the transparent ground's define follows emboss.paperColour", async () => {
        const { ctx, draws } = makeCtx();
        const fx = new HoloEffect({ holo: element });
        await fx.init?.(ctx);
        frame(fx, ctx);
        expect(lastMaterial(draws)?.frag).toMatch(/#define HOLO_CLEAR_PAPER\b/);
        fx.setParams({
            holo: [element, { settings: { "emboss.paperColour": "#ffffff" } }],
        });
        frame(fx, ctx);
        expect(lastMaterial(draws)?.frag).not.toMatch(
            /#define HOLO_CLEAR_PAPER\b/,
        );
    });

    test("the readback is read top-down and un-premultiplied", async () => {
        // 2 × 2, bottom-up: the bottom row is red at half alpha (premultiplied), the top row is clear
        const pixels = new Uint8Array([
            128, 0, 0, 128, 128, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0,
        ]);
        const { ctx, readPixels } = makeCtx({ w: 2, h: 2, pixels });
        const fx = new HoloEffect({ holo: element });
        await fx.init?.(ctx);
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(1);
        expect(readPixels.mock.calls[0][1]).toEqual({ flipY: true });
        await tick();
        const read = puts.find((p) => p.w === 2 && p.h === 2);
        expect(read).toBeDefined();
        // canvas row 0 is the top: clear; row 1 is the red, straight alpha
        expect(Array.from(read?.data.slice(0, 8) ?? [])).toEqual([
            0, 0, 0, 0, 0, 0, 0, 0,
        ]);
        expect(Array.from(read?.data.slice(8, 12) ?? [])).toEqual([
            255, 0, 0, 128,
        ]);
    });

    test("the element is read once at a time, again for a new holo, not for other params", async () => {
        const { ctx, readPixels } = makeCtx();
        const fx = new HoloEffect({ holo: element });
        await fx.init?.(ctx);
        frame(fx, ctx);
        frame(fx, ctx); // the first read is still on its way
        expect(readPixels).toHaveBeenCalledTimes(1);
        await tick();
        fx.setParams({ ink: 0.5, flat: true });
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(1);
        fx.setParams({ holo: [element, { exposure: 1 }] });
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(2);
    });

    test("an <img> given as emboss.print before it loads is printed once it has loaded", async () => {
        let loaded = () => {};
        class FakeImg {
            complete = false;
            naturalWidth = 0;
            naturalHeight = 0;
            decode() {
                return new Promise<void>((r) => {
                    loaded = () => {
                        this.complete = true;
                        this.naturalWidth = 300;
                        this.naturalHeight = 200;
                        r();
                    };
                });
            }
        }
        vi.stubGlobal("HTMLImageElement", FakeImg);
        const img = new FakeImg();
        const { ctx, draws } = makeCtx();
        const wrapped: unknown[] = [];
        const wrap = ctx.wrapTexture.bind(ctx);
        ctx.wrapTexture = ((src: unknown, o?: unknown) => {
            wrapped.push(src);
            return wrap(src as never, o as never);
        }) as typeof ctx.wrapTexture;
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: {
                    "emboss.print": img as unknown as HTMLImageElement,
                },
            },
        });
        await fx.init?.(ctx);
        frame(fx, ctx);
        expect(printOn(draws)).toBe(0); // loading: no print, and not wrapped at 0 × 0
        expect(wrapped).not.toContain(img);
        loaded();
        await Promise.resolve();
        frame(fx, ctx);
        expect(printOn(draws)).toBe(1);
        expect(wrapped).toContain(img);
    });

    test("no print while emboss.print loads; the element is the print otherwise", async () => {
        const loading = makeCtx();
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: {
                    "emboss.logo": "element",
                    "emboss.print": "/print.png",
                },
            },
        });
        await fx.init?.(loading.ctx);
        frame(fx, loading.ctx);
        expect(printOn(loading.draws)).toBe(0);

        const plain = makeCtx();
        const fy = new HoloEffect({ holo: { material: "emboss" } });
        await fy.init?.(plain.ctx);
        frame(fy, plain.ctx);
        expect(printOn(plain.draws)).toBe(1);
    });
});

// vortex and nebula are not used above, so they start unloaded in this file
describe("HoloEffect loads a material's code on first use", () => {
    test("switching material keeps drawing the current one until the new one has loaded", async () => {
        const { ctx, draws } = makeCtx();
        const fx = new HoloEffect();
        await fx.init?.(ctx);
        frame(fx, ctx);
        expect(lastMaterial(draws)?.frag).toMatch(/#define MATERIAL_PRISM /);
        expect(loadedMaterial("vortex")).toBeUndefined();
        fx.setParams({ holo: { material: "vortex" } });
        frame(fx, ctx); // vortex is on its way: still prism
        expect(lastMaterial(draws)?.frag).toMatch(/#define MATERIAL_PRISM /);
        const ready = fx.ready;
        await vi.waitFor(() => expect(loadedMaterial("vortex")).toBeDefined());
        frame(fx, ctx);
        expect(lastMaterial(draws)?.frag).toMatch(/#define MATERIAL_VORTEX /);
        expect(await settled(ready)).toBe("ready");
    });

    test("preload loads ahead; resolvedSettings needs no material code", async () => {
        expect(loadedMaterial("nebula")).toBeUndefined();
        const v = new HoloEffect({
            holo: { material: "nebula" },
        }).resolvedSettings();
        expect(typeof v["nebula.size"]).toBe("number");
        expect(loadedMaterial("nebula")).toBeUndefined();
        await HoloEffect.preload("nebula");
        expect(loadedMaterial("nebula")).toBeDefined();
    });
});

/** A worker that answers at once with a 1 × 1 result, so the logo and paper builds finish. */
function stubAnsweringWorker() {
    vi.stubGlobal(
        "Worker",
        class {
            onmessage: ((e: { data: unknown }) => void) | null = null;
            postMessage(d: { id: number }) {
                setTimeout(() =>
                    this.onmessage?.({
                        data: {
                            id: d.id,
                            r: {
                                levels: [
                                    {
                                        w: 1,
                                        h: 1,
                                        mom: new Uint16Array(4),
                                        aux: new Uint16Array(4),
                                    },
                                ],
                            },
                        },
                    }),
                );
            }
            terminate() {}
        },
    );
}

/** A promise with its resolve. */
function deferred<T>() {
    let resolve: (v: T) => void = () => {};
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

describe("HoloEffect when loading fails or is cut short", () => {
    test("a material that fails to load warns once, settles ready, and the scene still updates", async () => {
        // sparkle is not used elsewhere in this file: make its chunk fail
        vi.doMock("./_holo/materials/sparkle.js", () => {
            throw new Error("chunk failed");
        });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { ctx, draws } = makeCtx();
        const fx = new HoloEffect();
        await fx.init?.(ctx);
        frame(fx, ctx);
        fx.setParams({ holo: { material: "sparkle" } });
        const ready = fx.ready;
        frame(fx, ctx); // the load starts when the frame resolves the settings
        await vi.waitFor(() =>
            expect(fx.errors.some((e) => e.includes('"sparkle"'))).toBe(true),
        );
        for (let i = 0; i < 10; i++) {
            frame(fx, ctx);
        }
        expect(await settled(ready)).toBe("ready");
        const loadWarnings = warn.mock.calls.filter((c) =>
            String(c[0]).includes('"sparkle" material'),
        );
        expect(loadWarnings).toHaveLength(1); // not one per frame
        // still drawing prism, with the scene as set now
        const exposure = () =>
            draws.filter((d) => d.uniforms && "uExposure" in d.uniforms).at(-1)
                ?.uniforms?.uExposure;
        const before = exposure();
        fx.setParams({ holo: { material: "sparkle", exposure: 2 } });
        frame(fx, ctx);
        expect(lastMaterial(draws)?.frag).toMatch(/#define MATERIAL_PRISM /);
        expect(exposure()).not.toBe(before); // the scene change is drawn
        vi.doUnmock("./_holo/materials/sparkle.js");
    });

    test("ready settles after emboss.logo leaves the element while its readback is pending", async () => {
        stubAnsweringWorker();
        // the element reads as blank: the readback keeps retrying
        const { ctx, readPixels } = makeCtx({
            w: 2,
            h: 2,
            pixels: new Uint8Array(16),
        });
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: { "emboss.logo": "element" },
            },
        });
        await fx.init?.(ctx);
        frame(fx, ctx);
        await tick();
        expect(readPixels).toHaveBeenCalled();
        fx.setParams({
            holo: { material: "emboss", settings: { "emboss.logo": "" } },
        });
        const ready = fx.ready;
        for (let i = 0; i < 5; i++) {
            frame(fx, ctx);
            await tick();
        }
        expect(await settled(ready)).toBe("ready");
    });

    test("an emboss.print that fails to load warns once, prints nothing, and settles ready", async () => {
        stubAnsweringWorker();
        vi.stubGlobal(
            "Image",
            class {
                crossOrigin = "";
                src = "";
                decode() {
                    return Promise.reject(new Error("404"));
                }
            },
        );
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { ctx, draws } = makeCtx();
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: { "emboss.print": "/missing.png" },
            },
        });
        await fx.init?.(ctx);
        const ready = fx.ready;
        for (let i = 0; i < 5; i++) {
            frame(fx, ctx);
            await tick();
        }
        expect(
            fx.errors.some((e) => e.includes("emboss.print /missing.png")),
        ).toBe(true);
        expect(
            warn.mock.calls.filter((c) => String(c[0]).includes("emboss.print"))
                .length,
        ).toBe(1);
        expect(printOn(draws)).toBe(0); // not the element instead
        expect(await settled(ready)).toBe("ready");
    });

    test("a readPixels that rejects is tried again on the next frame", async () => {
        const { ctx, readPixels } = makeCtx();
        readPixels.mockImplementationOnce(() =>
            Promise.reject(new Error("context lost")),
        );
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: { "emboss.logo": "element" },
            },
        });
        await fx.init?.(ctx);
        frame(fx, ctx);
        await tick();
        expect(readPixels).toHaveBeenCalledTimes(1);
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(2);
    });

    test("a restore during a readback reads the element again and drops the late result", async () => {
        const { ctx, readPixels, restore } = makeCtx({ w: 2, h: 2 });
        const first = deferred<Uint8Array>();
        const second = deferred<Uint8Array>();
        readPixels
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(() => second.promise);
        const fx = new HoloEffect({
            holo: {
                material: "emboss",
                settings: { "emboss.logo": "element" },
            },
        });
        await fx.init?.(ctx);
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(1);
        restore();
        frame(fx, ctx);
        expect(readPixels).toHaveBeenCalledTimes(2);
        const reads = () => puts.filter((p) => p.w === 2 && p.h === 2).length;
        first.resolve(new Uint8Array(16).fill(255));
        await tick();
        expect(reads()).toBe(0); // from before the restore: dropped
        second.resolve(new Uint8Array(16).fill(255));
        await tick();
        expect(reads()).toBe(1);
    });

    test("an init that awaits across a dispose stops", async () => {
        const { ctx, hasRestoreListener } = makeCtx();
        const fx = new HoloEffect({ holo: { material: "shatter" } });
        const created = vi.spyOn(ctx, "createRenderTarget");
        const init = fx.init?.(ctx);
        fx.dispose?.();
        await init;
        expect(hasRestoreListener()).toBe(false);
        expect(created).not.toHaveBeenCalled();
    });
});
